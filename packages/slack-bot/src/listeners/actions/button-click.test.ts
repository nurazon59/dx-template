import { describe, expect, it, vi } from "vitest";
import { buttonClick } from "./button-click.js";
import { apiClient } from "../../api-client.js";

vi.mock("../../api-client.js", () => ({
  apiClient: {
    system: {
      time: vi.fn(),
    },
  },
}));

describe("buttonClick", () => {
  it("ack() を呼ぶ", async () => {
    const ack = vi.fn();
    const respond = vi.fn();
    vi.mocked(apiClient.system.time).mockResolvedValue({ timestamp: "2026-04-12T09:00:00.000Z" });

    await buttonClick({ ack, respond } as never);

    expect(ack).toHaveBeenCalledOnce();
  });

  it("respond() を Block Kit メッセージで呼ぶ", async () => {
    const ack = vi.fn();
    const respond = vi.fn();
    vi.mocked(apiClient.system.time).mockResolvedValue({ timestamp: "2026-04-12T09:00:00.000Z" });

    await buttonClick({ ack, respond } as never);

    expect(respond).toHaveBeenCalledOnce();
    const message = respond.mock.calls[0][0];
    expect(message).toHaveProperty("blocks");
    expect(message.blocks.length).toBeGreaterThan(0);
    expect(JSON.stringify(message)).toContain("2026-04-12T09:00:00.000Z");
  });

  it("server API が失敗しても respond() する", async () => {
    const ack = vi.fn();
    const respond = vi.fn();
    vi.mocked(apiClient.system.time).mockRejectedValue(new Error("server down"));

    await buttonClick({ ack, respond } as never);

    expect(respond).toHaveBeenCalledOnce();
    expect(JSON.stringify(respond.mock.calls[0][0])).toContain("取得に失敗");
  });
});
