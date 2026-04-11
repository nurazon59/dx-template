import type { App } from "@slack/bolt";
import { register as registerCommands } from "./commands/index.js";
import { register as registerEvents } from "./events/index.js";
import { register as registerActions } from "./actions/index.js";

export function registerListeners(app: App): void {
  registerCommands(app);
  registerEvents(app);
  registerActions(app);
}
