import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(process.argv[2] ?? ".devspace-visual/round15-props/final");
const safeArea = { x: 128, y: 72, width: 1344, height: 756 };

const candidates = [
  {
    id: "prop-protocol-terms",
    label: "01 / 协议条款",
    criticalBounds: { x: 236, y: 90, width: 1128, height: 697 },
  },
  {
    id: "prop-barcode-shift",
    label: "02 / 条码班次",
    criticalBounds: { x: 128, y: 88, width: 1340, height: 700 },
  },
  {
    id: "prop-rental-receipt",
    label: "03 / 九百房租收条",
    criticalBounds: { x: 423, y: 96, width: 727, height: 637 },
  },
  {
    id: "prop-application-nda",
    label: "04 / 机器人申请 + NDA",
    criticalBounds: { x: 138, y: 84, width: 1312, height: 720 },
  },
  {
    id: "prop-approval-sms",
    label: "05 / 初审通过短信",
    criticalBounds: { x: 436, y: 91, width: 728, height: 722 },
  },
];

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

function isInside(inner, outer) {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function safeOverlay(label) {
  const scale = 0.8;
  const x = safeArea.x * scale;
  const y = safeArea.y * scale;
  const width = safeArea.width * scale;
  const height = safeArea.height * scale;
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
      <rect x="0" y="0" width="1280" height="${y}" fill="#000" fill-opacity="0.28"/>
      <rect x="0" y="${y}" width="${x}" height="${height}" fill="#000" fill-opacity="0.28"/>
      <rect x="${x + width}" y="${y}" width="${1280 - x - width}" height="${height}" fill="#000" fill-opacity="0.28"/>
      <rect x="0" y="${y + height}" width="1280" height="${720 - y - height}" fill="#000" fill-opacity="0.28"/>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="#f7d6c1" stroke-width="3" stroke-dasharray="12 10"/>
      <rect x="20" y="18" width="360" height="42" rx="6" fill="#05070a" fill-opacity="0.88"/>
      <text x="38" y="47" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-size="20" font-weight="800" letter-spacing="2" fill="#fff1e7">${label} · 8% SAFE AREA</text>
    </svg>
  `);
}

async function makePreview(candidate) {
  const sourcePath = join(here, `${candidate.id}.png`);
  const sourceBuffer = await readFile(sourcePath);
  const previewPath = join(outputDir, `${candidate.id}-safe-zone-1280x720.png`);

  await sharp(sourceBuffer)
    .resize(1280, 720, { fit: "fill" })
    .composite([{ input: safeOverlay(candidate.label), left: 0, top: 0 }])
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(previewPath);

  return {
    ...candidate,
    sourcePath,
    sourceSha256: sha256(sourceBuffer),
    previewPath,
    withinSafeArea: isInside(candidate.criticalBounds, safeArea),
  };
}

async function panel(previewPath, width, height) {
  return sharp(previewPath)
    .resize(width, height, { fit: "contain", background: "#05070a" })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();
}

await mkdir(outputDir, { recursive: true });
const inspected = [];
for (const candidate of candidates) {
  inspected.push(await makePreview(candidate));
}

const byId = Object.fromEntries(inspected.map((candidate) => [candidate.id, candidate]));
const panels = await Promise.all([
  panel(byId["prop-protocol-terms"].previewPath, 854, 480),
  panel(byId["prop-application-nda"].previewPath, 854, 480),
  panel(byId["prop-barcode-shift"].previewPath, 576, 324),
  panel(byId["prop-rental-receipt"].previewPath, 576, 324),
  panel(byId["prop-approval-sms"].previewPath, 576, 324),
]);

const contactSheetPath = join(outputDir, "safe-zone-contact-sheet.png");
await sharp({
  create: { width: 1920, height: 1080, channels: 4, background: "#05070a" },
})
  .composite([
    { input: panels[0], left: 66, top: 68 },
    { input: panels[1], left: 1000, top: 68 },
    { input: panels[2], left: 66, top: 672 },
    { input: panels[3], left: 672, top: 672 },
    { input: panels[4], left: 1278, top: 672 },
  ])
  .png({ compressionLevel: 9, effort: 10 })
  .toFile(contactSheetPath);

const report = {
  schemaVersion: 1,
  checkedAt: new Date().toISOString(),
  artifactUnderTest: "SPEC-0003 Round 15 prop UI candidates",
  viewport: { width: 1280, height: 720 },
  safeArea,
  contactSheetPath,
  candidates: inspected.map(({ sourcePath, previewPath, ...candidate }) => ({
    ...candidate,
    sourcePath,
    previewPath,
  })),
  observedByScript: {
    allCriticalBoundsInsideSafeArea: inspected.every((candidate) => candidate.withinSafeArea),
  },
  limitations:
    "Bounds and hashes support review but do not prove aesthetics, exact text legibility, copyright clearance, or human art approval; the PNGs must be visually inspected.",
};

await writeFile(join(outputDir, "inspection-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
