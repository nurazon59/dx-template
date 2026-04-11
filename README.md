# slack-bot-template

Slack Bolt for JavaScript (TypeScript) のボットテンプレート。Socket Mode で動作し、コマンド・イベント・アクションのリスナーが構造化された状態で用意されている。

## 必要なもの

- [mise](https://mise.jdx.dev/) (Node.js 22 + go-task + oxlint + oxfmt を管理)
- [pnpm](https://pnpm.io/)
- Slack App (Socket Mode 有効)

## セットアップ

```sh
mise install
task setup   # pnpm install + .env.local 作成
```

`.env.local` に Slack のトークンを設定する:

```
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
```

## 開発

```sh
task dev              # 全パッケージ並列起動
task dev:bot          # bot のみ起動
task dev:server       # server のみ起動
task dev:local        # ローカル開発ハーネス（Slack 不要）
task lint             # oxlint
task fmt              # oxfmt
task typecheck        # tsc --noEmit (全パッケージ)
task test             # vitest run (全パッケージ)
```

## プロジェクト構成

```
packages/
  bot/                            # Slack Bot (Socket Mode)
    src/
      app.ts                      # Bolt App インスタンス
      index.ts                    # エントリーポイント
      listeners/
        index.ts                  # 全リスナー登録
        commands/
          ping.ts                 # /ping コマンド
        events/
          app-mention.ts          # app_mention イベント
        actions/
          button-click.ts         # button_click アクション
  server/                         # API サーバー (Hono)
    src/
      app.ts                      # Hono App
      index.ts                    # エントリーポイント
      db/                         # Drizzle ORM
      routes/                     # ルーティング
infra/
  terraform/                      # AWS インフラ定義
  ecspresso/                      # ECS デプロイ設定
```

## 組み込みリスナー

| 種別    | トリガー       | 動作                               |
| ------- | -------------- | ---------------------------------- |
| Command | `/ping`        | Pong! を返す                       |
| Event   | `app_mention`  | メンションしたユーザーに挨拶を返す |
| Action  | `button_click` | クリック確認メッセージを返す       |

## ローカル開発ハーネス

Slack App のトークンなしでリスナーの動作確認ができるローカルサーバー。リスナー関数をモック引数で呼び出し、Block Kit JSON レスポンスを返す。

```sh
task dev:local    # http://localhost:4000 で起動

# コマンドテスト
curl -s -X POST http://localhost:4000/commands/ping | jq

# イベントテスト（ペイロード付き）
curl -s -X POST http://localhost:4000/events/app-mention \
  -H 'Content-Type: application/json' \
  -d '{"user": "U12345"}' | jq

# アクションテスト
curl -s -X POST http://localhost:4000/actions/button-click | jq
```

## テスト

```sh
pnpm test           # 全テスト実行
pnpm test:watch     # ウォッチモード
```

各リスナー関数は純粋な `async function` なので、`vi.fn()` でモックを渡してテストしている。

## ビルド・本番起動

```sh
task build    # tsc → dist/
```

## Docker

```sh
task docker:build    # イメージビルド
task docker:run      # コンテナ実行（.env.local を使用）
```

## インフラ (AWS)

Terraform + ecspresso で AWS にデプロイする。Socket Mode のため NAT Gateway 不要（パブリックサブネット + アウトバウンドのみ）。

### リソース構成

- **VPC**: パブリックサブネット x2 AZ
- **ECS Cluster**: Fargate, Container Insights 有効
- **ECR**: コンテナレジストリ（最新10件保持）
- **SSM Parameter Store**: `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN` (SecureString)
- **CloudWatch Logs**: 保持30日
- **S3**: tfstate バケット

### デプロイ手順

```sh
# 1. Terraform 初期化・適用
task infra:init
task infra:plan
task infra:apply

# 2. SSM にトークン設定（初回のみ）
aws ssm put-parameter \
  --name /slack-bot-template/SLACK_BOT_TOKEN \
  --value "xoxb-..." --type SecureString --overwrite
aws ssm put-parameter \
  --name /slack-bot-template/SLACK_APP_TOKEN \
  --value "xapp-..." --type SecureString --overwrite

# 3. Docker イメージ push
aws ecr get-login-password | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com
docker tag slack-bot-template:latest <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/slack-bot-template:latest
docker push <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/slack-bot-template:latest

# 4. ecspresso デプロイ
task deploy
```

### S3 backend への移行

初回は local backend で `terraform apply` → S3 バケット作成後、`versions.tf` の backend ブロックをアンコメントして:

```sh
terraform -chdir=infra/terraform init -migrate-state
```

## Claude Code Skills

| スキル              | 説明                       | 使い方                               |
| ------------------- | -------------------------- | ------------------------------------ |
| `add-listener`      | リスナーをスキャフォールド | `/add-listener command daily-report` |
| `add-block-message` | Block Kit メッセージ生成   | `/add-block-message 承認フォーム`    |
