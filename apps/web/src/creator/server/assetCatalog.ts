/**
 * Asset Bay data merge: VISUAL-ASSET-INTAKE.json + RUNTIME-ASSET-LEDGER.csv.
 * Pure helpers so unit tests do not need the full Studio service.
 */

export interface IntakeAssetLike {
  readonly id?: string;
  readonly kind?: string;
  readonly path?: string;
  readonly qualityStatus?: string;
  readonly rightsStatus?: string;
  readonly bytes?: number;
  readonly notes?: string;
  readonly fileStatus?: string;
  readonly sha256?: string;
  readonly requiredForProduction?: boolean;
}

export interface LedgerRow {
  readonly assetId: string;
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number | null;
  readonly source: string;
  readonly releaseStatus: string;
  readonly notes: string;
}

export interface CreatorAssetRecord {
  readonly id: string;
  readonly kind: string;
  readonly path: string;
  /** Browser-served URL when path is under apps/web/public/, else null. */
  readonly publicPath: string | null;
  readonly qualityStatus: string;
  readonly rightsStatus: string;
  readonly bytes: number | null;
  readonly notes: string;
  readonly sources: readonly ("intake" | "ledger")[];
  readonly sha256: string | null;
  readonly fileStatus: string | null;
  readonly ledgerReleaseStatus: string | null;
  readonly ledgerSource: string | null;
}

const PUBLIC_MARKER = "apps/web/public/";

/** Map repo-relative path under apps/web/public to a same-origin URL. */
export function toPublicPath(repoPath: string): string | null {
  const normalized = repoPath.replace(/\\/g, "/");
  const idx = normalized.indexOf(PUBLIC_MARKER);
  if (idx === -1) return null;
  const rest = normalized.slice(idx + PUBLIC_MARKER.length);
  return rest ? `/${rest}` : null;
}

/** Normalize intake kind labels for filter chips. */
export function normalizeAssetKind(kind: string | undefined, path: string): string {
  const raw = (kind ?? "").trim().toLowerCase();
  if (raw === "background" || raw === "bg") return "bg";
  if (raw === "portrait") return "portrait";
  if (raw === "ui_still") return "ui_still";
  if (raw === "prop_ui") return "prop_ui";
  if (raw === "character_reference") return "character_reference";
  if (raw === "audio") return "audio";

  const p = path.replace(/\\/g, "/").toLowerCase();
  if (p.includes("/audio/") || /\.(mp3|ogg|wav|m4a)$/i.test(p)) return "audio";
  if (p.includes("/portraits/")) return "portrait";
  if (p.includes("/scenes/")) return "bg";
  if (p.includes("/props/")) return "prop_ui";
  if (p.includes("/ui/")) return "ui_still";
  return raw || "other";
}

export function isAudioAsset(record: Pick<CreatorAssetRecord, "kind" | "path" | "publicPath">): boolean {
  if (record.kind === "audio") return true;
  const path = record.publicPath ?? record.path;
  return /\.(mp3|ogg|wav|m4a)$/i.test(path);
}

export function isImageAsset(record: Pick<CreatorAssetRecord, "kind" | "path" | "publicPath">): boolean {
  if (isAudioAsset(record)) return false;
  const path = record.publicPath ?? record.path;
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(path);
}

/** Parse RUNTIME-ASSET-LEDGER.csv text (header + rows). */
export function parseRuntimeLedgerCsv(csvText: string): LedgerRow[] {
  const lines = csvText.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) return [];
  const rows: LedgerRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    if (cols.length < 2 || !cols[0]?.trim()) continue;
    const bytesRaw = cols[3]?.trim() ?? "";
    const bytes = bytesRaw && /^\d+$/.test(bytesRaw) ? Number(bytesRaw) : null;
    rows.push({
      assetId: cols[0]!.trim(),
      path: (cols[1] ?? "").trim(),
      sha256: (cols[2] ?? "").trim(),
      bytes,
      source: (cols[4] ?? "").trim(),
      releaseStatus: (cols[5] ?? "").trim(),
      notes: (cols[6] ?? "").trim(),
    });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}

/**
 * Merge intake assets and ledger rows by asset id.
 * Intake wins for kind/quality/rights when present; ledger fills gaps and adds audio-only rows.
 */
export function mergeAssetCatalog(
  intakeAssets: readonly IntakeAssetLike[],
  ledgerRows: readonly LedgerRow[],
): CreatorAssetRecord[] {
  const byId = new Map<string, CreatorAssetRecord>();

  for (const asset of intakeAssets) {
    const id = asset.id?.trim();
    if (!id) continue;
    const path = (asset.path ?? "").trim();
    byId.set(id, {
      id,
      kind: normalizeAssetKind(asset.kind, path),
      path,
      publicPath: path ? toPublicPath(path) : null,
      qualityStatus: asset.qualityStatus?.trim() || "unknown",
      rightsStatus: asset.rightsStatus?.trim() || "unknown",
      bytes: typeof asset.bytes === "number" ? asset.bytes : null,
      notes: asset.notes?.trim() || "",
      sources: ["intake"],
      sha256: asset.sha256?.trim() || null,
      fileStatus: asset.fileStatus?.trim() || null,
      ledgerReleaseStatus: null,
      ledgerSource: null,
    });
  }

  for (const row of ledgerRows) {
    const existing = byId.get(row.assetId);
    if (!existing) {
      byId.set(row.assetId, {
        id: row.assetId,
        kind: normalizeAssetKind(undefined, row.path),
        path: row.path,
        publicPath: row.path ? toPublicPath(row.path) : null,
        qualityStatus: "ledger_only",
        rightsStatus: row.releaseStatus || "unknown",
        bytes: row.bytes,
        notes: row.notes,
        sources: ["ledger"],
        sha256: row.sha256 || null,
        fileStatus: null,
        ledgerReleaseStatus: row.releaseStatus || null,
        ledgerSource: row.source || null,
      });
      continue;
    }

    byId.set(row.assetId, {
      ...existing,
      path: existing.path || row.path,
      publicPath: existing.publicPath ?? (row.path ? toPublicPath(row.path) : null),
      bytes: existing.bytes ?? row.bytes,
      notes: existing.notes || row.notes,
      sources: existing.sources.includes("ledger")
        ? existing.sources
        : ([...existing.sources, "ledger"] as const),
      sha256: existing.sha256 || row.sha256 || null,
      ledgerReleaseStatus: row.releaseStatus || null,
      ledgerSource: row.source || null,
      // Prefer intake rights; if intake missing, use ledger release status.
      rightsStatus:
        existing.rightsStatus === "unknown" && row.releaseStatus
          ? row.releaseStatus
          : existing.rightsStatus,
    });
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}
