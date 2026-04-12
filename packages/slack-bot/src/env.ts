import { z } from "zod/v4";

const envSchema = z.object({
  SLACK_BOT_TOKEN: z.string(),
  SLACK_APP_TOKEN: z.string(),
  SERVER_URL: z.url().default("http://localhost:3000"),
});

export const env = envSchema.parse(process.env);
