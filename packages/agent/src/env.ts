import { z } from "zod/v4";

const envSchema = z.object({
  AI_PROVIDER: z.enum(["openai", "google"]).default("openai"),
  AI_MODEL: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
