export function buildHitlApprovalMessage(toolName: string, toolArgs: unknown, jobId: string) {
  const argsText =
    typeof toolArgs === "object" && toolArgs !== null
      ? JSON.stringify(toolArgs, null, 2)
      : String(toolArgs);

  return {
    text: `承認リクエスト: ${toolName}`,
    blocks: [
      {
        type: "header" as const,
        text: {
          type: "plain_text" as const,
          text: "承認リクエスト",
          emoji: true,
        },
      },
      {
        type: "section" as const,
        fields: [
          {
            type: "mrkdwn" as const,
            text: `*ツール名:*\n${toolName}`,
          },
          {
            type: "mrkdwn" as const,
            text: `*ジョブID:*\n${jobId}`,
          },
        ],
      },
      {
        type: "section" as const,
        text: {
          type: "mrkdwn" as const,
          text: `*引数:*\n\`\`\`${argsText}\`\`\``,
        },
      },
      {
        type: "actions" as const,
        elements: [
          {
            type: "button" as const,
            text: {
              type: "plain_text" as const,
              text: "承認",
              emoji: true,
            },
            style: "primary" as const,
            action_id: "hitl_approve",
            value: jobId,
          },
          {
            type: "button" as const,
            text: {
              type: "plain_text" as const,
              text: "拒否",
              emoji: true,
            },
            style: "danger" as const,
            action_id: "hitl_reject",
            value: jobId,
          },
        ],
      },
    ],
  };
}
