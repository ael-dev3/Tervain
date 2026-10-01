#!/usr/bin/env python3
"""Build compact, reproducible menu visual envelopes from the approved score.

Requires existing Python 3 / NumPy and FFmpeg; this script never installs packages.
Run from any directory: python3 tools/analyze-menu-score.py
The archived source and primary runtime derivative must match the audio manifest.
No source lyrics, timed text, metadata prompts, audio samples, or artwork enter the
generated module. Runtime reads five precomputed envelopes; it never runs an FFT.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import pathlib
import shutil
import subprocess
import textwrap

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src/presentation/menu/menuScoreFeatures.ts"
RATE = 20
SAMPLE_RATE = 12000
WINDOW = 2048
BANDS = ((40, 260), (260, 2200), (2200, 5500))
FEATURES = ("energy", "bass", "mid", "treble", "onset")


def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def checked_audio() -> tuple[dict, dict, pathlib.Path]:
    manifest = json.loads((ROOT / "docs/engineering/menu-audio-assets.json").read_text(encoding="utf-8"))
    asset = next(a for a in manifest["assets"] if a["id"] == "tervain.menu.the-sovereigns-oath.2026-09-30")
    source = asset["source"]
    runtime = next(d for d in asset["runtime"]["derivatives"] if d["role"] == "primary")
    for entry, key in ((source, "archivePath"), (runtime, "path")):
        path = ROOT / entry[key]
        if sha256(path) != entry["sha256"]:
            raise SystemExit(f"Audio integrity differs from the approved manifest: {path}")
    return source, runtime, ROOT / runtime["path"]


def envelopes(path: pathlib.Path, duration: float, ffmpeg: str) -> tuple[np.ndarray, np.ndarray, dict]:
    # Decode stereo rather than a mono mix: phase cancellation must not erase musical energy. The primary Ogg is the
    # timing reference used by the native audio element; AAC's millisecond priming difference is below one 50ms hop.
    decoded = subprocess.run([
        ffmpeg, "-nostdin", "-hide_banner", "-loglevel", "error", "-i", str(path), "-map", "0:a:0",
        "-vn", "-sn", "-dn", "-ac", "2", "-ar", str(SAMPLE_RATE), "-t", str(duration), "-f", "f32le", "pipe:1",
    ], check=True, stdout=subprocess.PIPE).stdout
    pcm = np.frombuffer(decoded, dtype="<f4").reshape(-1, 2).astype(np.float64)
    count = round(duration * RATE) + 1
    padded = np.pad(pcm, ((WINDOW // 2, WINDOW // 2 + SAMPLE_RATE // RATE), (0, 0)))
    hann = np.hanning(WINDOW)
    bins = np.fft.rfftfreq(WINDOW, 1 / SAMPLE_RATE)
    weights = np.full(len(bins), 2.0 / (WINDOW * WINDOW * np.mean(hann * hann)))
    weights[[0, -1]] *= 0.5
    masks = [(bins >= low) & (bins < high) for low, high in BANDS]
    raw = np.zeros((count, len(FEATURES)), dtype=np.float64)
    previous_magnitude = np.zeros_like(bins)
    for frame in range(count):
        offset = round(frame * SAMPLE_RATE / RATE)
        block = padded[offset:offset + WINDOW]
        raw[frame, 0] = np.sqrt(np.mean(block * block))
        spectrum = np.fft.rfft(block * hann[:, None], axis=0)
        power = np.mean(np.abs(spectrum) ** 2, axis=1) * weights
        for band, mask in enumerate(masks):
            raw[frame, band + 1] = np.sqrt(np.sum(power[mask]))
        magnitude = np.sqrt(power)
        positive_flux = np.maximum(magnitude - previous_magnitude, 0)
        raw[frame, 4] = np.sqrt(np.sum(positive_flux[bins >= 40] ** 2))
        previous_magnitude = magnitude

    # A quiet numerical floor removes codec/dither remnants. P95 gives score-relative visual controls, not loudness
    # measurements. Square-root compression keeps a restrained response audible through soft orchestral passages.
    floor = 10 ** (-65 / 20)
    references = np.maximum(np.percentile(raw, 95, axis=0), floor * 2)
    normalized = np.clip((raw - floor) / (references - floor), 0, 1)
    normalized[:, :4] = np.sqrt(normalized[:, :4])
    smoothed = np.zeros_like(normalized)
    for frame in range(count):
        previous = smoothed[frame - 1] if frame else np.zeros(len(FEATURES))
        attack = np.array([0.07, 0.07, 0.07, 0.07, 0.035])
        release = np.array([0.18, 0.18, 0.18, 0.18, 0.15])
        tau = np.where(normalized[frame] > previous, attack, release)
        alpha = 1 - np.exp(-1 / (RATE * tau))
        smoothed[frame] = previous + alpha * (normalized[frame] - previous)
    quantized = np.rint(np.clip(smoothed, 0, 1) * 255).astype(np.uint8)
    settings = {
        "sampleRate": SAMPLE_RATE, "channels": 2, "windowSamples": WINDOW, "window": "symmetric Hann",
        "windowSeconds": WINDOW / SAMPLE_RATE, "featureHz": RATE, "hopSeconds": 1 / RATE,
        "timeAlignment": "window centered on source time; zero-padding at ends; not calibrated display/audio latency",
        "bandsHz": BANDS, "noiseFloorDbfs": -65, "referencePercentile": 95,
        "compression": "square root for energy/bands; linear positive spectral-flux onset",
        "attackSeconds": [0.07, 0.07, 0.07, 0.07, 0.035], "releaseSeconds": [0.18, 0.18, 0.18, 0.18, 0.15],
        "quantization": "round to unsigned 8-bit, interleaved energy/bass/mid/treble/onset",
        "referenceAmplitudes": [round(float(value), 10) for value in references],
        "numpyVersion": np.__version__,
    }
    return quantized, raw, settings


def module(source: dict, runtime: dict, data: np.ndarray, settings: dict) -> str:
    payload = data.tobytes()
    encoded = base64.b64encode(payload).decode("ascii")
    lines = textwrap.wrap(encoded, 112)
    literal = " +\n".join(f"  '{line}'" for line in lines)
    info = {
        "sourceArchive": source["archivePath"], "sourceSha256": source["sha256"],
        "runtimeReference": runtime["path"], "runtimeSha256": runtime["sha256"],
        "duration": source["durationSeconds"], "rate": RATE, "frames": len(data), "channels": list(FEATURES),
        "payloadSha256": hashlib.sha256(payload).hexdigest(), "analysis": settings,
        "credit": "The Sovereign's Oath — supplied by Ael for Tervain; source metadata discloses creation with Suno.",
    }
    return f'''// Generated by tools/analyze-menu-score.py; do not hand-edit the envelope payload.
// Original supplied score → measured spectral controls, not invented musical timings or copied art.
// Source authority/provenance: docs/engineering/menu-score.md. No audio samples are embedded here.
export const MENU_SCORE_FEATURE_INFO = {json.dumps(info, indent=2)} as const;

export interface MenuScoreSample {{
  energy: number;
  bass: number;
  mid: number;
  treble: number;
  onset: number;
  /** Cumulative energy-weighted seconds; random-access phase, independent of rendering frame rate. */
  motion: number;
}}

const ENCODED =
{literal};

// One compact typed-array allocation for the whole score; no per-frame base64 decoding, FFT or media fetch.
const FEATURES = Uint8Array.from(atob(ENCODED), (byte) => byte.charCodeAt(0));

// Integrate the quantized energy once. Speed stays between .55 and1 weighted second/second; a seek reconstructs the
// identical orbit phase immediately. This is derived from the small payload, not another encoded channel.
const MOTION = new Float32Array(MENU_SCORE_FEATURE_INFO.frames);
for (let i = 1; i < MOTION.length; i++) {{
  const previousSpeed = 0.55 + 0.45 * FEATURES[(i - 1) * 5]! / 255;
  const speed = 0.55 + 0.45 * FEATURES[i * 5]! / 255;
  MOTION[i] = MOTION[i - 1]! + (previousSpeed + speed) / (2 * MENU_SCORE_FEATURE_INFO.rate);
}}
/** Divide motion by this and use integer turns to make orbital phase continuous across the native song loop. */
export const MENU_SCORE_MOTION_LENGTH = MOTION[MOTION.length - 1]!;

function readChannel(frame: number, next: number, fraction: number, channel: number): number {{
  const a = FEATURES[frame * 5 + channel]!;
  return (a + (FEATURES[next * 5 + channel]! - a) * fraction) / 255;
}}

/** Source-time choreography, not a calibrated physical latency model. Pass a target to sample without allocations. */
export function sampleMenuScore(time: number, target?: MenuScoreSample): MenuScoreSample {{
  const t = Number.isFinite(time) ? Math.max(0, Math.min(MENU_SCORE_FEATURE_INFO.duration, time)) : 0;
  const position = t * MENU_SCORE_FEATURE_INFO.rate;
  const frame = Math.min(MENU_SCORE_FEATURE_INFO.frames - 1, Math.floor(position));
  const next = Math.min(MENU_SCORE_FEATURE_INFO.frames - 1, frame + 1);
  const fraction = position - frame;
  const out = target ?? {{ energy: 0, bass: 0, mid: 0, treble: 0, onset: 0, motion: 0 }};
  out.energy = readChannel(frame, next, fraction, 0);
  out.bass = readChannel(frame, next, fraction, 1);
  out.mid = readChannel(frame, next, fraction, 2);
  out.treble = readChannel(frame, next, fraction, 3);
  out.onset = readChannel(frame, next, fraction, 4);
  out.motion = MOTION[frame]! + (MOTION[next]! - MOTION[frame]!) * fraction;
  return out;
}}
'''


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Compare with the checked-in module without writing it")
    args = parser.parse_args()
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise SystemExit("FFmpeg is required; no packages will be installed by this script.")
    source, runtime, path = checked_audio()
    data, raw, settings = envelopes(path, source["durationSeconds"], ffmpeg)
    result = module(source, runtime, data, settings)
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != result:
            raise SystemExit("Feature module differs; run the script without --check to regenerate it.")
    else:
        # Explicit UTF-8 and LF: the module holds non-ASCII text, and a platform default must neither fail half-way
        # through the write nor change the line endings.
        OUTPUT.write_text(result, encoding="utf-8", newline="\n")
    summary = {
        "output": str(OUTPUT.relative_to(ROOT)), "moduleBytes": len(result.encode()), "payloadBytes": data.nbytes,
        "frames": len(data), "durationSeconds": source["durationSeconds"], "featuresAt30Seconds": dict(zip(FEATURES, (data[30 * RATE] / 255).round(3).tolist())),
        "highestRmsAtSeconds": round(float(np.argmax(raw[:, 0]) / RATE), 2),
        "strongestPositiveFluxAtSeconds": round(float(np.argmax(raw[:, 4]) / RATE), 2),
        "around30Seconds": [dict(time=second, **dict(zip(FEATURES, (data[round(second * RATE)] / 255).round(3).tolist()))) for second in (28, 29, 30, 31, 32)],
        "first30SecondsMean": dict(zip(FEATURES, (np.mean(data[:30 * RATE], axis=0) / 255).round(3).tolist())),
        "seconds30To40Mean": dict(zip(FEATURES, (np.mean(data[30 * RATE:40 * RATE], axis=0) / 255).round(3).tolist())),
        "ending": dict(zip(FEATURES, (data[-1] / 255).round(3).tolist())), "check": args.check,
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
