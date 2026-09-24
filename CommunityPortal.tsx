import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Archive, ArrowLeft, BadgeCheck, BookOpen, CheckCircle2, ChevronRight, CircleUserRound,
  Clock3, ExternalLink, Film, Gamepad2, History, LayoutGrid, Library, Link2,
  ListPlus, LogIn, MonitorPlay, MoreHorizontal, Play, Plus, Radio, ShieldCheck,
  Sparkles, Star, Upload, UsersRound, X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

type PageKey = "home" | "lives" | "games" | "books" | "epubs" | "links" | "admin";
type FormKind = "live" | "game" | "book" | "review" | "comment" | "epub" | "link" | null;
type ContentType = "game" | "book";

type Live = {
  id: number; title: string; streamerName: string; platform: "youtube" | "twitch" | "kick";
  streamUrl: string; embedUrl: string | null; layoutGroup: string | null; startedAt: Date; isActive: boolean;
};
type Review = { id: number; rating: string; personName: string; timeSpent: number; progress: number; notes: string | null; createdAt: Date };
type Comment = { id: number; authorName: string; body: string; createdAt: Date };

const navigation: { id: PageKey; label: string; icon: typeof LayoutGrid }[] = [
  { id: "home", label: "Início", icon: LayoutGrid },
  { id: "lives", label: "Lives", icon: Radio },
  { id: "games", label: "Jogos", icon: Gamepad2 },
  { id: "books", label: "Livros", icon: BookOpen },
  { id: "epubs", label: "EPUB", icon: Library },
  { id: "links", label: "Links", icon: Link2 },
];

const platformLabel: Record<string, string> = { xbox: "Xbox", playstation: "PlayStation", nintendo: "Nintendo", pc: "PC", multi: "Multiplataforma" };
const platformTone: Record<string, string> = {
  youtube: "bg-red-500/15 text-red-300 ring-red-400/25", twitch: "bg-violet-500/15 text-violet-200 ring-violet-400/25", kick: "bg-lime-500/15 text-lime-200 ring-lime-400/25",
};

function pathFor(page: PageKey) {
  return page === "home" ? "/" : `/${page === "epubs" ? "epub" : page}`;
}

function pageFromPath(path: string): PageKey {
  if (path.startsWith("/lives")) return "lives";
  if (path.startsWith("/jogos")) return "games";
  if (path.startsWith("/livros")) return "books";
  if (path.startsWith("/epub")) return "epubs";
  if (path.startsWith("/links")) return "links";
  if (path.startsWith("/admin")) return "admin";
  return "home";
}

function displayDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function showMutationError(error: unknown) {
  toast.error(error instanceof Error ? error.message : "Não foi possível concluir a operação.");
}

function initials(text: string) {
  return text.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "CJ";
}

function deriveEmbedUrl(live: Live) {
  if (live.embedUrl) return live.embedUrl;
  try {
    const url = new URL(live.streamUrl);
    if (live.platform === "youtube") {
      const videoId = url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop();
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0` : "";
    }
    const channel = url.pathname.split("/").filter(Boolean)[0];
    if (live.platform === "twitch" && channel) return `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
    if (live.platform === "kick" && channel) return `https://player.kick.com/${channel}`;
  } catch { /* Link de stream pode ser um embed fornecido manualmente. */ }
  return "";
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }: { icon: typeof Archive; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 bg-slate-900/45 px-6 py-14 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300"><Icon className="size-6" /></div>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function Cover({ title, url, type, className }: { title: string; url?: string | null; type: ContentType; className?: string }) {
  if (url) return <img src={url} alt={`Capa de ${title}`} className={cn("object-cover", className)} />;
  const Icon = type === "game" ? Gamepad2 : BookOpen;
  return (
    <div className={cn("relative overflow-hidden bg-linear-to-br from-cyan-500/35 via-indigo-500/30 to-fuchsia-700/35", className)}>
      <div className="absolute -right-4 -top-6 size-24 rounded-full border border-white/10 bg-white/5" />
      <div className="absolute -bottom-9 -left-4 size-24 rounded-full bg-cyan-400/10 blur-sm" />
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        <Icon className="size-7 text-cyan-100" />
        <span className="line-clamp-3 text-sm font-bold leading-tight text-white">{title}</span>
      </div>
    </div>
  );
}

function StatsCard({ icon: Icon, label, value, tone, onClick }: { icon: typeof Radio; label: string; value: number | string; tone: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group rounded-2xl border border-white/8 bg-white/4 p-4 text-left transition hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/7">
      <div className="flex items-start justify-between">
        <div className={cn("flex size-9 items-center justify-center rounded-xl", tone)}><Icon className="size-4.5" /></div>
        <ChevronRight className="mt-1 size-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-300" />
      </div>
      <div className="mt-7 text-3xl font-semibold tracking-tight text-white">{value}</div>
      <div className="mt-1 text-xs font-medium text-slate-400">{label}</div>
    </button>
  );
}

function LivePlayer({ live, canEdit, onEnd }: { live: Live; canEdit: boolean; onEnd: (id: number) => void }) {
  const embed = deriveEmbedUrl(live);
  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl shadow-black/20">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-rose-500" /></span><p className="truncate text-sm font-semibold text-white">{live.title}</p></div>
          <p className="mt-0.5 text-xs text-slate-400">Live de {live.streamerName} · iniciada em {displayDate(live.startedAt)}</p>
        </div>
        <div className="ml-3 flex shrink-0 items-center gap-2">
          <span className={cn("hidden rounded-md px-2 py-1 text-[10px] font-bold uppercase ring-1 sm:inline-block", platformTone[live.platform])}>{live.platform}</span>
          {canEdit && <button onClick={() => onEnd(live.id)} title="Encerrar live" className="rounded-md p-1.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"><X className="size-4" /></button>}
        </div>
      </div>
      <div className="aspect-video bg-black">
        {embed ? <iframe src={embed} title={live.title} className="size-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : <div className="flex size-full flex-col items-center justify-center gap-3 text-center"><MonitorPlay className="size-9 text-cyan-400" /><p className="text-sm text-slate-300">Este link não possui embed automático.</p><a href={live.streamUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-cyan-300 hover:text-cyan-100">Abrir a transmissão <ExternalLink className="ml-1 inline size-3.5" /></a></div>}
      </div>
      <div className="flex items-center justify-between px-4 py-3"><span className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Ao vivo</span><a href={live.streamUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-cyan-300 hover:text-cyan-100">Abrir na plataforma <ExternalLink className="ml-1 inline size-3" /></a></div>
    </article>
  );
}

function LivesGrid({ lives, canEdit, onEnd, compact = false }: { lives: Live[]; canEdit: boolean; onEnd: (id: number) => void; compact?: boolean }) {
  if (!lives.length) return <EmptyState icon={Radio} title="Nenhuma transmissão no ar" description="Quando alguém do grupo iniciar uma live, ela aparece aqui por ordem de abertura. O layout suporta uma tela individual ou duplas simultâneas." />;
  const groups = new Map<string, Live[]>();
  lives.forEach(live => {
    const key = live.layoutGroup ? `group-${live.layoutGroup}` : `single-${live.id}`;
    groups.set(key, [...(groups.get(key) ?? []), live]);
  });
  return <div className="space-y-5">{Array.from(groups.entries()).map(([key, group]) => <div key={key} className={cn("grid gap-5", group.length > 1 ? "lg:grid-cols-2" : compact ? "max-w-3xl" : "")}>{group.map(live => <LivePlayer key={live.id} live={live} canEdit={canEdit} onEnd={onEnd} />)}</div>)}</div>;
}

function HomePage({ go, openForm, canEdit }: { go: (page: PageKey) => void; openForm: (form: FormKind) => void; canEdit: boolean }) {
  const stats = trpc.dashboard.stats.useQuery();
  const lives = trpc.lives.listActive.useQuery();
  const liveList = (lives.data ?? []) as Live[];
  const endLive = trpc.lives.end.useMutation({ onSuccess: () => { toast.success("Live encerrada."); lives.refetch(); stats.refetch(); }, onError: showMutationError });
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 px-6 py-9 sm:px-10 sm:py-12">
        <div className="absolute -right-20 -top-24 size-80 rounded-full bg-cyan-500/15 blur-3xl" /><div className="absolute bottom-0 left-1/3 size-72 rounded-full bg-fuchsia-600/10 blur-3xl" />
        <div className="relative grid gap-9 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/8 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.17em] text-cyan-200"><Sparkles className="size-3.5" /> A base do nosso grupo</div>
            <h1 className="max-w-xl font-display text-4xl font-semibold leading-[1.04] tracking-tight text-white sm:text-5xl">Todo mundo joga. <span className="text-cyan-300">Todo mundo registra.</span></h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">Um ponto de encontro para acompanhar a jogatina, trocar avaliações sinceras e guardar o que vale a pena ler.</p>
            <div className="mt-7 flex flex-wrap gap-3"><Button onClick={() => go("lives")} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Play className="mr-2 size-4 fill-current" /> Ver lives agora</Button>{canEdit && <Button variant="outline" onClick={() => openForm("live")} className="border-white/15 bg-white/4 text-white hover:bg-white/10 hover:text-white"><Plus className="mr-2 size-4" /> Iniciar live</Button>}</div>
          </div>
          <div className="grid grid-cols-2 gap-3"> <StatsCard icon={Radio} label="lives ativas" value={stats.data?.activeLives ?? 0} tone="bg-rose-400/10 text-rose-300" onClick={() => go("lives")} /><StatsCard icon={Gamepad2} label="jogos no grupo" value={stats.data?.games ?? 0} tone="bg-violet-400/10 text-violet-300" onClick={() => go("games")} /><StatsCard icon={BookOpen} label="livros catalogados" value={stats.data?.books ?? 0} tone="bg-amber-400/10 text-amber-300" onClick={() => go("books")} /><StatsCard icon={Library} label="EPUBs na estante" value={stats.data?.epubs ?? 0} tone="bg-emerald-400/10 text-emerald-300" onClick={() => go("epubs")} /></div>
        </div>
      </section>
      <section><SectionHeading eyebrow="Agora na tela" title="Transmissões em andamento" description="Entram primeiro as lives abertas mais recentemente. Use o mesmo grupo de layout para ver duas transmissões lado a lado." action={<Button variant="ghost" onClick={() => go("lives")} className="text-cyan-300 hover:bg-cyan-300/10 hover:text-cyan-100">Ver painel completo <ChevronRight className="ml-1 size-4" /></Button>} /><LivesGrid lives={liveList} canEdit={canEdit} onEnd={id => endLive.mutate({ id })} compact /></section>
      <section className="grid gap-4 md:grid-cols-3"><QuickRoute icon={Gamepad2} title="Registro de jogos" description="Notas, tempo, progresso e comentários de cada campanha." action="Explorar jogos" onClick={() => go("games")} /><QuickRoute icon={BookOpen} title="Clube de leitura" description="Livros, ISBN, avaliações e impressões finais." action="Ver livros" onClick={() => go("books")} /><QuickRoute icon={Link2} title="Atalhos do grupo" description="Os links úteis ficam reunidos e fáceis de encontrar." action="Abrir links" onClick={() => go("links")} /></section>
    </div>
  );
}

function QuickRoute({ icon: Icon, title, description, action, onClick }: { icon: typeof Gamepad2; title: string; description: string; action: string; onClick: () => void }) {
  return <button onClick={onClick} className="group rounded-2xl border border-white/8 bg-slate-900/55 p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/20 hover:bg-slate-900"><div className="flex size-10 items-center justify-center rounded-xl bg-white/6 text-cyan-300"><Icon className="size-5" /></div><h3 className="mt-7 text-lg font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p><div className="mt-5 text-sm font-semibold text-cyan-300">{action} <ChevronRight className="inline size-4 transition group-hover:translate-x-1" /></div></button>;
}

function LivesPage({ openForm, canEdit }: { openForm: (form: FormKind) => void; canEdit: boolean }) {
  const lives = trpc.lives.listActive.useQuery();
  const endLive = trpc.lives.end.useMutation({ onSuccess: () => { toast.success("Live encerrada."); lives.refetch(); }, onError: showMutationError });
  return <div><SectionHeading eyebrow="Sala de transmissão" title="Lives do grupo" description="Cada live é mostrada por ordem de abertura. Para duas telas simultâneas, cadastre as duas com o mesmo grupo de layout." action={canEdit ? <Button onClick={() => openForm("live")} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Plus className="mr-2 size-4" /> Iniciar live</Button> : undefined} /><LivesGrid lives={(lives.data ?? []) as Live[]} canEdit={canEdit} onEnd={id => endLive.mutate({ id })} /></div>;
}

function CatalogPage({ type, goDetail, openForm, canEdit }: { type: ContentType; goDetail: (id: number) => void; openForm: (form: FormKind) => void; canEdit: boolean }) {
  const query = type === "game" ? trpc.catalog.games.useQuery() : trpc.catalog.books.useQuery();
  const data = query.data ?? [];
  const title = type === "game" ? "Jogos do grupo" : "Estante de livros";
  const singular = type === "game" ? "jogo" : "livro";
  const emptyAction = canEdit ? <Button onClick={() => openForm(type)} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Plus className="mr-2 size-4" /> Adicionar {singular}</Button> : undefined;
  return <div><SectionHeading eyebrow={type === "game" ? "Biblioteca de jogatina" : "Clube de leitura"} title={title} description={type === "game" ? "Organize o que o grupo joga, a plataforma preferida e as experiências de cada pessoa." : "Acompanhe leituras, ISBNs, notas e os comentários que ficam depois da última página."} action={canEdit ? <Button onClick={() => openForm(type)} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Plus className="mr-2 size-4" /> Adicionar {singular}</Button> : undefined} />
    {!data.length ? <EmptyState icon={type === "game" ? Gamepad2 : BookOpen} title={`Nenhum ${singular} catalogado`} description={`Comece a coleção adicionando o primeiro ${singular}. Depois, qualquer membro poderá registrar sua nota, tempo e progresso.`} action={emptyAction} /> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.map((item: any) => <CatalogCard key={item.id} item={item} type={type} onClick={() => goDetail(item.id)} />)}</div>}
  </div>;
}

function CatalogCard({ item, type, onClick }: { item: any; type: ContentType; onClick: () => void }) {
  return <button onClick={onClick} className="group overflow-hidden rounded-2xl border border-white/8 bg-slate-900/60 text-left transition hover:-translate-y-1 hover:border-white/18 hover:bg-slate-900"><div className="flex gap-4 p-4"><Cover title={item.title} url={item.coverUrl} type={type} className="h-28 w-20 shrink-0 rounded-xl" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="line-clamp-2 text-base font-semibold leading-5 text-white">{item.title}</h3><ChevronRight className="mt-0.5 size-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-300" /></div><p className="mt-2 truncate text-sm text-slate-400">{type === "game" ? platformLabel[item.preferredPlatform] : item.author}</p><div className="mt-5 flex items-center gap-2">{item.criticScore ? <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/10 px-2 py-1 text-xs font-semibold text-amber-200"><Star className="size-3 fill-current" /> {item.criticScore}</span> : <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-slate-500">Sem nota externa</span>}{type === "game" && item.releaseYear && <span className="text-xs text-slate-500">{item.releaseYear}</span>}</div></div></div></button>;
}

function DetailPage({ type, id, goBack, requestForm, isAuthenticated }: { type: ContentType; id: number; goBack: () => void; requestForm: (kind: FormKind, type?: ContentType, id?: number) => void; isAuthenticated: boolean }) {
  const detail = trpc.catalog.detail.useQuery({ type, id });
  const payload = detail.data as { item: any; reviews: Review[]; comments: Comment[] } | undefined;
  if (detail.isLoading) return <div className="animate-pulse rounded-3xl bg-white/5 p-10 text-sm text-slate-400">Carregando os registros…</div>;
  if (!payload) return <EmptyState icon={Archive} title="Registro não encontrado" description="Este item pode ter sido removido ou o endereço está incorreto." action={<Button onClick={goBack}>Voltar</Button>} />;
  const { item, reviews, comments } = payload;
  const average = reviews.length ? (reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length).toFixed(1) : null;
  const averageProgress = reviews.length ? Math.round(reviews.reduce((sum, review) => sum + review.progress, 0) / reviews.length) : 0;
  const averageTime = reviews.length ? Math.round(reviews.reduce((sum, review) => sum + review.timeSpent, 0) / reviews.length) : 0;
  const label = type === "game" ? "jogo" : "livro";
  return <div className="space-y-8"><button onClick={goBack} className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-cyan-200"><ArrowLeft className="size-4" /> Voltar para {type === "game" ? "jogos" : "livros"}</button>
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/75"><div className="grid lg:grid-cols-[260px_1fr]"><Cover title={item.title} url={item.coverUrl} type={type} className="min-h-64 w-full lg:h-full" /><div className="p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">{type === "game" ? "Registro de jogo" : "Registro de leitura"}</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">{item.title}</h1><p className="mt-2 text-sm text-slate-400">{type === "game" ? `${platformLabel[item.preferredPlatform]}${item.releaseYear ? ` · ${item.releaseYear}` : ""}` : `${item.author}${item.isbn ? ` · ISBN ${item.isbn}` : ""}`}</p></div>{item.criticScore && <div className="rounded-2xl border border-amber-300/15 bg-amber-300/8 px-4 py-3 text-center"><div className="text-[10px] font-bold uppercase tracking-wider text-amber-200">Nota externa</div><div className="mt-1 text-2xl font-semibold text-amber-100">{item.criticScore}</div></div>}</div><p className="mt-6 max-w-3xl text-sm leading-7 text-slate-300">{item.description || `Ainda não há uma sinopse para este ${label}. O grupo pode completar esta parte em uma próxima edição.`}</p><div className="mt-7 flex flex-wrap gap-3">{isAuthenticated ? <><Button onClick={() => requestForm("review", type, id)} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Star className="mr-2 size-4" /> Incluir nota</Button><Button variant="outline" onClick={() => requestForm("comment", type, id)} className="border-white/15 bg-white/4 text-white hover:bg-white/10 hover:text-white"><MoreHorizontal className="mr-2 size-4" /> Comentar</Button></> : <Button onClick={startLogin} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><LogIn className="mr-2 size-4" /> Entre para avaliar</Button>}</div></div></div></section>
    <section className="grid gap-4 sm:grid-cols-3"><Metric icon={Star} label="média do grupo" value={average ? `${average}/10` : "—"} tone="text-amber-200 bg-amber-300/10" /><Metric icon={Clock3} label={type === "game" ? "tempo médio jogado" : "tempo médio de leitura"} value={reviews.length ? `${averageTime}h` : "—"} tone="text-cyan-200 bg-cyan-300/10" /><Metric icon={CheckCircle2} label="progresso médio" value={reviews.length ? `${averageProgress}%` : "—"} tone="text-emerald-200 bg-emerald-300/10" /></section>
    <section className="grid gap-8 xl:grid-cols-[1.3fr_.7fr]"><div><SectionHeading eyebrow="Notas do grupo" title="Quem viveu essa experiência" description="Nota, tempo, progresso e observações ficam visíveis em cada registro." />{reviews.length ? <div className="space-y-3">{reviews.map(review => <ReviewRow key={review.id} review={review} type={type} />)}</div> : <EmptyState icon={Star} title="Ainda não há avaliações" description="Se você terminou, está no meio ou só quer registrar a experiência, seja a primeira pessoa a avaliar." />}</div><div><SectionHeading eyebrow="Mural" title="Comentários" description="Sem algoritmo: só o papo que o grupo quis guardar." />{comments.length ? <div className="space-y-3">{comments.map(comment => <CommentCard key={comment.id} comment={comment} />)}</div> : <EmptyState icon={MoreHorizontal} title="Mural livre" description="Nenhum comentário por enquanto." />}</div></section>
  </div>;
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Star; label: string; value: string; tone: string }) {
  return <div className="rounded-2xl border border-white/8 bg-slate-900/55 p-4"><div className={cn("flex size-8 items-center justify-center rounded-lg", tone)}><Icon className="size-4" /></div><p className="mt-6 text-2xl font-semibold text-white">{value}</p><p className="mt-1 text-xs text-slate-400">{label}</p></div>;
}

function ReviewRow({ review, type }: { review: Review; type: ContentType }) {
  return <article className="rounded-2xl border border-white/8 bg-slate-900/55 p-4"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/30 to-violet-400/30 text-xs font-bold text-cyan-100">{initials(review.personName)}</div><div><h3 className="text-sm font-semibold text-white">{review.personName}</h3><p className="text-xs text-slate-500">{displayDate(review.createdAt)}</p></div></div><div className="inline-flex items-center gap-1 rounded-lg bg-amber-400/10 px-2.5 py-1.5 text-sm font-bold text-amber-100"><Star className="size-3.5 fill-current" /> {review.rating}</div></div>{review.notes && <p className="mt-4 text-sm leading-6 text-slate-300">{review.notes}</p>}<div className="mt-4 grid gap-3 border-t border-white/6 pt-3 sm:grid-cols-2"><p className="text-xs text-slate-400"><Clock3 className="mr-1.5 inline size-3.5 text-cyan-300" />{review.timeSpent}h {type === "game" ? "jogadas" : "de leitura"}</p><div className="flex items-center gap-2"><Progress value={review.progress} className="h-1.5 flex-1 bg-white/8" /><span className="text-xs font-semibold text-cyan-200">{review.progress}%</span></div></div></article>;
}

function CommentCard({ comment }: { comment: Comment }) { return <article className="rounded-2xl border border-white/8 bg-slate-900/55 p-4"><div className="flex items-center gap-2"><CircleUserRound className="size-4 text-cyan-300" /><h3 className="text-sm font-semibold text-white">{comment.authorName}</h3><span className="text-xs text-slate-600">· {displayDate(comment.createdAt)}</span></div><p className="mt-3 text-sm leading-6 text-slate-300">{comment.body}</p></article>; }

function EpubPage({ openForm, canEdit }: { openForm: (kind: FormKind) => void; canEdit: boolean }) {
  const query = trpc.library.epubs.useQuery(); const epubs = query.data ?? [];
  return <div><SectionHeading eyebrow="Biblioteca digital" title="EPUBs do grupo" description="Arquive seus arquivos EPUB ou registre um link externo. A biblioteca guarda título, autor, nota e o acesso ao arquivo." action={canEdit ? <Button onClick={() => openForm("epub")} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Upload className="mr-2 size-4" /> Adicionar EPUB</Button> : undefined} />{!epubs.length ? <EmptyState icon={Library} title="A estante digital está vazia" description="Editores podem enviar EPUBs de até 15 MB ou registrar um arquivo hospedado externamente." action={canEdit ? <Button onClick={() => openForm("epub")} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">Adicionar primeiro EPUB</Button> : undefined} /> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{epubs.map((epub: any) => <article key={epub.id} className="rounded-2xl border border-white/8 bg-slate-900/60 p-5"><div className="flex items-start justify-between gap-4"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200"><BookOpen className="size-5" /></div>{epub.rating ? <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/10 px-2 py-1 text-xs font-semibold text-amber-200"><Star className="size-3 fill-current" /> {epub.rating}</span> : null}</div><h3 className="mt-6 text-lg font-semibold text-white">{epub.title}</h3><p className="mt-1 text-sm text-slate-400">{epub.author}</p><a href={epub.fileUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-100">Abrir arquivo <ExternalLink className="ml-1.5 size-4" /></a></article>)}</div>}</div>;
}

function LinksPage({ openForm, canEdit }: { openForm: (kind: FormKind) => void; canEdit: boolean }) {
  const query = trpc.links.list.useQuery(); const links = query.data ?? [];
  return <div><SectionHeading eyebrow="Recursos favoritos" title="Links do grupo" description="Um mural simples para canais, comunidades, listas e qualquer ferramenta que a galera queira achar depois." action={canEdit ? <Button onClick={() => openForm("link")} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Plus className="mr-2 size-4" /> Novo link</Button> : undefined} />{!links.length ? <EmptyState icon={Link2} title="Nenhum link salvo" description="Salve aqui os lugares que fazem parte da rotina do grupo." action={canEdit ? <Button onClick={() => openForm("link")} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">Adicionar link</Button> : undefined} /> : <div className="grid gap-4 md:grid-cols-2">{links.map((link: any) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="group rounded-2xl border border-white/8 bg-slate-900/60 p-5 transition hover:-translate-y-0.5 hover:border-cyan-300/20"><div className="flex items-start justify-between gap-4"><span className="rounded-md bg-cyan-300/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-200">{link.category}</span><ExternalLink className="size-4 text-slate-600 transition group-hover:text-cyan-300" /></div><h3 className="mt-6 text-lg font-semibold text-white">{link.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{link.description || "Abrir recurso externo"}</p></a>)}</div>}</div>;
}

function AdminPage() {
  const members = trpc.admin.members.useQuery(); const audit = trpc.admin.audit.useQuery(); const utils = trpc.useUtils();
  const update = trpc.admin.updateRole.useMutation({ onSuccess: () => { toast.success("Nível de acesso atualizado."); utils.admin.members.invalidate(); utils.admin.audit.invalidate(); }, onError: showMutationError });
  return <div><SectionHeading eyebrow="Controle de acesso" title="Administração" description="Somente administradores podem promover pessoas e acompanhar as alterações diretas feitas no portal." /><div className="grid gap-8 xl:grid-cols-[1.1fr_.9fr]"><section><h2 className="mb-4 text-sm font-semibold text-white">Membros e permissões</h2><div className="overflow-hidden rounded-2xl border border-white/8 bg-slate-900/60"><div className="hidden grid-cols-[1fr_120px_120px] gap-4 border-b border-white/8 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:grid"><span>Pessoa</span><span>Função</span><span>Editar</span></div>{(members.data ?? []).map(member => <div key={member.id} className="grid gap-3 border-b border-white/6 px-5 py-4 last:border-0 sm:grid-cols-[1fr_120px_120px] sm:items-center"><div><p className="text-sm font-semibold text-white">{member.name || "Membro sem nome"}</p><p className="text-xs text-slate-500">{member.email || "Sem e-mail"}</p></div><span className={cn("w-fit rounded-md px-2 py-1 text-[10px] font-bold uppercase", member.role === "admin" ? "bg-fuchsia-400/10 text-fuchsia-200" : member.role === "editor" ? "bg-cyan-400/10 text-cyan-200" : "bg-white/6 text-slate-400")}>{member.role === "user" ? "membro" : member.role}</span><select value={member.role} onChange={event => update.mutate({ id: member.id, role: event.target.value as "user" | "editor" | "admin" })} disabled={update.isPending} className="h-9 rounded-lg border border-white/10 bg-slate-950 px-2 text-xs text-white outline-none focus:border-cyan-300"><option value="user">Membro</option><option value="editor">Editor</option><option value="admin">Admin</option></select></div>)}</div></section><section><h2 className="mb-4 text-sm font-semibold text-white">Trilha de alterações</h2><div className="space-y-3">{(audit.data ?? []).length ? audit.data?.map(log => <article key={log.id} className="rounded-2xl border border-white/8 bg-slate-900/60 p-4"><div className="flex items-center gap-3"><div className="flex size-8 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-200"><History className="size-4" /></div><div><p className="text-sm font-semibold text-white">{log.action.replaceAll("_", " ")}</p><p className="mt-0.5 text-xs text-slate-500">{log.entityType} #{log.entityId ?? "—"} · {displayDate(log.createdAt)}</p></div></div></article>) : <EmptyState icon={History} title="Sem alterações registradas" description="As próximas modificações feitas pelos membros aparecerão aqui." />}</div></section></div></div>;
}

function Field({ label, children, required, hint }: { label: string; children: React.ReactNode; required?: boolean; hint?: string }) { return <div className="space-y-1.5"><Label className="text-xs font-semibold text-slate-200">{label}{required && <span className="ml-1 text-cyan-300">*</span>}</Label>{children}{hint && <p className="text-[11px] leading-4 text-slate-500">{hint}</p>}</div>; }

function LiveForm({ close }: { close: () => void }) {
  const utils = trpc.useUtils(); const mutation = trpc.lives.create.useMutation({ onSuccess: () => { toast.success("Live adicionada ao painel."); utils.lives.listActive.invalidate(); utils.dashboard.stats.invalidate(); close(); }, onError: showMutationError });
  return <form className="space-y-4" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); mutation.mutate({ title: String(form.get("title")), streamerName: String(form.get("streamerName")), platform: String(form.get("platform")) as "youtube" | "twitch" | "kick", streamUrl: String(form.get("streamUrl")), embedUrl: String(form.get("embedUrl")), layoutGroup: String(form.get("layoutGroup")) }); }}><Field label="Título da live" required><Input name="title" placeholder="Ex.: Rumo ao boss final" required className="portal-input" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Quem está ao vivo" required><Input name="streamerName" placeholder="Paulinho" required className="portal-input" /></Field><Field label="Plataforma" required><select name="platform" defaultValue="youtube" className="portal-input"><option value="youtube">YouTube</option><option value="twitch">Twitch</option><option value="kick">Kick</option></select></Field></div><Field label="Link da transmissão" required hint="YouTube, Twitch ou Kick. O sistema tenta montar o player automaticamente."><Input name="streamUrl" type="url" placeholder="https://..." required className="portal-input" /></Field><Field label="Link de embed (opcional)" hint="Use se a plataforma exigir um endereço específico para incorporar o player."><Input name="embedUrl" type="url" placeholder="https://..." className="portal-input" /></Field><Field label="Grupo de layout (opcional)" hint="Dê o mesmo nome em duas lives para exibi-las lado a lado, por exemplo: noite-de-coop."><Input name="layoutGroup" placeholder="noite-de-coop" className="portal-input" /></Field><SubmitRow close={close} pending={mutation.isPending} label="Iniciar live" /></form>;
}

function GameForm({ close }: { close: () => void }) {
  const utils = trpc.useUtils(); const mutation = trpc.catalog.createGame.useMutation({ onSuccess: () => { toast.success("Jogo adicionado ao catálogo."); utils.catalog.games.invalidate(); utils.dashboard.stats.invalidate(); close(); }, onError: showMutationError });
  return <form className="space-y-4" onSubmit={event => { event.preventDefault(); const f = new FormData(event.currentTarget); mutation.mutate({ title: String(f.get("title")), coverUrl: String(f.get("coverUrl")), criticScore: f.get("criticScore") ? Number(f.get("criticScore")) : undefined, preferredPlatform: String(f.get("preferredPlatform")) as "xbox" | "playstation" | "nintendo" | "pc" | "multi", releaseYear: f.get("releaseYear") ? Number(f.get("releaseYear")) : undefined, description: String(f.get("description")) }); }}><Field label="Nome do jogo" required><Input name="title" required placeholder="Ex.: Hades" className="portal-input" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Plataforma preferida" required><select name="preferredPlatform" defaultValue="multi" className="portal-input"><option value="xbox">Xbox</option><option value="playstation">PlayStation</option><option value="nintendo">Nintendo</option><option value="pc">PC</option><option value="multi">Multiplataforma</option></select></Field><Field label="Ano de lançamento"><Input name="releaseYear" type="number" min="1970" max="2100" placeholder="2024" className="portal-input" /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Nota externa (0–10)"><Input name="criticScore" type="number" min="0" max="10" step="0.1" placeholder="8.5" className="portal-input" /></Field><Field label="URL da capa"><Input name="coverUrl" type="url" placeholder="https://..." className="portal-input" /></Field></div><Field label="Sinopse / contexto"><Textarea name="description" placeholder="Por que esse jogo entrou na lista?" className="portal-input min-h-24" /></Field><SubmitRow close={close} pending={mutation.isPending} label="Adicionar jogo" /></form>;
}

function BookForm({ close }: { close: () => void }) {
  const utils = trpc.useUtils(); const mutation = trpc.catalog.createBook.useMutation({ onSuccess: () => { toast.success("Livro adicionado à estante."); utils.catalog.books.invalidate(); utils.dashboard.stats.invalidate(); close(); }, onError: showMutationError });
  return <form className="space-y-4" onSubmit={event => { event.preventDefault(); const f = new FormData(event.currentTarget); mutation.mutate({ title: String(f.get("title")), author: String(f.get("author")), coverUrl: String(f.get("coverUrl")), isbn: String(f.get("isbn")), criticScore: f.get("criticScore") ? Number(f.get("criticScore")) : undefined, description: String(f.get("description")) }); }}><div className="grid gap-4 sm:grid-cols-2"><Field label="Título" required><Input name="title" required placeholder="Ex.: Duna" className="portal-input" /></Field><Field label="Autor" required><Input name="author" required placeholder="Frank Herbert" className="portal-input" /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="ISBN"><Input name="isbn" placeholder="978..." className="portal-input" /></Field><Field label="Nota externa (0–10)"><Input name="criticScore" type="number" min="0" max="10" step="0.1" placeholder="9.0" className="portal-input" /></Field></div><Field label="URL da capa"><Input name="coverUrl" type="url" placeholder="https://..." className="portal-input" /></Field><Field label="Sinopse / contexto"><Textarea name="description" placeholder="Sobre o que é e por que vale entrar na estante?" className="portal-input min-h-24" /></Field><SubmitRow close={close} pending={mutation.isPending} label="Adicionar livro" /></form>;
}

function ReviewForm({ type, id, close }: { type: ContentType; id: number; close: () => void }) {
  const utils = trpc.useUtils(); const mutation = trpc.catalog.addReview.useMutation({ onSuccess: () => { toast.success("Avaliação registrada."); utils.catalog.detail.invalidate({ type, id }); close(); }, onError: showMutationError });
  return <form className="space-y-4" onSubmit={event => { event.preventDefault(); const f = new FormData(event.currentTarget); mutation.mutate({ type, id, rating: Number(f.get("rating")), personName: String(f.get("personName")), timeSpent: Number(f.get("timeSpent")), progress: Number(f.get("progress")), notes: String(f.get("notes")) }); }}><Field label="Seu nome" required><Input name="personName" required placeholder="Como o grupo te chama?" className="portal-input" /></Field><div className="grid gap-4 sm:grid-cols-3"><Field label="Nota (0–10)" required><Input name="rating" type="number" min="0" max="10" step="0.1" required placeholder="8.5" className="portal-input" /></Field><Field label={type === "game" ? "Horas jogadas" : "Horas de leitura"} required><Input name="timeSpent" type="number" min="0" required placeholder="12" className="portal-input" /></Field><Field label="Progresso (%)" required><Input name="progress" type="number" min="0" max="100" required placeholder="100" className="portal-input" /></Field></div><Field label="Observações"><Textarea name="notes" placeholder="O que ficou desta experiência?" className="portal-input min-h-28" /></Field><p className="rounded-xl border border-cyan-300/10 bg-cyan-300/5 p-3 text-xs leading-5 text-slate-400"><BadgeCheck className="mr-1 inline size-3.5 text-cyan-300" /> Nome, nota, tempo e progresso são associados à sua avaliação e entram nas médias da página.</p><SubmitRow close={close} pending={mutation.isPending} label="Publicar avaliação" /></form>;
}

function CommentForm({ type, id, close }: { type: ContentType; id: number; close: () => void }) {
  const utils = trpc.useUtils(); const mutation = trpc.catalog.addComment.useMutation({ onSuccess: () => { toast.success("Comentário publicado."); utils.catalog.detail.invalidate({ type, id }); close(); }, onError: showMutationError });
  return <form className="space-y-4" onSubmit={event => { event.preventDefault(); const f = new FormData(event.currentTarget); mutation.mutate({ type, id, authorName: String(f.get("authorName")), body: String(f.get("body")) }); }}><Field label="Seu nome" required><Input name="authorName" required placeholder="Como o grupo te chama?" className="portal-input" /></Field><Field label="Comentário" required><Textarea name="body" required minLength={2} placeholder="Deixe uma impressão, dica ou reação…" className="portal-input min-h-32" /></Field><SubmitRow close={close} pending={mutation.isPending} label="Publicar comentário" /></form>;
}

function EpubForm({ close }: { close: () => void }) {
  const utils = trpc.useUtils(); const urlMutation = trpc.library.addFromUrl.useMutation({ onSuccess: () => { toast.success("EPUB adicionado à biblioteca."); utils.library.epubs.invalidate(); utils.dashboard.stats.invalidate(); close(); }, onError: showMutationError }); const uploadMutation = trpc.library.uploadEpub.useMutation({ onSuccess: () => { toast.success("EPUB enviado à biblioteca."); utils.library.epubs.invalidate(); utils.dashboard.stats.invalidate(); close(); }, onError: showMutationError }); const [mode, setMode] = useState<"upload" | "link">("upload"); const [file, setFile] = useState<File | null>(null);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const f = new FormData(event.currentTarget); const shared = { title: String(f.get("title")), author: String(f.get("author")), rating: f.get("rating") ? Number(f.get("rating")) : undefined }; if (mode === "link") { urlMutation.mutate({ ...shared, fileUrl: String(f.get("fileUrl")) }); return; } if (!file) { toast.error("Selecione um arquivo EPUB."); return; } if (file.size > 10 * 1024 * 1024) { toast.error("Para o envio pelo navegador, use um EPUB de até 10 MB."); return; } const reader = new FileReader(); reader.onload = () => uploadMutation.mutate({ ...shared, fileName: file.name, base64: String(reader.result) }); reader.onerror = () => toast.error("Não foi possível ler o arquivo."); reader.readAsDataURL(file); };
  return <form className="space-y-4" onSubmit={submit}><div className="flex rounded-xl bg-white/5 p-1"><button type="button" onClick={() => setMode("upload")} className={cn("flex-1 rounded-lg px-3 py-2 text-xs font-semibold", mode === "upload" ? "bg-cyan-300 text-slate-950" : "text-slate-400 hover:text-white")}>Enviar arquivo</button><button type="button" onClick={() => setMode("link")} className={cn("flex-1 rounded-lg px-3 py-2 text-xs font-semibold", mode === "link" ? "bg-cyan-300 text-slate-950" : "text-slate-400 hover:text-white")}>Usar link</button></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Título" required><Input name="title" required placeholder="Nome do livro" className="portal-input" /></Field><Field label="Autor" required><Input name="author" required placeholder="Nome do autor" className="portal-input" /></Field></div><Field label="Nota (0–10)"><Input name="rating" type="number" min="0" max="10" step="0.1" placeholder="8.0" className="portal-input" /></Field>{mode === "upload" ? <Field label="Arquivo EPUB" required hint="EPUB de até 10 MB pelo navegador. O arquivo é guardado no armazenamento do portal."><Input type="file" accept=".epub,application/epub+zip" onChange={event => setFile(event.target.files?.[0] ?? null)} className="portal-input file:mr-3 file:rounded-md file:border-0 file:bg-cyan-300/10 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-cyan-200" /></Field> : <Field label="Link do arquivo" required><Input name="fileUrl" type="url" required={mode === "link"} placeholder="https://.../arquivo.epub" className="portal-input" /></Field>}<SubmitRow close={close} pending={urlMutation.isPending || uploadMutation.isPending} label={mode === "upload" ? "Enviar EPUB" : "Salvar link"} /></form>;
}

function LinkForm({ close }: { close: () => void }) {
  const utils = trpc.useUtils(); const mutation = trpc.links.create.useMutation({ onSuccess: () => { toast.success("Link salvo."); utils.links.list.invalidate(); close(); }, onError: showMutationError });
  return <form className="space-y-4" onSubmit={event => { event.preventDefault(); const f = new FormData(event.currentTarget); mutation.mutate({ title: String(f.get("title")), url: String(f.get("url")), category: String(f.get("category")), description: String(f.get("description")) }); }}><div className="grid gap-4 sm:grid-cols-2"><Field label="Título" required><Input name="title" required placeholder="Canal do grupo" className="portal-input" /></Field><Field label="Categoria" required><Input name="category" required defaultValue="Geral" placeholder="Comunidade" className="portal-input" /></Field></div><Field label="URL" required><Input name="url" required type="url" placeholder="https://..." className="portal-input" /></Field><Field label="Descrição"><Textarea name="description" placeholder="Para que serve este link?" className="portal-input min-h-24" /></Field><SubmitRow close={close} pending={mutation.isPending} label="Salvar link" /></form>;
}

function SubmitRow({ close, pending, label }: { close: () => void; pending: boolean; label: string }) { return <div className="flex justify-end gap-3 border-t border-white/8 pt-5"><Button type="button" variant="ghost" onClick={close} className="text-slate-400 hover:bg-white/6 hover:text-white">Cancelar</Button><Button disabled={pending} type="submit" className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{pending ? "Salvando…" : label}</Button></div>; }

export default function CommunityPortal() {
  const [location, setLocation] = useLocation(); const { user, loading, isAuthenticated, logout } = useAuth();
  const [form, setForm] = useState<{ kind: FormKind; type?: ContentType; id?: number }>({ kind: null });
  const page = pageFromPath(location); const detailMatch = location.match(/^\/(jogos|livros)\/(\d+)/); const detailType: ContentType | null = detailMatch ? (detailMatch[1] === "jogos" ? "game" : "book") : null; const detailId = detailMatch ? Number(detailMatch[2]) : null;
  const canEdit = user?.role === "editor" || user?.role === "admin"; const isAdmin = user?.role === "admin";
  const go = (next: PageKey) => setLocation(pathFor(next)); const goDetail = (type: ContentType, id: number) => setLocation(`/${type === "game" ? "jogos" : "livros"}/${id}`);
  const requestForm = (kind: FormKind, type?: ContentType, id?: number) => { const requiresEditor = ["live", "game", "book", "epub", "link"].includes(kind ?? ""); if (!isAuthenticated) { toast.message("Entre na sua conta para contribuir."); startLogin(); return; } if (requiresEditor && !canEdit) { toast.error("Esta alteração exige o nível Editor ou Administrador."); return; } setForm({ kind, type, id }); };
  const formTitles: Record<Exclude<FormKind, null>, [string, string]> = { live: ["Iniciar uma live", "Cadastre a transmissão para ela aparecer no painel em ordem de abertura."], game: ["Adicionar jogo", "Crie a ficha base que o grupo vai avaliar."], book: ["Adicionar livro", "Inclua a próxima leitura na estante do grupo."], review: ["Registrar avaliação", "Os campos com asterisco compõem as médias do grupo."], comment: ["Novo comentário", "Deixe registrado o que você quer lembrar sobre essa experiência."], epub: ["Adicionar EPUB", "Envie um arquivo ou salve um link externo para a biblioteca."], link: ["Salvar link", "Organize os recursos que o grupo consulta sempre."] };
  const currentFormTitle = form.kind ? formTitles[form.kind] : null;
  return <div className="min-h-screen bg-[#070b16] text-slate-100"><div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute -left-28 top-20 size-96 rounded-full bg-indigo-600/10 blur-[120px]" /><div className="absolute right-0 top-1/2 size-80 rounded-full bg-cyan-500/8 blur-[110px]" /></div><header className="sticky top-0 z-30 border-b border-white/7 bg-[#070b16]/85 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6"><button onClick={() => go("home")} className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 text-slate-950 shadow-lg shadow-cyan-400/15"><Gamepad2 className="size-5" /></div><div className="hidden text-left sm:block"><p className="font-display text-sm font-semibold tracking-tight text-white">Comunidade Jogatina</p><p className="text-[10px] font-medium uppercase tracking-widest text-cyan-300">Painel do grupo</p></div></button><nav className="hidden items-center gap-1 lg:flex">{navigation.map(item => <NavButton key={item.id} item={item} active={page === item.id && !detailType} onClick={() => go(item.id)} />)}{isAdmin && <NavButton item={{ id: "admin", label: "Admin", icon: ShieldCheck }} active={page === "admin"} onClick={() => go("admin")} />}</nav><div className="flex items-center gap-2">{loading ? <div className="h-8 w-20 animate-pulse rounded-lg bg-white/5" /> : isAuthenticated ? <><div className="hidden text-right md:block"><p className="max-w-28 truncate text-xs font-semibold text-white">{user?.name || "Membro"}</p><p className="text-[10px] uppercase tracking-wider text-cyan-300">{user?.role === "user" ? "membro" : user?.role}</p></div><button onClick={logout} className="rounded-lg border border-white/10 px-2.5 py-2 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/6 hover:text-white">Sair</button></> : <Button size="sm" onClick={startLogin} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><LogIn className="mr-1.5 size-3.5" /> Entrar</Button>}</div></div><div className="border-t border-white/5 px-3 py-2 lg:hidden"><div className="flex gap-1 overflow-x-auto">{navigation.map(item => <NavButton key={item.id} item={item} active={page === item.id && !detailType} onClick={() => go(item.id)} />)}{isAdmin && <NavButton item={{ id: "admin", label: "Admin", icon: ShieldCheck }} active={page === "admin"} onClick={() => go("admin")} />}</div></div></header><main className="relative mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-12">{detailType && detailId ? <DetailPage type={detailType} id={detailId} goBack={() => go(detailType === "game" ? "games" : "books")} requestForm={requestForm} isAuthenticated={isAuthenticated} /> : page === "home" ? <HomePage go={go} openForm={requestForm} canEdit={canEdit} /> : page === "lives" ? <LivesPage openForm={requestForm} canEdit={canEdit} /> : page === "games" ? <CatalogPage type="game" goDetail={id => goDetail("game", id)} openForm={requestForm} canEdit={canEdit} /> : page === "books" ? <CatalogPage type="book" goDetail={id => goDetail("book", id)} openForm={requestForm} canEdit={canEdit} /> : page === "epubs" ? <EpubPage openForm={requestForm} canEdit={canEdit} /> : page === "links" ? <LinksPage openForm={requestForm} canEdit={canEdit} /> : isAdmin ? <AdminPage /> : <EmptyState icon={ShieldCheck} title="Área restrita" description="A administração está disponível apenas para administradores." />}</main><footer className="relative border-t border-white/7 px-4 py-8 text-center text-xs text-slate-500">Comunidade Jogatina · feito para registrar boas partidas e boas histórias.</footer><Dialog open={Boolean(form.kind)} onOpenChange={open => !open && setForm({ kind: null })}><DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#101728] text-white sm:max-w-xl"><DialogHeader><DialogTitle className="font-display text-2xl text-white">{currentFormTitle?.[0]}</DialogTitle><DialogDescription className="pr-6 leading-6 text-slate-400">{currentFormTitle?.[1]}</DialogDescription></DialogHeader><div className="pt-3">{form.kind === "live" && <LiveForm close={() => setForm({ kind: null })} />}{form.kind === "game" && <GameForm close={() => setForm({ kind: null })} />}{form.kind === "book" && <BookForm close={() => setForm({ kind: null })} />}{form.kind === "review" && form.type && form.id && <ReviewForm type={form.type} id={form.id} close={() => setForm({ kind: null })} />}{form.kind === "comment" && form.type && form.id && <CommentForm type={form.type} id={form.id} close={() => setForm({ kind: null })} />}{form.kind === "epub" && <EpubForm close={() => setForm({ kind: null })} />}{form.kind === "link" && <LinkForm close={() => setForm({ kind: null })} />}</div></DialogContent></Dialog></div>;
}

function NavButton({ item, active, onClick }: { item: { id: PageKey; label: string; icon: typeof LayoutGrid }; active: boolean; onClick: () => void }) { const Icon = item.icon; return <button onClick={onClick} className={cn("flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition", active ? "bg-cyan-300/10 text-cyan-200" : "text-slate-400 hover:bg-white/5 hover:text-white")}><Icon className="size-3.5" />{item.label}</button>; }
