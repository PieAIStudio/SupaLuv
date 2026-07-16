import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../../../..");
const packagePrefix = "packages/content/assets/candidates/round15-props";

const provenanceType = "project_generated_agent_authored_vector_candidate";
const provenanceCreatedWith =
  "Grok/agent-authored editable SVG vector candidates; rendered locally with Sharp (no external images/fonts/templates)";
const provenanceNotes =
  "Agent-generated project vectors from local project inputs only (SPEC-0003 Presentation bible, draft-ch01/ch02 Ink scenes, web style tokens, prop-ui-web-16x9 intake contract). Not authored by the human project owner. Candidate-only; no runtime integration, rights clearance, or human art approval is asserted.";

function formatWithOxfmt(filePath) {
  const oxfmtBin = resolve(repoRoot, "node_modules/.bin/oxfmt");
  if (!existsSync(oxfmtBin)) {
    throw new Error(`oxfmt not found at ${oxfmtBin}; run pnpm install at repo root`);
  }
  execFileSync(oxfmtBin, [filePath, "--write"], { cwd: repoRoot, stdio: "inherit" });
}

const candidates = [
  {
    id: "prop-protocol-terms",
    source: "prop-protocol-terms.svg",
    output: "prop-protocol-terms.png",
    sceneIds: ["dch01_s002", "dch01_protocol_test", "dch01_s003", "dch01_s038"],
    accessibleText:
      "情感真实性测试协议，第3页，数据处理说明。03.1 本产品情感真实度依赖用户真情流露。03.2 测试期间数据用于模型迭代。03.3 测试结束后原始录音自动清除，其中“清除”加粗。条款继续见附录 A。",
    altText:
      "冷白色第三页协议压在黑色测试台上，三条小字依次写明真情流露、模型迭代与原始录音自动清除，“清除”被黑底加粗；纸面不含角色旁白或剧情揭示标注。",
    factSources: [
      "docs/specs/active/SPEC-0003-draft-chapters-story-graph-and-game-feel.md#prop-inserts",
      "packages/content/ink/draft-ch01.ink#dch01_s002",
      "packages/content/ink/draft-ch01.ink#dch01_protocol_test",
      "packages/content/ink/draft-ch01.ink#dch01_s003",
      "packages/content/ink/draft-ch01.ink#dch01_s038",
    ],
  },
  {
    id: "prop-barcode-shift",
    source: "prop-barcode-shift.svg",
    output: "prop-barcode-shift.png",
    sceneIds: ["dch02_s002", "dch02_s003", "dch02_barcode_sweep"],
    accessibleText:
      "惠万家 POS 收银终端与热敏条码带。一分钟扫四十件，画面显示01:00 / 40件。密集订单行含数量、单价、小计与状态。练习锚点：临期辣条已扫嘀；冰红茶已扫嘀；桶装方便面已扫嘀。穿插扫枪中断、条码磨损重扫与拒扫。货堆着，别玩系统。",
    altText:
      "廉价小超市的磨损 POS 屏与热敏条码带：高密度品名/条码/数量/价格/状态行，三行练习锚点为临期辣条、冰红茶与桶装方便面，红扫描线与物理污迹可见。",
    factSources: [
      "docs/specs/active/SPEC-0003-draft-chapters-story-graph-and-game-feel.md#prop-inserts",
      "packages/content/ink/draft-ch02.ink#dch02_s002",
      "packages/content/ink/draft-ch02.ink#dch02_s003",
      "packages/content/ink/draft-ch02.ink#dch02_barcode_sweep",
    ],
  },
  {
    id: "prop-rental-receipt",
    source: "prop-rental-receipt.svg",
    output: "prop-rental-receipt.png",
    sceneIds: ["dch02_s017", "dch02_s018", "dch02_s019", "dch02_s020"],
    accessibleText:
      "收条，房租 / 定金。今收到九百块房租定金。金额：￥900，九百。入住条件：① 九百块，五号前交。② 备注栏禁止发表情包。③ 奇怪的人别往楼里带，出事自己扛。代收人签字。字迹像医院处方。",
    altText:
      "一张皱旧热敏纸房租收条斜放在廉价木桌上，蓝色手写字像医院处方，金额“￥900”最大，下面写着五号前交、备注栏禁止发表情包和奇怪的人别往楼里带。画面外围另有演出标注（猫爪与“其余选择信任”卡片），不属于收条印刷事实。",
    factSources: [
      "docs/specs/active/SPEC-0003-draft-chapters-story-graph-and-game-feel.md#prop-inserts",
      "packages/content/ink/draft-ch02.ink#dch02_s017",
      "packages/content/ink/draft-ch02.ink#dch02_s020",
    ],
  },
  {
    id: "prop-application-nda",
    source: "prop-application-nda.svg",
    output: "prop-application-nda.png",
    sceneIds: [
      "dch02_s027",
      "dch02_s029",
      "dch02_s035",
      "dch02_s036",
      "dch02_s037",
      "dch02_mobile_questionnaire",
      "dch02_s038",
    ],
    accessibleText:
      "体验官申请 / 01。申请成为体验官。实体设备全天候居家测试员。补贴五倍。居住条件：独立房间。问卷字段：邻居容忍度（一般/良好/优秀/不愿评价）；是否介意设备高度拟人（介意/不介意/不确定）。已阅读并同意。下一步：超级保密协议。超级保密协议。申请项目：实体设备全天候居家测试。签约条件：独立房间 / 超级保密协议。第七条：设备之存在，不得让任何非签约人知晓，包括同住人。违约金：前位隐去，后面五个零。",
    altText:
      "左侧廉价手机显示机器人全天候居家测试员申请，补贴五倍并勾选独立房间，问卷仅列出标签与可选值且无选定答案；右侧过度正式的黑框超级保密协议把第七条反白加粗，违约金只露出醒目的五个零。",
    factSources: [
      "docs/specs/active/SPEC-0003-draft-chapters-story-graph-and-game-feel.md#prop-inserts",
      "packages/content/ink/draft-ch02.ink#dch02_s027",
      "packages/content/ink/draft-ch02.ink#dch02_s029",
      "packages/content/ink/draft-ch02.ink#dch02_s037",
      "packages/content/ink/draft-ch02.ink#dch02_mobile_questionnaire",
      "packages/content/ink/draft-ch02.ink#dch02_s038",
    ],
  },
  {
    id: "prop-approval-sms",
    source: "prop-approval-sms.svg",
    output: "prop-approval-sms.png",
    sceneIds: ["dch02_s038", "dch02_s039", "dch02_s040", "d2_chapter_end"],
    accessibleText:
      "23:43，短信，系统通知。初审通过。三分钟后。初审通过。请于48小时内完成个性化匹配问卷。48小时。系统通知。短信正文仅含审核结果与问卷时限。",
    altText:
      "廉价出租屋床上亮着一部手机，企业短信界面用过分亲切的粉色圆角、对勾和小彩纸宣布“初审通过”，正文要求48小时内完成个性化匹配问卷。画面外围另有演出标注（屏幕还亮着 / 就当我有病），不属于短信正文。",
    factSources: [
      "docs/specs/active/SPEC-0003-draft-chapters-story-graph-and-game-feel.md#prop-inserts",
      "packages/content/ink/draft-ch02.ink#dch02_s038",
      "packages/content/ink/draft-ch02.ink#dch02_s039",
      "packages/content/ink/draft-ch02.ink#dch02_s040",
      "packages/content/ink/draft-ch02.ink#d2_chapter_end",
    ],
  },
];

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

async function renderCandidate(candidate) {
  const sourcePath = join(here, candidate.source);
  const outputPath = join(here, candidate.output);
  const sourceBuffer = await readFile(sourcePath);

  await sharp(sourceBuffer, { density: 144 })
    .resize(1600, 900, { fit: "fill" })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(outputPath);

  const outputBuffer = await readFile(outputPath);
  const metadata = await sharp(outputBuffer).metadata();
  const fileStat = await stat(outputPath);

  return {
    ...candidate,
    sourcePath: `${packagePrefix}/${candidate.source}`,
    outputPath: `${packagePrefix}/${candidate.output}`,
    dimensions: { width: metadata.width, height: metadata.height },
    mimeType: "image/png",
    bytes: fileStat.size,
    sha256: sha256(outputBuffer),
    candidate_only: true,
    humanArtReview: false,
    rightsStatus: "pending",
    provenance: {
      type: provenanceType,
      createdWith: provenanceCreatedWith,
      workflow: "grok-agent-directed-vector-candidate",
      externalImages: false,
      externalFonts: false,
      externalTemplates: false,
      notes: provenanceNotes,
    },
  };
}

const labelSvg = (label, width, height) =>
  Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#090b0f"/>
    <rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="#ffffff" stroke-opacity="0.14"/>
    <text x="18" y="30" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-size="18" font-weight="800" letter-spacing="2" fill="#f0d7c8">${label}</text>
  </svg>
`);

async function makePanel(candidate, width, height, label) {
  const labelHeight = 44;
  const imageHeight = height - labelHeight;
  const imageBuffer = await sharp(join(here, candidate.output))
    .resize(width, imageHeight, { fit: "contain", background: "#090b0f" })
    .toBuffer();

  return sharp({
    create: { width, height, channels: 4, background: "#090b0f" },
  })
    .composite([
      { input: labelSvg(label, width, labelHeight), top: 0, left: 0 },
      { input: imageBuffer, top: labelHeight, left: 0 },
    ])
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();
}

async function renderContactSheet() {
  const byId = Object.fromEntries(candidates.map((candidate) => [candidate.id, candidate]));
  const topWidth = 900;
  const topHeight = 506;
  const bottomWidth = 596;
  const bottomHeight = 368;

  const panels = await Promise.all([
    makePanel(byId["prop-protocol-terms"], topWidth, topHeight, "01 / 协议条款"),
    makePanel(byId["prop-application-nda"], topWidth, topHeight, "04 / 机器人申请 + NDA"),
    makePanel(byId["prop-barcode-shift"], bottomWidth, bottomHeight, "02 / 条码班次"),
    makePanel(byId["prop-rental-receipt"], bottomWidth, bottomHeight, "03 / 九百房租收条"),
    makePanel(byId["prop-approval-sms"], bottomWidth, bottomHeight, "05 / 初审通过短信"),
  ]);

  const title = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
      <rect width="1920" height="1080" fill="#05070a"/>
      <text x="50" y="48" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-size="26" font-weight="900" letter-spacing="3" fill="#f6e6dc">SPEC-0003 / ROUND 15 / PROP UI CANDIDATES</text>
      <text x="1870" y="48" text-anchor="end" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-size="17" font-weight="700" letter-spacing="2" fill="#a8a09a">CANDIDATE ONLY · HUMAN ART REVIEW PENDING</text>
    </svg>
  `);

  const outputPath = join(here, "contact-sheet.png");
  await sharp(title)
    .composite([
      { input: panels[0], left: 50, top: 70 },
      { input: panels[1], left: 970, top: 70 },
      { input: panels[2], left: 50, top: 620 },
      { input: panels[3], left: 662, top: 620 },
      { input: panels[4], left: 1274, top: 620 },
    ])
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(outputPath);

  const buffer = await readFile(outputPath);
  const metadata = await sharp(buffer).metadata();
  const fileStat = await stat(outputPath);
  return {
    path: `${packagePrefix}/contact-sheet.png`,
    dimensions: { width: metadata.width, height: metadata.height },
    mimeType: "image/png",
    bytes: fileStat.size,
    sha256: sha256(buffer),
  };
}

const rendered = [];
for (const candidate of candidates) {
  rendered.push(await renderCandidate(candidate));
}

const contactSheet = await renderContactSheet();
const manifest = {
  schemaVersion: 1,
  candidateSetId: "spec-0003-round15-prop-ui-candidates",
  generatedAt: new Date().toISOString(),
  contract: {
    id: "prop-ui-web-16x9",
    outputExtensions: [".png", ".webp"],
    outputMimeTypes: ["image/png", "image/webp"],
    dimensions: {
      minWidth: 1280,
      maxWidth: 1920,
      minHeight: 720,
      maxHeight: 1080,
      aspectRatio: 1.777778,
      aspectTolerance: 0.002,
    },
    maxBytes: 2097152,
  },
  candidate_only: true,
  humanArtReview: false,
  rightsStatus: "pending",
  runtimeIntegrated: false,
  provenance: {
    owner: "project",
    method: provenanceCreatedWith,
    type: provenanceType,
    workflow: "grok-agent-directed-vector-candidate",
    externalImages: false,
    externalFonts: false,
    externalTemplates: false,
    sourceScope: [
      "docs/specs/active/SPEC-0003-draft-chapters-story-graph-and-game-feel.md",
      "packages/content/ink/draft-ch01.ink",
      "packages/content/ink/draft-ch02.ink",
      "apps/web/src/styles/base.css",
      "apps/web/src/styles/stage.css",
      "packages/content/assets/VISUAL-ASSET-INTAKE.json#contracts.prop-ui-web-16x9",
    ],
    statement:
      "These files are agent-generated project vector candidates only. Machine checks do not establish copyright clearance, production readiness, or human art approval. They were not authored by the human project owner.",
  },
  assets: rendered.map(({ source: _source, output: _output, ...asset }) => asset),
  contactSheet,
};

const manifestPath = join(here, "candidate-manifest.json");
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
formatWithOxfmt(manifestPath);

console.log(
  JSON.stringify(
    {
      root: relative(repoRoot, here),
      assets: rendered.map(({ id, outputPath, bytes, sha256: digest }) => ({
        id,
        outputPath,
        bytes,
        sha256: digest,
      })),
      contactSheet,
      manifest: `${packagePrefix}/candidate-manifest.json`,
    },
    null,
    2,
  ),
);
