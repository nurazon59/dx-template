import type { App } from "@slack/bolt";
import { buttonClick } from "./button-click.js";
import { hitlApprove, hitlReject } from "./hitl.js";

export function register(app: App): void {
  app.action("button_click", buttonClick);
  app.action("hitl_approve", hitlApprove);
  app.action("hitl_reject", hitlReject);
}
