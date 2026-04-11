import type { App } from "@slack/bolt";
import { ping } from "./ping.js";

export function register(app: App): void {
  app.command("/ping", async (args) => ping(args));
}
