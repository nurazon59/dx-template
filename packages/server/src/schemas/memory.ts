import { z } from "zod";

export const MemorySchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    content: z.string(),
    createdBy: z.string().nullable(),
    source: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .meta({ ref: "Memory" });

export const CreateMemoryInputSchema = z
  .object({
    title: z.string().min(1).max(255),
    content: z.string().min(1),
    source: z.enum(["web", "slack", "agent"]),
  })
  .meta({ ref: "CreateMemoryInput" });

export const UpdateMemoryInputSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    content: z.string().min(1).optional(),
  })
  .meta({ ref: "UpdateMemoryInput" });
