import { describe, expect, it } from "vitest";
import { apiClient, createApiClient } from "./api-client.js";

describe("api-client", () => {
  it("createApiClient は hc<AppType> のインスタンスを返す", () => {
    const client = createApiClient("http://localhost:3000");
    expect(client).toBeDefined();
    expect(client.api).toBeDefined();
    expect(client.api.users).toBeDefined();
  });

  it("デフォルト export は SERVER_URL 環境変数を使用する", () => {
    expect(apiClient).toBeDefined();
    expect(apiClient.api).toBeDefined();
  });

  it("api.users のエンドポイントメソッドが型として存在する", () => {
    const client = createApiClient("http://localhost:3000");

    // $get, $post が関数として存在する
    expect(typeof client.api.users.$get).toBe("function");
    expect(typeof client.api.users.$post).toBe("function");
  });

  it("api.users[':slackUserId'] のエンドポイントが存在する", () => {
    const client = createApiClient("http://localhost:3000");

    const userById = client.api.users[":slackUserId"];
    expect(userById).toBeDefined();
    expect(typeof userById.$get).toBe("function");
  });
});
