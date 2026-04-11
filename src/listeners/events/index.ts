import type { App } from "@slack/bolt";
import { appMention } from "./app-mention.js";

export function register(app: App): void {
  app.event("app_mention", appMention);
}
