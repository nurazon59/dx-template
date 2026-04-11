import type { App } from "@slack/bolt";
import { buttonClick } from "./button-click.js";

export function register(app: App): void {
  app.action("button_click", buttonClick);
}
