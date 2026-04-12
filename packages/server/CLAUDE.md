# @dx-template/server

Hono v4 + Drizzle ORM + PostgreSQL の API サーバー

## レイヤー構造

```
routes/         # HTTP handler + OpenAPI schema（hono-openapi）
services/       # ビジネスロジック + AppError
repositories/   # DB 操作（Drizzle ORM / DynamoDB）
schemas/        # Zod 入力検証スキーマ
middleware/     # Hono middleware
  auth.ts       #   sessionMiddleware（セッション復元）+ requireAuth（認証必須）
  db.ts         #   PostgreSQL 接続
  dynamodb.ts   #   DynamoDB 接続
lib/            # ユーティリティ, エラー定義, S3, DynamoDB ヘルパー
db/             # Drizzle schema 定義 + 接続設定
```

## データフロー

```
リクエスト → middleware (auth, db, dynamodb) → routes → schemas(検証) → services → repositories → db
```

## 既存リソース

| routes                               | services | repositories                                 |
| ------------------------------------ | -------- | -------------------------------------------- |
| users, agent(conversations), uploads | users    | users, events(DynamoDB), agent-conversations |

## 認証

better-auth を使用。`sessionMiddleware` でセッション復元、`requireAuth` で認証必須エンドポイントを保護。

## DB スキーマ（主要テーブル）

- `users` — アプリユーザー
- `agent_conversations`, `agent_messages` — エージェントチャット履歴
- `user`, `session`, `account`, `verification` — better-auth 管理テーブル

## エラーハンドリング

```ts
throw new AppError("CODE", "message", statusCode);
```

## 新規ルート追加パターン

1. `schemas/` にリクエスト/レスポンス Zod スキーマ追加
2. `repositories/` に DB 操作追加
3. `services/` にビジネスロジック追加
4. `routes/` に Hono ルート追加（describeRoute + validator）
5. `routes/index.ts` でマウント

## テスト

- vitest（globals 有効）
- 各レイヤーに `.test.ts` を共存配置

## 開発コマンド

```sh
pnpm dev              # tsx watch
pnpm build            # tsc
pnpm test             # vitest run
pnpm generate:openapi # openapi.json 生成（クライアント型生成の元）
```
