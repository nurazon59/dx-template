# dx-template

## セットアップ

### 前提条件

以下を Homebrew でインストールしておく：

| ツール | 用途 | インストール |
|--------|------|-------------|
| [mise](https://mise.jdx.dev/) | ランタイム・ツール管理 | `brew install mise` |
| [Docker](https://www.docker.com/) | DB 等のコンテナ実行 | Docker Desktop or `brew install --cask docker` |
| [direnv](https://direnv.net/) | `.envrc` による環境変数自動読み込み | `brew install direnv` |

### 手順

```sh
mise trust
mise install
task setup
direnv allow
```

### mise で自動インストールされるツール

以下は `mise install` で自動的にインストールされるため、個別に brew 等で入れる必要はない：

| ツール | バージョン | 用途 |
|--------|-----------|------|
| Node.js | 22 | ランタイム |
| pnpm | latest | パッケージマネージャ |
| go-task | latest | タスクランナー（`task` コマンド） |
| mprocs | latest | 複数プロセスの並列実行 |
| lefthook | latest | Git hooks |
| ecspresso | 2.8.0 | ECS デプロイ |

### 環境変数

`task setup` で `.env.local.example` → `.env.local` にコピーされる。主要な変数：

| 変数 | 説明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 接続文字列 |
| `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` | Slack Bot の認証トークン |
| `SERVER_URL` | API サーバーの URL |
| `BETTER_AUTH_SECRET` | 認証用シークレット（`openssl rand -base64 32` で生成） |
| `AI_PROVIDER` / `AI_MODEL` | AI プロバイダと使用モデル（`openai` or `google`） |
| `OPENAI_API_KEY` | OpenAI API キー |
| `S3_UPLOAD_BUCKET` / `S3_PUBLIC_BASE_URL` | ファイルアップロード先の S3 設定 |
