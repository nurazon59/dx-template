import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import { buildHomeView } from "../../views/home.js";

export async function appHomeOpened({
  client,
  event,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"app_home_opened">): Promise<void> {
  await client.views.publish({
    user_id: event.user,
    view: buildHomeView(),
  });
}
