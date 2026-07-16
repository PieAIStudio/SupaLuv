import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { ALL_RUNTIME_PORTRAITS } from "./portrait-matte/config.mjs";
import { evaluateGate, inspectPortrait } from "./portrait-matte/matte.mjs";

const DEFAULT_MANIFEST_PATH = "packages/content/assets/VISUAL-ASSET-INTAKE.json";
const DEFAULT_RUNTIME_LEDGER_PATH = "packages/content/assets/RUNTIME-ASSET-LEDGER.csv";

const SCENE_MANIFEST_SOURCES = Object.freeze([
  "packages/content/manifests/draft-ch01-scenes.ts",
  "packages/content/manifests/draft-ch02-scenes.ts",
]);
const ARCHIVE_RECORD_SOURCE = "apps/web/src/persistence/algorithmShameArchive.ts";
const CHARACTER_REGISTRY_SOURCE = "packages/content/characters/registry.ts";
const BOOT_SPLASH_SOURCE = "apps/web/src/views/BootSplash.tsx";
const VISUAL_SCAN_ROOTS = Object.freeze([
  "apps/web/public/assets/scenes",
  "apps/web/public/assets/portraits",
  "apps/web/public/assets/props",
  "apps/web/public/assets/ui",
  "packages/content/characters",
]);
const VISUAL_FILE_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".webp",
]);

const FROZEN_PRODUCTION_CHARACTER_ASSETS = Object.freeze([
  { registryId: "chen_jia", portraitId: "chen-jia-neutral", referenceId: "chen-jia-ref-base" },
  { registryId: "leo", portraitId: "leo-neutral", referenceId: "leo-ref-base" },
  {
    registryId: "shi_peixin",
    portraitId: "shi-peixin-neutral",
    referenceId: "shi-peixin-ref-base",
  },
  {
    registryId: "staff_worker",
    portraitId: "staff-worker-neutral",
    referenceId: "staff-worker-ref-base",
  },
  {
    registryId: "staff_lead",
    portraitId: "staff-lead-neutral",
    referenceId: "staff-lead-ref-base",
  },
  {
    registryId: "shop_owner",
    portraitId: "shop-owner-neutral",
    referenceId: "shop-owner-ref-base",
  },
]);
const FROZEN_ARCHIVE_PROP_IDS = Object.freeze([
  "prop-protocol-terms",
  "prop-barcode-shift",
  "prop-rental-receipt",
  "prop-application-nda",
  "prop-approval-sms",
]);
export const FROZEN_REQUIRED_PROP_IDS = FROZEN_ARCHIVE_PROP_IDS;
/** Frozen minimum deliveries that are still genuinely missing. */
export const FROZEN_REQUIRED_MISSING_IDS = Object.freeze([
  ...FROZEN_PRODUCTION_CHARACTER_ASSETS.map(({ portraitId }) => portraitId),
  ...FROZEN_PRODUCTION_CHARACTER_ASSETS.map(({ referenceId }) => referenceId),
]);
const FROZEN_REQUIRED_PRODUCTION_GAP_IDS = new Set([
  "gap-background-shot-list",
  "gap-npc-mood-matrix",
  "gap-commercial-rights-evidence",
]);

const VALID_FILE_STATUSES = new Set(["present", "missing"]);
const VALID_QUALITY_STATUSES = new Set([
  "production_ready",
  "prototype_only",
  "legacy_only",
  "missing",
]);
const VALID_RIGHTS_STATUSES = new Set(["cleared", "pending", "not_required"]);
const VALID_RIGHTS_EVIDENCE_KINDS = new Set([
  "project_ownership",
  "commercial_license",
  "commission_assignment",
  "generation_terms",
  "likeness_release",
  "public_domain",
]);
const VALID_GAP_STATUSES = new Set(["open", "resolved"]);
const VALID_ALPHA_RULES = new Set(["required", "forbidden", "optional"]);
const ASSET_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const CLEARED_FORBIDDEN_SOURCE = Object.freeze({
  type: new Set(["pending"]),
  owner: new Set(["unassigned"]),
});
const RIGHTS_EVIDENCE_PLACEHOLDERS = new Set([
  "",
  "ok",
  "self",
  "pending",
  "placeholder",
  "unassigned",
  "unknown",
  "not_yet_supplied",
  "n/a",
  "none",
  "todo",
  "tbd",
]);
/** Forbidden evidence targets — string form and final realpath identity. */
const EVIDENCE_SELF_REFERENCES = Object.freeze([
  DEFAULT_MANIFEST_PATH,
  "packages/content/assets/ATTRIBUTION.md",
  "packages/content/assets/README.md",
  "tools/asset-audit.mjs",
  "tests/unit/content-assets.test.ts",
]);
const RIGHTS_EVIDENCE_LOCAL_PREFIX = "packages/content/assets/rights-evidence/";
const GAP_RESOLUTION_LOCAL_PREFIX = "packages/content/assets/release-evidence/";

/** UTC calendar date `YYYY-MM-DD` for the given Date (default: now). */
export function utcDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

const MIME_BY_SHARP_FORMAT = Object.freeze({
  avif: "image/avif",
  gif: "image/gif",
  heif: "image/heif",
  jpeg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  tiff: "image/tiff",
  webp: "image/webp",
});

function relativeDisplayPath(workspaceRoot, inputPath) {
  if (!inputPath) return "<no-path>";
  if (path.isAbsolute(inputPath)) {
    const relativePath = path.relative(workspaceRoot, inputPath);
    return relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath)
      ? relativePath
      : inputPath;
  }
  return inputPath.split(path.sep).join("/");
}

function addIssue(target, assetId, assetPath, message) {
  target.push({
    assetId,
    path: assetPath ?? null,
    message: `[${assetId}] ${assetPath ?? "<no-path>"}: ${message}`,
  });
}

/**
 * Reject absolute paths and `..` segments; require containment under workspaceRoot.
 * Uses realpath when the target exists so symlinks cannot escape.
 */
export async function resolveWorkspacePath(workspaceRoot, inputPath, { mustExist = false } = {}) {
  if (typeof inputPath !== "string" || inputPath.length === 0) {
    throw new Error("path is required");
  }
  if (path.isAbsolute(inputPath)) {
    throw new Error("absolute paths are not allowed");
  }
  const normalizedInput = inputPath.replaceAll("\\", "/");
  if (normalizedInput.split("/").some((segment) => segment === "..")) {
    throw new Error("path traversal ('..') is not allowed");
  }

  const resolvedRoot = path.resolve(workspaceRoot);
  const rootReal = await fs.realpath(resolvedRoot);
  const rootPrefix = rootReal.endsWith(path.sep) ? rootReal : `${rootReal}${path.sep}`;
  const segments = normalizedInput.split("/").filter((segment) => segment && segment !== ".");
  const candidate = path.resolve(rootReal, ...segments);

  if (candidate !== rootReal && !candidate.startsWith(rootPrefix)) {
    throw new Error("path must stay inside the workspace");
  }

  let current = rootReal;
  for (let index = 0; index < segments.length; index += 1) {
    const next = path.join(current, segments[index]);
    try {
      await fs.lstat(next);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        if (mustExist) throw error;
        const unresolved = path.resolve(current, ...segments.slice(index));
        if (unresolved !== rootReal && !unresolved.startsWith(rootPrefix)) {
          throw new Error("unresolved path escapes the workspace");
        }
        return unresolved;
      }
      throw error;
    }

    const realPath = await fs.realpath(next);
    if (realPath !== rootReal && !realPath.startsWith(rootPrefix)) {
      throw new Error("resolved path escapes the workspace");
    }
    current = realPath;
  }
  return current;
}

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/u).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const fields = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, fields[index] ?? ""]));
  });
}

function validateContract(contractId, contract, errors) {
  const label = `contract:${contractId}`;
  if (!contract || typeof contract !== "object") {
    addIssue(errors, label, null, "contract must be an object");
    return;
  }
  if (!Array.isArray(contract.allowedExtensions) || contract.allowedExtensions.length === 0) {
    addIssue(errors, label, null, "allowedExtensions must be a non-empty array");
  }
  if (!Array.isArray(contract.allowedMimeTypes) || contract.allowedMimeTypes.length === 0) {
    addIssue(errors, label, null, "allowedMimeTypes must be a non-empty array");
  }
  if (!VALID_ALPHA_RULES.has(contract.alpha)) {
    addIssue(errors, label, null, `alpha must be one of ${[...VALID_ALPHA_RULES].join(", ")}`);
  }
  if (!Number.isInteger(contract.maxBytes) || contract.maxBytes <= 0) {
    addIssue(errors, label, null, "maxBytes must be a positive integer");
  }
  const dimensions = contract.dimensions;
  if (!dimensions || typeof dimensions !== "object") {
    addIssue(errors, label, null, "dimensions must be defined");
    return;
  }
  for (const key of ["minWidth", "maxWidth", "minHeight", "maxHeight"]) {
    if (!Number.isInteger(dimensions[key]) || dimensions[key] <= 0) {
      addIssue(errors, label, null, `dimensions.${key} must be a positive integer`);
    }
  }
  if (
    Number.isInteger(dimensions.minWidth) &&
    Number.isInteger(dimensions.maxWidth) &&
    dimensions.minWidth > dimensions.maxWidth
  ) {
    addIssue(errors, label, null, "dimensions.minWidth cannot exceed maxWidth");
  }
  if (
    Number.isInteger(dimensions.minHeight) &&
    Number.isInteger(dimensions.maxHeight) &&
    dimensions.minHeight > dimensions.maxHeight
  ) {
    addIssue(errors, label, null, "dimensions.minHeight cannot exceed maxHeight");
  }
  if (typeof dimensions.aspectRatio !== "number" || dimensions.aspectRatio <= 0) {
    addIssue(errors, label, null, "dimensions.aspectRatio must be positive");
  }
  if (typeof dimensions.aspectTolerance !== "number" || dimensions.aspectTolerance < 0) {
    addIssue(errors, label, null, "dimensions.aspectTolerance must be zero or positive");
  }
  if (contract.magentaCheck === true) {
    if (
      typeof contract.maxVisibleMagentaRatio !== "number" ||
      contract.maxVisibleMagentaRatio < 0 ||
      contract.maxVisibleMagentaRatio > 1
    ) {
      addIssue(errors, label, null, "maxVisibleMagentaRatio must be between 0 and 1");
    }
  }
}

async function inspectImage(buffer, contract) {
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const metrics = {
    format: metadata.format ?? null,
    mimeType: metadata.format ? (MIME_BY_SHARP_FORMAT[metadata.format] ?? null) : null,
    width,
    height,
    hasAlpha: metadata.hasAlpha ?? false,
    transparentPixels: 0,
    visiblePixels: 0,
    visibleMagentaPixels: 0,
    visibleMagentaRatio: 0,
  };

  if (contract.alpha !== "optional" || contract.magentaCheck === true) {
    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let index = 0; index < data.length; index += info.channels) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const alpha = data[index + 3];
      if (alpha < 255) metrics.transparentPixels += 1;
      if (alpha >= 16) {
        metrics.visiblePixels += 1;
        const magentaDominance = Math.min(red, blue) - green;
        if (red >= 180 && blue >= 180 && green <= 110 && magentaDominance >= 70) {
          metrics.visibleMagentaPixels += 1;
        }
      }
    }
    metrics.visibleMagentaRatio =
      metrics.visiblePixels === 0 ? 0 : metrics.visibleMagentaPixels / metrics.visiblePixels;
  }

  return metrics;
}

/**
 * Reject empty/placeholder identity text and low-effort filler (all-x, token
 * concatenation). Does not prove legal authenticity — human review remains required.
 */
export function isPlaceholderIdentity(value) {
  if (typeof value !== "string") return true;
  const trimmed = value.trim();
  if (trimmed.length < 2) return true;
  const lower = trimmed.toLowerCase();
  if (RIGHTS_EVIDENCE_PLACEHOLDERS.has(lower)) return true;

  const compact = lower.replace(/[\s_\-./\\|,;:]+/gu, "");
  if (compact.length === 0) return true;
  // Repeated single character filler: "xxx", "XXXX", "......"
  if (/^(.)\1{2,}$/u.test(compact)) return true;
  // All-x family even with mixed length noise around pure x runs
  if (/^x+$/u.test(compact)) return true;

  const tokens = lower.split(/[\s,;|/_\-.]+/u).filter((token) => token.length > 0);
  if (
    tokens.length > 0 &&
    tokens.every(
      (token) =>
        RIGHTS_EVIDENCE_PLACEHOLDERS.has(token) ||
        /^(.)\1{2,}$/u.test(token) ||
        /^x{1,}$/u.test(token),
    )
  ) {
    return true;
  }

  // Concatenated placeholder tokens without separators: "placeholderpending", "okself"
  const sortedPlaceholders = [...RIGHTS_EVIDENCE_PLACEHOLDERS]
    .filter((entry) => entry.length >= 2)
    .sort((left, right) => right.length - left.length);
  let remainder = compact;
  let matchedAny = false;
  while (remainder.length > 0) {
    let matched = false;
    for (const placeholder of sortedPlaceholders) {
      if (remainder.startsWith(placeholder)) {
        remainder = remainder.slice(placeholder.length);
        matched = true;
        matchedAny = true;
        break;
      }
    }
    if (!matched) break;
  }
  if (matchedAny && remainder.length === 0) return true;

  return false;
}

/** Real UTC calendar date not later than utcToday (YYYY-MM-DD). */
export function isValidReviewedDate(value, utcToday) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  if (typeof utcToday !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(utcToday)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) return false;
  return value <= utcToday;
}

async function collectForbiddenEvidenceRealPaths(workspaceRoot) {
  const forbidden = new Set();
  for (const relativePath of EVIDENCE_SELF_REFERENCES) {
    try {
      const absolute = await resolveWorkspacePath(workspaceRoot, relativePath, {
        mustExist: true,
      });
      forbidden.add(absolute);
    } catch {
      // Missing forbidden targets cannot be self-referenced by realpath.
    }
  }
  return forbidden;
}

/**
 * Immutable local evidence: non-symlink regular file under allowedPrefix,
 * workspace-contained after realpath, not a forbidden self-reference, SHA match.
 */
async function validateImmutableLocalEvidenceFile({
  workspaceRoot,
  reference,
  expectedSha256,
  allowedPrefix,
  forbiddenRealPaths,
  reject,
  checks,
  label,
}) {
  const cleaned = typeof reference === "string" ? reference.trim() : "";
  if (isPlaceholderIdentity(cleaned)) {
    reject(`${label} reference must be an existing checked-in evidence file, not a placeholder`);
    return false;
  }
  if (/^https?:\/\//iu.test(cleaned)) {
    reject(
      `${label} reference must be a local file under ${allowedPrefix}; HTTPS URLs are provenance only and cannot clear this gate`,
    );
    return false;
  }

  const localPath = cleaned.split("#", 1)[0];
  if (EVIDENCE_SELF_REFERENCES.includes(localPath)) {
    reject(
      `${label} reference cannot point back to intake, attribution, README, audit, or its tests`,
    );
    return false;
  }
  if (!localPath.startsWith(allowedPrefix) || localPath === allowedPrefix) {
    reject(`${label} reference must be a file under ${allowedPrefix}`);
    return false;
  }
  if (!SHA256_PATTERN.test(expectedSha256 ?? "")) {
    reject(`${label} sha256 must be a lowercase 64-char hex digest`);
    return false;
  }

  const parentRelative = path.posix.dirname(localPath);
  const baseName = path.posix.basename(localPath);
  if (!baseName || baseName === "." || baseName === "..") {
    reject(`${label} reference must name a file under ${allowedPrefix}`);
    return false;
  }

  let parentAbsolute;
  try {
    parentAbsolute = await resolveWorkspacePath(workspaceRoot, parentRelative, {
      mustExist: true,
    });
  } catch (error) {
    reject(`${label} local reference is unsafe or unreadable: ${error.message}`);
    return false;
  }

  const candidate = path.join(parentAbsolute, baseName);
  let linkStat;
  try {
    linkStat = await fs.lstat(candidate);
  } catch (error) {
    reject(`${label} local reference is missing or unreadable: ${error.message}`);
    return false;
  }
  if (linkStat.isSymbolicLink()) {
    reject(`${label} local reference must not be a symlink`);
    return false;
  }
  if (!linkStat.isFile()) {
    reject(`${label} local reference must be a non-symlink regular file`);
    return false;
  }

  let realFile;
  try {
    realFile = await fs.realpath(candidate);
  } catch (error) {
    reject(`${label} local reference realpath failed: ${error.message}`);
    return false;
  }

  const rootReal = await fs.realpath(path.resolve(workspaceRoot));
  const rootPrefix = rootReal.endsWith(path.sep) ? rootReal : `${rootReal}${path.sep}`;
  if (realFile !== rootReal && !realFile.startsWith(rootPrefix)) {
    reject(`${label} local reference escapes the workspace after realpath`);
    return false;
  }
  if (forbiddenRealPaths.has(realFile)) {
    reject(
      `${label} reference cannot resolve to intake, attribution, README, audit, or its tests`,
    );
    return false;
  }

  let buffer;
  try {
    buffer = await fs.readFile(candidate);
  } catch (error) {
    reject(`${label} local reference cannot be read: ${error.message}`);
    return false;
  }
  const actualHash = crypto.createHash("sha256").update(buffer).digest("hex");
  if (actualHash !== expectedSha256) {
    reject(`${label} sha256 mismatch: got ${actualHash}`);
    return false;
  }

  checks.pathSafety += 1;
  return true;
}

async function validateRightsEvidenceRecord(
  record,
  workspaceRoot,
  errors,
  checks,
  utcToday,
  forbiddenRealPaths,
) {
  const assetId =
    typeof record?.assetId === "string" && record.assetId.length > 0
      ? record.assetId
      : "rights-evidence";
  let valid = true;
  const reject = (message) => {
    valid = false;
    addIssue(errors, assetId, null, message);
  };

  if (!ASSET_ID_PATTERN.test(assetId)) reject("rights evidence assetId must use stable-id syntax");
  if (!VALID_RIGHTS_EVIDENCE_KINDS.has(record?.kind)) {
    reject(`rights evidence kind must be one of ${[...VALID_RIGHTS_EVIDENCE_KINDS].join(", ")}`);
  }
  if (isPlaceholderIdentity(record?.ownerOrLicensor)) {
    reject("rights evidence ownerOrLicensor must identify the rights holder or licensor");
  }
  if (!isValidReviewedDate(record?.reviewedAt, utcToday)) {
    reject(
      "rights evidence reviewedAt must be a real UTC YYYY-MM-DD date not later than today",
    );
  }
  if (isPlaceholderIdentity(record?.reviewer)) {
    reject("rights evidence reviewer must identify the human reviewer");
  }

  const fileOk = await validateImmutableLocalEvidenceFile({
    workspaceRoot,
    reference: record?.reference,
    expectedSha256: record?.sha256,
    allowedPrefix: RIGHTS_EVIDENCE_LOCAL_PREFIX,
    forbiddenRealPaths,
    reject,
    checks,
    label: "rights evidence",
  });
  if (!fileOk) valid = false;

  return valid;
}

async function validateGapResolutionRecord(
  record,
  workspaceRoot,
  errors,
  checks,
  utcToday,
  forbiddenRealPaths,
  knownGapIds,
) {
  const gapId =
    typeof record?.gapId === "string" && record.gapId.length > 0
      ? record.gapId
      : "gap-resolution";
  let valid = true;
  const reject = (message) => {
    valid = false;
    addIssue(errors, gapId, null, message);
  };

  if (!ASSET_ID_PATTERN.test(gapId)) {
    reject("gap resolution gapId must use stable-id syntax");
  } else if (!knownGapIds.has(gapId)) {
    reject("gap resolution references an unknown gap ID");
  }
  if (isPlaceholderIdentity(record?.approvedBy)) {
    reject("gap resolution approvedBy must identify the human approver");
  }
  if (!isValidReviewedDate(record?.reviewedAt, utcToday)) {
    reject(
      "gap resolution reviewedAt must be a real UTC YYYY-MM-DD date not later than today",
    );
  }

  const fileOk = await validateImmutableLocalEvidenceFile({
    workspaceRoot,
    reference: record?.reference,
    expectedSha256: record?.sha256,
    allowedPrefix: GAP_RESOLUTION_LOCAL_PREFIX,
    forbiddenRealPaths,
    reject,
    checks,
    label: "gap resolution",
  });
  if (!fileOk) valid = false;

  return valid;
}

function validateAssetRecord(asset, contracts, errors) {
  const assetId = typeof asset?.id === "string" && asset.id.length > 0 ? asset.id : "unknown-asset";
  const assetPath = typeof asset?.path === "string" ? asset.path : null;
  if (!ASSET_ID_PATTERN.test(assetId)) {
    addIssue(errors, assetId, assetPath, "id must use lowercase stable-id syntax");
  }
  if (typeof asset.kind !== "string" || asset.kind.length === 0) {
    addIssue(errors, assetId, assetPath, "kind is required");
  }
  if (typeof asset.contract !== "string" || !contracts[asset.contract]) {
    addIssue(errors, assetId, assetPath, `unknown contract ${String(asset.contract)}`);
  }
  if (!Array.isArray(asset.usage) || asset.usage.length === 0) {
    addIssue(errors, assetId, assetPath, "usage must be a non-empty array");
  } else if (asset.usage.some((entry) => typeof entry !== "string" || entry.length === 0)) {
    addIssue(errors, assetId, assetPath, "usage entries must be non-empty strings");
  }
  if (!VALID_FILE_STATUSES.has(asset.fileStatus)) {
    addIssue(errors, assetId, assetPath, `invalid fileStatus ${String(asset.fileStatus)}`);
  }
  if (!VALID_QUALITY_STATUSES.has(asset.qualityStatus)) {
    addIssue(errors, assetId, assetPath, `invalid qualityStatus ${String(asset.qualityStatus)}`);
  }
  if (!VALID_RIGHTS_STATUSES.has(asset.rightsStatus)) {
    addIssue(errors, assetId, assetPath, `invalid rightsStatus ${String(asset.rightsStatus)}`);
  }
  if (typeof asset.requiredForProduction !== "boolean") {
    addIssue(errors, assetId, assetPath, "requiredForProduction must be boolean");
  }
  if (!asset.source || typeof asset.source !== "object") {
    addIssue(errors, assetId, assetPath, "source/ownership record is required");
  } else {
    for (const key of ["type", "owner", "evidence"]) {
      if (typeof asset.source[key] !== "string" || asset.source[key].length === 0) {
        addIssue(errors, assetId, assetPath, `source.${key} must be a non-empty string`);
      }
    }
    if (asset.rightsStatus === "cleared") {
      const sourceType = String(asset.source.type ?? "").trim().toLowerCase();
      const sourceOwner = String(asset.source.owner ?? "").trim().toLowerCase();
      if (CLEARED_FORBIDDEN_SOURCE.type.has(sourceType)) {
        addIssue(
          errors,
          assetId,
          assetPath,
          "rightsStatus=cleared forbids source.type=pending",
        );
      }
      if (CLEARED_FORBIDDEN_SOURCE.owner.has(sourceOwner)) {
        addIssue(
          errors,
          assetId,
          assetPath,
          "rightsStatus=cleared forbids source.owner=unassigned",
        );
      }
    }
  }

  if (asset.fileStatus === "present") {
    if (!assetPath) addIssue(errors, assetId, assetPath, "present assets require path");
    if (!SHA256_PATTERN.test(asset.sha256 ?? "")) {
      addIssue(errors, assetId, assetPath, "present assets require lowercase SHA-256");
    }
    if (!Number.isInteger(asset.bytes) || asset.bytes <= 0) {
      addIssue(errors, assetId, assetPath, "present assets require positive bytes");
    }
  }
  if (asset.fileStatus === "missing") {
    if (asset.path !== null)
      addIssue(errors, assetId, assetPath, "missing assets must use path: null");
    if (asset.sha256 !== null)
      addIssue(errors, assetId, assetPath, "missing assets must use sha256: null");
    if (asset.bytes !== null)
      addIssue(errors, assetId, assetPath, "missing assets must use bytes: null");
    if (asset.qualityStatus !== "missing") {
      addIssue(errors, assetId, assetPath, "missing assets must use qualityStatus: missing");
    }
  }
}

function productionReasons(asset) {
  const reasons = [];
  if (asset.fileStatus !== "present") reasons.push("file missing");
  if (asset.qualityStatus !== "production_ready") {
    reasons.push(`qualityStatus=${asset.qualityStatus}`);
  }
  if (asset.rightsStatus !== "cleared") reasons.push(`rightsStatus=${asset.rightsStatus}`);
  return reasons;
}

function requiresStrictPortraitMatte(asset, truthRequired) {
  return (
    asset?.contract === "portrait-runtime-2x3" &&
    truthRequired === true &&
    asset?.fileStatus === "present"
  );
}

/**
 * Narrow, testable extraction of string-literal field values from TS sources.
 * Avoids importing app TS from the audit CLI.
 */
export function extractStringFieldValues(sourceText, fieldName) {
  const pattern = new RegExp(`${fieldName}\\s*:\\s*["']([^"']+)["']`, "g");
  const values = new Set();
  for (const match of sourceText.matchAll(pattern)) {
    values.add(match[1]);
  }
  return values;
}

/**
 * Extract ALGORITHM_SHAME_ARCHIVE_RECORD_IDS string literals without TS import.
 */
export function extractAlgorithmShameArchiveRecordIds(sourceText) {
  const blockMatch = sourceText.match(
    /export\s+const\s+ALGORITHM_SHAME_ARCHIVE_RECORD_IDS\s*=\s*\[([\s\S]*?)\]\s*as\s+const/u,
  );
  if (!blockMatch) {
    throw new Error(
      `ALGORITHM_SHAME_ARCHIVE_RECORD_IDS array not found in ${ARCHIVE_RECORD_SOURCE}`,
    );
  }
  const ids = [...blockMatch[1].matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
  if (ids.length === 0) {
    throw new Error(
      `ALGORITHM_SHAME_ARCHIVE_RECORD_IDS is empty in ${ARCHIVE_RECORD_SOURCE}`,
    );
  }
  return ids;
}

export function extractPublicVisualAssetIds(sourceText) {
  return [
    ...sourceText.matchAll(
      /["'`]\/assets\/(?:scenes|portraits|ui)\/([a-z0-9]+(?:[.-][a-z0-9]+)*)\.(?:avif|gif|jpe?g|png|webp)["'`]/giu,
    ),
  ].map((match) => match[1]);
}

async function collectVisualFilesUnder(workspaceRoot, relativeRoot) {
  const absoluteRoot = await resolveWorkspacePath(workspaceRoot, relativeRoot, {
    mustExist: false,
  });
  const collected = [];

  async function walk(currentAbsolute, currentRelative) {
    let entries;
    try {
      entries = await fs.readdir(currentAbsolute, { withFileTypes: true });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        return;
      }
      throw error;
    }
    for (const entry of entries) {
      const childAbsolute = path.join(currentAbsolute, entry.name);
      const childRelative = path.posix.join(currentRelative, entry.name);
      if (entry.isDirectory()) {
        // Character packages: only scan refs/ under each character.
        if (relativeRoot === "packages/content/characters") {
          if (currentRelative === "packages/content/characters" || entry.name === "refs") {
            await walk(childAbsolute, childRelative);
          }
          continue;
        }
        await walk(childAbsolute, childRelative);
        continue;
      }
      if (!entry.isFile()) continue;
      const extension = path.extname(entry.name).toLowerCase();
      if (!VISUAL_FILE_EXTENSIONS.has(extension)) continue;
      // Under characters, only accept files inside a refs/ segment.
      if (relativeRoot === "packages/content/characters") {
        if (!childRelative.includes("/refs/")) continue;
      }
      collected.push(childRelative);
    }
  }

  await walk(absoluteRoot, relativeRoot.replaceAll("\\", "/"));
  return collected;
}

function addRequirement(target, key, sourceLabel) {
  const sources = target.get(key) ?? new Set();
  sources.add(sourceLabel);
  target.set(key, sources);
}

function formatRequirementSources(sources) {
  return [...sources].sort();
}

async function collectTruthRequirements(workspaceRoot, errors) {
  const requiredIds = new Map(); // id -> source labels
  const requiredPaths = new Map(); // path -> source labels
  const productionAssetIds = new Map(); // id -> independent production truth labels

  function requireId(assetId, sourceLabel, { production = false } = {}) {
    addRequirement(requiredIds, assetId, sourceLabel);
    if (production) addRequirement(productionAssetIds, assetId, sourceLabel);
  }

  function requirePath(assetPath, sourceLabel) {
    addRequirement(requiredPaths, assetPath.replaceAll("\\", "/"), sourceLabel);
  }

  for (const sceneSource of SCENE_MANIFEST_SOURCES) {
    let text;
    try {
      const absolute = await resolveWorkspacePath(workspaceRoot, sceneSource, {
        mustExist: true,
      });
      text = await fs.readFile(absolute, "utf8");
    } catch (error) {
      addIssue(
        errors,
        "reverse-coverage",
        sceneSource,
        `cannot read scene manifest truth source: ${error.message}`,
      );
      continue;
    }
    for (const field of ["artKey", "portraitKey", "companionPortraitKey"]) {
      for (const value of extractStringFieldValues(text, field)) {
        requireId(value, `${sceneSource}:${field}`, { production: true });
      }
    }
  }

  try {
    const absoluteRegistry = await resolveWorkspacePath(workspaceRoot, CHARACTER_REGISTRY_SOURCE, {
      mustExist: true,
    });
    const registryText = await fs.readFile(absoluteRegistry, "utf8");
    const registryIds = extractStringFieldValues(registryText, "id");
    for (const requirement of FROZEN_PRODUCTION_CHARACTER_ASSETS) {
      if (!registryIds.has(requirement.registryId)) {
        addIssue(
          errors,
          requirement.portraitId,
          CHARACTER_REGISTRY_SOURCE,
          `frozen production character ${requirement.registryId} is missing from registry truth source`,
        );
      }
      const label = `${CHARACTER_REGISTRY_SOURCE}:id=${requirement.registryId} + frozen production IDs`;
      requireId(requirement.portraitId, label, { production: true });
      requireId(requirement.referenceId, label, { production: true });
    }
  } catch (error) {
    addIssue(
      errors,
      "production-truth",
      CHARACTER_REGISTRY_SOURCE,
      `cannot read character registry truth source: ${error.message}`,
    );
  }

  for (const portrait of ALL_RUNTIME_PORTRAITS) {
    const label = "tools/portrait-matte/config.mjs:ALL_RUNTIME_PORTRAITS";
    requireId(portrait.id, label, { production: true });
    requireId(portrait.id.replace(/^suming-/u, "suming-ref-"), label, { production: true });
  }

  try {
    const absoluteArchive = await resolveWorkspacePath(workspaceRoot, ARCHIVE_RECORD_SOURCE, {
      mustExist: true,
    });
    const archiveText = await fs.readFile(absoluteArchive, "utf8");
    const archiveIds = extractAlgorithmShameArchiveRecordIds(archiveText);
    for (const archiveId of archiveIds) {
      requireId(`prop-${archiveId}`, `${ARCHIVE_RECORD_SOURCE}:ALGORITHM_SHAME_ARCHIVE_RECORD_IDS`, {
        production: true,
      });
    }
  } catch (error) {
    addIssue(
      errors,
      "reverse-coverage",
      ARCHIVE_RECORD_SOURCE,
      `cannot extract archive record IDs: ${error.message}`,
    );
  }

  for (const frozenId of FROZEN_REQUIRED_MISSING_IDS) {
    requireId(frozenId, "tools/asset-audit.mjs:FROZEN_REQUIRED_MISSING_IDS", {
      production: true,
    });
  }

  try {
    const absoluteBootSource = await resolveWorkspacePath(workspaceRoot, BOOT_SPLASH_SOURCE, {
      mustExist: true,
    });
    const bootText = await fs.readFile(absoluteBootSource, "utf8");
    const bootAssetIds = new Set(extractPublicVisualAssetIds(bootText));
    if (!bootAssetIds.has("boot-splash")) {
      addIssue(
        errors,
        "boot-splash",
        BOOT_SPLASH_SOURCE,
        "BootSplash runtime source does not reference the frozen boot-splash visual",
      );
    }
    for (const assetId of bootAssetIds) {
      requireId(assetId, `${BOOT_SPLASH_SOURCE}:runtime visual URL`, { production: true });
    }
  } catch (error) {
    addIssue(
      errors,
      "production-truth",
      BOOT_SPLASH_SOURCE,
      `cannot read boot visual truth source: ${error.message}`,
    );
  }

  for (const scanRoot of VISUAL_SCAN_ROOTS) {
    try {
      const files = await collectVisualFilesUnder(workspaceRoot, scanRoot);
      for (const filePath of files) {
        requirePath(filePath, `filesystem:${scanRoot}`);
      }
    } catch (error) {
      addIssue(
        errors,
        "reverse-coverage",
        scanRoot,
        `cannot scan visual files: ${error.message}`,
      );
    }
  }

  return { requiredIds, requiredPaths, productionAssetIds };
}

export async function auditAssetIntake({
  workspaceRoot = process.cwd(),
  manifestPath = DEFAULT_MANIFEST_PATH,
  runtimeLedgerPath = DEFAULT_RUNTIME_LEDGER_PATH,
  mode = "intake",
  /** Injectable UTC calendar date `YYYY-MM-DD` for deterministic reviewedAt checks. */
  utcToday = utcDateString(),
} = {}) {
  const errors = [];
  const warnings = [];
  const releaseBlockers = [];
  const assetMetrics = [];
  const checks = {
    stableIds: 0,
    fileExistence: 0,
    mimeAndExtension: 0,
    dimensions: 0,
    alpha: 0,
    magenta: 0,
    portraitMatte: 0,
    sha256: 0,
    attribution: 0,
    rightsEvidence: 0,
    gapResolutions: 0,
    runtimeLedgerRows: 0,
    reverseCoverage: 0,
    productionTruth: 0,
    pathSafety: 0,
  };

  if (!new Set(["intake", "production"]).has(mode)) {
    throw new Error(`Unsupported audit mode: ${mode}`);
  }

  let absoluteManifestPath;
  try {
    absoluteManifestPath = await resolveWorkspacePath(workspaceRoot, manifestPath, {
      mustExist: true,
    });
    checks.pathSafety += 1;
  } catch (error) {
    return {
      schemaVersion: 1,
      mode,
      pass: false,
      decision: "stop",
      manifestPath: relativeDisplayPath(workspaceRoot, manifestPath),
      runtimeLedgerPath: runtimeLedgerPath
        ? relativeDisplayPath(workspaceRoot, runtimeLedgerPath)
        : null,
      summary: { assets: 0, present: 0, missing: 0, openGaps: 0, releaseBlockers: 0 },
      checks,
      errors: [
        {
          assetId: "manifest",
          path: relativeDisplayPath(workspaceRoot, manifestPath),
          message: `[manifest] ${relativeDisplayPath(workspaceRoot, manifestPath)}: ${error.message}`,
        },
      ],
      warnings,
      releaseBlockers,
      assetMetrics,
    };
  }

  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(absoluteManifestPath, "utf8"));
  } catch (error) {
    return {
      schemaVersion: 1,
      mode,
      pass: false,
      decision: "stop",
      manifestPath: relativeDisplayPath(workspaceRoot, manifestPath),
      runtimeLedgerPath: runtimeLedgerPath
        ? relativeDisplayPath(workspaceRoot, runtimeLedgerPath)
        : null,
      summary: { assets: 0, present: 0, missing: 0, openGaps: 0, releaseBlockers: 0 },
      checks,
      errors: [
        {
          assetId: "manifest",
          path: relativeDisplayPath(workspaceRoot, manifestPath),
          message: `[manifest] ${relativeDisplayPath(workspaceRoot, manifestPath)}: ${error.message}`,
        },
      ],
      warnings,
      releaseBlockers,
      assetMetrics,
    };
  }

  if (manifest.schemaVersion !== 2) {
    addIssue(errors, "manifest", manifestPath, "schemaVersion must be 2");
  }
  if (!manifest.contracts || typeof manifest.contracts !== "object") {
    addIssue(errors, "manifest", manifestPath, "contracts object is required");
  }
  const contracts = manifest.contracts ?? {};
  for (const [contractId, contract] of Object.entries(contracts)) {
    validateContract(contractId, contract, errors);
  }
  if (!Array.isArray(manifest.assets)) {
    addIssue(errors, "manifest", manifestPath, "assets array is required");
  }
  if (!Array.isArray(manifest.gaps)) {
    addIssue(errors, "manifest", manifestPath, "gaps array is required");
  }
  if (!Array.isArray(manifest.rightsEvidence)) {
    addIssue(errors, "manifest", manifestPath, "rightsEvidence array is required");
  }
  if (!Array.isArray(manifest.gapResolutions)) {
    addIssue(errors, "manifest", manifestPath, "gapResolutions array is required");
  }

  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  const gaps = Array.isArray(manifest.gaps) ? manifest.gaps : [];
  const rightsEvidence = Array.isArray(manifest.rightsEvidence) ? manifest.rightsEvidence : [];
  const gapResolutions = Array.isArray(manifest.gapResolutions) ? manifest.gapResolutions : [];
  const knownGapIds = new Set(
    gaps
      .map((gap) => (typeof gap?.id === "string" ? gap.id : null))
      .filter((gapId) => typeof gapId === "string" && gapId.length > 0),
  );
  const forbiddenEvidenceRealPaths = await collectForbiddenEvidenceRealPaths(workspaceRoot);

  const rightsEvidenceByAssetId = new Map();
  const seenRightsEvidence = new Set();
  for (const record of rightsEvidence) {
    const assetId = typeof record?.assetId === "string" ? record.assetId : "rights-evidence";
    const signature = `${assetId}:${String(record?.kind)}:${String(record?.reference)}:${String(record?.sha256)}`;
    if (seenRightsEvidence.has(signature)) {
      addIssue(errors, assetId, null, "duplicate structured rights evidence record");
      continue;
    }
    seenRightsEvidence.add(signature);
    const valid = await validateRightsEvidenceRecord(
      record,
      workspaceRoot,
      errors,
      checks,
      utcToday,
      forbiddenEvidenceRealPaths,
    );
    const records = rightsEvidenceByAssetId.get(assetId) ?? [];
    records.push({ record, valid });
    rightsEvidenceByAssetId.set(assetId, records);
    if (valid) checks.rightsEvidence += 1;
  }

  const validGapResolutionById = new Map();
  const seenGapResolutionIds = new Set();
  const seenGapResolutionSignatures = new Set();
  for (const record of gapResolutions) {
    const gapId = typeof record?.gapId === "string" ? record.gapId : "gap-resolution";
    const signature = `${gapId}:${String(record?.reference)}:${String(record?.sha256)}`;
    if (seenGapResolutionSignatures.has(signature)) {
      addIssue(errors, gapId, null, "duplicate structured gap resolution evidence record");
      continue;
    }
    seenGapResolutionSignatures.add(signature);
    if (seenGapResolutionIds.has(gapId)) {
      addIssue(errors, gapId, null, "duplicate gap resolution for the same gap ID");
      continue;
    }
    seenGapResolutionIds.add(gapId);
    const valid = await validateGapResolutionRecord(
      record,
      workspaceRoot,
      errors,
      checks,
      utcToday,
      forbiddenEvidenceRealPaths,
      knownGapIds,
    );
    if (valid) {
      validGapResolutionById.set(gapId, record);
      checks.gapResolutions += 1;
    }
  }

  const { requiredIds, requiredPaths, productionAssetIds } = await collectTruthRequirements(
    workspaceRoot,
    errors,
  );
  checks.productionTruth = productionAssetIds.size + FROZEN_REQUIRED_PRODUCTION_GAP_IDS.size;
  const seenIds = new Map();
  const seenPaths = new Map();
  const intakeById = new Map();

  for (const asset of assets) {
    validateAssetRecord(asset, contracts, errors);
    const assetId =
      typeof asset?.id === "string" && asset.id.length > 0 ? asset.id : "unknown-asset";
    const assetPath = typeof asset?.path === "string" ? asset.path : null;
    const assetRightsEvidence = rightsEvidenceByAssetId.get(assetId) ?? [];
    const validAssetRightsEvidence = assetRightsEvidence.filter(({ valid }) => valid);
    const productionSources = productionAssetIds.get(assetId);
    const truthRequired = Boolean(productionSources);
    checks.stableIds += 1;
    checks.attribution += 1;
    if (asset.rightsStatus === "cleared" && validAssetRightsEvidence.length === 0) {
      addIssue(
        errors,
        assetId,
        assetPath,
        "rightsStatus=cleared requires at least one valid structured rightsEvidence record",
      );
    }
    if (seenIds.has(assetId)) {
      addIssue(
        errors,
        assetId,
        assetPath,
        `duplicate stable ID; first seen at ${seenIds.get(assetId)}`,
      );
    } else {
      seenIds.set(assetId, assetPath ?? "<no-path>");
      intakeById.set(assetId, asset);
    }
    if (assetPath) {
      if (seenPaths.has(assetPath)) {
        addIssue(
          errors,
          assetId,
          assetPath,
          `duplicate path; first owned by ${seenPaths.get(assetPath)}`,
        );
      } else {
        seenPaths.set(assetPath, assetId);
      }
    }

    if (asset.requiredForProduction !== truthRequired) {
      addIssue(
        warnings,
        assetId,
        assetPath,
        `requiredForProduction=${String(asset.requiredForProduction)} is non-authoritative; independent production truth says ${truthRequired}${productionSources ? ` (${formatRequirementSources(productionSources).join("; ")})` : ""}`,
      );
    }
    if (truthRequired) {
      const reasons = productionReasons(asset);
      if (reasons.length > 0) {
        releaseBlockers.push({
          assetId,
          path: assetPath,
          reasons,
          truthSources: formatRequirementSources(productionSources),
        });
      }
    }
    if (asset.fileStatus === "missing") {
      addIssue(
        warnings,
        assetId,
        null,
        "known missing asset is recorded; production gate remains blocked",
      );
      continue;
    }
    if (!assetPath || !contracts[asset.contract]) continue;

    let absoluteAssetPath;
    try {
      absoluteAssetPath = await resolveWorkspacePath(workspaceRoot, assetPath, {
        mustExist: true,
      });
      checks.pathSafety += 1;
    } catch (error) {
      addIssue(errors, assetId, assetPath, `unsafe or unreadable path: ${error.message}`);
      continue;
    }

    let buffer;
    try {
      buffer = await fs.readFile(absoluteAssetPath);
      checks.fileExistence += 1;
    } catch (error) {
      addIssue(errors, assetId, assetPath, `file cannot be read: ${error.message}`);
      continue;
    }

    const actualHash = crypto.createHash("sha256").update(buffer).digest("hex");
    checks.sha256 += 1;
    if (actualHash !== asset.sha256) {
      addIssue(
        errors,
        assetId,
        assetPath,
        `SHA-256 mismatch: expected ${asset.sha256}, got ${actualHash}`,
      );
    }
    if (buffer.length !== asset.bytes) {
      addIssue(
        errors,
        assetId,
        assetPath,
        `byte-size mismatch: expected ${asset.bytes}, got ${buffer.length}`,
      );
    }

    const contract = contracts[asset.contract];
    const extension = path.extname(assetPath).toLowerCase();
    if (!contract.allowedExtensions.includes(extension)) {
      addIssue(
        errors,
        assetId,
        assetPath,
        `extension ${extension} is not allowed by ${asset.contract}`,
      );
    }

    let metrics;
    try {
      metrics = await inspectImage(buffer, contract);
      checks.mimeAndExtension += 1;
      checks.dimensions += 1;
      if (contract.alpha !== "optional") checks.alpha += 1;
      if (contract.magentaCheck === true) checks.magenta += 1;
    } catch (error) {
      addIssue(errors, assetId, assetPath, `image metadata cannot be read: ${error.message}`);
      continue;
    }

    if (!metrics.mimeType || !contract.allowedMimeTypes.includes(metrics.mimeType)) {
      addIssue(
        errors,
        assetId,
        assetPath,
        `MIME ${metrics.mimeType ?? "unknown"} is not allowed by ${asset.contract}`,
      );
    }
    const dimensions = contract.dimensions;
    if (
      metrics.width < dimensions.minWidth ||
      metrics.width > dimensions.maxWidth ||
      metrics.height < dimensions.minHeight ||
      metrics.height > dimensions.maxHeight
    ) {
      addIssue(
        errors,
        assetId,
        assetPath,
        `dimensions ${metrics.width}x${metrics.height} outside ${dimensions.minWidth}-${dimensions.maxWidth} x ${dimensions.minHeight}-${dimensions.maxHeight}`,
      );
    }
    const actualAspectRatio = metrics.height === 0 ? 0 : metrics.width / metrics.height;
    if (Math.abs(actualAspectRatio - dimensions.aspectRatio) > dimensions.aspectTolerance) {
      addIssue(
        errors,
        assetId,
        assetPath,
        `aspect ratio ${actualAspectRatio.toFixed(6)} outside ${dimensions.aspectRatio} ± ${dimensions.aspectTolerance}`,
      );
    }
    if (buffer.length > contract.maxBytes) {
      addIssue(
        errors,
        assetId,
        assetPath,
        `byte budget exceeded: ${buffer.length} > ${contract.maxBytes}`,
      );
    }

    if (requiresStrictPortraitMatte(asset, truthRequired)) {
      try {
        const portraitMetrics = await inspectPortrait(absoluteAssetPath, assetId);
        const gate = evaluateGate(portraitMetrics);
        checks.portraitMatte += 1;
        if (!gate.pass) {
          for (const failure of gate.failures) {
            addIssue(errors, assetId, assetPath, `portrait matte gate: ${failure}`);
          }
        }
        assetMetrics.push({
          assetId,
          path: assetPath,
          format: metrics.format,
          mimeType: metrics.mimeType,
          width: metrics.width,
          height: metrics.height,
          hasAlpha: metrics.hasAlpha,
          visibleMagentaRatio: metrics.visibleMagentaRatio,
          portraitMattePass: gate.pass,
          transparentCoverage: portraitMetrics.alphaCoverage.transparent,
          subjectCoverage: portraitMetrics.subjectCoverage,
          sha256: actualHash,
          bytes: buffer.length,
        });
        continue;
      } catch (error) {
        addIssue(
          errors,
          assetId,
          assetPath,
          `portrait matte inspection failed: ${error.message}`,
        );
        continue;
      }
    }

    // Legacy/placeholder and non-production portraits: basic alpha/MIME only.
    if (contract.alpha === "required") {
      if (!metrics.hasAlpha) addIssue(errors, assetId, assetPath, "alpha channel is required");
      if (metrics.transparentPixels === 0) {
        addIssue(
          errors,
          assetId,
          assetPath,
          "portrait transparency gate found no transparent pixels",
        );
      }
      if (metrics.visiblePixels === 0) {
        addIssue(
          errors,
          assetId,
          assetPath,
          "portrait transparency gate found no visible subject pixels",
        );
      }
    }
    if (contract.alpha === "forbidden" && metrics.hasAlpha && metrics.transparentPixels > 0) {
      addIssue(errors, assetId, assetPath, "alpha/transparency is forbidden for this contract");
    }
    if (
      contract.magentaCheck === true &&
      metrics.visibleMagentaRatio > contract.maxVisibleMagentaRatio
    ) {
      addIssue(
        errors,
        assetId,
        assetPath,
        `visible magenta ratio ${metrics.visibleMagentaRatio} exceeds ${contract.maxVisibleMagentaRatio}`,
      );
    }
    assetMetrics.push({
      assetId,
      path: assetPath,
      format: metrics.format,
      mimeType: metrics.mimeType,
      width: metrics.width,
      height: metrics.height,
      hasAlpha: metrics.hasAlpha,
      visibleMagentaRatio: metrics.visibleMagentaRatio,
      sha256: actualHash,
      bytes: buffer.length,
    });
  }

  const seenGapIds = new Set();
  for (const gap of gaps) {
    const gapId = typeof gap?.id === "string" && gap.id.length > 0 ? gap.id : "unknown-gap";
    if (!ASSET_ID_PATTERN.test(gapId))
      addIssue(errors, gapId, null, "gap id must use stable-id syntax");
    if (seenGapIds.has(gapId)) addIssue(errors, gapId, null, "duplicate gap ID");
    seenGapIds.add(gapId);
    if (!VALID_GAP_STATUSES.has(gap.status)) {
      addIssue(errors, gapId, null, `invalid gap status ${String(gap.status)}`);
    }
    if (typeof gap.requiredForProduction !== "boolean") {
      addIssue(errors, gapId, null, "requiredForProduction must be boolean");
    }
    for (const key of ["reason", "currentFallback", "resolution"]) {
      if (typeof gap[key] !== "string" || gap[key].length === 0) {
        addIssue(errors, gapId, null, `${key} must be a non-empty string`);
      }
    }
    const truthRequired = FROZEN_REQUIRED_PRODUCTION_GAP_IDS.has(gapId);
    if (gap.requiredForProduction !== truthRequired) {
      addIssue(
        warnings,
        gapId,
        null,
        `requiredForProduction=${String(gap.requiredForProduction)} is non-authoritative; formal production gap contract says ${truthRequired}`,
      );
    }
    // gap.status is non-authoritative for release. Only a valid gapResolutions
    // record can suppress a formal production gap blocker.
    const hasValidResolution = validGapResolutionById.has(gapId);
    if (gap.status === "resolved" && !hasValidResolution) {
      addIssue(
        errors,
        gapId,
        null,
        "gap.status=resolved is non-authoritative without a matching valid gapResolutions evidence record",
      );
    }
    if (truthRequired && !hasValidResolution) {
      const reasons = [];
      if (gap.status === "open") reasons.push("open production gap");
      else if (gap.status === "resolved") {
        reasons.push("production gap lacks valid structured gapResolutions evidence");
      } else {
        reasons.push("production gap is not resolved with structured evidence");
      }
      releaseBlockers.push({
        assetId: gapId,
        path: null,
        reasons,
        truthSources: ["tools/asset-audit.mjs:FROZEN_REQUIRED_PRODUCTION_GAP_IDS"],
      });
    }
  }
  for (const requiredGapId of FROZEN_REQUIRED_PRODUCTION_GAP_IDS) {
    if (!seenGapIds.has(requiredGapId)) {
      addIssue(
        errors,
        requiredGapId,
        null,
        "formal production gap is missing from intake",
      );
    }
  }

  if (runtimeLedgerPath) {
    let absoluteRuntimeLedgerPath;
    try {
      absoluteRuntimeLedgerPath = await resolveWorkspacePath(workspaceRoot, runtimeLedgerPath, {
        mustExist: true,
      });
      checks.pathSafety += 1;
    } catch (error) {
      addIssue(
        errors,
        "runtime-ledger",
        runtimeLedgerPath,
        `unsafe or unreadable ledger path: ${error.message}`,
      );
      absoluteRuntimeLedgerPath = null;
    }

    let runtimeRows = [];
    if (absoluteRuntimeLedgerPath) {
      try {
        runtimeRows = parseCsv(await fs.readFile(absoluteRuntimeLedgerPath, "utf8"));
      } catch (error) {
        addIssue(errors, "runtime-ledger", runtimeLedgerPath, `cannot read CSV: ${error.message}`);
      }
    }

    const runtimeIds = new Set();
    const runtimeHashes = new Map();
    for (const row of runtimeRows) {
      const assetId = row.asset_id || "unknown-runtime-asset";
      const assetPath = row.path || null;
      checks.runtimeLedgerRows += 1;
      if (runtimeIds.has(assetId))
        addIssue(errors, assetId, assetPath, "duplicate runtime ledger ID");
      runtimeIds.add(assetId);
      if (runtimeHashes.has(row.sha256)) {
        addIssue(
          errors,
          assetId,
          assetPath,
          `duplicate runtime hash; first owned by ${runtimeHashes.get(row.sha256)}`,
        );
      }
      runtimeHashes.set(row.sha256, assetId);
      if (!SHA256_PATTERN.test(row.sha256)) {
        addIssue(errors, assetId, assetPath, "runtime ledger SHA-256 is invalid");
      }
      if (!assetPath) {
        addIssue(errors, assetId, assetPath, "runtime ledger path is required");
        continue;
      }

      let absoluteAssetPath;
      try {
        absoluteAssetPath = await resolveWorkspacePath(workspaceRoot, assetPath, {
          mustExist: true,
        });
        checks.pathSafety += 1;
      } catch (error) {
        addIssue(
          errors,
          assetId,
          assetPath,
          `runtime ledger path unsafe or unreadable: ${error.message}`,
        );
        continue;
      }

      try {
        const buffer = await fs.readFile(absoluteAssetPath);
        const actualHash = crypto.createHash("sha256").update(buffer).digest("hex");
        if (actualHash !== row.sha256) {
          addIssue(
            errors,
            assetId,
            assetPath,
            `runtime ledger SHA-256 mismatch: got ${actualHash}`,
          );
        }
        if (buffer.length !== Number(row.bytes)) {
          addIssue(
            errors,
            assetId,
            assetPath,
            `runtime ledger byte-size mismatch: expected ${row.bytes}, got ${buffer.length}`,
          );
        }
      } catch (error) {
        addIssue(
          errors,
          assetId,
          assetPath,
          `runtime ledger file cannot be read: ${error.message}`,
        );
      }

      if (/\.(?:avif|gif|jpe?g|png|webp)$/iu.test(assetPath)) {
        const intakeAsset = intakeById.get(assetId);
        if (!intakeAsset) {
          addIssue(
            errors,
            assetId,
            assetPath,
            `visual runtime ledger row is missing from visual intake (source=${DEFAULT_RUNTIME_LEDGER_PATH})`,
          );
        } else {
          if (intakeAsset.path !== assetPath) {
            addIssue(errors, assetId, assetPath, `visual intake path differs: ${intakeAsset.path}`);
          }
          if (intakeAsset.sha256 !== row.sha256) {
            addIssue(
              errors,
              assetId,
              assetPath,
              "visual intake SHA-256 differs from runtime ledger",
            );
          }
          if (intakeAsset.bytes !== Number(row.bytes)) {
            addIssue(errors, assetId, assetPath, "visual intake bytes differ from runtime ledger");
          }
        }
      }
    }
    for (const asset of assets) {
      if (
        asset.fileStatus === "present" &&
        typeof asset.path === "string" &&
        asset.path.startsWith("apps/web/public/assets/") &&
        !runtimeIds.has(asset.id)
      ) {
        addIssue(
          errors,
          asset.id,
          asset.path,
          "runtime visual is missing from RUNTIME-ASSET-LEDGER.csv",
        );
      }
    }
  }

  // Reverse coverage: truth sources must not be self-certified only by intake.
  for (const [requiredId, sourceLabels] of requiredIds) {
    checks.reverseCoverage += 1;
    if (!intakeById.has(requiredId)) {
      addIssue(
        errors,
        requiredId,
        null,
        `reverse coverage missing intake record (truth source: ${formatRequirementSources(sourceLabels).join("; ")})`,
      );
    }
  }
  for (const [requiredPath, sourceLabels] of requiredPaths) {
    checks.reverseCoverage += 1;
    if (!seenPaths.has(requiredPath)) {
      addIssue(
        errors,
        "filesystem-asset",
        requiredPath,
        `reverse coverage missing intake path (truth source: ${formatRequirementSources(sourceLabels).join("; ")})`,
      );
    }
  }

  for (const assetId of rightsEvidenceByAssetId.keys()) {
    if (!intakeById.has(assetId)) {
      addIssue(errors, assetId, null, "structured rights evidence references an unknown asset ID");
    }
  }

  const present = assets.filter((asset) => asset.fileStatus === "present").length;
  const missing = assets.filter((asset) => asset.fileStatus === "missing").length;
  const openGaps = gaps.filter((gap) => gap.status === "open").length;
  const pass = errors.length === 0 && (mode === "intake" || releaseBlockers.length === 0);
  return {
    schemaVersion: 1,
    catalogId: manifest.catalogId ?? null,
    mode,
    pass,
    decision: pass ? "final" : mode === "production" && errors.length === 0 ? "blocked" : "iterate",
    manifestPath: relativeDisplayPath(workspaceRoot, manifestPath),
    runtimeLedgerPath: runtimeLedgerPath
      ? relativeDisplayPath(workspaceRoot, runtimeLedgerPath)
      : null,
    summary: {
      assets: assets.length,
      present,
      missing,
      openGaps,
      releaseBlockers: releaseBlockers.length,
    },
    checks,
    errors,
    warnings,
    releaseBlockers,
    assetMetrics,
  };
}

function parseArgs(argv) {
  const options = {
    mode: "intake",
    manifestPath: DEFAULT_MANIFEST_PATH,
    runtimeLedgerPath: DEFAULT_RUNTIME_LEDGER_PATH,
    workspaceRoot: process.cwd(),
    json: false,
    reportPath: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--mode") options.mode = argv[++index];
    else if (arg.startsWith("--mode=")) options.mode = arg.slice("--mode=".length);
    else if (arg === "--manifest") options.manifestPath = argv[++index];
    else if (arg === "--runtime-ledger") {
      const value = argv[++index];
      options.runtimeLedgerPath = value === "none" ? null : value;
    } else if (arg === "--workspace-root") options.workspaceRoot = argv[++index];
    else if (arg === "--report") options.reportPath = argv[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function formatHumanReport(report) {
  const lines = [
    `asset audit ${report.pass ? "PASS" : "FAIL"} (mode=${report.mode})`,
    `catalog=${report.catalogId ?? "unknown"} assets=${report.summary.assets} present=${report.summary.present} missing=${report.summary.missing} openGaps=${report.summary.openGaps} releaseBlockers=${report.summary.releaseBlockers}`,
  ];
  for (const issue of report.errors) lines.push(`ERROR ${issue.message}`);
  for (const issue of report.warnings) lines.push(`WARN ${issue.message}`);
  if (report.mode === "production") {
    for (const blocker of report.releaseBlockers) {
      lines.push(
        `BLOCKED [${blocker.assetId}] ${blocker.path ?? "<no-path>"}: ${blocker.reasons.join(", ")}`,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

async function runCli() {
  const options = parseArgs(process.argv.slice(2));
  const report = await auditAssetIntake(options);
  const output = options.json ? `${JSON.stringify(report, null, 2)}\n` : formatHumanReport(report);
  if (options.reportPath) {
    const absoluteReportPath = await resolveWorkspacePath(
      options.workspaceRoot,
      options.reportPath,
      { mustExist: false },
    );
    await fs.mkdir(path.dirname(absoluteReportPath), { recursive: true });
    await fs.writeFile(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  process.stdout.write(output);
  process.exitCode = report.pass ? 0 : 1;
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  runCli().catch((error) => {
    process.stderr.write(`asset audit crashed: ${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
