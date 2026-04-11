import { describe, expect, it, vi } from "vitest";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { putEvent, queryEventsByType } from "./events.js";

function createMockDynamodb(response: Record<string, unknown> = {}) {
  return {
    send: vi.fn().mockResolvedValue(response),
  } as unknown as DynamoDBDocumentClient;
}

describe("putEvent", () => {
  it("PutCommand を送信する", async () => {
    const dynamodb = createMockDynamodb();

    await putEvent(dynamodb, {
      type: "USER_LOGIN",
      id: "evt-1",
      payload: { userId: "u-1" },
      timestamp: "2024-01-01T00:00:00Z",
    });

    expect(dynamodb.send).toHaveBeenCalledOnce();
    const command = vi.mocked(dynamodb.send).mock.calls[0]![0];
    expect(command.input).toEqual({
      TableName: "",
      Item: {
        pk: "EVENT#USER_LOGIN",
        sk: "2024-01-01T00:00:00Z#evt-1",
        type: "USER_LOGIN",
        id: "evt-1",
        payload: { userId: "u-1" },
        timestamp: "2024-01-01T00:00:00Z",
      },
    });
  });
});

describe("queryEventsByType", () => {
  it("指定タイプのイベント一覧を返す", async () => {
    const items = [{ pk: "EVENT#USER_LOGIN", sk: "2024-01-01T00:00:00Z#evt-1" }];
    const dynamodb = createMockDynamodb({ Items: items });

    const result = await queryEventsByType(dynamodb, "USER_LOGIN");

    expect(result).toEqual(items);
    expect(dynamodb.send).toHaveBeenCalledOnce();
  });

  it("Items が undefined の場合は空配列を返す", async () => {
    const dynamodb = createMockDynamodb({});

    const result = await queryEventsByType(dynamodb, "UNKNOWN");

    expect(result).toEqual([]);
  });
});
