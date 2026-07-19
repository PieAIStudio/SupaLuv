/**
 * Creator Studio self-description catalog (AI-legibility SSOT).
 *
 * `GET /__creator-studio/describe` returns this document.
 * Endpoint list is keyed off CREATOR_STUDIO_ROUTE_REGISTRY so new mounts that
 * skip registration fail the unit coverage test.
 */

import { CREATOR_TASK_DEFS } from "./creatorTasks";
import type { CreatorStudioErrorCode } from "./creatorStudioServer";

export const CREATOR_STUDIO_BASE_PATH = "/__creator-studio";

export type CreatorStudioHttpMethod = "GET" | "POST";

/** Canonical mounted routes. Handler must implement every entry; describe must document every entry. */
export const CREATOR_STUDIO_ROUTE_REGISTRY = [
  { method: "GET", path: `${CREATOR_STUDIO_BASE_PATH}/describe` },
  { method: "GET", path: `${CREATOR_STUDIO_BASE_PATH}/graph` },
  { method: "GET", path: `${CREATOR_STUDIO_BASE_PATH}/scene-meta` },
  { method: "GET", path: `${CREATOR_STUDIO_BASE_PATH}/assets` },
  { method: "GET", path: `${CREATOR_STUDIO_BASE_PATH}/casting` },
  { method: "GET", path: `${CREATOR_STUDIO_BASE_PATH}/tasks` },
  { method: "POST", path: `${CREATOR_STUDIO_BASE_PATH}/save` },
  { method: "POST", path: `${CREATOR_STUDIO_BASE_PATH}/save-scene` },
  { method: "POST", path: `${CREATOR_STUDIO_BASE_PATH}/pipeline` },
  { method: "POST", path: `${CREATOR_STUDIO_BASE_PATH}/task` },
] as const satisfies readonly { readonly method: CreatorStudioHttpMethod; readonly path: string }[];

export type CreatorStudioRouteEntry = (typeof CREATOR_STUDIO_ROUTE_REGISTRY)[number];

export function creatorStudioRouteKey(method: string, path: string): string {
  return `${method} ${path}`;
}

export function listCreatorStudioRouteKeys(): string[] {
  return CREATOR_STUDIO_ROUTE_REGISTRY.map((route) =>
    creatorStudioRouteKey(route.method, route.path),
  );
}

/** Known error codes emitted by CreatorStudioError (keep in lockstep with CreatorStudioErrorCode). */
export const CREATOR_STUDIO_ERROR_CODES = [
  "INVALID_REQUEST",
  "INVALID_PATH",
  "HASH_CONFLICT",
  "GRAPH_CONFLICT",
  "RANGE_DRIFT",
  "INVALID_REPLACEMENT",
  "COMPILE_FAILED",
  "TOPOLOGY_CHANGED",
  "VALIDATION_FAILED",
  "SCENE_NOT_FOUND",
  "TASK_BUSY",
  "SAVE_FAILED",
] as const satisfies readonly CreatorStudioErrorCode[];

export interface CreatorStudioFieldShape {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly description: string;
  /** Where a cold agent obtains legal values (endpoint field, fixed enum, etc.). */
  readonly legalValuesFrom?: string;
}

export interface CreatorStudioErrorSemantics {
  readonly code: string;
  readonly httpStatus: number;
  readonly meaning: string;
}

export interface CreatorStudioEndpointSpec {
  readonly method: CreatorStudioHttpMethod;
  readonly path: string;
  readonly purpose: string;
  readonly contentType?: string;
  readonly requestBody: {
    readonly fields: readonly CreatorStudioFieldShape[];
    readonly notes?: string;
  } | null;
  readonly response: {
    readonly contentType: string;
    readonly shape: string;
    readonly notes?: string;
  };
  readonly errors: readonly CreatorStudioErrorSemantics[];
}

export interface CreatorStudioWorkflowStep {
  readonly step: number;
  readonly action: string;
  readonly method?: CreatorStudioHttpMethod;
  readonly path?: string;
  readonly detail: string;
}

export interface CreatorStudioWorkflow {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly steps: readonly CreatorStudioWorkflowStep[];
}

const TASK_IDS = CREATOR_TASK_DEFS.map((task) => task.id).join(" | ");

const ERROR_JSON = `{ "error": { "code": string, "message": string } }`;

const SAVE_SCENE_ERRORS: readonly CreatorStudioErrorSemantics[] = [
  {
    code: "INVALID_REQUEST",
    httpStatus: 400,
    meaning: "缺少 sceneId / chapterId / sourceHash / fields，或 JSON 非法。",
  },
  {
    code: "INVALID_PATH",
    httpStatus: 403,
    meaning: "chapterId 不在 production catalog，或 manifest 路径非法。",
  },
  {
    code: "HASH_CONFLICT",
    httpStatus: 409,
    meaning: "磁盘 manifest 的 sha256 与 sourceHash 不一致；刷新 scene-meta 后重试。磁盘未改动。",
  },
  {
    code: "SCENE_NOT_FOUND",
    httpStatus: 404,
    meaning: "该 manifest 中找不到 sceneId。",
  },
  {
    code: "VALIDATION_FAILED",
    httpStatus: 422,
    meaning: "字段非法，或写入后 content typecheck 失败并已自动回滚。",
  },
  {
    code: "SAVE_FAILED",
    httpStatus: 500,
    meaning: "未预期的保存失败。",
  },
];

const TASK_BUSY_ERROR: CreatorStudioErrorSemantics = {
  code: "TASK_BUSY",
  httpStatus: 409,
  meaning: "已有 pipeline 或 task 在运行（排他锁）；等结束后再试。响应体 error.message 含 busy 任务 id。",
};

/**
 * Full endpoint documentation. Must cover exactly CREATOR_STUDIO_ROUTE_REGISTRY
 * (enforced by unit test + buildCreatorStudioDescribe assertion).
 */
export const CREATOR_STUDIO_ENDPOINT_SPECS: readonly CreatorStudioEndpointSpec[] = [
  {
    method: "GET",
    path: `${CREATOR_STUDIO_BASE_PATH}/describe`,
    purpose: "返回本 Studio 的完整自描述 JSON（本文件）。冷启动 AI 的唯一机读入口。",
    requestBody: null,
    response: {
      contentType: "application/json",
      shape:
        "{ schemaVersion, product, basePath, devOnly, endpoints[], workflows[], invariants[], errorCodes[], taskDefs[] }",
    },
    errors: [],
  },
  {
    method: "GET",
    path: `${CREATOR_STUDIO_BASE_PATH}/graph`,
    purpose: "读取创作用地图（Ink 拓扑派生的 NarrativeGraphCreator）及白名单 Ink 文件的 source hash。",
    requestBody: null,
    response: {
      contentType: "application/json",
      shape:
        "{ graph: NarrativeGraphCreator, sources: Record<repoRelativeInkPath, { hash: sha256Hex }> }",
      notes: "graph.revision 用于 POST /save 乐观并发；sources[file].hash 用于 Ink 文本保存。",
    },
    errors: [
      {
        code: "VALIDATION_FAILED",
        httpStatus: 500,
        meaning: "story-catalog 无 production Ink 或图文件不可读。",
      },
    ],
  },
  {
    method: "GET",
    path: `${CREATOR_STUDIO_BASE_PATH}/scene-meta`,
    purpose:
      "读取全部 production 场景卡片、合法 speaker/artKey/videoKey 列表，以及各 manifest 文件 hash（场景保存前必调）。",
    requestBody: null,
    response: {
      contentType: "application/json",
      shape: `{
  speakers: string[],          // 合法 speaker；始终含「旁白」「系统」
  artKeys: string[],           // 来自 VISUAL-ASSET-INTAKE.json
  videoKeys: string[],         // apps/web/public/assets/video/*.mp4 去扩展名
  sceneIds: string[],
  scenes: Record<sceneId, {
    id, speaker?, artKey?, videoKey?, aiBranch,
    chapterId,                 // 保存时必传
    file,                      // manifest 仓库相对路径
    sourceHash                 // 该 manifest 文件当前 sha256；保存时必传
  }>,
  manifests: Record<manifestPath, { hash: sha256Hex }>
}`,
      notes: "改 speaker 前：用 scenes[sceneId].sourceHash 与 chapterId；合法 speaker 用 speakers[]。",
    },
    errors: [
      {
        code: "VALIDATION_FAILED",
        httpStatus: 500,
        meaning: "story-catalog 无 production manifest。",
      },
    ],
  },
  {
    method: "GET",
    path: `${CREATOR_STUDIO_BASE_PATH}/assets`,
    purpose: "列出视觉 intake + runtime ledger 合并后的资产台账（Asset Bay）。",
    requestBody: null,
    response: {
      contentType: "application/json",
      shape: `{
  assets: Array<{
    id, kind, path, publicPath, qualityStatus, rightsStatus,
    bytes, notes, sources: ("intake"|"ledger")[],
    sha256, fileStatus, ledgerReleaseStatus, ledgerSource
  }>,
  kinds: string[]
}`,
    },
    errors: [],
  },
  {
    method: "GET",
    path: `${CREATOR_STUDIO_BASE_PATH}/casting`,
    purpose: "读取选角台数据：角色 registry、立绘、预览语音映射。",
    requestBody: null,
    response: {
      contentType: "application/json",
      shape: `{
  characters: Array<{
    id, name, description, side, defaultPortrait, voiceId,
    portraits: Array<{ stem, fileName, publicPath }>,
    previewVoicePath, previewVoiceKey
  }>,
  voiceMap: Record<string, string>,
  castIndexSource: "memory" | "static" | "generated"
}`,
    },
    errors: [],
  },
  {
    method: "GET",
    path: `${CREATOR_STUDIO_BASE_PATH}/tasks`,
    purpose: "列出任务控制台可运行任务与当前是否有任务占用排他锁。",
    requestBody: null,
    response: {
      contentType: "application/json",
      shape: `{ tasks: Array<{ id, label, description }>, busyTask: string | null }`,
      notes: `当前任务 id：${TASK_IDS}。`,
    },
    errors: [],
  },
  {
    method: "POST",
    path: `${CREATOR_STUDIO_BASE_PATH}/save`,
    purpose:
      "在 source range 内改 Ink 对白文本（不改拓扑）。先编译 + 生成 narrative graph，拓扑不变才原子写盘。",
    requestBody: {
      notes: "仅允许白名单 production Ink；不能增删行、不能引入 divert/choice/tag 等结构。",
      fields: [
        {
          name: "file",
          type: "string",
          required: true,
          description: "仓库相对 Ink 路径，如 packages/content/ink/draft-ch01.ink",
          legalValuesFrom: "GET /graph → sources 的 key；须在 story-catalog productionChapters 白名单内",
        },
        {
          name: "revision",
          type: "string",
          required: true,
          description: "graph.revision，乐观锁",
          legalValuesFrom: "GET /graph → graph.revision",
        },
        {
          name: "sourceHash",
          type: "string",
          required: true,
          description: "目标 Ink 文件当前 sha256",
          legalValuesFrom: "GET /graph → sources[file].hash",
        },
        {
          name: "sourceRange",
          type: "{ startLine: number, endLine: number }",
          required: true,
          description: "1-based 闭区间行号，须与 graph 中某 dialogueLine 一致",
          legalValuesFrom: "GET /graph → graph.nodes[].dialogueLines[].sourceRange",
        },
        {
          name: "originalText",
          type: "string",
          required: true,
          description: "当前行文本（可与磁盘缩进差 trim 匹配）",
          legalValuesFrom: "GET /graph → dialogueLines[].text",
        },
        {
          name: "replacement",
          type: "string",
          required: true,
          description: "替换文本；行数必须等于 endLine-startLine+1；不能含结构语句",
        },
      ],
    },
    response: {
      contentType: "application/json",
      shape: "同 GET /graph 的 CreatorGraphEnvelope（保存成功后的新图与 hash）",
    },
    errors: [
      {
        code: "INVALID_REQUEST",
        httpStatus: 400,
        meaning: "字段不完整或 source range 非法。",
      },
      {
        code: "INVALID_PATH",
        httpStatus: 403,
        meaning: "文件不在白名单或不在仓库内。",
      },
      {
        code: "GRAPH_CONFLICT",
        httpStatus: 409,
        meaning: "revision 已变；刷新 graph 后重试。",
      },
      {
        code: "HASH_CONFLICT",
        httpStatus: 409,
        meaning: "Ink 文件 hash 已变；刷新后重试，磁盘未改动。",
      },
      {
        code: "RANGE_DRIFT",
        httpStatus: 409,
        meaning: "行号/原文与磁盘或 graph 不一致。",
      },
      {
        code: "INVALID_REPLACEMENT",
        httpStatus: 422,
        meaning: "增删行或引入结构语句。",
      },
      {
        code: "COMPILE_FAILED",
        httpStatus: 422,
        meaning: "Ink 编译失败，磁盘未改动。",
      },
      {
        code: "TOPOLOGY_CHANGED",
        httpStatus: 422,
        meaning: "候选文本改变了节点/choice/divert 拓扑。",
      },
      {
        code: "VALIDATION_FAILED",
        httpStatus: 422,
        meaning: "NarrativeGraph 生成或完整性失败，磁盘未改动。",
      },
      {
        code: "SAVE_FAILED",
        httpStatus: 500,
        meaning: "原子替换失败（会尝试回滚原文件）。",
      },
    ],
  },
  {
    method: "POST",
    path: `${CREATOR_STUDIO_BASE_PATH}/save-scene`,
    purpose:
      "更新场景 manifest 可编辑字段（speaker / artKey / videoKey / aiBranch）。写入后跑 content typecheck，失败自动回滚。",
    requestBody: {
      notes:
        "fields 只应包含要改的键。speaker 必须来自 scene-meta.speakers；artKey 来自 artKeys；videoKey 来自 videoKeys 或省略。",
      fields: [
        {
          name: "sceneId",
          type: "string",
          required: true,
          description: "场景稳定 id，如 dch01_s005",
          legalValuesFrom: "GET /scene-meta → sceneIds 或 scenes 的 key",
        },
        {
          name: "chapterId",
          type: "string",
          required: true,
          description: "章节 id，如 draft-ch01",
          legalValuesFrom: "GET /scene-meta → scenes[sceneId].chapterId",
        },
        {
          name: "sourceHash",
          type: "string",
          required: true,
          description: "该场景所在 manifest 文件当前 sha256",
          legalValuesFrom: "GET /scene-meta → scenes[sceneId].sourceHash（或 manifests[file].hash）",
        },
        {
          name: "fields",
          type: "SceneEditableFields object",
          required: true,
          description:
            "可含 speaker?: string; artKey?: string; videoKey?: string; aiBranch?: { enabled: true, rejoinSceneId: string, context: string, waitLabel?, maxAiBeats?, artPool?, portraitPool?, speakerPool? } | null（null 删除 aiBranch）",
          legalValuesFrom:
            "speaker → scene-meta.speakers；artKey → scene-meta.artKeys；videoKey → scene-meta.videoKeys",
        },
      ],
    },
    response: {
      contentType: "application/json",
      shape: "同 GET /scene-meta 的完整 CreatorSceneMeta（保存成功后刷新视图）",
    },
    errors: SAVE_SCENE_ERRORS,
  },
  {
    method: "POST",
    path: `${CREATOR_STUDIO_BASE_PATH}/pipeline`,
    purpose:
      "一键编译校验管线：compile-ink → generate-narrative-graph → content typecheck。响应为 NDJSON 流式日志。",
    contentType: "application/json（body 可为空对象 {}）",
    requestBody: {
      fields: [],
      notes: "body 可省略或为 {}；无需字段。",
    },
    response: {
      contentType: "application/x-ndjson",
      shape: `每行一个 JSON 事件：
  { type: "step_start", step, command }
  { type: "stdout"|"stderr", step, chunk }
  { type: "step_end", step, ok, exitCode }
  { type: "done", ok }
  { type: "result", ok, steps: string[] }   // 流结束前服务端追加
  { type: "error", code?, message }         // 流已开始后的失败
步骤 step 顺序：compile-ink, generate-narrative-graph, typecheck`,
      notes: "若在获取锁前失败，返回 application/json 错误体（如 TASK_BUSY）。",
    },
    errors: [TASK_BUSY_ERROR],
  },
  {
    method: "POST",
    path: `${CREATOR_STUDIO_BASE_PATH}/task`,
    purpose: "运行任务控制台中的长任务，NDJSON 流式日志；与 pipeline 共享排他锁。",
    contentType: "application/json",
    requestBody: {
      fields: [
        {
          name: "taskId",
          type: "string",
          required: true,
          description: "任务 id",
          legalValuesFrom: `固定枚举：${TASK_IDS}；或 GET /tasks → tasks[].id`,
        },
      ],
    },
    response: {
      contentType: "application/x-ndjson",
      shape: "同 /pipeline 的 NDJSON 事件；result.steps 为该任务步骤名",
    },
    errors: [
      {
        code: "INVALID_REQUEST",
        httpStatus: 400,
        meaning: `taskId 不是 ${TASK_IDS}。`,
      },
      TASK_BUSY_ERROR,
    ],
  },
];

export const CREATOR_STUDIO_WORKFLOWS: readonly CreatorStudioWorkflow[] = [
  {
    id: "edit-scene-speaker",
    title: "改一个场景的 speaker 并保存",
    summary:
      "先 GET scene-meta 取合法值与 hash，再 POST save-scene；遇 409/HASH_CONFLICT 刷新后重试。",
    steps: [
      {
        step: 1,
        action: "读取场景元数据",
        method: "GET",
        path: `${CREATOR_STUDIO_BASE_PATH}/scene-meta`,
        detail:
          "curl -sS http://127.0.0.1:<port>/__creator-studio/scene-meta。从 JSON 中取：scenes[\"dch01_s005\"].chapterId、.sourceHash、.speaker；确认目标 speaker 在 speakers[] 内（如「系统」「旁白」）。",
      },
      {
        step: 2,
        action: "保存 speaker 字段",
        method: "POST",
        path: `${CREATOR_STUDIO_BASE_PATH}/save-scene`,
        detail: `curl -sS -X POST http://127.0.0.1:<port>/__creator-studio/save-scene \\
  -H 'content-type: application/json' \\
  -d '{"sceneId":"dch01_s005","chapterId":"<from step1>","sourceHash":"<from step1>","fields":{"speaker":"系统"}}'
成功时 HTTP 200，body 为刷新后的 scene-meta；scenes[sceneId].speaker 应为新值。服务端会 typecheck，失败则回滚并 422 VALIDATION_FAILED。`,
      },
      {
        step: 3,
        action: "处理 HASH_CONFLICT",
        detail:
          "若 HTTP 409 且 error.code === \"HASH_CONFLICT\"：不要重放旧 sourceHash。重新执行 step 1 取新 hash，再 step 2。磁盘在冲突时未改动。",
      },
      {
        step: 4,
        action: "（可选）改回原 speaker",
        method: "POST",
        path: `${CREATOR_STUDIO_BASE_PATH}/save-scene`,
        detail:
          "用 step 2 成功响应里的新 sourceHash，再 POST fields.speaker 为原值（如「旁白」）。每次成功保存后 hash 都会变。",
      },
    ],
  },
  {
    id: "run-pipeline-stream",
    title: "跑一键编译校验管线并读流式日志",
    summary: "POST /pipeline，按行解析 NDJSON，直到 type=done 或 type=result。",
    steps: [
      {
        step: 1,
        action: "（可选）确认无任务占用",
        method: "GET",
        path: `${CREATOR_STUDIO_BASE_PATH}/tasks`,
        detail: "busyTask 应为 null；否则等当前任务结束或稍后重试。",
      },
      {
        step: 2,
        action: "启动管线",
        method: "POST",
        path: `${CREATOR_STUDIO_BASE_PATH}/pipeline`,
        detail: `curl -sS -N -X POST http://127.0.0.1:<port>/__creator-studio/pipeline \\
  -H 'accept: application/x-ndjson' -H 'content-type: application/json' -d '{}'
-N 关闭缓冲以便边下边看。`,
      },
      {
        step: 3,
        action: "解读事件流",
        detail:
          "按行 JSON.parse。step_start/stdout/stderr/step_end 为进度；done.ok 或 result.ok 为总成败。中途某 step 失败会 done.ok=false 并停止后续步骤。409 TASK_BUSY 时 body 是 JSON error 而非 NDJSON。",
      },
    ],
  },
  {
    id: "list-assets-and-casting",
    title: "列出资产 / 选角数据",
    summary: "GET /assets 与 GET /casting，只读台账。",
    steps: [
      {
        step: 1,
        action: "列资产",
        method: "GET",
        path: `${CREATOR_STUDIO_BASE_PATH}/assets`,
        detail:
          "curl -sS http://127.0.0.1:<port>/__creator-studio/assets。用 kinds 过滤；publicPath 为浏览器可加载路径（若有）。",
      },
      {
        step: 2,
        action: "列选角",
        method: "GET",
        path: `${CREATOR_STUDIO_BASE_PATH}/casting`,
        detail:
          "curl -sS http://127.0.0.1:<port>/__creator-studio/casting。characters[] 含立绘 portraits 与 previewVoicePath。",
      },
    ],
  },
];

export const CREATOR_STUDIO_INVARIANTS: readonly string[] = [
  "唯一真相源：Ink 是剧情拓扑真相；scene manifest（packages/content/manifests/*）是场景表现真相；NarrativeGraph 为派生图。",
  "dev-only：仅 Vite command===serve 且 mode!==production 时挂载；pnpm build / 生产产物不含这些写接口。",
  "场景保存闸门：POST /save-scene 先写盘再 pnpm --filter @supaluv/content typecheck；失败自动回滚 manifest，返回 VALIDATION_FAILED。",
  "Ink 保存闸门：POST /save 在临时候选上编译+生成 graph；拓扑签名变化则 TOPOLOGY_CHANGED，磁盘不改；成功才原子替换 ink/compiled/graphs。",
  "乐观并发：Ink 用 revision + sourceHash；场景用 sourceHash。冲突返回 409，不覆盖他人写入。",
  "排他锁：pipeline 与 task 共用一把锁；并发第二请求 409 TASK_BUSY。",
  "Ink 第一版编辑边界：不可增删行、不可引入 divert/choice/tag/结构语句；只能改既有对白文字。",
  "路径沙箱：只能改 story-catalog production 白名单内的 Ink 与 production manifest。",
  "错误体形状（非流式）：{ error: { code, message } }；流式已开始后的错误为 NDJSON { type:\"error\", code?, message }。",
];

export const CREATOR_STUDIO_PRODUCT = [
  "SupaLuv Creator Studio 是本地 dev-only 创作表面：在浏览器里看剧情图、改场景 manifest 字段、改白名单 Ink 对白，并触发编译/校验任务。",
  "唯一真相源原则：Ink 源文件是剧情拓扑（节点/choice/divert）的真相；scene manifest 是场景表现（speaker/artKey/videoKey/aiBranch 等）的真相；生成的 narrative graph 与 compiled JSON 是派生产物，不能当作可手改 SSOT。",
  "本 describe 文档由服务端常量结构生成，与路由注册表同源；不要依赖会漂移的平行文档。",
].join(" ");

export interface CreatorStudioDescribeDocument {
  readonly schemaVersion: 1;
  readonly product: string;
  readonly basePath: string;
  readonly devOnly: true;
  readonly howToStart: string;
  readonly endpoints: readonly CreatorStudioEndpointSpec[];
  readonly workflows: readonly CreatorStudioWorkflow[];
  readonly invariants: readonly string[];
  readonly errorCodes: readonly {
    readonly code: CreatorStudioErrorCode;
    readonly typicalHttpStatus: string;
  }[];
  readonly taskDefs: typeof CREATOR_TASK_DEFS;
  readonly errorResponseShape: string;
}

function assertEndpointsCoverRegistry(
  endpoints: readonly CreatorStudioEndpointSpec[],
): void {
  const registry = new Set(listCreatorStudioRouteKeys());
  const documented = new Set(
    endpoints.map((endpoint) => creatorStudioRouteKey(endpoint.method, endpoint.path)),
  );
  for (const key of registry) {
    if (!documented.has(key)) {
      throw new Error(`describe catalog missing mounted route: ${key}`);
    }
  }
  for (const key of documented) {
    if (!registry.has(key)) {
      throw new Error(`describe catalog has undocumented-as-mounted route: ${key}`);
    }
  }
}

/** Build the machine-readable Studio manual (same object GET /describe returns). */
export function buildCreatorStudioDescribe(): CreatorStudioDescribeDocument {
  assertEndpointsCoverRegistry(CREATOR_STUDIO_ENDPOINT_SPECS);
  return {
    schemaVersion: 1,
    product: CREATOR_STUDIO_PRODUCT,
    basePath: CREATOR_STUDIO_BASE_PATH,
    devOnly: true,
    howToStart:
      "仓库根目录：pnpm --filter @supaluv/web dev（默认 http://127.0.0.1:5173）。仅 dev server 暴露本 API；先 GET /__creator-studio/describe。",
    endpoints: CREATOR_STUDIO_ENDPOINT_SPECS,
    workflows: CREATOR_STUDIO_WORKFLOWS,
    invariants: CREATOR_STUDIO_INVARIANTS,
    errorCodes: CREATOR_STUDIO_ERROR_CODES.map((code) => ({
      code,
      typicalHttpStatus:
        code === "HASH_CONFLICT" ||
        code === "GRAPH_CONFLICT" ||
        code === "RANGE_DRIFT" ||
        code === "TASK_BUSY"
          ? "409"
          : code === "INVALID_PATH"
            ? "403"
            : code === "SCENE_NOT_FOUND"
              ? "404"
              : code === "INVALID_REQUEST"
                ? "400 or 413"
                : code === "SAVE_FAILED"
                  ? "500"
                  : "422",
    })),
    taskDefs: CREATOR_TASK_DEFS,
    errorResponseShape: ERROR_JSON,
  };
}
