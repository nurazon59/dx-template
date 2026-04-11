import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from "@slack/bolt";
import { Message, Section } from "slack-block-builder";

export async function ping({
  ack,
  respond,
}: AllMiddlewareArgs & SlackCommandMiddlewareArgs): Promise<void> {
  await ack();

  const message = Message()
    .blocks(Section({ text: ":table_tennis_paddle_and_ball: Pong!" }))
    .buildToObject();

  await respond(message);
}
