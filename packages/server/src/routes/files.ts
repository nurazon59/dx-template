import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import type { Env } from "../lib/context.js";
import { AppError } from "../lib/errors.js";
import { createFileUploadUrl, createFileDownloadUrl, deleteFile } from "../lib/s3.js";
import { requireAuth } from "../middleware/auth.js";
import { ErrorSchema } from "../schemas/error.js";
import {
  CreateFileUploadUrlInputSchema,
  FileUploadUrlSchema,
  FileDownloadUrlSchema,
  FileSchema,
} from "../schemas/file.js";
import * as filesRepo from "../repositories/files.js";

export const filesRoute = new Hono<Env>()
  .get(
    "/",
    describeRoute({
      tags: ["Files"],
      responses: {
        200: {
          description: "ユーザーのファイル一覧",
          content: {
            "application/json": {
              schema: resolver(z.object({ files: z.array(FileSchema) })),
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
      },
    }),
    requireAuth,
    async (c) => {
      const user = c.get("user")!;
      const rows = await filesRepo.listByUserId(c.var.db, user.id);
      const files = rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      }));
      return c.json({ files });
    },
  )
  .delete(
    "/:objectKey",
    describeRoute({
      tags: ["Files"],
      responses: {
        200: {
          description: "ファイル削除成功",
          content: {
            "application/json": {
              schema: resolver(z.object({ success: z.literal(true) })),
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
        404: {
          description: "ファイルが存在しない",
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
      const user = c.get("user")!;
      const objectKey = decodeURIComponent(c.req.param("objectKey"));
      const target = await filesRepo.findByObjectKey(c.var.db, objectKey, user.id);
      if (!target) {
        throw new AppError("FILE_NOT_FOUND", "File not found", 404);
      }
      // S3を先に削除: 失敗してもDBレコードが残るためリトライ可能
      await deleteFile(objectKey);
      await filesRepo.deleteByObjectKey(c.var.db, objectKey, user.id);
      return c.json({ success: true as const });
    },
  )
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
