import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@supaluv/content": new URL("./packages/content/src/index.ts", import.meta.url).pathname,
      "@supaluv/shared": new URL("./packages/shared/src/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", "dist/**"],
  },
});
