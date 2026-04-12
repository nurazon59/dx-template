import { and, asc, desc, eq } from "drizzle-orm";
import { agentConversations, agentMessages } from "../db/schema.js";
import type { Database } from "../lib/context.js";

export interface AgentUiMessagePart {
  type: string;
  [key: string]: unknown;
}

export interface AgentUiMessage {
  id: string;
  role: "system" | "user" | "assistant";
  parts: AgentUiMessagePart[];
}

export interface AgentConversationSummary {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
}

export interface AgentMessageRecord {
  id: string;
  role: AgentUiMessage["role"];
  parts: AgentUiMessage["parts"];
  createdAt: Date;
}

export interface AgentConversation extends AgentConversationSummary {
  messages: AgentMessageRecord[];
}

function getConversationTitle(messages: AgentUiMessage[]): string {
  const text = messages
    .find((message) => message.role === "user")
    ?.parts.filter((part): part is AgentUiMessagePart & { type: "text"; text: string } => {
      return part.type === "text" && typeof part["text"] === "string";
    })
    .map((part) => part.text)
    .join(" ")
    .trim();

  if (!text) {
    return "新しい会話";
  }

  return text.length > 48 ? `${text.slice(0, 48)}...` : text;
}

export function listConversations(db: Database, userId: string) {
  return db
    .select({
      id: agentConversations.id,
      title: agentConversations.title,
      createdAt: agentConversations.createdAt,
      updatedAt: agentConversations.updatedAt,
      lastMessageAt: agentConversations.lastMessageAt,
    })
    .from(agentConversations)
    .where(eq(agentConversations.userId, userId))
    .orderBy(desc(agentConversations.lastMessageAt));
}

export async function findConversation(
  db: Database,
  input: { conversationId: string; userId: string },
): Promise<AgentConversation | undefined> {
  const rows = await db
    .select({
      id: agentConversations.id,
      title: agentConversations.title,
      createdAt: agentConversations.createdAt,
      updatedAt: agentConversations.updatedAt,
      lastMessageAt: agentConversations.lastMessageAt,
      messageId: agentMessages.id,
      role: agentMessages.role,
      parts: agentMessages.parts,
      messageCreatedAt: agentMessages.createdAt,
    })
    .from(agentConversations)
    .leftJoin(agentMessages, eq(agentConversations.id, agentMessages.conversationId))
    .where(
      and(
        eq(agentConversations.id, input.conversationId),
        eq(agentConversations.userId, input.userId),
      ),
    )
    .orderBy(asc(agentMessages.position));

  const first = rows.at(0);
  if (!first) {
    return undefined;
  }

  return {
    id: first.id,
    title: first.title,
    createdAt: first.createdAt,
    updatedAt: first.updatedAt,
    lastMessageAt: first.lastMessageAt,
    messages: rows.flatMap((row) => {
      if (!row.messageId || !row.role || !row.messageCreatedAt) {
        return [];
      }
      return [
        {
          id: row.messageId,
          role: row.role as AgentUiMessage["role"],
          parts: row.parts as AgentUiMessage["parts"],
          createdAt: row.messageCreatedAt,
        },
      ];
    }),
  };
}

export async function ensureConversation(
  db: Database,
  input: { conversationId: string; userId: string; messages: AgentUiMessage[] },
) {
  await db
    .insert(agentConversations)
    .values({
      id: input.conversationId,
      userId: input.userId,
      title: getConversationTitle(input.messages),
    })
    .onConflictDoNothing();

  return findConversation(db, input);
}

export async function replaceConversationMessages(
  db: Database,
  input: { conversationId: string; userId: string; messages: AgentUiMessage[] },
) {
  const now = new Date();
  const title = getConversationTitle(input.messages);

  return db.transaction(async (tx) => {
    const conversation = await findConversation(tx, input);
    if (!conversation) {
      return undefined;
    }

    await tx
      .update(agentConversations)
      .set({
        title: conversation.title || title,
        updatedAt: now,
        lastMessageAt: now,
      })
      .where(
        and(
          eq(agentConversations.id, input.conversationId),
          eq(agentConversations.userId, input.userId),
        ),
      );

    await tx.delete(agentMessages).where(eq(agentMessages.conversationId, input.conversationId));

    if (input.messages.length > 0) {
      await tx.insert(agentMessages).values(
        input.messages.map((message, index) => ({
          id: message.id,
          conversationId: input.conversationId,
          role: message.role,
          parts: message.parts,
          position: index,
          createdAt: now,
        })),
      );
    }

    return findConversation(tx, input);
  });
}
