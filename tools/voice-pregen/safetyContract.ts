import { createHash } from "node:crypto";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

export function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function voicePlanDigest(contract: unknown): string {
  return sha256Text(JSON.stringify(canonicalize(contract)));
}

export function voiceTraversalChunkKey(input: {
  sceneId: string | null;
  text: string;
  choices: ReadonlyArray<{ id: string | null; text: string }>;
}): string {
  return voicePlanDigest({
    sceneId: input.sceneId,
    text: input.text,
    choices: input.choices.map((choice) => ({ id: choice.id, text: choice.text })),
  });
}
