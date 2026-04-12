# Slack bot

## Local harness

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
