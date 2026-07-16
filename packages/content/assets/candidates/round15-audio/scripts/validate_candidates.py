#!/usr/bin/env python3
"""Mechanically validate the Round 15 audio candidate package without mutation."""

from __future__ import annotations

import array
import hashlib
import json
import math
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parents[4]
MANIFEST_PATH = ROOT / "candidate-manifest.json"
SOURCES_PATH = ROOT / "source-records.json"
AUDITION_INDEX_PATH = ROOT / "audition-index.json"
AUDITION_HTML_PATH = ROOT / "audition.html"

EXPECTED_IDS = {
    "music-corporate-soft-pressure",
    "music-private-shame-fracture",
    "music-public-spectacle-payment",
    "music-night-alley-alliance",
    "music-budget-settling",
    "music-robot-temptation",
    "music-chapter-endpoint",
    "test-booth-hvac",
    "office-corridor",
    "night-alley",
    "convenience-store",
    "budget-hotel",
    "rental-room",
    "door-lock",
    "chip-bag",
    "phone-buzz",
    "freight-elevator",
    "scanner",
    "door-knock",
    "cat-step",
    "payment-receipt",
}


def fail(message: str) -> None:
    raise AssertionError(message)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ffprobe(path: Path) -> dict[str, Any]:
    output = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "a:0",
            "-show_entries",
            "stream=codec_name,sample_rate,channels:format=duration,size",
            "-of",
            "json",
            str(path),
        ],
        text=True,
    )
    return json.loads(output)


def decode_edge(path: Path, start_seconds: float) -> array.array[float]:
    raw = subprocess.check_output(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            str(max(0.0, start_seconds)),
            "-i",
            str(path),
            "-t",
            "0.1",
            "-f",
            "f32le",
            "-acodec",
            "pcm_f32le",
            "-",
        ]
    )
    values = array.array("f")
    values.frombytes(raw)
    return values


def validate_manifest_shape(manifest: dict[str, Any]) -> None:
    required_top = {"schemaVersion", "packageId", "candidate_only", "humanListeningReview", "rightsClearance", "counts", "candidates"}
    if set(manifest) != required_top:
        fail(f"manifest top-level keys differ: {set(manifest) ^ required_top}")
    if manifest["schemaVersion"] != 1 or manifest["packageId"] != "round15-audio":
        fail("manifest identity mismatch")
    if manifest["candidate_only"] is not True or manifest["humanListeningReview"] is not False:
        fail("candidate/review flags mismatch")
    if manifest["rightsClearance"] != "not_granted":
        fail("rights clearance must remain not_granted")
    if manifest["counts"] != {"music": 7, "ambience": 6, "sfx": 8, "total": 21}:
        fail("manifest counts mismatch")
    if len(manifest["candidates"]) != 21:
        fail("manifest must contain 21 candidates")


def main() -> int:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    sources = json.loads(SOURCES_PATH.read_text(encoding="utf-8"))
    audition = json.loads(AUDITION_INDEX_PATH.read_text(encoding="utf-8"))
    html = AUDITION_HTML_PATH.read_text(encoding="utf-8")
    validate_manifest_shape(manifest)

    ids = [candidate["stableId"] for candidate in manifest["candidates"]]
    if set(ids) != EXPECTED_IDS or len(ids) != len(set(ids)):
        fail("stable ID set or uniqueness mismatch")
    kinds = Counter(candidate["kind"] for candidate in manifest["candidates"])
    if kinds != Counter({"music": 7, "ambience": 6, "sfx": 8}):
        fail(f"kind counts mismatch: {kinds}")

    source_by_id = {record["sourceRecordId"]: record for record in sources["sources"]}
    if len(source_by_id) != 21 or sources["donorGate"]["assessment"] != "REJECTED":
        fail("source records or WOC donor gate mismatch")
    if sources["donorGate"]["exactCommit"] != "7c10f280eec380e9877e66ce16333089e171fe42":
        fail("WOC exact commit mismatch")

    hashes: list[str] = []
    total_bytes = 0
    seam_metrics: dict[str, dict[str, float]] = {}
    for candidate in manifest["candidates"]:
        candidate_id = candidate["stableId"]
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", candidate_id):
            fail(f"invalid stable ID: {candidate_id}")
        if candidate["candidate_only"] is not True or candidate["humanListeningReview"] is not False:
            fail(f"candidate/review flags mismatch: {candidate_id}")
        if candidate["rightsClearance"] != "not_granted":
            fail(f"rights clearance mismatch: {candidate_id}")
        if not candidate["sequenceMapping"]:
            fail(f"missing sequence mapping: {candidate_id}")

        provenance = candidate["provenance"]
        source = source_by_id.get(provenance["sourceRecordId"])
        if source is None or source["candidateId"] != candidate_id:
            fail(f"missing source record: {candidate_id}")
        if source["sourceSha256"] != provenance["sourceSha256"]:
            fail(f"source hash linkage mismatch: {candidate_id}")
        if source["itemUrl"] != provenance["itemUrl"] or source["sourcePath"] != provenance["sourcePath"]:
            fail(f"source URL/path linkage mismatch: {candidate_id}")

        path = ROOT / candidate["file"]
        if not path.is_file() or path.stat().st_size <= 0:
            fail(f"missing or empty audio: {candidate_id}")
        technical = candidate["technical"]
        if path.stat().st_size != technical["bytes"]:
            fail(f"byte count mismatch: {candidate_id}")
        actual_hash = sha256(path)
        if actual_hash != technical["sha256"]:
            fail(f"candidate hash mismatch: {candidate_id}")
        hashes.append(actual_hash)
        total_bytes += path.stat().st_size

        probe = ffprobe(path)
        stream = probe["streams"][0]
        duration = float(probe["format"]["duration"])
        if stream["codec_name"] != "mp3" or int(stream["sample_rate"]) != 44100:
            fail(f"codec/sample-rate mismatch: {candidate_id}")
        expected_channels = 1 if candidate["kind"] == "sfx" else 2
        if int(stream["channels"]) != expected_channels:
            fail(f"channel count mismatch: {candidate_id}")
        if abs(duration - float(technical["durationSeconds"])) > 0.02:
            fail(f"duration mismatch: {candidate_id}")
        if technical["truePeakDbtp"] > -2.0:
            fail(f"true peak exceeds -2 dBTP: {candidate_id}")
        if candidate["kind"] == "music" and not (40 <= duration <= 60):
            fail(f"music duration out of bounds: {candidate_id}")
        if candidate["kind"] == "ambience" and not (25 <= duration <= 40):
            fail(f"ambience duration out of bounds: {candidate_id}")
        if candidate["kind"] == "sfx" and not (0.3 <= duration <= 4.5):
            fail(f"SFX duration out of bounds: {candidate_id}")

        if candidate["loopCandidate"]:
            first = decode_edge(path, 0)
            last = decode_edge(path, max(0, duration - 0.1))
            if not first or not last:
                fail(f"unable to decode loop edges: {candidate_id}")
            channels = expected_channels
            jump = max(abs(last[-channels + index] - first[index]) for index in range(channels))
            start_rms = math.sqrt(sum(value * value for value in first) / len(first))
            end_rms = math.sqrt(sum(value * value for value in last) / len(last))
            if jump >= 0.11:
                fail(f"loop boundary jump too large ({jump:.6f}): {candidate_id}")
            seam_metrics[candidate_id] = {
                "boundaryJumpLinear": round(jump, 6),
                "startRmsDbfs": round(20 * math.log10(max(start_rms, 1e-9)), 2),
                "endRmsDbfs": round(20 * math.log10(max(end_rms, 1e-9)), 2),
            }

    if len(hashes) != len(set(hashes)):
        fail("duplicate candidate audio hashes detected")
    if total_bytes > 10 * 1024 * 1024:
        fail(f"candidate package audio exceeds 10 MiB: {total_bytes}")

    sequences = audition["sequences"]
    if [sequence["sequenceId"] for sequence in sequences] != [f"SQ{index:02d}" for index in range(1, 14)]:
        fail("audition sequence order/coverage mismatch")
    referenced: set[str] = set()
    for sequence in sequences:
        if not sequence["music"] or not sequence["ambience"]:
            fail(f"sequence lacks music or ambience: {sequence['sequenceId']}")
        for lane in ("music", "ambience", "sfx"):
            for candidate_id in sequence[lane]:
                if candidate_id not in EXPECTED_IDS:
                    fail(f"unknown audition candidate: {candidate_id}")
                referenced.add(candidate_id)
    if referenced != EXPECTED_IDS:
        fail(f"audition omits candidates: {sorted(EXPECTED_IDS - referenced)}")

    if "const AUDITION_DATA" not in html or "fetch(" in html or "XMLHttpRequest" in html:
        fail("audition HTML is not self-contained")
    if re.search(r"<(?:script|link)[^>]+(?:src|href)=['\"]https?://", html, re.I):
        fail("audition HTML loads external resources")
    for candidate in manifest["candidates"]:
        if candidate["file"] not in html:
            fail(f"audition HTML omits file path: {candidate['stableId']}")

    result = {
        "status": "PASS",
        "candidateCount": len(manifest["candidates"]),
        "kindCounts": dict(kinds),
        "sequenceCount": len(sequences),
        "uniqueCandidateHashes": len(set(hashes)),
        "audioBytes": total_bytes,
        "seamMetrics": seam_metrics,
        "humanListeningReview": False,
        "rightsClearance": "not_granted",
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, KeyError, ValueError, subprocess.CalledProcessError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        raise SystemExit(1)
