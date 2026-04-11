import type {
  AllMiddlewareArgs,
  BlockAction,
  ButtonAction,
  SlackActionMiddlewareArgs,
} from "@slack/bolt";
import { Message, Section } from "slack-block-builder";

export async function buttonClick({
  ack,
  respond,
}: AllMiddlewareArgs &
  SlackActionMiddlewareArgs<BlockAction<ButtonAction>>): Promise<void> {
  await ack();

  const message = Message()
    .blocks(
      Section({ text: ":white_check_mark: ボタンがクリックされました！" }),
    )
    .buildToObject();

  await respond(message);
}
