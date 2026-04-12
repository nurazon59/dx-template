# dx-template

Web、API server、Slack bot、AWS infra をまとめた TypeScript モノレポ。

## 必要なもの

- [mise](https://mise.jdx.dev/) (Node.js 22、pnpm、go-task、mprocs、lefthook を管理)
- Docker / Docker Compose (PostgreSQL やコンテナ実行で使用)
- Slack App (Slack bot を動かす場合)
- AWS CLI / Terraform (infra を行う場合)

## セットアップ

```sh
mise install
task setup
```

`task setup` は `pnpm install`、`.env.local` の作成、`lefthook install` を実行する。

`.env.local` の主な値:

```sh
DATABASE_URL=postgresql://dx:dx@localhost:5432/dx_template
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
BETTER_AUTH_SECRET=your-secret-key-generate-with-openssl-rand-base64-32
BETTER_AUTH_URL=http://localhost:3000
S3_UPLOAD_BUCKET=dx-template-uploads
S3_PUBLIC_BASE_URL=https://cdn.example.com
# S3_ENDPOINT=http://localhost:9000
# S3_FORCE_PATH_STYLE=true
```

## コマンド方針

開発時の入口は `task` に寄せている。`package.json` の scripts は、各 package 内で完結する実体コマンドとして扱う。

- ディレクトリを跨ぐ処理: root `Taskfile.yml`
- package 内の処理: `packages/*/package.json`
- package ごとの task alias: `packages/*/Taskfile.yml`

## 開発

```sh
task dev          # web / server / slack-bot を mprocs で並列起動
task dev:web      # web のみ起動
task dev:server   # server のみ起動
task dev:bot      # Slack bot のみ起動
task dev:local    # Slack token 不要の bot ローカルハーネスを起動
```

品質チェック:

```sh
task lint
task fmt
task typecheck
task test
task build
```

OpenAPI と web API クライアントの生成:

```sh
task api:generate
```

## 画像アップロード

画像は API server で署名付き URL を発行し、ブラウザから S3 互換 storage に直接 `PUT` する。
web 側は `packages/web/src/lib/uploads.ts` の `uploadImage(file)` を使う。

対応形式は `image/jpeg`、`image/png`、`image/webp`、上限は 20 MiB。storage 側では web origin からの `PUT` と `Content-Type` header を許可する CORS 設定が必要。

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

## DB / migration

ローカル PostgreSQL は `docker-compose.yml` で定義している。

```sh
docker compose up -d postgres
task migrate:generate
task migrate:up
task migrate:push
task migrate:studio
```

## Slack bot local harness

Slack App の token なしでリスナーの動作確認ができる。

```sh
task dev:local
```

起動後:

```sh
curl -s -X POST http://localhost:4000/commands/ping | jq

curl -s -X POST http://localhost:4000/events/app-mention \
  -H 'Content-Type: application/json' \
  -d '{"user": "U12345"}' | jq

curl -s -X POST http://localhost:4000/events/app_home_opened \
  -H 'Content-Type: application/json' \
  -d '{"user": "U12345"}' | jq

curl -s -X POST http://localhost:4000/actions/button-click | jq
```

組み込みリスナー:

| 種別 | トリガー | 動作 |
| --- | --- | --- |
| Command | `/ping` | Pong! を返す |
| Event | `app_mention` | メンションしたユーザーに挨拶を返す |
| Event | `app_home_opened` | App Home を publish する |
| Action | `button_click` | クリック確認メッセージを返す |

## Docker

```sh
task docker:build:bot
task docker:run:bot
task docker:build:server
task docker:run:server
```

## Infra / deploy

Terraform:

```sh
task infra:init
task infra:migrate-state
task infra:plan
task infra:apply
```

初回に local state で apply して `slack-bot-template-tfstate` bucket を作成した後、`task infra:migrate-state` で S3 backend へ移行する。

ECS deploy はローカルから実行せず、GitHub Actions 経由で行う。GitHub Actions の ECS deploy は S3 backend の tfstate を ecspresso から参照する。GitHub repository variables には次を設定する。

```sh
AWS_ROLE_ARN=arn:aws:iam::<account-id>:role/slack-bot-template-github-actions
```
