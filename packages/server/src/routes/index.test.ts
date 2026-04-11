import { describe, expect, it } from "vitest";
import { app } from "../app.js";

describe("GET /api/health", () => {
  it("status: ok を返す", async () => {
    const res = await app.request("/api/health");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("GET /api/users", () => {
  it("空の配列を返す", async () => {
    const res = await app.request("/api/users");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ users: [] });
  });
});
