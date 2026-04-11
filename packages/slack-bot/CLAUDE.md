# @dx-template/slack-bot

Slack Bot パッケージ（`@slack/bolt` v4 + `slack-block-builder`）

## 構成

- ディレクトリ: `packages/slack-bot/`
- エントリポイント: `src/index.ts`、アプリ初期化: `src/app.ts`
- リスナー: `src/listeners/{actions,commands,events}/` 配下に配置
- テストは各リスナーと同階層に `.test.ts` として colocate

## 開発コマンド

```sh
pnpm dev      # tsx watch で起動
pnpm build    # tsc
pnpm test     # vitest run
```

## 規約

- ESM (`"type": "module"`)
- リスナー追加時は `src/listeners/` の既存パターンに従う
- テストは vitest（globals 有効）、リスナーごとに必ず書く
