import { z } from "zod";

export const AgentMessageSchema = z
  .object({
    id: z.string(),
    role: z.enum(["system", "user", "assistant"]),
    parts: z.array(z.object({ type: z.string() }).passthrough()),
    createdAt: z.string().datetime(),
  })
  .meta({ ref: "AgentMessage" });

export const AgentConversationSummarySchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    lastMessageAt: z.string().datetime(),
  })
  .meta({ ref: "AgentConversationSummary" });

export const AgentConversationSchema = AgentConversationSummarySchema.extend({
  messages: z.array(AgentMessageSchema),
}).meta({ ref: "AgentConversation" });
