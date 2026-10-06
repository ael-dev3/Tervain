#!/usr/bin/env python3
"""Generate small, locally packaged animal calls using ElevenLabs Sound Effects.

The key is read only from stdin (--key-stdin) or ELEVENLABS_API_KEY. This is an
offline asset tool, never a browser endpoint or an environment install step.
Use --inspect first (read-only), then --generate for at most 18 paid requests.
Existing files with matching manifest hashes are reused; network errors are not
retried automatically. --validate checks the packaged manifest and decoded audio
without a key or API calls. Requires Python 3 and FFmpeg with libmp3lame.
"""

from __future__ import annotations

import argparse
import array
import datetime
import hashlib
import json
import math
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
API = "https://api.elevenlabs.io"
MODEL = "eleven_text_to_sound_v2"
SDK = "https://raw.githubusercontent.com/elevenlabs/elevenlabs-python/main/src/elevenlabs/"
SOURCES = [SDK + "types/sfx_model_id.py", SDK + "text_to_sound_effects/client.py"]
SPECIES = {
    "bear": ("a real brown bear giving one deep low grunt and a short breath", "a real brown bear giving a restrained natural warning growl"),
    "lion": ("a real male lion giving one short low rumbling growl", "a real lion giving a short natural throaty roar"),
    "tiger": ("a real tiger giving two soft natural chuff calls", "a real tiger giving one short throaty warning growl"),
    "wolf": ("a real grey wolf giving a short natural howl", "a real grey wolf giving one quiet low growl and breath"),
    "cat": ("a real domestic cat giving one soft natural meow", "a real domestic cat giving two quiet natural questioning meows"),
    "dog": ("a real medium domestic dog giving one natural bark", "a real domestic dog giving two short alert barks"),
    "boar": ("a real wild boar giving two low natural nasal grunts", "a real wild boar giving a short low snort and grunt"),
    "deer": ("a real roe deer giving one short natural bark", "a real female deer giving one soft natural contact call"),
    "stag": ("a real red deer stag giving one low natural rut bellow", "a real red deer stag giving a short throaty contact grunt"),
}


class SafeFailure(Exception):
    """Contains only sanitized, credential-free diagnostic fields."""


def report(**fields):
    print(json.dumps(fields, sort_keys=True), flush=True)


def request(path, key, body=None):
    headers = {"xi-api-key": key, "accept": "application/json" if body is None else "audio/mpeg"}
    data = None
    if body is not None:
        headers["content-type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(API + path, data=data, headers=headers)
    try:
        # Uses the platform's normal verified TLS trust store; never disables TLS.
        with urllib.request.urlopen(req, timeout=90) as response:
            return response.read(8 * 1024 * 1024), response.headers.get("content-type", "")
    except urllib.error.HTTPError as error:
        status = "http_" + str(error.code)
        # Return API status identifiers only, never its arbitrary message/body.
        try:
            detail = json.loads(error.read(4096)).get("detail", {})
            value = detail.get("status", "") if isinstance(detail, dict) else ""
            if isinstance(value, str) and re.fullmatch(r"[a-zA-Z0-9_-]{1,80}", value):
                status += ":" + value
        except (ValueError, AttributeError):
            pass
        raise SafeFailure(status) from None
    except urllib.error.URLError as error:
        # A proxy or TLS error can include sensitive headers in its repr.
        kind = type(error.reason).__name__
        raise SafeFailure("network_" + kind) from None
    except (TimeoutError, OSError) as error:
        raise SafeFailure("network_" + type(error).__name__) from None


def inspect(key):
    data, _ = request("/v1/models", key)
    try:
        models = json.loads(data)
        if not isinstance(models, list):
            raise ValueError("not a model list")
        identifiers = sorted({m["model_id"] for m in models if isinstance(m, dict) and isinstance(m.get("model_id"), str)
                              and re.fullmatch(r"[a-zA-Z0-9_-]{1,80}", m["model_id"])})
    except (ValueError, KeyError, TypeError):
        raise SafeFailure("invalid_model_response") from None
    report(status="authenticated", model_ids=identifiers,
           requested_eleven_v4_model_ids=[m for m in identifiers if "v4" in m.lower()],
           documented_sound_model_ids=[MODEL],
           sound_model=MODEL, sound_model_authority=SOURCES,
           eleven_v4_sound_effects="not_advertised_by_official_sdk",
           note="The model list describes speech models; sound-model access is established by generation.")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def run_ffmpeg(args):
    result = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", *args],
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        # Do not expose arbitrarily interpolated paths or process diagnostics.
        raise SafeFailure("ffmpeg_conversion_failed")
    return result.stdout


def prepare(raw, output, duration):
    with tempfile.TemporaryDirectory(prefix="tervain-animal-sfx-") as folder:
        source = pathlib.Path(folder) / "source.mp3"
        source.write_bytes(raw)
        pcm = run_ffmpeg(["-i", str(source), "-vn", "-ac", "1", "-ar", "44100", "-t", str(duration),
                          "-af", "highpass=f=30", "-f", "f32le", "pipe:1"])
        samples = array.array("f")
        samples.frombytes(pcm)
        if sys.byteorder != "little":
            samples.byteswap()
        if not samples or not all(math.isfinite(value) for value in samples):
            raise SafeFailure("invalid_decoded_audio")
        peak = max(abs(value) for value in samples)
        if peak < 0.0001:
            raise SafeFailure("generated_audio_silent")
        seconds = len(samples) / 44100
        # At most 4x amplification; a -9 dBFS PCM peak reserves mixing headroom.
        gain = min(4.0, 10 ** (-9 / 20) / peak)
        filtered = pathlib.Path(folder) / "mono.wav"
        run_ffmpeg(["-y", "-i", str(source), "-vn", "-ac", "1", "-ar", "44100", "-t", str(duration),
                    "-af", f"highpass=f=30,volume={gain:.10f},afade=t=in:st=0:d=0.008,afade=t=out:st={max(0, seconds - 0.02):.8f}:d=0.02",
                    "-c:a", "pcm_s16le", str(filtered)])
        target = pathlib.Path(folder) / "call.mp3"
        run_ffmpeg(["-y", "-i", str(filtered), "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "96k", str(target)])
        encoded = target.read_bytes()
        decoded = run_ffmpeg(["-i", str(target), "-ac", "1", "-ar", "44100", "-f", "f32le", "pipe:1"])
        measured = array.array("f")
        measured.frombytes(decoded)
        if sys.byteorder != "little":
            measured.byteswap()
        measured_peak = max(abs(value) for value in measured)
        if not math.isfinite(measured_peak) or measured_peak >= 0.8:
            raise SafeFailure("encoded_audio_headroom_failed")
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(encoded)
        return {"sha256": digest(encoded), "bytes": len(encoded), "durationSeconds": len(measured) / 44100,
                "peakDbfs": round(20 * math.log10(max(measured_peak, 1e-12)), 3),
                "channels": 1, "sampleRate": 44100, "codec": "mp3", "bitrate": 96000,
                "sourceSha256": digest(raw)}


def write_manifest(manifest):
    manifest["status"] = "complete" if len(manifest["assets"]) == 18 else "partial"
    content = json.dumps(manifest, indent=2) + "\n"
    for relative in ("docs/engineering/animal-sounds.json", "public/assets/audio/animals/manifest.json"):
        path = ROOT / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_name(path.name + ".tmp")
        temporary.write_text(content, encoding="utf-8")
        temporary.replace(path)


def validate():
    docs = ROOT / "docs/engineering/animal-sounds.json"
    public = ROOT / "public/assets/audio/animals/manifest.json"
    if not docs.exists() or not public.exists() or docs.read_bytes() != public.read_bytes():
        raise SafeFailure("packaged_manifest_differs")
    manifest = json.loads(docs.read_text(encoding="utf-8"))
    expected = {f"{species}-call-{variant}" for species in SPECIES for variant in (1, 2)}
    assets = manifest.get("assets", [])
    if len(assets) != 18 or {asset.get("id") for asset in assets} != expected:
        raise SafeFailure("incomplete_animal_sound_assets")
    hashes = set()
    peaks = []
    total_bytes = 0
    for asset in assets:
        name = asset["id"]
        if asset["path"] != f"public/assets/audio/animals/{name}.mp3":
            raise SafeFailure("invalid_asset_path")
        path = ROOT / asset["path"]
        if digest(path.read_bytes()) != asset["sha256"]:
            raise SafeFailure("asset_integrity_differs:" + name)
        hashes.add(asset["sha256"])
        total_bytes += path.stat().st_size
        decoded = run_ffmpeg(["-i", str(path), "-ac", "1", "-ar", "44100", "-f", "f32le", "pipe:1"])
        samples = array.array("f")
        samples.frombytes(decoded)
        if sys.byteorder != "little":
            samples.byteswap()
        if not samples or not all(math.isfinite(value) for value in samples):
            raise SafeFailure("invalid_audio:" + name)
        peak = max(abs(value) for value in samples)
        if peak < 0.0001 or peak >= 0.8 or not 0.5 <= len(samples) / 44100 <= 5:
            raise SafeFailure("invalid_audio_headroom_or_duration:" + name)
        peaks.append(20 * math.log10(peak))
    if len(hashes) != 18:
        raise SafeFailure("duplicate_sound_recordings")
    report(status="validated", assets=18, species=len(SPECIES), unique_sha256=len(hashes),
           peak_dbfs_min=round(min(peaks), 3), peak_dbfs_max=round(max(peaks), 3),
           bytes=total_bytes, actual_models=sorted({asset["modelId"] for asset in assets}),
           requested_eleven_v4=manifest["requestedElevenV4"])


def generate(args, key):
    if not shutil.which("ffmpeg"):
        raise SafeFailure("ffmpeg_required")
    manifest_path = ROOT / "docs/engineering/animal-sounds.json"
    manifest = {"schemaVersion": 1, "provider": "ElevenLabs", "modelId": MODEL,
                "modelAuthority": SOURCES, "requestedElevenV4": "Not advertised as a Sound Effects model by the official SDK.",
                "authorization": "Animal sound assets requested by the repository owner for the next live build.",
                "processing": "Mono MP3, 30 Hz high-pass, bounded peak normalization to -9 dBFS, short end fades; no synthesized speech.",
                "assets": []}
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if manifest.get("modelId") != MODEL:
            raise SafeFailure("existing_manifest_model_differs")
    assets = {asset["id"]: asset for asset in manifest["assets"]}
    count = 0
    v4_probed = False
    selected = args.species or list(SPECIES)
    for species in selected:
        for variant, prompt in enumerate(SPECIES[species], 1):
            asset_id = f"{species}-call-{variant}"
            relative = f"public/assets/audio/animals/{asset_id}.mp3"
            output = ROOT / relative
            existing = assets.get(asset_id)
            if existing and output.exists() and digest(output.read_bytes()) == existing["sha256"]:
                report(status="reused", id=asset_id)
                continue
            if output.exists():
                raise SafeFailure("unverified_existing_audio:" + asset_id)
            if count >= args.max_requests:
                raise SafeFailure("maximum_generation_requests_reached")
            count += 1
            duration = 3.2 if species in ("bear", "wolf", "lion", "tiger", "stag") else 2.5
            text = "Close clear dry field recording of " + prompt + ". One isolated animal only, natural realistic animal vocalization. Quiet background, no humans, no speech, no music, no other animals, no artificial effects, no distortion."
            report(status="generating", id=asset_id, model_id=MODEL, request_number=count)
            payload = {"text": text, "model_id": MODEL, "duration_seconds": duration,
                       "prompt_influence": 0.45, "loop": False}
            actual_model = MODEL
            if args.try_v4 and not v4_probed:
                # Explicit experimental request only: the SDK does not advertise
                # this model for SFX. Never send its prompt to a speech endpoint.
                v4_probed = True
                report(status="probing_requested_model", model_id="eleven_v4", id=asset_id)
                try:
                    raw, content_type = request("/v1/sound-generation?output_format=mp3_44100_128", key,
                                                {**payload, "model_id": "eleven_v4"})
                    actual_model = "eleven_v4"
                    manifest["requestedElevenV4"] = "Accepted by the sound-generation endpoint; exact asset model recorded per asset."
                    report(status="requested_model_accepted", model_id=actual_model)
                except SafeFailure as error:
                    reason = str(error)
                    report(status="requested_model_rejected", model_id="eleven_v4", reason=reason)
                    if not reason.startswith(("http_400", "http_404", "http_422")):
                        raise
                    manifest["requestedElevenV4"] = "Sound-generation endpoint rejected eleven_v4: " + reason
                    raw, content_type = request("/v1/sound-generation?output_format=mp3_44100_128", key, payload)
            else:
                raw, content_type = request("/v1/sound-generation?output_format=mp3_44100_128", key, payload)
            if not (content_type.startswith("audio/") or content_type.startswith("application/octet-stream")):
                raise SafeFailure("unexpected_generation_response_type")
            record = {"id": asset_id, "species": species, "variant": variant, "path": relative, "modelId": actual_model,
                      "prompt": text, "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                      "requestedDurationSeconds": duration, **prepare(raw, output, duration)}
            assets[asset_id] = record
            manifest["assets"] = sorted(assets.values(), key=lambda entry: entry["id"])
            write_manifest(manifest)
            report(status="generated", id=asset_id, bytes=record["bytes"], peak_dbfs=record["peakDbfs"])
    write_manifest(manifest)
    report(status="complete", generated_requests=count, assets=len(assets), manifest=str(manifest_path.relative_to(ROOT)))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--inspect", action="store_true", help="Authenticated read-only model discovery; no sound generation.")
    mode.add_argument("--generate", action="store_true", help="Generate only missing assets; consumes ElevenLabs credits.")
    mode.add_argument("--validate", action="store_true", help="Validate all packaged recordings and matching manifests without network access or credentials.")
    parser.add_argument("--key-stdin", action="store_true", help="Read key from stdin without displaying or writing it.")
    parser.add_argument("--try-v4", action="store_true", help="Try eleven_v4 once at the SFX endpoint, then use the documented SFX model if rejected as unsupported.")
    parser.add_argument("--species", action="append", choices=list(SPECIES))
    parser.add_argument("--max-requests", type=int, default=18)
    args = parser.parse_args()
    if not args.generate and args.try_v4:
        parser.error("--try-v4 requires --generate; inspect is read-only")
    if args.max_requests < 1 or args.max_requests > 18:
        parser.error("max-requests must be 1..18")
    key = "" if args.validate else (sys.stdin.readline().strip() if args.key_stdin else os.environ.get("ELEVENLABS_API_KEY", "").strip())
    if not args.validate and not key:
        report(status="failed", reason="missing_api_key")
        return 1
    try:
        if args.validate:
            validate()
        else:
            inspect(key) if args.inspect else generate(args, key)
    except SafeFailure as error:
        report(status="failed", reason=str(error))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
