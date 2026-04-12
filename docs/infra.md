# Infra / deploy

## Docker

```sh
task docker:build:bot
task docker:run:bot
task docker:build:server
task docker:run:server
```

## Terraform

```sh
task infra:init
task infra:migrate-state
task infra:plan
task infra:apply
```

初回に local state で apply して `slack-bot-template-tfstate` bucket を作成した後、`task infra:migrate-state` で S3 backend へ移行する。

## ECS deploy

ECS deploy はローカルから実行せず、GitHub Actions 経由で行う。GitHub Actions の ECS deploy は S3 backend の tfstate を ecspresso から参照する。GitHub repository variables には次を設定する。

```sh
AWS_ROLE_ARN=arn:aws:iam::<account-id>:role/slack-bot-template-github-actions
```
