/**
 * Catalog-driven "algorithm shame archive" — authored record IDs only.
 * Not a reward economy or inventory; records what the algorithm noticed.
 */

export const ALGORITHM_SHAME_ARCHIVE_RECORD_IDS = [
  "protocol-terms",
  "barcode-shift",
  "rental-receipt",
  "application-nda",
  "approval-sms",
] as const;

export type AlgorithmShameArchiveRecordId = (typeof ALGORITHM_SHAME_ARCHIVE_RECORD_IDS)[number];

export interface AlgorithmShameArchiveRecord {
  readonly id: AlgorithmShameArchiveRecordId;
  /** Scenes that unlock this record when presented (unique merge). */
  readonly unlockSceneIds: readonly string[];
}

/** Stable authored catalog. Title/description copy lives in i18n under gallery.archive.records.* */
export const ALGORITHM_SHAME_ARCHIVE: readonly AlgorithmShameArchiveRecord[] = [
  {
    id: "protocol-terms",
    unlockSceneIds: ["dch01_protocol_test", "dch01_s002"],
  },
  {
    id: "barcode-shift",
    unlockSceneIds: ["dch02_barcode_sweep", "dch02_s003"],
  },
  {
    id: "rental-receipt",
    unlockSceneIds: ["dch02_s017"],
  },
  {
    id: "application-nda",
    unlockSceneIds: ["dch02_mobile_questionnaire", "dch02_s028"],
  },
  {
    id: "approval-sms",
    unlockSceneIds: ["dch02_s032"],
  },
] as const;

const sceneToArchive = new Map<string, AlgorithmShameArchiveRecordId[]>();
for (const record of ALGORITHM_SHAME_ARCHIVE) {
  for (const sceneId of record.unlockSceneIds) {
    const list = sceneToArchive.get(sceneId) ?? [];
    if (!list.includes(record.id)) {
      list.push(record.id);
    }
    sceneToArchive.set(sceneId, list);
  }
}

export function archiveIdsForScene(
  sceneId: string | null,
): readonly AlgorithmShameArchiveRecordId[] {
  if (!sceneId) {
    return [];
  }
  return sceneToArchive.get(sceneId) ?? [];
}

export function isAlgorithmShameArchiveRecordId(
  value: string,
): value is AlgorithmShameArchiveRecordId {
  return (ALGORITHM_SHAME_ARCHIVE_RECORD_IDS as readonly string[]).includes(value);
}
