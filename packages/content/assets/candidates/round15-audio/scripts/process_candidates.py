#!/usr/bin/env python3
"""Download source bytes, render candidate audio, and print provenance/metrics JSON.

This script intentionally writes only downloaded/derived binary media. Text
manifests and reports are maintained through reviewed patches.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
PLAN_PATH = ROOT / "source-plan.json"
SOURCE_CACHE = Path(tempfile.gettempdir()) / "round15-audio-sources"
VISUAL_ROOT = Path(".devspace-visual/round-15-audio-materials")


def run(command: list[str], *, capture: bool = False) -> str:
    completed = subprocess.run(
        command,
        check=True,
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
    )
    return completed.stdout if capture else ""


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download(url: str, path: Path) -> None:
    if path.exists() and path.stat().st_size > 0:
        return
    request = urllib.request.Request(url, headers={"User-Agent": "SupaLuv-audio-candidate-intake/1"})
    with urllib.request.urlopen(request, timeout=90) as response:
        data = response.read()
    if not data:
        raise RuntimeError(f"empty download: {url}")
    path.write_bytes(data)


def output_path(candidate: dict[str, Any]) -> Path:
    kind = candidate["kind"]
    folder = "music" if kind == "music" else "ambience" if kind == "ambience" else "sfx"
    return ROOT / "audio" / folder / f"{candidate['id']}.mp3"


def loop_filter(candidate: dict[str, Any], defaults: dict[str, Any]) -> str:
    transform = candidate["transform"]
    start = float(transform["startSeconds"])
    window = float(transform["sourceWindowSeconds"])
    crossfade = float(defaults["loopCrossfadeSeconds"])
    end = start + window
    body_start = start + crossfade
    head_end = start + crossfade
    return (
        f"[0:a]atrim=start={body_start}:end={end},asetpts=PTS-STARTPTS[a];"
        f"[0:a]atrim=start={start}:end={head_end},asetpts=PTS-STARTPTS[b];"
        f"[a][b]acrossfade=d={crossfade}:c1=tri:c2=tri,"
        f"loudnorm=I={defaults['targetIntegratedLufs']}:TP={defaults['targetTruePeakDbtp']}:LRA=7,"
        f"aresample={defaults['sampleRate']}"
    )


def sfx_filter(candidate: dict[str, Any], defaults: dict[str, Any]) -> str:
    transform = candidate["transform"]
    start = float(transform["startSeconds"])
    duration = float(transform["sourceWindowSeconds"])
    return (
        f"atrim=start={start}:duration={duration},asetpts=PTS-STARTPTS,"
        "silenceremove=start_periods=1:start_duration=0.005:start_threshold=-60dB,"
        f"loudnorm=I={defaults['targetIntegratedLufs']}:TP=-6:LRA=7,"
        "alimiter=limit=0.5:level=false:attack=5:release=50,"
        f"aresample={defaults['sampleRate']}"
    )


def render(candidate: dict[str, Any], plan: dict[str, Any], source: Path, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    defaults = plan["defaults"][candidate["kind"]]
    channels = str(defaults["channels"])
    bitrate = defaults["bitrate"]
    command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source)]
    if candidate["kind"] in {"music", "ambience"}:
        command += ["-filter_complex", loop_filter(candidate, defaults)]
    else:
        command += ["-af", sfx_filter(candidate, defaults)]
    command += [
        "-ar",
        str(defaults["sampleRate"]),
        "-ac",
        channels,
        "-codec:a",
        "libmp3lame",
        "-b:a",
        bitrate,
        "-map_metadata",
        "-1",
        str(output),
    ]
    run(command)


def probe(path: Path) -> dict[str, Any]:
    raw = run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "a:0",
            "-show_entries",
            "stream=codec_name,sample_rate,channels,channel_layout,bit_rate:format=duration,size,bit_rate",
            "-of",
            "json",
            str(path),
        ],
        capture=True,
    )
    return json.loads(raw)


def loudness(path: Path) -> dict[str, float | None]:
    completed = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-nostats",
            "-i",
            str(path),
            "-filter_complex",
            "ebur128=peak=true",
            "-f",
            "null",
            "-",
        ],
        check=True,
        text=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    integrated = None
    true_peak = None
    for line in completed.stderr.splitlines():
        stripped = line.strip()
        if stripped.startswith("I:") and "LUFS" in stripped:
            integrated = float(stripped.split()[1])
        elif stripped.startswith("Peak:") and "dBFS" in stripped:
            true_peak = float(stripped.split()[1])
    return {"integratedLufs": integrated, "truePeakDbtp": true_peak}


def make_visuals(candidate_id: str, path: Path) -> None:
    VISUAL_ROOT.mkdir(parents=True, exist_ok=True)
    waveform = VISUAL_ROOT / f"{candidate_id}-waveform.png"
    spectrum = VISUAL_ROOT / f"{candidate_id}-spectrum.png"
    run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(path),
            "-filter_complex",
            "showwavespic=s=1200x240:split_channels=1",
            "-frames:v",
            "1",
            str(waveform),
        ]
    )
    run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(path),
            "-lavfi",
            "showspectrumpic=s=1200x360:legend=disabled:scale=log",
            "-frames:v",
            "1",
            str(spectrum),
        ]
    )


def main() -> int:
    plan = json.loads(PLAN_PATH.read_text(encoding="utf-8"))
    SOURCE_CACHE.mkdir(parents=True, exist_ok=True)
    results: list[dict[str, Any]] = []
    for candidate in plan["candidates"]:
        candidate_id = candidate["id"]
        source = SOURCE_CACHE / f"{candidate_id}.source.mp3"
        download(candidate["source"]["downloadUrl"], source)
        output = output_path(candidate)
        render(candidate, plan, source, output)
        make_visuals(candidate_id, output)
        probe_data = probe(output)
        stream = probe_data["streams"][0]
        format_data = probe_data["format"]
        results.append(
            {
                "id": candidate_id,
                "kind": candidate["kind"],
                "source": {
                    "path": str(source),
                    "bytes": source.stat().st_size,
                    "sha256": sha256(source),
                },
                "candidate": {
                    "path": output.relative_to(ROOT).as_posix(),
                    "codec": stream.get("codec_name"),
                    "sampleRate": int(stream["sample_rate"]),
                    "channels": int(stream["channels"]),
                    "channelLayout": stream.get("channel_layout"),
                    "durationSeconds": round(float(format_data["duration"]), 6),
                    "bitRate": int(stream.get("bit_rate") or format_data.get("bit_rate") or 0),
                    "bytes": output.stat().st_size,
                    "sha256": sha256(output),
                    **loudness(output),
                },
            }
        )
        print(f"processed {candidate_id}", file=sys.stderr)
    print(json.dumps(results, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
