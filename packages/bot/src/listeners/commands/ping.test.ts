import { describe, expect, it, vi } from "vitest";
import { ping } from "./ping.js";

describe("ping", () => {
  it("ack() を呼ぶ", async () => {
    const ack = vi.fn();
    const respond = vi.fn();

    await ping({ ack, respond } as never);

    expect(ack).toHaveBeenCalledOnce();
  });

  it("respond() を Block Kit メッセージで呼ぶ", async () => {
    const ack = vi.fn();
    const respond = vi.fn();

    await ping({ ack, respond } as never);

    expect(respond).toHaveBeenCalledOnce();
    const message = respond.mock.calls[0][0];
    expect(message).toHaveProperty("blocks");
    expect(message.blocks.length).toBeGreaterThan(0);
  });
});
