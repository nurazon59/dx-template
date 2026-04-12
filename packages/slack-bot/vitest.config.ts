import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    env: {
      SLACK_BOT_TOKEN: "xoxb-test-token",
      SLACK_APP_TOKEN: "xapp-test-token",
    },
  },
});
