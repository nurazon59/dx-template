import { desc, eq } from "drizzle-orm";
import { memories } from "../db/schema.js";
import type { Database } from "../lib/context.js";

export async function listAll(db: Database) {
  return db.select().from(memories).orderBy(desc(memories.createdAt));
}

export async function findById(db: Database, id: string) {
  const rows = await db.select().from(memories).where(eq(memories.id, id));
  return rows[0];
}

export async function insert(
  db: Database,
  input: { title: string; content: string; source: string; createdBy?: string },
) {
  const rows = await db.insert(memories).values(input).returning();
  return rows[0]!;
}

export async function update(
  db: Database,
  id: string,
  input: { title?: string; content?: string },
) {
  const rows = await db
    .update(memories)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(memories.id, id))
    .returning();
  return rows[0];
}

export async function remove(db: Database, id: string) {
  const rows = await db.delete(memories).where(eq(memories.id, id)).returning();
  return rows[0];
}
