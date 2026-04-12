import type { App } from "@slack/bolt";
import { appHomeOpened } from "./app-home.js";
import { appMention } from "./app-mention.js";

export function register(app: App): void {
  app.event("app_mention", appMention);
  app.event("app_home_opened", appHomeOpened);
}
