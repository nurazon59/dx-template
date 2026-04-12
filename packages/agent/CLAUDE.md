# @dx-template/agent

AI SDK v6 + @dx-template/workflow のエージェントパッケージ

## レイヤー構造

```
providers/   # LLM provider 切替（OpenAI, Google）
prompts/     # システムプロンプト定義
tools/       # Agent が呼び出すツール（triage, report-draft）
agents/      # agent 本体（agent.ts）+ mock 実装（mock.ts）
types.ts     # Zod スキーマ（AgentRunInput, AgentChatInput, AgentRunResult 等）
```

## 新規 Provider 追加

`providers/index.ts` の `getConfiguredModel()` に case を追加する。

## 新規 Tool 追加

```ts
// tools/new-tool.ts
export const newTool = (context: WorkflowContext, state) =>
  tool({
    description: "...",
    inputSchema: z.object({ ... }),
    execute: async (input) => {
      const result = await workflowRegistry.newWorkflow.run(input, context);
      state.toolTrace.push(...);
      return result;
    },
  });
```

## テスト

- vitest、`.test.ts` サフィックス
- モック実装（`agents/mock.ts`）を使えば API key なしでテスト可能

## 開発コマンド

```sh
pnpm build      # tsc
pnpm typecheck  # tsc --noEmit
pnpm test       # vitest run
```
