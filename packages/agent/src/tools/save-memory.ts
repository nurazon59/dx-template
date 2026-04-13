import { tool } from "ai";
import { z } from "zod";
import type { AgentToolTrace } from "../types.js";

export type SaveMemoryFn = (input: { title: string; content: string }) => Promise<{ id: string }>;

export const saveMemoryTool = (saveMemory: SaveMemoryFn, state: { toolTrace: AgentToolTrace[] }) =>
  tool({
    description:
      "ユーザーが「覚えておいて」「メモして」と言った情報をチームメモリとして保存する。保存した情報は次回以降の応答時にシステムプロンプトに含まれる",
    inputSchema: z.object({
      title: z.string().min(1).describe("メモリのタイトル（簡潔に）"),
      content: z.string().min(1).describe("メモリの本文"),
    }),
    execute: async ({ title, content }) => {
      const result = await saveMemory({ title, content });
      state.toolTrace.push({
        toolName: "saveMemory",
        workflow: "saveMemory",
        input: { title, content },
        output: result,
      });
      return { success: true, id: result.id, message: `「${title}」をメモリに保存しました` };
    },
  });
