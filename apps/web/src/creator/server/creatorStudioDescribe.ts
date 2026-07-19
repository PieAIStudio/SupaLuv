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

/** Canonical mounted routes. Handler must implement every entry; openapi must document every entry. */
export const CREATOR_STUDIO_ROUTE_REGISTRY = [
  { method: "GET", path: `${CREATOR_STUDIO_BASE_PATH}/describe` },
  { method: "GET", path: `${CREATOR_STUDIO_BASE_PATH}/openapi.json` },
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
 * (enforced by unit test + buildCreatorStudioOpenApi / assertEndpointsCoverRegistry).
 */
export const CREATOR_STUDIO_ENDPOINT_SPECS: readonly CreatorStudioEndpointSpec[] = [
  {
    method: "GET",
    path: `${CREATOR_STUDIO_BASE_PATH}/describe`,
    purpose:
      "薄壳自描述：product 一句话 + howToStart + openapiUrl。完整契约见 GET /openapi.json（OpenAPI 3.1）。旧字段 endpoints/workflows 等已 deprecated。",
    requestBody: null,
    response: {
      contentType: "application/json",
      shape:
        "{ schemaVersion: 2, product, basePath, devOnly, howToStart, openapiUrl, deprecatedFields[], endpoints? (deprecated), workflows? (deprecated), ... }",
    },
    errors: [],
  },
  {
    method: "GET",
    path: `${CREATOR_STUDIO_BASE_PATH}/openapi.json`,
    purpose:
      "标准 OpenAPI 3.1 文档（paths/operations/requestBody/response JSON Schema、x-destructive、x-idempotent、错误码 responses、x-supaluv-workflows / x-supaluv-invariants）。冷启动 AI 的主入口。",
    requestBody: null,
    response: {
      contentType: "application/json",
      shape:
        "OpenAPI 3.1 document: { openapi: \"3.1.0\", info, servers, paths, components.schemas, x-supaluv-workflows, x-supaluv-invariants, x-supaluv-error-codes, x-supaluv-task-defs }",
      notes:
        "由 CREATOR_STUDIO_ENDPOINT_SPECS 同一注册表生成；新路由未注册必被单测抓到。五类冷启动任务：读取 / 修改 / 冲突 / 非法输入 / 回滚，见 x-supaluv-workflows。",
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
    title: "五类冷启动：读 / 改 speaker / 冲突 / 非法输入 / 回滚",
    summary:
      "只凭 openapi.json：GET scene-meta 读取 → POST save-scene 修改 → 过期 hash 得 HASH_CONFLICT → 缺字段/假 sceneId 得 4xx → 再 POST 还原并确认一致。",
    steps: [
      {
        step: 1,
        action: "读取：列出某场景当前字段",
        method: "GET",
        path: `${CREATOR_STUDIO_BASE_PATH}/scene-meta`,
        detail:
          "curl -sS http://127.0.0.1:<port>/__creator-studio/scene-meta。从 JSON 取 scenes[\"dch01_s005\"]（或任意 sceneIds[] 项）的 chapterId、sourceHash、speaker、artKey 等；合法 speaker 在 speakers[]。",
      },
      {
        step: 2,
        action: "修改：改 speaker 并确认落盘",
        method: "POST",
        path: `${CREATOR_STUDIO_BASE_PATH}/save-scene`,
        detail: `curl -sS -X POST http://127.0.0.1:<port>/__creator-studio/save-scene \\
  -H 'content-type: application/json' \\
  -d '{"sceneId":"dch01_s005","chapterId":"<from step1>","sourceHash":"<from step1>","fields":{"speaker":"系统"}}'
成功 HTTP 200，body 为刷新后的 scene-meta；scenes[sceneId].speaker 为新值，sourceHash 已变。服务端 typecheck 失败则回滚并 422 VALIDATION_FAILED。x-destructive: true。`,
      },
      {
        step: 3,
        action: "冲突：用过期 hash 提交",
        method: "POST",
        path: `${CREATOR_STUDIO_BASE_PATH}/save-scene`,
        detail:
          "用 step1 的旧 sourceHash 再 POST（任意合法 fields）。期望 HTTP 409，error.code === \"HASH_CONFLICT\"，磁盘未改。恢复：重新 GET /scene-meta 取新 sourceHash 后再写。",
      },
      {
        step: 4,
        action: "非法输入：缺字段 / 假 sceneId",
        method: "POST",
        path: `${CREATOR_STUDIO_BASE_PATH}/save-scene`,
        detail: `缺字段：curl -sS -X POST .../save-scene -H 'content-type: application/json' -d '{"sceneId":"x"}'
→ 400 INVALID_REQUEST（机器可读 error.code）。
假 sceneId：带齐全字段与当前合法 sourceHash，sceneId 用 "no_such_scene_zzz"
→ 404 SCENE_NOT_FOUND。
超长字符串 / 错类型同样 400 INVALID_REQUEST，不会 500 或静默成功。`,
      },
      {
        step: 5,
        action: "回滚：还原 speaker 并确认与初始一致",
        method: "POST",
        path: `${CREATOR_STUDIO_BASE_PATH}/save-scene`,
        detail:
          "GET scene-meta 取当前 sourceHash，POST fields.speaker 为 step1 记录的原值。再 GET 确认 scenes[sceneId].speaker 与初始一致。每次成功保存后 hash 都会变，必须用最新 sourceHash。",
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
  "完整 HTTP 契约以 GET /__creator-studio/openapi.json（OpenAPI 3.1，与路由注册表同源生成）为准；describe 仅为薄壳入口。",
].join(" ");

/** Fields kept on describe for one release; remove in next major. */
export const CREATOR_STUDIO_DESCRIBE_DEPRECATED_FIELDS = [
  "endpoints",
  "workflows",
  "invariants",
  "errorCodes",
  "taskDefs",
  "errorResponseShape",
] as const;

export interface CreatorStudioDescribeDocument {
  readonly schemaVersion: 2;
  readonly product: string;
  readonly basePath: string;
  readonly devOnly: true;
  readonly howToStart: string;
  /** Primary machine-readable contract (OpenAPI 3.1). */
  readonly openapiUrl: string;
  readonly deprecatedFields: readonly (typeof CREATOR_STUDIO_DESCRIBE_DEPRECATED_FIELDS)[number][];
  readonly deprecationNotice: string;
  /** @deprecated Use openapiUrl — removed next major. */
  readonly endpoints: readonly CreatorStudioEndpointSpec[];
  /** @deprecated Use openapi x-supaluv-workflows — removed next major. */
  readonly workflows: readonly CreatorStudioWorkflow[];
  /** @deprecated Use openapi x-supaluv-invariants — removed next major. */
  readonly invariants: readonly string[];
  /** @deprecated Use openapi x-supaluv-error-codes — removed next major. */
  readonly errorCodes: readonly {
    readonly code: CreatorStudioErrorCode;
    readonly typicalHttpStatus: string;
  }[];
  /** @deprecated Use openapi x-supaluv-task-defs — removed next major. */
  readonly taskDefs: typeof CREATOR_TASK_DEFS;
  /** @deprecated Use openapi components.schemas.ErrorBody — removed next major. */
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

/**
 * Thin describe shell for GET /describe.
 * Full contract: GET /openapi.json (OpenAPI 3.1, same registry SSOT).
 * Deprecated fields retained for one major; do not add new consumers.
 */
export function buildCreatorStudioDescribe(): CreatorStudioDescribeDocument {
  assertEndpointsCoverRegistry(CREATOR_STUDIO_ENDPOINT_SPECS);
  return {
    schemaVersion: 2,
    product: CREATOR_STUDIO_PRODUCT,
    basePath: CREATOR_STUDIO_BASE_PATH,
    devOnly: true,
    howToStart:
      "仓库根目录：pnpm --filter @supaluv/web dev（默认 http://127.0.0.1:5173，仅绑定 localhost）。仅 dev server 暴露本 API。先 GET /__creator-studio/openapi.json 读完整契约与 x-supaluv-workflows，再按 workflow 用 curl 操作。",
    openapiUrl: `${CREATOR_STUDIO_BASE_PATH}/openapi.json`,
    deprecatedFields: CREATOR_STUDIO_DESCRIBE_DEPRECATED_FIELDS,
    deprecationNotice:
      "endpoints / workflows / invariants / errorCodes / taskDefs / errorResponseShape 已迁入 OpenAPI 3.1（openapiUrl）。下个大版本将从 /describe 删除；新集成请只读 openapi.json。",
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
