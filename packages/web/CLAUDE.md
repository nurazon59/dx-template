# @dx-template/web

React 19 + Vite + Chakra UI v3 + TanStack Router の SPA フロントエンド

## レイヤー構造

```
routes/                # TanStack Router file-based routing（フラットドット区切り）
  __root.tsx           #   ルートレイアウト
  _authenticated.tsx   #   認証済みレイアウト
  _authenticated.*.tsx #   認証済み各ページ
  login.tsx, signup.tsx
features/              # ドメイン機能ごとのコンポーネント群
  agent/components/    #   ChatWorkspace, ChatMessageBubble, ConversationSidebar
lib/
  api/generated.ts     # Orval 自動生成（API クライアント + React Query hooks）
  auth.ts              # better-auth クライアント
  query-client.ts      # TanStack Query シングルトン
  agent-conversations.ts # エージェント会話 API ヘルパー
  uploads.ts           # アップロード関連ユーティリティ
```

## ルーティング規約

TanStack Router のフラットファイル形式を使用：

- `_authenticated.users.tsx` — `/users` ページ（認証必須）
- `_authenticated.agents.tsx` — `/agents` ページ（認証必須）

## 新規ページ追加パターン

```tsx
// src/routes/_authenticated.tasks.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const { data } = useGetApiTasksSuspense();
  // ...
}
```

認証チェックは `_authenticated.tsx` レイアウトで一括処理済み。各ページでの `beforeLoad` は不要。

## データフェッチ

| 操作     | 方法                                                |
| -------- | --------------------------------------------------- |
| 読み取り | `useGetApi*Suspense()` — Orval 生成の Suspense hook |
| 書き込み | Orval 生成の mutation hook                          |
| queryKey | `get*QueryKey()` / `get*QueryOptions()` を利用      |

## AI チャット機能

`@ai-sdk/react` の `useChat` + `nuqs` でクエリパラメータ管理（provider, model, conversationId）。
UI コンポーネントは `features/agent/components/` に配置。

## 開発コマンド

```sh
pnpm dev           # Vite dev server
pnpm build         # Vite build
pnpm typecheck     # tsc --noEmit
pnpm test          # vitest run
pnpm generate:api  # Orval（server の openapi.json から生成）
```
