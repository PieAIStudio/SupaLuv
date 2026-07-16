import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const manifestPath = join(here, "candidate-manifest.json");
const expectedIds = [
  "prop-protocol-terms",
  "prop-barcode-shift",
  "prop-rental-receipt",
  "prop-application-nda",
  "prop-approval-sms",
];

const expectedScenes = {
  "prop-protocol-terms": ["dch01_protocol_test"],
  "prop-barcode-shift": ["dch02_barcode_sweep"],
  "prop-rental-receipt": ["dch02_s017", "dch02_s020"],
  "prop-application-nda": ["dch02_s027", "dch02_s037"],
  "prop-approval-sms": ["dch02_s039", "d2_chapter_end"],
};

const expectedText = {
  "prop-protocol-terms": ["原始录音自动清除", "数据用于模型迭代", "真情流露"],
  "prop-barcode-shift": ["临期辣条", "冰红茶", "桶装方便面", "一分钟", "01:00", "40件"],
  "prop-rental-receipt": ["￥900", "五号前交", "禁止发表情包"],
  "prop-application-nda": ["补贴五倍", "独立房间", "设备高度拟人", "已阅读并同意", "五个零"],
  "prop-approval-sms": ["初审通过", "48小时", "个性化匹配问卷"],
};

// Reject provenance claims that present the package as human-owner authored.
const forbiddenOwnerAuthoredClaims = [
  /owner_authored_vector_candidate/i,
  /"type"\s*:\s*"owner[_-]authored[^"]*"/i,
  /owner-authored editable SVG/i,
  /method"\s*:\s*"owner-authored/i,
];

const forbiddenProtocolRevealInDocument = [
  "字面没了，骨头留着",
  "字面没了骨头留着",
  "第三页小字",
  "请眯眼阅读",
  "签字页在前一页",
];

const forbiddenApplicationFixedAnswers = [
  /邻居容忍度\s*[=：:]\s*良好/,
  /邻居容忍度良好/,
  /高度拟人\s*[=：:]\s*不确定/,
  /是否介意设备高度拟人[，,]?\s*不确定/,
  /签约条件[：:].*高度拟人设备/,
  /独立房间\s*\/\s*高度拟人设备/,
];

const digest = (buffer) => createHash("sha256").update(buffer).digest("hex");

async function loadManifest() {
  return JSON.parse(await readFile(manifestPath, "utf8"));
}

async function loadAllPackageText() {
  const names = [
    "candidate-manifest.json",
    "render-candidates.mjs",
    "round15-props.test.mjs",
    "prop-protocol-terms.svg",
    "prop-barcode-shift.svg",
    "prop-rental-receipt.svg",
    "prop-application-nda.svg",
    "prop-approval-sms.svg",
  ];
  const chunks = [];
  for (const name of names) {
    chunks.push(await readFile(join(here, name), "utf8"));
  }
  return chunks.join("\n");
}

test("candidate manifest is explicitly review-only", async () => {
  const raw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(raw);

  assert.equal(manifest.candidate_only, true);
  assert.equal(manifest.humanArtReview, false);
  assert.equal(manifest.runtimeIntegrated, false);
  assert.notEqual(manifest.rightsStatus, "cleared");
  assert.doesNotMatch(raw, /"rightsStatus"\s*:\s*"cleared"/);
  assert.deepEqual(
    manifest.assets.map((asset) => asset.id),
    expectedIds,
  );
});

test("provenance rejects owner-authored and records agent-authored type", async () => {
  const raw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(raw);
  const packageText = await loadAllPackageText();

  assert.equal(manifest.provenance.type, "project_generated_agent_authored_vector_candidate");
  assert.match(manifest.provenance.method, /Grok|agent/i);
  assert.ok(Array.isArray(manifest.provenance.sourceScope));
  assert.ok(manifest.provenance.sourceScope.length >= 3);
  assert.doesNotMatch(manifest.provenance.type, /owner/i);

  for (const asset of manifest.assets) {
    assert.equal(asset.candidate_only, true, asset.id);
    assert.equal(asset.humanArtReview, false, asset.id);
    assert.equal(asset.rightsStatus, "pending", asset.id);
    assert.equal(
      asset.provenance.type,
      "project_generated_agent_authored_vector_candidate",
      asset.id,
    );
    assert.doesNotMatch(asset.provenance.type, /owner/i, asset.id);
  }

  // Deliverable manifest + renderer + SVGs must not claim owner authorship.
  const deliverableText = [
    await readFile(join(here, "candidate-manifest.json"), "utf8"),
    await readFile(join(here, "render-candidates.mjs"), "utf8"),
    await readFile(join(here, "prop-protocol-terms.svg"), "utf8"),
    await readFile(join(here, "prop-barcode-shift.svg"), "utf8"),
    await readFile(join(here, "prop-rental-receipt.svg"), "utf8"),
    await readFile(join(here, "prop-application-nda.svg"), "utf8"),
    await readFile(join(here, "prop-approval-sms.svg"), "utf8"),
  ].join("\n");

  for (const pattern of forbiddenOwnerAuthoredClaims) {
    assert.doesNotMatch(raw, pattern, `manifest still claims ${pattern}`);
    assert.doesNotMatch(deliverableText, pattern, `deliverable still claims ${pattern}`);
  }

  assert.ok(packageText.includes("project_generated_agent_authored_vector_candidate"));
});

test("five editable SVG sources contain no embedded external image", async () => {
  const manifest = await loadManifest();

  for (const asset of manifest.assets) {
    assert.equal(extname(asset.sourcePath), ".svg", asset.id);
    const source = await readFile(join(here, `${asset.id}.svg`), "utf8");
    assert.match(source, /width="1600" height="900"/, asset.id);
    assert.doesNotMatch(source, /<image\b/i, asset.id);
    assert.doesNotMatch(source, /(?:href|xlink:href)\s*=/i, asset.id);
  }
});

test("rendered outputs satisfy prop-ui-web-16x9 and recorded hashes", async () => {
  const manifest = await loadManifest();

  for (const asset of manifest.assets) {
    const outputPath = join(here, `${asset.id}.png`);
    const outputBuffer = await readFile(outputPath);
    const metadata = await sharp(outputBuffer).metadata();
    const fileStat = await stat(outputPath);

    assert.equal(metadata.format, "png", asset.id);
    assert.equal(metadata.width, 1600, asset.id);
    assert.equal(metadata.height, 900, asset.id);
    assert.ok(fileStat.size <= 2 * 1024 * 1024, `${asset.id} exceeds 2 MiB`);
    assert.equal(asset.bytes, fileStat.size, asset.id);
    assert.equal(asset.sha256, digest(outputBuffer), asset.id);
    assert.deepEqual(asset.dimensions, { width: 1600, height: 900 }, asset.id);
    assert.equal(asset.mimeType, "image/png", asset.id);
  }
});

test("scene IDs and full text alternatives align with frozen story facts", async () => {
  const manifest = await loadManifest();

  for (const asset of manifest.assets) {
    assert.equal(asset.candidate_only, true, asset.id);
    assert.equal(asset.humanArtReview, false, asset.id);
    assert.notEqual(asset.rightsStatus, "cleared", asset.id);
    assert.ok(asset.altText.length >= 40, `${asset.id} alt text is too short`);
    assert.ok(asset.accessibleText.length >= 60, `${asset.id} accessible text is too short`);

    for (const sceneId of expectedScenes[asset.id]) {
      assert.ok(asset.sceneIds.includes(sceneId), `${asset.id} missing ${sceneId}`);
    }
    for (const phrase of expectedText[asset.id]) {
      const normalized = asset.accessibleText.replaceAll(" ", "");
      assert.ok(
        normalized.includes(phrase.replaceAll(" ", "")),
        `${asset.id} missing text: ${phrase}`,
      );
    }
  }
});

test("application/NDA rejects fixed questionnaire answers and invented signing conditions", async () => {
  const manifest = await loadManifest();
  const asset = manifest.assets.find((item) => item.id === "prop-application-nda");
  assert.ok(asset);

  const svg = await readFile(join(here, "prop-application-nda.svg"), "utf8");
  const combined = `${svg}\n${asset.accessibleText}\n${asset.altText}`;

  for (const pattern of forbiddenApplicationFixedAnswers) {
    assert.doesNotMatch(combined, pattern, `application still encodes ${pattern}`);
  }

  // Labels present without locking a single selected value as the only truth.
  assert.match(svg, /邻居容忍度/);
  assert.match(svg, /是否介意设备高度拟人/);
  assert.match(svg, /独立房间/);
  assert.match(svg, /补贴五倍|五倍/);
  assert.match(svg, /已阅读并同意/);
  assert.match(svg, /第七条/);
  assert.match(svg, /00000/);
  assert.doesNotMatch(svg, /高度拟人设备/);
  assert.match(asset.accessibleText, /邻居容忍度（一般\/良好\/优秀\/不愿评价）/);
});

test("protocol document SVG omits corporation reveal / review-only commentary", async () => {
  const manifest = await loadManifest();
  const asset = manifest.assets.find((item) => item.id === "prop-protocol-terms");
  assert.ok(asset);

  const svg = await readFile(join(here, "prop-protocol-terms.svg"), "utf8");
  // Strip the non-document candidate footer before scanning.
  const paperBody = svg.replace(/PROP \/ PROTOCOL TERMS \/ CANDIDATE/g, "");

  for (const phrase of forbiddenProtocolRevealInDocument) {
    assert.ok(!paperBody.includes(phrase), `protocol SVG still contains reveal copy: ${phrase}`);
    assert.ok(
      !asset.accessibleText.includes(phrase),
      `protocol accessibleText still contains reveal copy: ${phrase}`,
    );
  }

  assert.match(svg, /真情流露/);
  assert.match(svg, /模型迭代/);
  assert.match(svg, /清除/);
});

test("contact sheet is 1920x1080 with verified bytes and hash", async () => {
  const manifest = await loadManifest();
  const path = join(here, "contact-sheet.png");
  const buffer = await readFile(path);
  const metadata = await sharp(buffer).metadata();
  const fileStat = await stat(path);

  assert.equal(metadata.format, "png");
  assert.equal(metadata.width, 1920);
  assert.equal(metadata.height, 1080);
  assert.equal(manifest.contactSheet.bytes, fileStat.size);
  assert.equal(manifest.contactSheet.sha256, digest(buffer));
});
