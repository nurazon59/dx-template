import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import type { Env } from "../lib/context.js";
import { AppError } from "../lib/errors.js";
import { requireAuth } from "../middleware/auth.js";
import { ErrorSchema } from "../schemas/error.js";
import {
  MemorySchema,
  CreateMemoryInputSchema,
  UpdateMemoryInputSchema,
} from "../schemas/memory.js";
import * as memoriesRepo from "../repositories/memories.js";

export const memoriesRoute = new Hono<Env>()
  .get(
    "/",
    describeRoute({
      tags: ["Memories"],
      responses: {
        200: {
          description: "メモリ一覧",
          content: {
            "application/json": {
              schema: resolver(z.object({ memories: z.array(MemorySchema) })),
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
      const rows = await memoriesRepo.listAll(c.var.db);
      const memories = rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }));
      return c.json({ memories });
    },
  )
  .get(
    "/:id",
    describeRoute({
      tags: ["Memories"],
      responses: {
        200: {
          description: "メモリ詳細",
          content: {
            "application/json": {
              schema: resolver(z.object({ memory: MemorySchema })),
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
          description: "メモリが見つからない",
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
      const { id } = c.req.param();
      const row = await memoriesRepo.findById(c.var.db, id);
      if (!row) {
        throw new AppError("MEMORY_NOT_FOUND", "Memory not found", 404);
      }
      return c.json({
        memory: {
          ...row,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        },
      });
    },
  )
  .post(
    "/",
    describeRoute({
      tags: ["Memories"],
      responses: {
        201: {
          description: "メモリ作成成功",
          content: {
            "application/json": {
              schema: resolver(z.object({ memory: MemorySchema })),
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
      },
    }),
    requireAuth,
    validator("json", CreateMemoryInputSchema),
    async (c) => {
      const input = c.req.valid("json");
      const user = c.get("user")!;
      const row = await memoriesRepo.insert(c.var.db, {
        ...input,
        createdBy: user.id,
      });
      return c.json(
        {
          memory: {
            ...row,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
          },
        },
        201,
      );
    },
  )
  .put(
    "/:id",
    describeRoute({
      tags: ["Memories"],
      responses: {
        200: {
          description: "メモリ更新成功",
          content: {
            "application/json": {
              schema: resolver(z.object({ memory: MemorySchema })),
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
        404: {
          description: "メモリが見つからない",
          content: {
            "application/json": {
              schema: resolver(ErrorSchema),
            },
          },
        },
      },
    }),
    requireAuth,
    validator("json", UpdateMemoryInputSchema),
    async (c) => {
      const { id } = c.req.param();
      const input = c.req.valid("json");
      const row = await memoriesRepo.update(c.var.db, id, input);
      if (!row) {
        throw new AppError("MEMORY_NOT_FOUND", "Memory not found", 404);
      }
      return c.json({
        memory: {
          ...row,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        },
      });
    },
  )
  .delete(
    "/:id",
    describeRoute({
      tags: ["Memories"],
      responses: {
        200: {
          description: "メモリ削除成功",
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
          description: "メモリが見つからない",
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
      const { id } = c.req.param();
      const row = await memoriesRepo.remove(c.var.db, id);
      if (!row) {
        throw new AppError("MEMORY_NOT_FOUND", "Memory not found", 404);
      }
      return c.json({ success: true as const });
    },
  );
