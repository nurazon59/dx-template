import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@dx-template/agent": fileURLToPath(new URL("../agent/src/index.ts", import.meta.url)),
      "@dx-template/workflow": fileURLToPath(new URL("../workflow/src/index.ts", import.meta.url)),
    },
  },
  test: {
    globals: true,
    passWithNoTests: true,
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    },
  },
});
