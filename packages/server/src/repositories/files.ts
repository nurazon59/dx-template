import { files } from "../db/schema.js";
import type { Database } from "../lib/context.js";

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
