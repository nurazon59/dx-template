# @dx-template/web

SPA フロントエンド（React 19 + Vite + Chakra UI v3 + TanStack Router）

## 構成

- エントリポイント: `src/main.tsx`
- ルーティング: TanStack Router（file-based、`src/routes/`）
- API クライアント: Hono RPC（`src/lib/api.ts`）、パスは `client.api.*` でアクセス
- データフェッチ: TanStack Query v5（Suspense ベース）

## データフェッチ規約

- `src/features/<domain>/api/` に 1 ファイル 1 フック
- 読み取り: `useSuspenseQuery`、書き込み: `useMutation`
- queryKey は各フック内で定義（汎用ラッパーは作らない）
- QueryClient シングルトン: `src/lib/query-client.ts`

## 開発コマンド

```sh
pnpm dev        # Vite dev server
pnpm build      # Vite build
pnpm typecheck  # tsc --noEmit
pnpm test       # vitest run
```

## 規約

- ESM (`"type": "module"`)
- フォーム: react-hook-form + zod
- 認証: better-auth（サーバー側で処理、クライアントは `/api/auth/**` 経由）
