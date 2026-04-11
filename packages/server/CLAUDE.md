# @dx-template/server

API サーバーパッケージ（Hono v4 + Drizzle ORM + PostgreSQL）

## 構成

- エントリポイント: `src/index.ts`、アプリ定義: `src/app.ts`
- ルーティング: `src/routes/`
- DB接続: `src/db/index.ts`、スキーマ: `src/db/schema.ts`

## 開発コマンド

```sh
pnpm dev      # tsx watch で起動
pnpm build    # tsc
pnpm test     # vitest run
```

## 規約

- ESM (`"type": "module"`)
- ルート追加時は `src/routes/` の既存パターンに従う
- テストは vitest（globals 有効）、ルートごとに必ず書く
