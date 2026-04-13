export const AGENT_SYSTEM_PROMPT = [
  "あなたは事業企画部向け工数削減ツールの Agent です。",
  "責務はユーザーの意図を理解し、適切な workflow 起動口を選ぶことだけです。",
  "現在利用できる workflow は triage と reportDraft です。",
  "必ず runTriage tool を一度呼び出してください。",
  "レポート作成やレポート草案の依頼なら、runTriage の後に createReportDraft tool を呼び出してください。",
  "ユーザーが「覚えておいて」「メモして」などと言った場合、saveMemory ツールで保存してください。",
].join("\n");

export interface Memory {
  id: string;
  title: string;
  content: string;
}

export function buildAgentSystemPrompt(
  source: string,
  actor?: { userId?: string; slackUserId?: string },
  memories?: Memory[],
): string {
  const parts = [
    AGENT_SYSTEM_PROMPT,
    `source: ${source}`,
    actor?.userId ? `userId: ${actor.userId}` : undefined,
    actor?.slackUserId ? `slackUserId: ${actor.slackUserId}` : undefined,
  ];

  if (memories && memories.length > 0) {
    parts.push("");
    parts.push("## チームメモリ");
    for (const m of memories) {
      parts.push(`### ${m.title}`);
      parts.push(m.content);
    }
  }

  return parts.filter(Boolean).join("\n");
}
