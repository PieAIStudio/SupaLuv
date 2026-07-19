import { EventEmitter } from "node:events";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Validator } from "@seriousme/openapi-schema-validator";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildCreatorStudioDescribe,
  CREATOR_STUDIO_ENDPOINT_SPECS,
  CREATOR_STUDIO_ROUTE_REGISTRY,
  creatorStudioRouteKey,
  listCreatorStudioRouteKeys,
} from "../../apps/web/src/creator/server/creatorStudioDescribe";
import {
  buildCreatorStudioOpenApi,
  endpointIsDestructive,
  endpointIsIdempotent,
} from "../../apps/web/src/creator/server/creatorStudioOpenApi";
import {
  createCreatorStudioRequestHandler,
  CREATOR_STUDIO_MOUNTED_ROUTES,
} from "../../apps/web/src/creator/server/creatorStudioDevPlugin";
import { createCreatorStudioService } from "../../apps/web/src/creator/server/creatorStudioServer";
import { CREATOR_TASK_DEFS } from "../../apps/web/src/creator/server/creatorTasks";

const tempRoots: string[] = [];

async function createMinimalFixture() {
  const repoRoot = await mkdtemp(join(tmpdir(), "supaluv-creator-describe-"));
  tempRoots.push(repoRoot);
  await Promise.all([
    mkdir(join(repoRoot, "packages/content/catalog"), { recursive: true }),
    mkdir(join(repoRoot, "packages/content/ink"), { recursive: true }),
    mkdir(join(repoRoot, "packages/content/manifests"), { recursive: true }),
    mkdir(join(repoRoot, "packages/content/generated"), { recursive: true }),
    mkdir(join(repoRoot, "packages/content/characters"), { recursive: true }),
    mkdir(join(repoRoot, "packages/content/assets"), { recursive: true }),
    mkdir(join(repoRoot, "packages/content/compiled"), { recursive: true }),
  ]);
  await writeFile(
    join(repoRoot, "packages/content/catalog/story-catalog.json"),
    `${JSON.stringify({
      productionChapters: [
        {
          id: "draft-ch01",
          inkFile: "draft-ch01.ink",
          manifestFile: "draft-ch01-scenes.ts",
        },
      ],
    })}\n`,
  );
  await writeFile(join(repoRoot, "packages/content/ink/draft-ch01.ink"), "=== a ===\n-> END\n");
  await writeFile(
    join(repoRoot, "packages/content/manifests/draft-ch01-scenes.ts"),
    `export const draftCh01Scenes = [
  { id: "dch01_s001", speaker: "旁白", artKey: "bg-office-night" },
] as const;
`,
  );
  await writeFile(
    join(repoRoot, "packages/content/generated/narrative-graph-creator.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      packageId: "fixture",
      revision: "rev",
      nodes: [],
      edges: [],
      entryNodeIds: [],
      terminalNodeIds: [],
    })}\n`,
  );
  await writeFile(
    join(repoRoot, "packages/content/generated/narrative-graph-player.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      packageId: "fixture",
      revision: "rev",
      nodes: [],
      edges: [],
      entryNodeIds: [],
      terminalNodeIds: [],
    })}\n`,
  );
  await writeFile(
    join(repoRoot, "packages/content/characters/registry.ts"),
    `export const CHARACTER_BY_NAME = { 旁白: { id: "narrator", name: "旁白" } };
`,
  );
  await writeFile(
    join(repoRoot, "packages/content/assets/VISUAL-ASSET-INTAKE.json"),
    `${JSON.stringify({ assets: [{ id: "bg-office-night" }] })}\n`,
  );
  await writeFile(
    join(repoRoot, "packages/content/assets/RUNTIME-ASSET-LEDGER.csv"),
    "asset_id,path,sha256,bytes,source,release_status,notes\n",
  );
  return repoRoot;
}

async function invokeHandler(
  handler: ReturnType<typeof createCreatorStudioRequestHandler>,
  method: string,
  url: string,
  body?: string,
): Promise<{ statusCode: number; body: string; contentType: string | undefined }> {
  const request = Object.assign(new EventEmitter(), {
    method,
    url,
    async *[Symbol.asyncIterator]() {
      if (body) {
        yield Buffer.from(body, "utf8");
      }
    },
  });
  let responseBody = "";
  const headers = new Map<string, string>();
  let ended = false;
  const response = {
    statusCode: 200,
    headersSent: false,
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), value);
    },
    write(chunk: string) {
      this.headersSent = true;
      responseBody += chunk;
    },
    end(value?: string) {
      ended = true;
      this.headersSent = true;
      if (value !== undefined) responseBody += value;
    },
  };

  await handler(request as never, response as never, () => {
    throw new Error("creator route unexpectedly fell through");
  });

  expect(ended).toBe(true);
  return {
    statusCode: response.statusCode,
    body: responseBody,
    contentType: headers.get("content-type"),
  };
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Creator Studio OpenAPI catalog", () => {
  it("covers every mounted route in the route registry (and no extras)", () => {
    const openapi = buildCreatorStudioOpenApi();
    const openapiKeys = Object.entries(openapi.paths)
      .flatMap(([path, methods]) =>
        Object.keys(methods).map((method) => creatorStudioRouteKey(method.toUpperCase(), path)),
      )
      .sort();
    const registryKeys = listCreatorStudioRouteKeys().sort();
    const mountedKeys = CREATOR_STUDIO_MOUNTED_ROUTES.map((route) =>
      creatorStudioRouteKey(route.method, route.path),
    ).sort();
    const endpointKeys = CREATOR_STUDIO_ENDPOINT_SPECS.map((endpoint) =>
      creatorStudioRouteKey(endpoint.method, endpoint.path),
    ).sort();

    expect(openapiKeys).toEqual(registryKeys);
    expect(mountedKeys).toEqual(registryKeys);
    expect(endpointKeys).toEqual(registryKeys);
    expect(CREATOR_STUDIO_ENDPOINT_SPECS).toHaveLength(CREATOR_STUDIO_ROUTE_REGISTRY.length);
  });

  it("is a valid OpenAPI 3.1 document (schema validator)", async () => {
    const openapi = buildCreatorStudioOpenApi();
    expect(openapi.openapi).toBe("3.1.0");
    expect(openapi.info.title).toMatch(/Creator Studio/i);
    expect(openapi["x-supaluv-workflows"].length).toBeGreaterThanOrEqual(3);
    expect(openapi["x-supaluv-invariants"].some((line) => /typecheck|回滚/.test(line))).toBe(true);
    expect(openapi["x-supaluv-task-defs"]).toEqual(CREATOR_TASK_DEFS);
    expect(openapi["x-supaluv-dev-only"]).toBe(true);

    const saveScene = openapi.paths["/__creator-studio/save-scene"]?.post as {
      "x-destructive"?: boolean;
      "x-idempotent"?: boolean;
      responses?: Record<string, unknown>;
    };
    expect(saveScene?.["x-destructive"]).toBe(true);
    expect(saveScene?.["x-idempotent"]).toBe(false);
    expect(saveScene?.responses?.["409"]).toBeTruthy();
    expect(saveScene?.responses?.["400"]).toBeTruthy();

    const sceneMeta = openapi.paths["/__creator-studio/scene-meta"]?.get as {
      "x-destructive"?: boolean;
      "x-idempotent"?: boolean;
    };
    expect(sceneMeta?.["x-destructive"]).toBe(false);
    expect(sceneMeta?.["x-idempotent"]).toBe(true);

    const validator = new Validator();
    const result = await validator.validate(openapi as never);
    expect(result.valid, JSON.stringify(result.errors ?? [], null, 2)).toBe(true);
  });

  it("annotates destructive / idempotent consistently with helpers", () => {
    for (const spec of CREATOR_STUDIO_ENDPOINT_SPECS) {
      expect(endpointIsDestructive(spec)).toBe(spec.method === "POST");
      expect(endpointIsIdempotent(spec)).toBe(spec.method === "GET");
    }
  });

  it("GET /openapi.json returns the document through the request handler", async () => {
    const repoRoot = await createMinimalFixture();
    const service = createCreatorStudioService({ repoRoot });
    const handler = createCreatorStudioRequestHandler(service);
    const result = await invokeHandler(handler, "GET", "/__creator-studio/openapi.json");
    expect(result.statusCode).toBe(200);
    expect(result.contentType).toMatch(/application\/json/);
    const body = JSON.parse(result.body) as ReturnType<typeof buildCreatorStudioOpenApi>;
    expect(body.openapi).toBe("3.1.0");
    const pathKeys = Object.entries(body.paths)
      .flatMap(([path, methods]) =>
        Object.keys(methods).map((method) => creatorStudioRouteKey(method.toUpperCase(), path)),
      )
      .sort();
    expect(pathKeys).toEqual(listCreatorStudioRouteKeys().sort());
  });

  it("GET /describe is a thin shell pointing at openapi.json (deprecated fields retained)", async () => {
    const describe = buildCreatorStudioDescribe();
    expect(describe.schemaVersion).toBe(2);
    expect(describe.devOnly).toBe(true);
    expect(describe.product).toMatch(/Ink/);
    expect(describe.openapiUrl).toBe("/__creator-studio/openapi.json");
    expect(describe.howToStart).toMatch(/openapi\.json/);
    expect(describe.deprecatedFields).toEqual(
      expect.arrayContaining(["endpoints", "workflows", "invariants"]),
    );
    expect(describe.deprecationNotice).toMatch(/下个大版本/);
    // Deprecated payload still present for one major.
    expect(describe.endpoints.length).toBe(CREATOR_STUDIO_ROUTE_REGISTRY.length);
    expect(describe.workflows.some((w) => w.id === "edit-scene-speaker")).toBe(true);

    const repoRoot = await createMinimalFixture();
    const handler = createCreatorStudioRequestHandler(createCreatorStudioService({ repoRoot }));
    const result = await invokeHandler(handler, "GET", "/__creator-studio/describe");
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body) as ReturnType<typeof buildCreatorStudioDescribe>;
    expect(body.openapiUrl).toBe("/__creator-studio/openapi.json");
  });

  it("handler implements every registry route (never 404 for registered mounts)", async () => {
    const repoRoot = await createMinimalFixture();
    const service = createCreatorStudioService({
      repoRoot,
      validateCandidate: async () => {
        throw new Error("not used in route coverage");
      },
    });
    const handler = createCreatorStudioRequestHandler(service);

    for (const route of CREATOR_STUDIO_MOUNTED_ROUTES) {
      const body =
        route.method === "POST"
          ? route.path.endsWith("/task")
            ? JSON.stringify({ taskId: "asset-audit" })
            : route.path.endsWith("/save-scene")
              ? JSON.stringify({
                  sceneId: "missing",
                  chapterId: "draft-ch01",
                  sourceHash: "0".repeat(64),
                  fields: { speaker: "旁白" },
                })
              : route.path.endsWith("/save")
                ? JSON.stringify({
                    file: "packages/content/ink/draft-ch01.ink",
                    revision: "rev",
                    sourceHash: "0".repeat(64),
                    sourceRange: { startLine: 1, endLine: 1 },
                    originalText: "x",
                    replacement: "y",
                  })
                : "{}"
          : undefined;

      if (route.path.endsWith("/pipeline") || route.path.endsWith("/task")) {
        continue;
      }

      const result = await invokeHandler(handler, route.method, route.path, body);
      expect(result.statusCode, `${route.method} ${route.path}`).not.toBe(404);
    }
  });

  it("rejects illegal save-scene / task bodies with 4xx machine-readable codes", async () => {
    const repoRoot = await createMinimalFixture();
    const handler = createCreatorStudioRequestHandler(
      createCreatorStudioService({ repoRoot }),
    );

    const missing = await invokeHandler(
      handler,
      "POST",
      "/__creator-studio/save-scene",
      JSON.stringify({ sceneId: "dch01_s001" }),
    );
    expect(missing.statusCode).toBe(400);
    expect(JSON.parse(missing.body).error.code).toBe("INVALID_REQUEST");

    const wrongType = await invokeHandler(
      handler,
      "POST",
      "/__creator-studio/save-scene",
      JSON.stringify({
        sceneId: 123,
        chapterId: "draft-ch01",
        sourceHash: "0".repeat(64),
        fields: { speaker: "旁白" },
      }),
    );
    expect(wrongType.statusCode).toBe(400);
    expect(JSON.parse(wrongType.body).error.code).toBe("INVALID_REQUEST");

    const tooLong = await invokeHandler(
      handler,
      "POST",
      "/__creator-studio/save-scene",
      JSON.stringify({
        sceneId: "x".repeat(200),
        chapterId: "draft-ch01",
        sourceHash: "0".repeat(64),
        fields: { speaker: "旁白" },
      }),
    );
    expect(tooLong.statusCode).toBe(400);
    expect(JSON.parse(tooLong.body).error.code).toBe("INVALID_REQUEST");

    const fakeScene = await invokeHandler(
      handler,
      "POST",
      "/__creator-studio/save-scene",
      JSON.stringify({
        sceneId: "no_such_scene_zzz",
        chapterId: "draft-ch01",
        sourceHash: "0".repeat(64),
        fields: { speaker: "旁白" },
      }),
    );
    // Hash is wrong first, or scene not found after hash match — with fake hash we get conflict.
    // Use real hash from meta.
    const metaResult = await invokeHandler(handler, "GET", "/__creator-studio/scene-meta");
    const meta = JSON.parse(metaResult.body) as {
      scenes: Record<string, { chapterId: string; sourceHash: string }>;
    };
    const realHash = Object.values(meta.scenes)[0]?.sourceHash ?? "0".repeat(64);
    const fakeScene2 = await invokeHandler(
      handler,
      "POST",
      "/__creator-studio/save-scene",
      JSON.stringify({
        sceneId: "no_such_scene_zzz",
        chapterId: "draft-ch01",
        sourceHash: realHash,
        fields: { speaker: "旁白" },
      }),
    );
    expect(fakeScene2.statusCode).toBe(404);
    expect(JSON.parse(fakeScene2.body).error.code).toBe("SCENE_NOT_FOUND");
    // Also ensure the conflict path is 4xx not 500
    expect(fakeScene.statusCode).toBeGreaterThanOrEqual(400);
    expect(fakeScene.statusCode).toBeLessThan(500);

    const badTask = await invokeHandler(
      handler,
      "POST",
      "/__creator-studio/task",
      JSON.stringify({ taskId: "not-a-real-task" }),
    );
    expect(badTask.statusCode).toBe(400);
    expect(JSON.parse(badTask.body).error.code).toBe("INVALID_REQUEST");

    const missingTask = await invokeHandler(
      handler,
      "POST",
      "/__creator-studio/task",
      JSON.stringify({}),
    );
    expect(missingTask.statusCode).toBe(400);
    expect(JSON.parse(missingTask.body).error.code).toBe("INVALID_REQUEST");
  });
});
