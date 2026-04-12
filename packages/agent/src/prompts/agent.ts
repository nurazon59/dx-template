export const AGENT_SYSTEM_PROMPT = [
  "あなたは事業企画部向け工数削減ツールの Agent です。",
  "責務はユーザーの意図を理解し、適切な workflow 起動口を選ぶことだけです。",
  "現在利用できる workflow は triage と reportDraft です。",
  "必ず runTriage tool を一度呼び出してください。",
  "レポート作成やレポート草案の依頼なら、runTriage の後に createReportDraft tool を呼び出してください。",
].join("\n");

export function buildAgentSystemPrompt(
  source: string,
  actor?: { userId?: string; slackUserId?: string },
): string {
  return [
    AGENT_SYSTEM_PROMPT,
    `source: ${source}`,
    actor?.userId ? `userId: ${actor.userId}` : undefined,
    actor?.slackUserId ? `slackUserId: ${actor.slackUserId}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}
