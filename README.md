# dx-template

Web、API server、Slack bot、AWS infra をまとめた TypeScript モノレポ。

## セットアップ

Docker が必要。それ以外のツールは [mise](https://mise.jdx.dev/) が管理する。

```sh
mise trust
mise install
task setup
```

## 環境変数

`.env.local` の主な値（`task setup` で雛形が作成される）:

- `DATABASE_URL`
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN`
- `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL`
- `AI_PROVIDER` / `AI_MODEL` / API KEY
- `S3_UPLOAD_BUCKET` / `S3_PUBLIC_BASE_URL`

## 開発

```sh
task dev          # web / server / slack-bot を mprocs で並列起動
task dev:web      # web のみ
task dev:server   # server のみ
task dev:bot      # Slack bot のみ
task dev:local    # Slack token 不要の bot ローカルハーネス
```

品質チェック:

```sh
task lint
task fmt
task typecheck
task test
task build
```

DB / migration:

```sh
docker compose up -d postgres
task migrate:generate
task migrate:up
task migrate:push
task migrate:studio
```

OpenAPI / クライアント生成:

```sh
task api:generate
```

## プロジェクト構成

```text
packages/
  web/          # Vite + React
  server/       # Hono API server、Drizzle ORM、OpenAPI
  slack-bot/    # Slack Bolt bot、local dev harness
infra/
  terraform/    # AWS infra
  ecspresso/    # ECS deploy settings
```

## ドキュメント

- [Slack bot](docs/slack.md)
- [Infra / deploy](docs/infra.md)
