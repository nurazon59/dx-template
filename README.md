# slack-bot-template

Slack Bolt for JavaScript (TypeScript) のボットテンプレート。Socket Mode で動作し、コマンド・イベント・アクションのリスナーが構造化された状態で用意されている。

## 必要なもの

- [mise](https://mise.jdx.dev/) (Node.js 22 + oxlint + oxfmt を管理)
- [pnpm](https://pnpm.io/)
- Slack App (Socket Mode 有効)

## セットアップ

```sh
mise install
mise run setup   # pnpm install + .env.local 作成
```

`.env.local` に Slack のトークンを設定する:

```
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
```

## 開発

```sh
mise run dev          # tsx watch で起動
mise run lint         # oxlint
mise run fmt          # oxfmt
mise run typecheck    # tsc --noEmit
mise run test         # vitest run
```

## プロジェクト構成

```
src/
  app.ts                          # Bolt App インスタンス
  index.ts                        # エントリーポイント
  listeners/
    index.ts                      # 全リスナー登録
    commands/
      ping.ts                     # /ping コマンド
    events/
      app-mention.ts              # app_mention イベント
    actions/
      button-click.ts             # button_click アクション
```

## 組み込みリスナー

| 種別 | トリガー | 動作 |
|------|----------|------|
| Command | `/ping` | Pong! を返す |
| Event | `app_mention` | メンションしたユーザーに挨拶を返す |
| Action | `button_click` | クリック確認メッセージを返す |

## テスト

```sh
pnpm test           # 全テスト実行
pnpm test:watch     # ウォッチモード
```

各リスナー関数は純粋な `async function` なので、`vi.fn()` でモックを渡してテストしている。

## ビルド・本番起動

```sh
mise run build    # tsc → dist/
mise run start    # node dist/index.js
```
