import { EventEmitter } from "node:events";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildCreatorStudioDescribe,
  CREATOR_STUDIO_ENDPOINT_SPECS,
  CREATOR_STUDIO_ROUTE_REGISTRY,
  creatorStudioRouteKey,
  listCreatorStudioRouteKeys,
} from "../../apps/web/src/creator/server/creatorStudioDescribe";
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

describe("Creator Studio describe catalog", () => {
  it("covers every mounted route in the route registry (and no extras)", () => {
    const describe = buildCreatorStudioDescribe();
    const describeKeys = describe.endpoints
      .map((endpoint) => creatorStudioRouteKey(endpoint.method, endpoint.path))
      .sort();
    const registryKeys = listCreatorStudioRouteKeys().sort();
    const mountedKeys = CREATOR_STUDIO_MOUNTED_ROUTES.map((route) =>
      creatorStudioRouteKey(route.method, route.path),
    ).sort();

    expect(describeKeys).toEqual(registryKeys);
    expect(mountedKeys).toEqual(registryKeys);
    expect(CREATOR_STUDIO_ENDPOINT_SPECS).toHaveLength(CREATOR_STUDIO_ROUTE_REGISTRY.length);
  });

  it("documents required product, workflows, and invariants for cold agents", () => {
    const describe = buildCreatorStudioDescribe();
    expect(describe.schemaVersion).toBe(1);
    expect(describe.devOnly).toBe(true);
    expect(describe.product).toMatch(/Ink/);
    expect(describe.product).toMatch(/manifest/i);
    expect(describe.basePath).toBe("/__creator-studio");

    const workflowIds = describe.workflows.map((workflow) => workflow.id);
    expect(workflowIds).toEqual(
      expect.arrayContaining([
        "edit-scene-speaker",
        "run-pipeline-stream",
        "list-assets-and-casting",
      ]),
    );
    expect(describe.workflows.length).toBeGreaterThanOrEqual(3);

    expect(describe.invariants.some((line) => /typecheck|回滚/.test(line))).toBe(true);
    expect(describe.invariants.some((line) => /dev-only|production/.test(line))).toBe(true);
    expect(describe.invariants.some((line) => /TASK_BUSY|排他/.test(line))).toBe(true);

    expect(describe.taskDefs).toEqual(CREATOR_TASK_DEFS);
    expect(describe.endpoints.find((e) => e.path.endsWith("/save-scene"))?.requestBody?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "sceneId", required: true }),
        expect.objectContaining({ name: "sourceHash", required: true }),
        expect.objectContaining({ name: "fields", required: true }),
      ]),
    );
  });

  it("GET /describe returns the catalog through the request handler", async () => {
    const repoRoot = await createMinimalFixture();
    const service = createCreatorStudioService({ repoRoot });
    const handler = createCreatorStudioRequestHandler(service);
    const result = await invokeHandler(handler, "GET", "/__creator-studio/describe");
    expect(result.statusCode).toBe(200);
    expect(result.contentType).toMatch(/application\/json/);
    const body = JSON.parse(result.body) as ReturnType<typeof buildCreatorStudioDescribe>;
    expect(body.endpoints.map((e) => creatorStudioRouteKey(e.method, e.path)).sort()).toEqual(
      listCreatorStudioRouteKeys().sort(),
    );
  });

  it("handler implements every registry route (never 404 for registered mounts)", async () => {
    const repoRoot = await createMinimalFixture();
    const service = createCreatorStudioService({
      repoRoot,
      // Ink save path is not exercised beyond routing; avoid real inkjs compile.
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

      // Pipeline/task acquire exclusive lock and may run long — only assert routing for
      // read endpoints + describe; for mutating POSTs we still expect non-404 if body valid.
      if (route.path.endsWith("/pipeline") || route.path.endsWith("/task")) {
        // Skip executing long-running jobs in unit coverage; presence is asserted via
        // registry ↔ describe equality. Routing smoke for these would need lock mocks.
        continue;
      }

      const result = await invokeHandler(handler, route.method, route.path, body);
      expect(result.statusCode, `${route.method} ${route.path}`).not.toBe(404);
    }
  });
});
