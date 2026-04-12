# dx-template

社内 DX ツール基盤のモノレポ（pnpm workspaces）

## パッケージ構成

```
packages/
  workflow/   # ワークフロー定義（triage, report-draft）— 純粋ロジック、外部依存なし
  agent/      # AI SDK v6 エージェント — workflow を呼び出す AI ツール層
  server/     # Hono v4 API サーバー — agent/workflow を統合して HTTP 提供
  slack-bot/  # Slack Bolt v4 Bot — server API を呼び出す
  web/        # React 19 SPA — server API を呼び出す
```

### 依存方向

```
slack-bot → server → agent → workflow
web       → server ↗
```

## 共通ルール

- **ESM 統一** (`"type": "module"`)
- **TypeScript strict** — `tsconfig.base.json` を各パッケージが extends
- **テスト**: vitest、ファイル共存の `.test.ts`
- **Linter**: oxlint（ルート `pnpm lint`）
- **Formatter**: oxfmt（ルート `pnpm fmt`）
- **ランタイム管理**: mise

## 開発コマンド

```sh
# ルート
pnpm lint           # oxlint（全パッケージ）
pnpm fmt            # oxfmt --write packages/

# 各パッケージ共通
pnpm build          # tsc
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest run
pnpm dev            # 開発サーバー（server, slack-bot, web）
```

## Git Hooks（lefthook）

- **pre-commit**（並列）: lint + fmt（JS/TS/JSX/TSX 対象）
- **pre-push**（並列）: test + build + typecheck

## CI/CD

- **CI** (`ci.yml`): push/PR on main → lint → typecheck → test → build
- **CD** (`cd.yml`): push on main → slack-bot/server は ECR+ECS(ecspresso)、web は S3+CloudFront にデプロイ（ap-northeast-1）

## API コード生成

server の OpenAPI スキーマから各クライアントの型を自動生成している：

| 生成元 | 生成先 | ツール |
|--------|--------|--------|
| `server/openapi.json` | `web/src/lib/api/generated.ts` | Orval |
| `server/openapi.json` | `slack-bot/src/lib/api/schema.ts` | openapi-typescript |

server の API を変更したら `pnpm generate:openapi`（server）→ 各クライアントの `pnpm generate:api` を実行すること。
