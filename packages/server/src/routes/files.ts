import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import type { Env } from "../lib/context.js";
import { createFileUploadUrl, createFileDownloadUrl } from "../lib/s3.js";
import { requireAuth } from "../middleware/auth.js";
import { ErrorSchema } from "../schemas/error.js";
import {
  CreateFileUploadUrlInputSchema,
  FileUploadUrlSchema,
  FileDownloadUrlSchema,
} from "../schemas/file.js";
import * as filesRepo from "../repositories/files.js";

export const filesRoute = new Hono<Env>()
  .post(
    "/presign",
    describeRoute({
      tags: ["Files"],
      responses: {
        201: {
          description: "ファイルアップロード用の署名付き URL を発行",
          content: {
            "application/json": {
              schema: resolver(z.object({ upload: FileUploadUrlSchema })),
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
    validator("json", CreateFileUploadUrlInputSchema),
    async (c) => {
      const input = c.req.valid("json");
      const user = c.get("user")!;
      const upload = await createFileUploadUrl({
        userId: user.id,
        contentType: input.contentType,
      });
      await filesRepo.insert(c.var.db, {
        objectKey: upload.objectKey,
        userId: user.id,
        fileName: input.fileName,
        contentType: input.contentType,
        contentLength: input.contentLength,
      });

      return c.json({ upload }, 201);
    },
  )
  .get(
    "/:objectKey/download",
    describeRoute({
      tags: ["Files"],
      responses: {
        200: {
          description: "署名付きダウンロード URL を発行",
          content: {
            "application/json": {
              schema: resolver(z.object({ download: FileDownloadUrlSchema })),
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
          description: "ダウンロード URL 発行エラー",
          content: {
            "application/json": {
              schema: resolver(ErrorSchema),
            },
          },
        },
      },
    }),
    requireAuth,
    async (c) => {
      const objectKey = c.req.param("objectKey");
      const download = await createFileDownloadUrl(objectKey);
      return c.json({ download });
    },
  );
