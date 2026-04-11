import { describe, expect, it, vi } from "vitest";
import { appMention } from "./app-mention.js";

describe("appMention", () => {
  it("say() を event.user を含むメッセージで呼ぶ", async () => {
    const say = vi.fn();
    const event = { user: "U12345" };

    await appMention({ event, say } as never);

    expect(say).toHaveBeenCalledOnce();
    const message = say.mock.calls[0][0];
    expect(message).toHaveProperty("blocks");
    expect(message.blocks.length).toBeGreaterThan(0);

    const blockText = JSON.stringify(message.blocks);
    expect(blockText).toContain("U12345");
  });
});
