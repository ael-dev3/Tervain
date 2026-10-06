#!/usr/bin/env python3
"""Generate locally packaged hunting sounds with ElevenLabs Sound Effects.

Use --generate --key-stdin (or ELEVENLABS_API_KEY) for at most six paid
requests. Verified assets are reused; network failures are never retried
automatically. --validate requires neither a key nor network access.
The game uses only the resulting local recordings, never this provider API.
Requires Python 3 and FFmpeg with libmp3lame.
"""

from __future__ import annotations

import argparse
import array
import datetime
import importlib.util
import json
import math
import os
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("animal_sound_tool", ROOT / "tools/generate-animal-sounds.py")
shared = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shared)
MODEL = shared.MODEL
EFFECTS = {
    "bow_draw": (1.5, False, "One slow controlled draw of a traditional wooden recurve hunting bow: taut braided bowstring stretching, quiet wood creak and leather finger glove tension. No release."),
    "bow_release": (0.65, False, "One crisp release of a traditional wooden hunting bow: a short dry bowstring twang, followed by a quick feathered arrow whisk passing away. Acoustic and restrained."),
    "arrow_flesh": (0.8, False, "One muted close impact of a feathered hunting arrow into dense animal hide: a soft leather puncture and low dull thud, a very small moist contact. Restrained, no gore, no cries."),
    "arrow_ground": (0.8, False, "One feathered wooden arrow striking packed woodland earth beside a dry root: a short dry thunk, little dirt crumble and a tiny wood rattle. No ricochet."),
    "skinning": (3.0, True, "Close quiet field recording of repeated short controlled knife scrapes along thick animal hide and leather, soft fur brushing and hide rustling. Slow deliberate hand work, gentle dry cutting sounds, no gore, no wet exaggerated effects. Even texture suitable for a seamless loop."),
    "skinning_complete": (1.0, False, "One short close rustle of a fur pelt being folded and tucked into a leather hunting satchel, ending with a soft leather strap settling. Quiet natural materials."),
}


def write_manifest(manifest):
    manifest["status"] = "complete" if len(manifest["assets"]) == len(EFFECTS) else "partial"
    content = json.dumps(manifest, indent=2) + "\n"
    for relative in ("docs/engineering/hunting-sounds.json", "public/assets/audio/hunting/manifest.json"):
        path = ROOT / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_name(path.name + ".tmp")
        temporary.write_text(content, encoding="utf-8")
        temporary.replace(path)


def validate():
    docs = ROOT / "docs/engineering/hunting-sounds.json"
    public = ROOT / "public/assets/audio/hunting/manifest.json"
    if not docs.exists() or not public.exists() or docs.read_bytes() != public.read_bytes():
        raise shared.SafeFailure("packaged_manifest_differs")
    manifest = json.loads(docs.read_text(encoding="utf-8"))
    assets = manifest.get("assets", [])
    if len(assets) != len(EFFECTS) or {asset.get("id") for asset in assets} != set(EFFECTS):
        raise shared.SafeFailure("incomplete_hunting_sound_assets")
    hashes, peaks, total_bytes = set(), [], 0
    for asset in assets:
        name = asset["id"]
        if asset["path"] != f"public/assets/audio/hunting/{name}.mp3" or asset["modelId"] != MODEL:
            raise shared.SafeFailure("invalid_asset_path_or_model")
        path = ROOT / asset["path"]
        if shared.digest(path.read_bytes()) != asset["sha256"]:
            raise shared.SafeFailure("asset_integrity_differs:" + name)
        decoded = shared.run_ffmpeg(["-i", str(path), "-ac", "1", "-ar", "44100", "-f", "f32le", "pipe:1"])
        samples = array.array("f")
        samples.frombytes(decoded)
        if sys.byteorder != "little":
            samples.byteswap()
        if not samples or not all(math.isfinite(value) for value in samples):
            raise shared.SafeFailure("invalid_audio:" + name)
        peak = max(abs(value) for value in samples)
        if peak < 0.0001 or peak >= 0.8 or not 0.4 <= len(samples) / 44100 <= 4:
            raise shared.SafeFailure("invalid_audio_headroom_or_duration:" + name)
        hashes.add(asset["sha256"])
        peaks.append(20 * math.log10(peak))
        total_bytes += path.stat().st_size
    if len(hashes) != len(EFFECTS):
        raise shared.SafeFailure("duplicate_sound_recordings")
    shared.report(status="validated", assets=len(assets), unique_sha256=len(hashes), bytes=total_bytes,
                  peak_dbfs_min=round(min(peaks), 3), peak_dbfs_max=round(max(peaks), 3), actual_model=MODEL)


def generate(args, key):
    if not shutil.which("ffmpeg"):
        raise shared.SafeFailure("ffmpeg_required")
    manifest_path = ROOT / "docs/engineering/hunting-sounds.json"
    manifest = {"schemaVersion": 1, "provider": "ElevenLabs", "modelId": MODEL,
                "modelAuthority": shared.SOURCES,
                "requestedElevenV4": "An earlier animal SFX request rejected eleven_v4 (HTTP 422); hunting uses the supported Sound Effects v2 model.",
                "authorization": "Hunting sound effects requested by the repository owner.",
                "processing": "Mono MP3, 30 Hz high-pass, bounded peak normalization to -9 dBFS, short boundary fades; skinning requests a provider loop and plays locally until stopped.",
                "assets": []}
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if manifest.get("modelId") != MODEL:
            raise shared.SafeFailure("existing_manifest_model_differs")
    assets = {asset["id"]: asset for asset in manifest["assets"]}
    count = 0
    for name in args.effect or EFFECTS:
        relative = f"public/assets/audio/hunting/{name}.mp3"
        output = ROOT / relative
        existing = assets.get(name)
        if existing and output.exists() and shared.digest(output.read_bytes()) == existing["sha256"]:
            shared.report(status="reused", id=name)
            continue
        if output.exists():
            raise shared.SafeFailure("unverified_existing_audio:" + name)
        if count >= args.max_requests:
            raise shared.SafeFailure("maximum_generation_requests_reached")
        duration, loop, detail = EFFECTS[name]
        text = "Close clear isolated acoustic field recording. " + detail + " Quiet background, no voices, no speech, no music, no other animals, no electronic or cinematic effects, no distortion."
        count += 1
        shared.report(status="generating", id=name, model_id=MODEL, request_number=count)
        raw, content_type = shared.request("/v1/sound-generation?output_format=mp3_44100_128", key,
            {"text": text, "model_id": MODEL, "duration_seconds": duration, "prompt_influence": 0.45, "loop": loop})
        if not (content_type.startswith("audio/") or content_type.startswith("application/octet-stream")):
            raise shared.SafeFailure("unexpected_generation_response_type")
        temporary = output.with_name(output.name + ".tmp")
        record = {"id": name, "path": relative, "modelId": MODEL, "prompt": text,
                  "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  "requestedDurationSeconds": duration, "loop": loop, **shared.prepare(raw, temporary, duration)}
        temporary.replace(output)
        assets[name] = record
        manifest["assets"] = sorted(assets.values(), key=lambda entry: entry["id"])
        write_manifest(manifest)
        shared.report(status="generated", id=name, bytes=record["bytes"], peak_dbfs=record["peakDbfs"])
    write_manifest(manifest)
    shared.report(status="complete", generated_requests=count, assets=len(assets), manifest=str(manifest_path.relative_to(ROOT)))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--generate", action="store_true", help="Generate missing recordings; consumes ElevenLabs credits.")
    mode.add_argument("--validate", action="store_true", help="Validate packaged recordings without API requests.")
    parser.add_argument("--key-stdin", action="store_true", help="Read key from stdin without displaying or writing it.")
    parser.add_argument("--effect", action="append", choices=list(EFFECTS))
    parser.add_argument("--max-requests", type=int, default=6)
    args = parser.parse_args()
    if not 1 <= args.max_requests <= 6:
        parser.error("max-requests must be 1..6")
    key = "" if args.validate else (sys.stdin.readline().strip() if args.key_stdin else os.environ.get("ELEVENLABS_API_KEY", "").strip())
    if not args.validate and not key:
        shared.report(status="failed", reason="missing_api_key")
        return 1
    try:
        validate() if args.validate else generate(args, key)
    except shared.SafeFailure as error:
        shared.report(status="failed", reason=str(error))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
