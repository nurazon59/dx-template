import { z } from "zod/v4";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  PORT: z.coerce.number().default(3000),
  TRUSTED_ORIGINS: z
    .string()
    .optional()
    .transform(
      (v) =>
        v
          ?.split(",")
          .map((s) => s.trim())
          .filter(Boolean) ?? [],
    ),
  BETTER_AUTH_URL: z.string().optional(),
  AWS_REGION: z.string().default("ap-northeast-1"),
  S3_ENDPOINT: z.string().optional(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  S3_UPLOAD_BUCKET: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  DYNAMODB_TABLE_NAME: z.string().default(""),
  DYNAMODB_ENDPOINT: z.string().optional(),
});

export const env = envSchema.parse(process.env);
