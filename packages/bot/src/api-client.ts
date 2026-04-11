import { hc } from "hono/client";
import type { AppType } from "@slack-bot/server";

export function createApiClient(baseUrl: string) {
  return hc<AppType>(baseUrl);
}

export const apiClient = createApiClient(process.env["SERVER_URL"] ?? "http://localhost:3000");
