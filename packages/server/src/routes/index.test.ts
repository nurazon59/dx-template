import { describe, expect, it, vi } from "vitest";

vi.mock("../db/index.js", () => ({ db: {} }));

import { app } from "../app.js";

describe("GET /api/health", () => {
  it("status: ok を返す", async () => {
    const res = await app.request("/api/health");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("GET /api/time", () => {
  it("timestamp を ISO 文字列で返す", async () => {
    const res = await app.request("/api/time");

    expect(res.status).toBe(200);
    const body = (await res.json()) as { timestamp: string };
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });
});
