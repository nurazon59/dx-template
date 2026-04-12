import type {
  AllMiddlewareArgs,
  BlockAction,
  ButtonAction,
  SlackActionMiddlewareArgs,
} from "@slack/bolt";
import { Message, Section } from "slack-block-builder";
import { apiClient } from "../../api-client.js";

export async function buttonClick({
  ack,
  respond,
}: AllMiddlewareArgs & SlackActionMiddlewareArgs<BlockAction<ButtonAction>>): Promise<void> {
  await ack();

  try {
    const { timestamp } = await apiClient.system.time();
    const message = Message()
      .blocks(Section({ text: `:white_check_mark: Server timestamp: ${timestamp}` }))
      .buildToObject();

    await respond(message);
  } catch (err) {
    console.error("Failed to fetch server timestamp:", err);
    const message = Message()
      .blocks(Section({ text: ":warning: Server timestamp の取得に失敗しました。" }))
      .buildToObject();

    await respond(message);
  }
}
