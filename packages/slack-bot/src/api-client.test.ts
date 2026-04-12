import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { apiClient, ApiError } from "./api-client.js";

const server = setupServer(
  http.get("http://localhost:3000/api/time", () =>
    HttpResponse.json({ timestamp: "2026-04-12T09:00:00.000Z" }),
  ),
  http.get("http://localhost:3000/api/users", () =>
    HttpResponse.json({ users: [{ id: "1", slackUserId: "U1", displayName: "Test" }] }),
  ),
  http.post("http://localhost:3000/api/users", async ({ request }) => {
    const body = (await request.json()) as { slackUserId: string; displayName: string };
    return HttpResponse.json(
      { user: { id: "2", slackUserId: body.slackUserId, displayName: body.displayName } },
      { status: 201 },
    );
  }),
  http.get("http://localhost:3000/api/users/U1", () =>
    HttpResponse.json({ user: { id: "1", slackUserId: "U1", displayName: "Test" } }),
  ),
  http.get("http://localhost:3000/api/users/UNKNOWN", () =>
    HttpResponse.json({ code: "USER_NOT_FOUND", message: "見つかりません" }, { status: 404 }),
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("apiClient", () => {
  it("system.time は timestamp を返す", async () => {
    const result = await apiClient.system.time();
    expect(result.timestamp).toBe("2026-04-12T09:00:00.000Z");
  });

  it("users.list はユーザー一覧を返す", async () => {
    const result = await apiClient.users.list();
    expect(result.users).toHaveLength(1);
    expect(result.users[0]!.slackUserId).toBe("U1");
  });

  it("users.create はユーザーを作成する", async () => {
    const result = await apiClient.users.create({ slackUserId: "U2", displayName: "New" });
    expect(result.user.slackUserId).toBe("U2");
  });

  it("users.getBySlackUserId はユーザーを返す", async () => {
    const result = await apiClient.users.getBySlackUserId("U1");
    expect(result.user.slackUserId).toBe("U1");
  });

  it("存在しないユーザーで ApiError を投げる", async () => {
    await expect(apiClient.users.getBySlackUserId("UNKNOWN")).rejects.toThrow(ApiError);
    await expect(apiClient.users.getBySlackUserId("UNKNOWN")).rejects.toMatchObject({
      status: 404,
      code: "USER_NOT_FOUND",
    });
  });
});
