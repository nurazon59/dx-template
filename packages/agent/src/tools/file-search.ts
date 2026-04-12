import { tool } from "ai";
import { z } from "zod";
import type { WorkflowContext } from "@dx-template/workflow";
import type { AgentToolTrace } from "../types.js";

export const fileSearchTool = (context: WorkflowContext, state: { toolTrace: AgentToolTrace[] }) =>
  tool({
    description:
      "ユーザーがアップロード済みのファイルをファイル名やコンテンツタイプで検索する。ファイルの存在確認や、後続のパース・分析の前にobjectKeyを取得するために使う",
    inputSchema: z.object({
      query: z.string().optional().describe("ファイル名の部分一致検索キーワード"),
      contentType: z.string().optional().describe("MIMEタイプでフィルタ（例: application/pdf）"),
    }),
    execute: async ({ query, contentType }) => {
      if (!context.queries.searchFiles || !context.userId) {
        return { files: [], message: "ファイル検索機能が利用できません" };
      }
      const files = await context.queries.searchFiles({
        query,
        contentType,
        userId: context.userId,
      });
      state.toolTrace.push({
        toolName: "searchFiles",
        workflow: "fileSearch",
        input: { query, contentType },
        output: { count: files.length },
      });
      return { files, count: files.length };
    },
  });
