import { and, desc, gte, lte, sql, count as drizzleCount } from "drizzle-orm";
import { agentRuns } from "../db/schema.js";
import type { Database } from "../lib/context.js";

export async function insert(db: Database, data: typeof agentRuns.$inferInsert) {
  const [row] = await db.insert(agentRuns).values(data).returning();
  return row!;
}

export async function listRecent(db: Database, opts: { limit?: number; offset?: number } = {}) {
  const { limit = 20, offset = 0 } = opts;
  return db
    .select()
    .from(agentRuns)
    .orderBy(desc(agentRuns.finishedAt))
    .limit(limit)
    .offset(offset);
}

export async function getSummary(db: Database, opts: { from?: Date; to?: Date } = {}) {
  const conditions = buildDateConditions(opts);
  const [row] = await db
    .select({
      totalRuns: drizzleCount(),
      totalInputTokens: sql<number>`coalesce(sum(${agentRuns.inputTokens}), 0)`,
      totalOutputTokens: sql<number>`coalesce(sum(${agentRuns.outputTokens}), 0)`,
      totalTokens: sql<number>`coalesce(sum(${agentRuns.totalTokens}), 0)`,
      avgDurationMs: sql<number>`coalesce(avg(${agentRuns.durationMs}), 0)`,
      errorCount: sql<number>`coalesce(sum(case when ${agentRuns.isError} then 1 else 0 end), 0)`,
    })
    .from(agentRuns)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  return row!;
}

export async function getToolUsage(db: Database, opts: { from?: Date; to?: Date } = {}) {
  const conditions = buildDateConditions(opts);
  const rows = await db.execute(sql`
    SELECT elem->>'toolName' AS tool_name, COUNT(*)::int AS usage_count
    FROM agent_runs, jsonb_array_elements(tool_trace) AS elem
    ${conditions.length > 0 ? sql`WHERE ${and(...conditions)}` : sql``}
    GROUP BY elem->>'toolName'
    ORDER BY usage_count DESC
  `);
  return rows as unknown as { tool_name: string; usage_count: number }[];
}

export async function getDailyStats(db: Database, opts: { from?: Date; to?: Date } = {}) {
  const conditions = buildDateConditions(opts);
  return db
    .select({
      date: sql<string>`date(${agentRuns.finishedAt})`,
      runs: drizzleCount(),
      totalTokens: sql<number>`coalesce(sum(${agentRuns.totalTokens}), 0)`,
      errorCount: sql<number>`coalesce(sum(case when ${agentRuns.isError} then 1 else 0 end), 0)`,
    })
    .from(agentRuns)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(sql`date(${agentRuns.finishedAt})`)
    .orderBy(sql`date(${agentRuns.finishedAt})`);
}

function buildDateConditions(opts: { from?: Date; to?: Date }) {
  const conditions = [];
  if (opts.from) conditions.push(gte(agentRuns.finishedAt, opts.from));
  if (opts.to) conditions.push(lte(agentRuns.finishedAt, opts.to));
  return conditions;
}
