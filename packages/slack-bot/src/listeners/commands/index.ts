import type { App } from "@slack/bolt";
import { memory } from "./memory.js";
import { ping } from "./ping.js";

export function register(app: App): void {
  app.command("/memory", async (args) => memory(args));
  app.command("/ping", async (args) => ping(args));
}
