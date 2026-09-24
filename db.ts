import { count, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  auditLogs,
  books,
  comments,
  epubs,
  externalLinks,
  games,
  InsertUser,
  liveStreams,
  reviews,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  if (user.role || user.openId === ENV.ownerOpenId) updateSet.role = values.role;

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  return db;
}

export async function createAuditLog(actorId: number, action: string, entityType: string, entityId?: number, details?: string) {
  const db = await requireDb();
  await db.insert(auditLogs).values({ actorId, action, entityType, entityId, details });
}

export async function getDashboardStats() {
  const db = await requireDb();
  const [activeLives] = await db.select({ value: count() }).from(liveStreams).where(eq(liveStreams.isActive, true));
  const [gameCount] = await db.select({ value: count() }).from(games);
  const [bookCount] = await db.select({ value: count() }).from(books);
  const [epubCount] = await db.select({ value: count() }).from(epubs);
  return { activeLives: activeLives?.value ?? 0, games: gameCount?.value ?? 0, books: bookCount?.value ?? 0, epubs: epubCount?.value ?? 0 };
}

export async function getActiveLives() {
  const db = await requireDb();
  return db.select().from(liveStreams).where(eq(liveStreams.isActive, true)).orderBy(desc(liveStreams.startedAt));
}

export async function createLive(input: typeof liveStreams.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(liveStreams).values(input);
  return Number(result[0].insertId);
}

export async function endLive(id: number, actorId: number) {
  const db = await requireDb();
  await db.update(liveStreams).set({ isActive: false, endedAt: new Date() }).where(eq(liveStreams.id, id));
  await createAuditLog(actorId, "LIVE_ENCERRADA", "live", id);
}

export async function getGames() {
  const db = await requireDb();
  return db.select().from(games).orderBy(desc(games.createdAt));
}

export async function getBooks() {
  const db = await requireDb();
  return db.select().from(books).orderBy(desc(books.createdAt));
}

export async function getCatalogItem(type: "game" | "book", id: number) {
  const db = await requireDb();
  const table = type === "game" ? games : books;
  const item = await db.select().from(table).where(eq(table.id, id)).limit(1);
  if (!item[0]) return undefined;
  const itemReviews = await db.select().from(reviews).where(eq(reviews.itemId, id)).orderBy(desc(reviews.createdAt));
  const itemComments = await db.select().from(comments).where(eq(comments.itemId, id)).orderBy(desc(comments.createdAt));
  return { item: item[0], reviews: itemReviews.filter(review => review.itemType === type), comments: itemComments.filter(comment => comment.itemType === type) };
}

export async function createGame(input: typeof games.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(games).values(input);
  return Number(result[0].insertId);
}

export async function createBook(input: typeof books.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(books).values(input);
  return Number(result[0].insertId);
}

export async function createReview(input: typeof reviews.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(reviews).values(input);
  return Number(result[0].insertId);
}

export async function createComment(input: typeof comments.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(comments).values(input);
  return Number(result[0].insertId);
}

export async function getEpubs() {
  const db = await requireDb();
  return db.select().from(epubs).orderBy(desc(epubs.createdAt));
}

export async function createEpub(input: typeof epubs.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(epubs).values(input);
  return Number(result[0].insertId);
}

export async function getExternalLinks() {
  const db = await requireDb();
  return db.select().from(externalLinks).orderBy(desc(externalLinks.createdAt));
}

export async function createExternalLink(input: typeof externalLinks.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(externalLinks).values(input);
  return Number(result[0].insertId);
}

export async function getMembers() {
  const db = await requireDb();
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).orderBy(desc(users.lastSignedIn));
}

export async function updateMemberRole(id: number, role: "user" | "editor" | "admin", actorId: number) {
  const db = await requireDb();
  await db.update(users).set({ role }).where(eq(users.id, id));
  await createAuditLog(actorId, "PERMISSAO_ATUALIZADA", "usuario", id, role);
}

export async function getAuditLogs() {
  const db = await requireDb();
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(80);
}
