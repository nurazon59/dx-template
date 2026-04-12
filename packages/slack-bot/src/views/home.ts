export function buildHomeView() {
  return {
    type: "home" as const,
    blocks: [
      {
        type: "section" as const,
        text: {
          type: "mrkdwn" as const,
          text: "*slack_bot_test*",
        },
      },
      {
        type: "section" as const,
        text: {
          type: "mrkdwn" as const,
          text: "App Home から動作確認できます。",
        },
      },
      {
        type: "actions" as const,
        elements: [
          {
            type: "button" as const,
            text: {
              type: "plain_text" as const,
              text: "ボタン確認",
              emoji: true,
            },
            action_id: "button_click",
            value: "app_home_button",
          },
        ],
      },
    ],
  };
}
