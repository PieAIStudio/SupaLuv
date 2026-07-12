import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@supaluv/content/ch01-scenes": new URL(
        "./packages/content/manifests/ch01-scenes.ts",
        import.meta.url,
      ).pathname,
      "@supaluv/content": new URL("./packages/content/src/index.ts", import.meta.url).pathname,
      "@supaluv/shared/story-map": new URL("./packages/shared/src/story-map.ts", import.meta.url)
        .pathname,
      "@supaluv/shared": new URL("./packages/shared/src/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", "dist/**"],
  },
});
