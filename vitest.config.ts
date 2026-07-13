import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@supaluv/content/draft-ch01-scenes": new URL(
        "./packages/content/manifests/draft-ch01-scenes.ts",
        import.meta.url,
      ).pathname,
      "@supaluv/content/draft-ch02-scenes": new URL(
        "./packages/content/manifests/draft-ch02-scenes.ts",
        import.meta.url,
      ).pathname,
      "@supaluv/content/ch01-scenes": new URL(
        "./packages/content/manifests/legacy/ch01-scenes.ts",
        import.meta.url,
      ).pathname,
      "@supaluv/content/prototype-scenes": new URL(
        "./packages/content/manifests/prototype-scenes.ts",
        import.meta.url,
      ).pathname,
      "@supaluv/content/chapter-01-trial-scenes": new URL(
        "./packages/content/manifests/chapter-01-trial-scenes.ts",
        import.meta.url,
      ).pathname,
      "@supaluv/content/narrative-graph-player": new URL(
        "./packages/content/src/narrative-graph-player.ts",
        import.meta.url,
      ).pathname,
      "@supaluv/content/narrative-graph-creator.node": new URL(
        "./packages/content/src/narrative-graph-creator.node.ts",
        import.meta.url,
      ).pathname,
      "@supaluv/content": new URL("./packages/content/src/index.ts", import.meta.url).pathname,
      "@supaluv/shared/story-map": new URL("./packages/shared/src/story-map.ts", import.meta.url)
        .pathname,
      "@supaluv/shared/narrative-graph": new URL(
        "./packages/shared/src/narrative-graph.ts",
        import.meta.url,
      ).pathname,
      "@supaluv/shared/character-pack": new URL(
        "./packages/shared/src/character-pack.ts",
        import.meta.url,
      ).pathname,
      "@supaluv/shared/ai-ending": new URL("./packages/shared/src/ai-ending.ts", import.meta.url)
        .pathname,
      "@supaluv/shared": new URL("./packages/shared/src/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", "dist/**"],
  },
});
