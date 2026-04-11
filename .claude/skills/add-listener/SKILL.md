---
name: add-listener
description: Slack Bolt リスナー (command/event/action) をスキャフォールドする
argument-hint: <type> <name>
---

# add-listener

`$ARGUMENTS` を `<type> <name>` として解釈する。

- `$0` = type: `command` | `event` | `action`
- `$1` = name: ケバブケース (例: `daily-report`)

## 生成対象

1. `packages/slack-bot/src/listeners/<type>s/<name>.ts` — リスナー関数
2. `packages/slack-bot/src/listeners/<type>s/<name>.test.ts` — vitest テスト
3. `packages/slack-bot/src/listeners/<type>s/index.ts` — 既存ファイルに登録を追加

## テンプレート参照

既存のリスナーをテンプレートとして使用する:

| type    | テンプレート                                         |
| ------- | ---------------------------------------------------- |
| command | `packages/slack-bot/src/listeners/commands/ping.ts`        |
| event   | `packages/slack-bot/src/listeners/events/app-mention.ts`   |
| action  | `packages/slack-bot/src/listeners/actions/button-click.ts` |

## 規約

- ESM: import パスに `.js` 拡張子を付ける
- Block Kit: `slack-block-builder` の `Message().blocks(...).buildToObject()` パターン
- テスト: `vi.fn()` でモック、`as never` で型キャスト
- 関数名: ケバブケースのファイル名をキャメルケースに変換 (例: `daily-report` → `dailyReport`)
- 型: `@slack/bolt` から適切な型を import

## 手順

1. テンプレートファイルを Read して構造を確認
2. テストファイルを先に生成 (TDD)
3. テスト実行 → 失敗確認
4. リスナー関数を生成
5. `index.ts` に登録を追加
6. テスト実行 → パス確認
7. `pnpm lint` 実行
