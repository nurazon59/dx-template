import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import type { Env } from "../lib/context.js";
import { createImageUploadUrl } from "../lib/s3.js";
import { requireAuth } from "../middleware/auth.js";
import { ErrorSchema } from "../schemas/error.js";
import { CreateImageUploadUrlInputSchema, ImageUploadUrlSchema } from "../schemas/upload.js";

export const uploadsRoute = new Hono<Env>().post(
  "/images/presign",
  describeRoute({
    tags: ["Uploads"],
    responses: {
      201: {
        description: "画像アップロード用の署名付き URL を発行",
        content: {
          "application/json": {
            schema: resolver(z.object({ upload: ImageUploadUrlSchema })),
          },
        },
      },
      400: {
        description: "入力値が不正",
        content: {
          "application/json": {
            schema: resolver(ErrorSchema),
          },
        },
      },
      401: {
        description: "未認証",
        content: {
          "application/json": {
            schema: resolver(ErrorSchema),
          },
        },
      },
      500: {
        description: "アップロード storage 設定不備",
        content: {
          "application/json": {
            schema: resolver(ErrorSchema),
          },
        },
      },
    },
  }),
  requireAuth,
  validator("json", CreateImageUploadUrlInputSchema),
  async (c) => {
    const input = c.req.valid("json");
    const user = c.get("user")!;
    const upload = await createImageUploadUrl({
      userId: user.id,
      contentType: input.contentType,
    });

    return c.json({ upload }, 201);
  },
);
