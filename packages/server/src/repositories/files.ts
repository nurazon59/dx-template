import { desc, and, eq, ilike } from "drizzle-orm";
import { files } from "../db/schema.js";
import type { Database } from "../lib/context.js";

export async function listByUserId(db: Database, userId: string) {
  return db.select().from(files).where(eq(files.userId, userId)).orderBy(desc(files.createdAt));
}

export async function findByObjectKey(db: Database, objectKey: string, userId: string) {
  const rows = await db
    .select()
    .from(files)
    .where(and(eq(files.objectKey, objectKey), eq(files.userId, userId)));
  return rows[0];
}

export async function deleteByObjectKey(db: Database, objectKey: string, userId: string) {
  const rows = await db
    .delete(files)
    .where(and(eq(files.objectKey, objectKey), eq(files.userId, userId)))
    .returning();
  return rows[0];
}

export async function search(
  db: Database,
  params: { query?: string; contentType?: string; userId: string },
) {
  const conditions = [eq(files.userId, params.userId)];
  if (params.query) {
    conditions.push(ilike(files.fileName, `%${params.query}%`));
  }
  if (params.contentType) {
    conditions.push(eq(files.contentType, params.contentType));
  }
  return db
    .select()
    .from(files)
    .where(and(...conditions))
    .orderBy(desc(files.createdAt));
}

export async function insert(
  db: Database,
  input: {
    objectKey: string;
    userId: string;
    fileName: string;
    contentType: string;
    contentLength: number;
  },
) {
  const rows = await db.insert(files).values(input).returning();
  return rows[0]!;
}
