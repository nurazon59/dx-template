import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import { Message, Section } from "slack-block-builder";

export async function appMention({
  event,
  say,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"app_mention">): Promise<void> {
  const message = Message()
    .blocks(
      Section({
        text: `<@${event.user}> こんにちは！何かお手伝いできることはありますか？`,
      }),
    )
    .buildToObject();

  await say(message);
}
