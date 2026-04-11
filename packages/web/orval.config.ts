import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: "../server/openapi.json",
    output: {
      target: "./src/lib/api/generated.ts",
      client: "react-query",
      mode: "single",
      override: {
        query: {
          useSuspenseQuery: true,
        },
      },
    },
  },
});
