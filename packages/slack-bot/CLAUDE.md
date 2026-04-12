# @dx-template/slack-bot

Slack Bolt v4 の Slack Bot

## レイヤー構造

```
listeners/           # Slack イベント/コマンド/アクション処理
  commands/          #   /ping
  events/            #   app-home（ホームタブ）, app-mention
  actions/           #   button-click
views/               # Slack Block Kit ビュー（プレーンオブジェクトで構築）
  home.ts            #   buildHomeView()
api-client.ts        # server API 呼び出し（openapi-fetch + 自動生成スキーマ）
lib/
  api/schema.ts      # openapi-typescript 自動生成スキーマ
```

## ロジックを持たせる基準

- listener → api-client の2層で十分な場合はそのまま
- Slack 依存のブロック構築は `views/` に分離
- 共有型・ユーティリティは `lib/`

## 新規リスナー追加

```ts
// src/listeners/commands/hoge.ts
export async function hoge({ ack, respond }: AllMiddlewareArgs & SlackCommandMiddlewareArgs) {
  await ack();
  await respond({ text: "response" });
}
```

## ビュー作成規約

Block Kit ビューはプレーンオブジェクトで構築する（slack-block-builder は使わない）。

```ts
// src/views/example.ts
export function buildExampleView(): View {
  return {
    type: "home",
    blocks: [{ type: "section", text: { type: "mrkdwn", text: "..." } }],
  };
}
```

## テスト

- vitest + vi.fn() によるモック
- リスナーと同ディレクトリに `.test.ts` 共存
- API モックは msw を使用

## 開発コマンド

```sh
pnpm dev           # tsx watch
pnpm dev:local     # dev-server.ts（ローカル開発用）
pnpm build         # tsc
pnpm test          # vitest run
pnpm generate:api  # openapi-typescript（server の openapi.json から生成）
```
