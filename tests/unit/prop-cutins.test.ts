import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PROP_CUTIN_CATALOG, resolvePropCutIn } from "@supaluv/content";
import round15Manifest from "../../packages/content/assets/candidates/round15-props/candidate-manifest.json";
import r2Ch03Manifest from "../../packages/content/assets/candidates/r2-ch03-props/candidate-manifest.json";
import {
  createEmptyPropCutInSeenMemory,
  hasSeenPropCutIn,
  markPropCutInSeen,
  propCutInSceneKey,
  shouldRequestPropCutIn,
  shouldShowPropCutIn,
} from "../../apps/web/src/views/play/lib/propCutInState";

const workspaceRoot = path.resolve(import.meta.dirname, "../..");

const expectedScenes = [
  ["prop-protocol-terms", "draft-ch01", "dch01_protocol_test"],
  ["prop-barcode-shift", "draft-ch02", "dch02_barcode_sweep"],
  ["prop-rental-receipt", "draft-ch02", "dch02_s017"],
  ["prop-application-nda", "draft-ch02", "dch02_s028"],
  ["prop-approval-sms", "draft-ch02", "dch02_s032"],
  ["prop-coat-sms", "draft-ch03", "dch03_s002"],
  ["prop-activation-confirm", "draft-ch03", "dch03_robot_barcode"],
] as const;

describe("Round 16 prop cut-in catalog and runtime boundary", () => {
  it("resolves only the exact story/scene landing points", () => {
    expect(PROP_CUTIN_CATALOG).toHaveLength(7);
    for (const [id, storyId, sceneId] of expectedScenes) {
      expect(resolvePropCutIn(storyId, sceneId)).toMatchObject({ id, storyId, sceneId });
    }
    expect(resolvePropCutIn("draft-ch01", "dch01_s016")).toBeNull();
    expect(resolvePropCutIn("draft-ch02", "dch02_s021")).toBeNull();
    expect(resolvePropCutIn("draft-ch03", "dch03_s010")).toBeNull();
    expect(resolvePropCutIn("draft-ch02", null)).toBeNull();
  });

  it("derives image metadata and complete accessible text from the candidate manifest", () => {
    const manifestById = new Map(
      [...round15Manifest.assets, ...r2Ch03Manifest.assets].map((asset) => [asset.id, asset]),
    );
    for (const definition of PROP_CUTIN_CATALOG) {
      const candidate = manifestById.get(definition.id);
      expect(candidate).toBeDefined();
      expect(definition).toMatchObject({
        imageUrl: `/assets/props/${definition.id}.png`,
        altText: candidate?.altText,
        accessibleText: candidate?.accessibleText,
        sha256: candidate?.sha256,
        bytes: candidate?.bytes,
        candidateOutputPath: candidate?.outputPath,
        provenanceType: candidate?.provenance.type,
      });
      expect(definition.accessibleText.length).toBeGreaterThan(40);
    }
  });

  it("keeps candidate and runtime PNG bytes identical", async () => {
    for (const definition of PROP_CUTIN_CATALOG) {
      const candidateBytes = await fs.readFile(
        path.join(workspaceRoot, definition.candidateOutputPath),
      );
      const runtimeBytes = await fs.readFile(
        path.join(workspaceRoot, "apps/web/public/assets/props", `${definition.id}.png`),
      );
      expect(runtimeBytes.equals(candidateBytes), definition.id).toBe(true);
      expect(runtimeBytes.byteLength, definition.id).toBe(definition.bytes);
      expect(crypto.createHash("sha256").update(runtimeBytes).digest("hex"), definition.id).toBe(
        definition.sha256,
      );
    }
  });

  it("opens once per run, supports manual reopen, resets cleanly, and never blocks guests", () => {
    const definition = resolvePropCutIn("draft-ch01", "dch01_protocol_test");
    expect(definition).not.toBeNull();
    const empty = createEmptyPropCutInSeenMemory();
    expect(
      shouldRequestPropCutIn({
        definition,
        isGuestSpectator: false,
        seenMemory: empty,
        manualOpenKey: null,
      }),
    ).toBe(true);
    expect(
      shouldRequestPropCutIn({
        definition,
        isGuestSpectator: true,
        seenMemory: empty,
        manualOpenKey: null,
      }),
    ).toBe(false);

    const seen = markPropCutInSeen(empty, definition!);
    expect(hasSeenPropCutIn(seen, definition!)).toBe(true);
    expect(
      shouldRequestPropCutIn({
        definition,
        isGuestSpectator: false,
        seenMemory: seen,
        manualOpenKey: null,
      }),
    ).toBe(false);
    expect(
      shouldRequestPropCutIn({
        definition,
        isGuestSpectator: false,
        seenMemory: seen,
        manualOpenKey: propCutInSceneKey(definition!),
      }),
    ).toBe(true);
    expect(hasSeenPropCutIn(createEmptyPropCutInSeenMemory(), definition!)).toBe(false);
  });

  it("keeps the request paused while a higher-priority surface owns the foreground", () => {
    expect(shouldShowPropCutIn({ requested: true, higherPrioritySurfaceOpen: true })).toBe(false);
    expect(shouldShowPropCutIn({ requested: true, higherPrioritySurfaceOpen: false })).toBe(true);
    expect(shouldShowPropCutIn({ requested: false, higherPrioritySurfaceOpen: false })).toBe(false);
  });

  it("wires modal focus, Escape, failure fallback, autoplay pause, interaction pause, and guest gate", async () => {
    const componentSource = await fs.readFile(
      path.join(workspaceRoot, "apps/web/src/views/play/PropCutIn.tsx"),
      "utf8",
    );
    const stageSource = await fs.readFile(
      path.join(workspaceRoot, "apps/web/src/views/VisualNovelPrototype.tsx"),
      "utf8",
    );
    const runtimeSource = await fs.readFile(
      path.join(workspaceRoot, "apps/web/src/views/play/experience/usePlayStageRuntime.ts"),
      "utf8",
    );
    expect(componentSource).toContain('role="dialog"');
    expect(componentSource).toContain('aria-modal="true"');
    expect(componentSource).toContain("dialog.showModal()");
    expect(componentSource).toContain("closeButtonRef.current?.focus()");
    expect(componentSource).toContain('event.key !== "Escape"');
    expect(componentSource).toContain("onError={() => setImageFailed(true)}");
    expect(componentSource).toContain("localized.accessibleText");
    expect(runtimeSource).toContain(
      "activeCutscene: Boolean(activeCutscene) || propCutIn.requested",
    );
    expect(stageSource).toContain("r.activeStoryInteraction && !r.propCutIn.requested");
    expect(stageSource).toContain("!r.isGuestSpectator &&");
    expect(stageSource).toContain("!r.propCutIn.requested &&");
  });
});
