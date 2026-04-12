import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@dx-template/workflow": fileURLToPath(new URL("../workflow/src/index.ts", import.meta.url)),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, "dist/**"],
    globals: true,
  },
});
