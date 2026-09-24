import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { storagePut } from "./storage";

const editorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "editor" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Esta ação exige o nível Editor ou Administrador." });
  }
  return next({ ctx });
});

const itemInput = z.object({ type: z.enum(["game", "book"]), id: z.number().int().positive() });
const optionalUrl = z.string().url().optional().or(z.literal(""));

function auditDetails(values: Record<string, unknown>) {
  return JSON.stringify(values);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  dashboard: router({
    stats: publicProcedure.query(() => db.getDashboardStats()),
  }),

  lives: router({
    listActive: publicProcedure.query(() => db.getActiveLives()),
    create: editorProcedure
      .input(z.object({
        title: z.string().trim().min(3).max(160),
        streamerName: z.string().trim().min(2).max(120),
        platform: z.enum(["youtube", "twitch", "kick"]),
        streamUrl: z.string().url(),
        embedUrl: z.string().url().optional().or(z.literal("")),
        layoutGroup: z.string().trim().max(48).optional().or(z.literal("")),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createLive({ ...input, embedUrl: input.embedUrl || null, layoutGroup: input.layoutGroup || null, createdBy: ctx.user.id });
        await db.createAuditLog(ctx.user.id, "LIVE_INICIADA", "live", id, auditDetails({ title: input.title, platform: input.platform }));
        return { id };
      }),
    end: editorProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => db.endLive(input.id, ctx.user.id)),
  }),

  catalog: router({
    games: publicProcedure.query(() => db.getGames()),
    books: publicProcedure.query(() => db.getBooks()),
    detail: publicProcedure.input(itemInput).query(({ input }) => db.getCatalogItem(input.type, input.id)),
    createGame: editorProcedure
      .input(z.object({
        title: z.string().trim().min(2).max(180),
        coverUrl: optionalUrl,
        criticScore: z.number().min(0).max(10).optional(),
        preferredPlatform: z.enum(["xbox", "playstation", "nintendo", "pc", "multi"]),
        releaseYear: z.number().int().min(1970).max(2100).optional(),
        description: z.string().trim().max(5000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createGame({
          ...input,
          coverUrl: input.coverUrl || null,
          criticScore: input.criticScore === undefined ? null : input.criticScore.toFixed(1),
          description: input.description || null,
          createdBy: ctx.user.id,
        });
        await db.createAuditLog(ctx.user.id, "JOGO_CRIADO", "game", id, auditDetails({ title: input.title }));
        return { id };
      }),
    createBook: editorProcedure
      .input(z.object({
        title: z.string().trim().min(2).max(180),
        author: z.string().trim().min(2).max(180),
        coverUrl: optionalUrl,
        isbn: z.string().trim().max(32).optional(),
        criticScore: z.number().min(0).max(10).optional(),
        description: z.string().trim().max(5000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createBook({
          ...input,
          coverUrl: input.coverUrl || null,
          isbn: input.isbn || null,
          criticScore: input.criticScore === undefined ? null : input.criticScore.toFixed(1),
          description: input.description || null,
          createdBy: ctx.user.id,
        });
        await db.createAuditLog(ctx.user.id, "LIVRO_CRIADO", "book", id, auditDetails({ title: input.title }));
        return { id };
      }),
    addReview: protectedProcedure
      .input(itemInput.extend({
        rating: z.number().min(0).max(10),
        personName: z.string().trim().min(2).max(120),
        timeSpent: z.number().int().min(0).max(100000),
        progress: z.number().int().min(0).max(100),
        notes: z.string().trim().max(5000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createReview({
          itemType: input.type,
          itemId: input.id,
          rating: input.rating.toFixed(1),
          personName: input.personName,
          timeSpent: input.timeSpent,
          progress: input.progress,
          notes: input.notes || null,
          createdBy: ctx.user.id,
        });
        await db.createAuditLog(ctx.user.id, "AVALIACAO_CRIADA", input.type, input.id, auditDetails({ reviewId: id }));
        return { id };
      }),
    addComment: protectedProcedure
      .input(itemInput.extend({ body: z.string().trim().min(2).max(5000), authorName: z.string().trim().min(2).max(120) }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createComment({ itemType: input.type, itemId: input.id, body: input.body, authorName: input.authorName, createdBy: ctx.user.id });
        await db.createAuditLog(ctx.user.id, "COMENTARIO_CRIADO", input.type, input.id, auditDetails({ commentId: id }));
        return { id };
      }),
  }),

  library: router({
    epubs: publicProcedure.query(() => db.getEpubs()),
    addFromUrl: editorProcedure
      .input(z.object({ title: z.string().trim().min(2).max(180), author: z.string().trim().min(2).max(180), rating: z.number().min(0).max(10).optional(), fileUrl: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createEpub({ ...input, rating: input.rating === undefined ? null : input.rating.toFixed(1), createdBy: ctx.user.id });
        await db.createAuditLog(ctx.user.id, "EPUB_ADICIONADO", "epub", id, auditDetails({ title: input.title, source: "url" }));
        return { id };
      }),
    uploadEpub: editorProcedure
      .input(z.object({ title: z.string().trim().min(2).max(180), author: z.string().trim().min(2).max(180), rating: z.number().min(0).max(10).optional(), fileName: z.string().trim().min(5).max(220), base64: z.string().min(20) }))
      .mutation(async ({ ctx, input }) => {
        const matched = input.base64.match(/^data:([^;]+);base64,(.+)$/);
        if (!matched) throw new TRPCError({ code: "BAD_REQUEST", message: "Arquivo inválido. Envie um EPUB em formato base64." });
        const contentType = matched[1];
        const bytes = Buffer.from(matched[2], "base64");
        if (bytes.byteLength > 15 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "O EPUB deve ter no máximo 15 MB." });
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
        const stored = await storagePut(`epubs/${ctx.user.id}/${safeName}`, bytes, contentType || "application/epub+zip");
        const id = await db.createEpub({ title: input.title, author: input.author, rating: input.rating === undefined ? null : input.rating.toFixed(1), fileUrl: stored.url, storageKey: stored.key, createdBy: ctx.user.id });
        await db.createAuditLog(ctx.user.id, "EPUB_ENVIADO", "epub", id, auditDetails({ title: input.title, key: stored.key }));
        return { id, url: stored.url };
      }),
  }),

  links: router({
    list: publicProcedure.query(() => db.getExternalLinks()),
    create: editorProcedure
      .input(z.object({ title: z.string().trim().min(2).max(180), url: z.string().url(), description: z.string().trim().max(1000).optional(), category: z.string().trim().min(2).max(72) }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createExternalLink({ ...input, description: input.description || null, createdBy: ctx.user.id });
        await db.createAuditLog(ctx.user.id, "LINK_CRIADO", "link", id, auditDetails({ title: input.title }));
        return { id };
      }),
  }),

  admin: router({
    members: adminProcedure.query(() => db.getMembers()),
    audit: adminProcedure.query(() => db.getAuditLogs()),
    updateRole: adminProcedure.input(z.object({ id: z.number().int().positive(), role: z.enum(["user", "editor", "admin"]) })).mutation(({ ctx, input }) => db.updateMemberRole(input.id, input.role, ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
