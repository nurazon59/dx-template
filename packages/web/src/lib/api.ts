import { hc } from "hono/client";
import type { AppType } from "@dx-template/server";

export const client = hc<AppType>("/api");
