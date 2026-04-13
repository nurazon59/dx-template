import type { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from "@slack/bolt";
import { apiClient } from "../../api-client.js";

export async function memory({
  ack,
  respond,
  command,
}: AllMiddlewareArgs & SlackCommandMiddlewareArgs): Promise<void> {
  await ack();

  const text = command.text.trim();
  const [subcommand, ...rest] = text.split(/\s+/);

  switch (subcommand) {
    case "list":
    case "": {
      try {
        const { memories } = await apiClient.memories.list();
        if (memories.length === 0) {
          await respond({ text: "メモリはまだ登録されていません" });
          return;
        }
        const lines = memories
          .slice(0, 10)
          .map((m, i) => `${i + 1}. *${m.title}* (${m.source}, ${m.id.slice(0, 8)})`);
        await respond({
          blocks: [
            {
              type: "section",
              text: { type: "mrkdwn", text: lines.join("\n") },
            },
          ],
        });
      } catch (err) {
        await respond({ text: `エラー: ${err instanceof Error ? err.message : String(err)}` });
      }
      break;
    }

    case "add": {
      const bodyText = rest.join(" ");
      const newlineIndex = bodyText.indexOf("\n");
      const title = newlineIndex >= 0 ? bodyText.slice(0, newlineIndex).trim() : bodyText.trim();
      const content = newlineIndex >= 0 ? bodyText.slice(newlineIndex + 1).trim() : "";

      if (!title) {
        await respond({ text: "使い方: `/memory add タイトル\\n本文`" });
        return;
      }
      if (!content) {
        await respond({
          text: "本文を入力してください。タイトルの後に改行して本文を記述してください",
        });
        return;
      }

      try {
        const { memory } = await apiClient.memories.create({
          title,
          content,
          source: "slack",
        });
        await respond({
          text: `メモリを作成しました: *${memory.title}* (${memory.id.slice(0, 8)})`,
        });
      } catch (err) {
        await respond({ text: `エラー: ${err instanceof Error ? err.message : String(err)}` });
      }
      break;
    }

    case "show": {
      const id = rest[0];
      if (!id) {
        await respond({ text: "使い方: `/memory show [id]`" });
        return;
      }
      try {
        const { memory } = await apiClient.memories.getById(id);
        await respond({
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*${memory.title}*\n登録元: ${memory.source}\n作成日: ${memory.createdAt}\n\n${memory.content}`,
              },
            },
          ],
        });
      } catch (err) {
        await respond({ text: `エラー: ${err instanceof Error ? err.message : String(err)}` });
      }
      break;
    }

    case "delete": {
      const id = rest[0];
      if (!id) {
        await respond({ text: "使い方: `/memory delete [id]`" });
        return;
      }
      try {
        await apiClient.memories.delete(id);
        await respond({ text: `メモリを削除しました (${id.slice(0, 8)})` });
      } catch (err) {
        await respond({ text: `エラー: ${err instanceof Error ? err.message : String(err)}` });
      }
      break;
    }

    default:
      await respond({
        text: [
          "使い方:",
          "`/memory list` — 一覧表示",
          "`/memory add タイトル\\n本文` — 新規作成",
          "`/memory show [id]` — 詳細表示",
          "`/memory delete [id]` — 削除",
        ].join("\n"),
      });
  }
}
