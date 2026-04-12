import { describe, expect, it, vi } from "vitest";
import { appHomeOpened, buildHomeView } from "./app-home.js";

describe("appHomeOpened", () => {
  it("views.publish() を Home view で呼ぶ", async () => {
    const publish = vi.fn();

    await appHomeOpened({
      event: { user: "U12345" },
      client: { views: { publish } },
    } as never);

    expect(publish).toHaveBeenCalledOnce();
    expect(publish).toHaveBeenCalledWith({
      user_id: "U12345",
      view: buildHomeView(),
    });
  });

  it("button_click action を含む", () => {
    const view = buildHomeView();
    const viewText = JSON.stringify(view);

    expect(view.type).toBe("home");
    expect(viewText).toContain("button_click");
  });
});
