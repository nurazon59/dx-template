# @dx-template/web

SPA フロントエンド（React 19 + Vite + Chakra UI v3 + TanStack Router）

## 構成

- エントリポイント: `src/main.tsx`
- ルーティング: TanStack Router（file-based、`src/routes/`）
- API クライアント: Orval 生成 React Query hooks（`src/lib/api/generated.ts`）
- データフェッチ: TanStack Query v5（Suspense ベース、Orval 生成 hooks を利用）

## データフェッチ規約

- 読み取り: Orval 生成の Suspense hook、書き込み: Orval 生成の mutation hook
- 読み取りは route loader ではなく、画面コンポーネント内で `use*Suspense` hook を直接使う
- `beforeLoad` は認証チェックや redirect など、route 遷移前の制御に限定する
- queryKey は Orval 生成の `get*QueryKey` / `get*QueryOptions` を利用
- 手書き hook は、返り値整形や invalidate などのドメイン固有処理が必要な場合だけ追加
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
