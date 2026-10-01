#!/usr/bin/env python3
"""Measure the approved menu score's beat grid, transient accents and a six-band spectrum for the grove's dance.

Requires existing Python 3 / NumPy and FFmpeg; this script never installs packages.
Run from any directory:  python3 tools/analyze-menu-rhythm.py [--check]
The archived source and primary runtime derivative must match the audio manifest (shared with analyze-menu-score.py).
No audio samples, lyrics, timed text, metadata prompts or artwork enter the generated module; runtime never runs an FFT.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import importlib.util
import json
import pathlib
import shutil
import subprocess
import textwrap

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src/presentation/menu/menuScoreRhythmData.ts"
_spec = importlib.util.spec_from_file_location("analyze_menu_score", ROOT / "tools/analyze-menu-score.py")
score = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(score)  # type: ignore[union-attr]

# Onset envelope for the beat grid and accents: 100 Hz frames from 24 kHz stereo, 2,048-sample (85 ms) Hann windows.
ONSET_SR = 24000
ONSET_RATE = 100
ONSET_WINDOW = 2048
# Spectrum for the visualiser: the same 20 Hz convention as the existing controls (12 kHz stereo, 2,048-sample window).
BAND_SR = 12000
BAND_RATE = 20
BAND_WINDOW = 2048
BANDS = ((40, 90), (90, 200), (200, 500), (500, 1200), (1200, 2800), (2800, 5800))
BAND_NAMES = ("sub", "bass", "lowMid", "mid", "highMid", "presence")
BAND_ATTACK = 0.04
BAND_RELEASE = 0.16
BEATS_PER_BAR = 4
BARS_PER_PHRASE = 8


def decode(path: pathlib.Path, rate: int, duration: float, ffmpeg: str) -> np.ndarray:
    data = subprocess.run([
        ffmpeg, "-nostdin", "-hide_banner", "-loglevel", "error", "-i", str(path), "-map", "0:a:0",
        "-vn", "-sn", "-dn", "-ac", "2", "-ar", str(rate), "-t", str(duration), "-f", "f32le", "pipe:1",
    ], check=True, stdout=subprocess.PIPE).stdout
    return np.frombuffer(data, dtype="<f4").reshape(-1, 2).astype(np.float64)


def stereo_power(block: np.ndarray, window: np.ndarray) -> np.ndarray:
    # Average left/right power: an inverted channel cannot cancel the measurement as a mono mix would.
    spectrum = np.fft.rfft(block * window[:, None], axis=0)
    return np.mean(np.abs(spectrum) ** 2, axis=1)


def onset_envelopes(pcm: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Positive log-spectral flux over 40 log bands (all and below 200 Hz), and frame RMS, at ONSET_RATE."""
    hop = ONSET_SR // ONSET_RATE
    frames = int(np.ceil(len(pcm) / hop))
    padded = np.pad(pcm, ((ONSET_WINDOW // 2, ONSET_WINDOW // 2 + hop), (0, 0)))
    window = np.hanning(ONSET_WINDOW)
    bins = np.fft.rfftfreq(ONSET_WINDOW, 1 / ONSET_SR)
    edges = np.geomspace(30, 10000, 41)
    band_of = np.digitize(bins, edges) - 1
    valid = (band_of >= 0) & (band_of < 40)
    low_bands = int(np.searchsorted(edges, 200) - 1)
    flux = np.zeros(frames)
    low = np.zeros(frames)
    rms = np.zeros(frames)
    previous = None
    for frame in range(frames):
        block = padded[frame * hop:frame * hop + ONSET_WINDOW]
        rms[frame] = np.sqrt(np.mean(block * block))
        power = stereo_power(block, window)
        level = np.log1p(1000 * np.bincount(band_of[valid], weights=power[valid], minlength=40))
        if previous is not None:
            rise = np.maximum(level - previous, 0)
            flux[frame] = rise.sum()
            low[frame] = rise[:low_bands].sum()
        previous = level

    def detrend(envelope: np.ndarray) -> np.ndarray:
        # Remove the slow loudness trend (one-second moving mean) and normalise; only the rises remain.
        k = ONSET_RATE // 2
        kernel = np.ones(2 * k + 1) / (2 * k + 1)
        local = np.convolve(np.pad(envelope, k, mode="edge"), kernel, mode="valid")
        out = np.maximum(envelope - local, 0)
        return out / (out.std() + 1e-9)

    return detrend(flux), detrend(low), rms


def tempo_period(envelope: np.ndarray) -> float:
    """Beat period in frames: autocorrelation weighted toward 110 BPM, refined by parabolic interpolation."""
    centred = envelope - envelope.mean()
    ac = np.correlate(centred, centred, mode="full")[len(centred) - 1:]
    lags = np.arange(len(ac))
    lo, hi = int(ONSET_RATE * 60 / 200), int(ONSET_RATE * 60 / 50)
    bpm = 60 * ONSET_RATE / np.maximum(lags, 1)
    weighted = ac * np.exp(-0.5 * np.log2(bpm / 110) ** 2)
    best = lo + int(np.argmax(weighted[lo:hi]))
    a, b, c = ac[best - 1], ac[best], ac[best + 1]
    shift = 0.5 * (a - c) / (a - 2 * b + c) if (a - 2 * b + c) != 0 else 0.0
    return best + float(np.clip(shift, -0.5, 0.5))


def dynamic_beats(envelope: np.ndarray, period: float, tightness: float = 100) -> np.ndarray:
    """Ellis (2007) dynamic-programming beat tracker on the onset envelope; returns beat frames."""
    n = len(envelope)
    total = envelope.astype(np.float64).copy()
    back = np.full(n, -1)
    for i in range(n):
        lo = max(0, i - int(round(2 * period)))
        hi = i - int(round(period / 2))
        if hi <= lo:
            continue
        previous = np.arange(lo, hi)
        candidate = total[previous] - tightness * np.log((i - previous) / period) ** 2
        j = int(np.argmax(candidate))
        total[i] = envelope[i] + candidate[j]
        back[i] = previous[j]
    end = n - 1 - int(np.argmax(total[::-1][:int(round(period))]))
    beats = [end]
    while back[beats[-1]] >= 0:
        beats.append(int(back[beats[-1]]))
    return np.array(beats[::-1])


def grid_score(envelope: np.ndarray, first: float, period: float, duration: float) -> float:
    """Mean onset strength under a constant grid, read with a 20 ms Gaussian tolerance."""
    times = np.arange(first, duration, period)
    frames = np.arange(len(envelope)) / ONSET_RATE
    total = 0.0
    for t in times:
        i = int(round(t * ONSET_RATE))
        lo, hi = max(0, i - 6), min(len(envelope), i + 7)
        weights = np.exp(-0.5 * ((frames[lo:hi] - t) / 0.02) ** 2)
        total += float(np.sum(envelope[lo:hi] * weights) / np.sum(weights))
    return total / max(1, len(times))


def beat_grid(envelope: np.ndarray, duration: float) -> dict:
    period_frames = tempo_period(envelope)
    beats = dynamic_beats(envelope, period_frames) / ONSET_RATE
    # The tracked beats of this score are nearly isochronous; fit one constant grid by least squares.
    period0 = period_frames / ONSET_RATE
    index = np.round((beats - beats[0]) / period0)
    period, first = np.polyfit(index, beats, 1)
    residual = beats - (first + period * index)
    # Refine against the envelope itself, so the grid sits on onsets rather than on the tracker's frame quantisation.
    best = (grid_score(envelope, first, period, duration), first, period)
    for dp in np.linspace(-0.0015, 0.0015, 31) * period:
        for df in np.linspace(-0.03, 0.03, 31):
            candidate = grid_score(envelope, first + df, period + dp, duration)
            if candidate > best[0]:
                best = (candidate, first + df, period + dp)
    _, first, period = best
    first = float(first % period)
    rng = np.random.default_rng(7)
    shuffled = float(np.mean([grid_score(envelope, rng.uniform(0, period), period * rng.uniform(0.8, 1.25), duration) for _ in range(24)]))
    return {
        "period": float(period), "first": first, "bpm": float(60 / period),
        "trackedBeats": int(len(beats)), "trackedRmsResidual": float(np.sqrt(np.mean(residual ** 2))),
        "trackedMaxResidual": float(np.max(np.abs(residual))),
        "alignment": float(best[0]), "randomGridAlignment": shuffled,
    }


def downbeat_and_phrase(grid: dict, low: np.ndarray, rms: np.ndarray, duration: float) -> dict:
    period, first = grid["period"], grid["first"]
    beats = np.arange(first, duration, period)
    strength = np.array([low[max(0, int(round(t * ONSET_RATE)) - 3):int(round(t * ONSET_RATE)) + 4].max(initial=0) for t in beats])
    scores = [float(np.mean(strength[m::BEATS_PER_BAR])) for m in range(BEATS_PER_BAR)]
    order = np.argsort(scores)[::-1]
    downbeat = int(order[0])
    # Bars start at beat `downbeat`; phrases group eight bars. Choose the phrase phase whose starts carry the largest
    # change in bar loudness (section entries), not a fixed assumption.
    bar_starts = beats[downbeat::BEATS_PER_BAR]
    bar_rms = np.array([float(np.mean(rms[int(t * ONSET_RATE):int((t + period * BEATS_PER_BAR) * ONSET_RATE)] ** 2)) ** 0.5
                        for t in bar_starts])
    novelty = np.abs(np.diff(np.log(bar_rms + 1e-6), prepend=np.log(bar_rms[0] + 1e-6)))
    phrase_scores = [float(np.mean(novelty[p::BARS_PER_PHRASE])) for p in range(BARS_PER_PHRASE)]
    phrase = int(np.argmax(phrase_scores))
    return {
        "downbeatBeat": downbeat, "downbeatScores": [round(s, 4) for s in scores],
        "downbeatMargin": float((scores[order[0]] - scores[order[1]]) / max(scores[order[0]], 1e-9)),
        "phraseBar": phrase, "phraseScores": [round(s, 4) for s in phrase_scores],
        "barStartsSeconds": bar_starts, "barRms": bar_rms,
    }


def accent_events(envelope: np.ndarray) -> tuple[np.ndarray, np.ndarray, dict]:
    """Strong transients: local maxima clearly above a two-second running level, at least 150 ms apart."""
    k = ONSET_RATE
    kernel = np.ones(2 * k + 1) / (2 * k + 1)
    level = np.convolve(np.pad(envelope, k, mode="edge"), kernel, mode="valid")
    spread = np.sqrt(np.convolve(np.pad((envelope - level) ** 2, k, mode="edge"), kernel, mode="valid"))
    threshold = level + 1.25 * spread + 0.25
    peaks = [i for i in range(1, len(envelope) - 1)
             if envelope[i] >= envelope[i - 1] and envelope[i] > envelope[i + 1] and envelope[i] > threshold[i]]
    spacing = int(0.15 * ONSET_RATE)
    kept: list[int] = []
    for i in sorted(peaks, key=lambda p: -envelope[p]):
        if all(abs(i - j) >= spacing for j in kept):
            kept.append(i)
    kept.sort()
    reference = float(np.percentile(envelope[kept], 90)) if kept else 1.0
    strength = np.clip(envelope[kept] / reference, 0, 1)
    times = np.array(kept) / ONSET_RATE
    return times, strength, {"threshold": "running mean + 1.25 x running deviation + 0.25 (two-second window)",
                             "minimumSpacingSeconds": 0.15, "strengthReference": "90th percentile of kept peaks"}


def spectrum_bands(path: pathlib.Path, duration: float, ffmpeg: str) -> tuple[np.ndarray, list[float]]:
    pcm = decode(path, BAND_SR, duration, ffmpeg)
    count = round(duration * BAND_RATE) + 1
    hop = BAND_SR // BAND_RATE
    padded = np.pad(pcm, ((BAND_WINDOW // 2, BAND_WINDOW // 2 + hop), (0, 0)))
    window = np.hanning(BAND_WINDOW)
    bins = np.fft.rfftfreq(BAND_WINDOW, 1 / BAND_SR)
    weights = np.full(len(bins), 2.0 / (BAND_WINDOW * BAND_WINDOW * np.mean(window * window)))
    weights[[0, -1]] *= 0.5
    masks = [(bins >= lo) & (bins < hi) for lo, hi in BANDS]
    raw = np.zeros((count, len(BANDS)))
    for frame in range(count):
        block = padded[frame * hop:frame * hop + BAND_WINDOW]
        power = stereo_power(block, window) * weights
        for band, mask in enumerate(masks):
            raw[frame, band] = np.sqrt(np.sum(power[mask]))
    floor = 10 ** (-65 / 20)
    references = np.maximum(np.percentile(raw, 95, axis=0), floor * 2)
    normalized = np.sqrt(np.clip((raw - floor) / (references - floor), 0, 1))
    smoothed = np.zeros_like(normalized)
    for frame in range(count):
        previous = smoothed[frame - 1] if frame else np.zeros(len(BANDS))
        tau = np.where(normalized[frame] > previous, BAND_ATTACK, BAND_RELEASE)
        smoothed[frame] = previous + (1 - np.exp(-1 / (BAND_RATE * tau))) * (normalized[frame] - previous)
    return np.rint(np.clip(smoothed, 0, 1) * 255).astype(np.uint8), [round(float(r), 10) for r in references]


def b64(data: bytes) -> str:
    encoded = base64.b64encode(data).decode("ascii")
    return " +\n".join(f"  '{line}'" for line in textwrap.wrap(encoded, 112))


def module(source: dict, runtime: dict, grid: dict, bars: dict, accents: tuple, bands: np.ndarray, references: list[float]) -> str:
    times, strength, accent_settings = accents
    accent_bytes = bytearray()
    for t, s in zip(times, strength):
        centis = int(round(t * 100))
        accent_bytes += bytes((centis & 255, centis >> 8, int(round(s * 255))))
    bar_energy = bars["barRms"] / max(float(np.percentile(bars["barRms"], 95)), 1e-9)
    bar_bytes = bytes(np.rint(np.clip(bar_energy, 0, 1) * 255).astype(np.uint8))
    band_bytes = bands.tobytes()
    payload = hashlib.sha256(band_bytes + bytes(accent_bytes) + bar_bytes).hexdigest()
    info = {
        "sourceArchive": source["archivePath"], "sourceSha256": source["sha256"],
        "runtimeReference": runtime["path"], "runtimeSha256": runtime["sha256"],
        "duration": source["durationSeconds"],
        "beat": {
            "bpm": round(grid["bpm"], 4), "period": round(grid["period"], 6), "first": round(grid["first"], 6),
            "beatsPerBar": BEATS_PER_BAR, "downbeatBeat": bars["downbeatBeat"],
            "barsPerPhrase": BARS_PER_PHRASE, "phraseBar": bars["phraseBar"],
            "trackedBeats": grid["trackedBeats"], "trackedRmsResidualSeconds": round(grid["trackedRmsResidual"], 5),
            "trackedMaxResidualSeconds": round(grid["trackedMaxResidual"], 5),
            "gridAlignment": round(grid["alignment"], 4), "randomGridAlignment": round(grid["randomGridAlignment"], 4),
            "downbeatScores": bars["downbeatScores"], "downbeatMargin": round(bars["downbeatMargin"], 4),
            "phraseScores": bars["phraseScores"],
        },
        "bands": {"rate": BAND_RATE, "frames": int(len(bands)), "names": list(BAND_NAMES), "hz": [list(b) for b in BANDS],
                  "referenceAmplitudes": references, "attackSeconds": BAND_ATTACK, "releaseSeconds": BAND_RELEASE},
        "accents": {"count": int(len(times)), **accent_settings},
        "bars": int(len(bar_bytes)),
        "payloadSha256": payload,
        "analysis": {
            "onset": {"sampleRate": ONSET_SR, "channels": 2, "windowSamples": ONSET_WINDOW, "frameHz": ONSET_RATE,
                      "bands": "40 log-spaced, 30 Hz-10 kHz", "flux": "positive log-power difference; one-second detrend",
                      "tempo": "autocorrelation with a 110 BPM log-normal prior; Ellis 2007 dynamic beat tracking; "
                               "least-squares constant grid refined on the envelope"},
            "spectrum": {"sampleRate": BAND_SR, "channels": 2, "windowSamples": BAND_WINDOW, "window": "symmetric Hann",
                         "timeAlignment": "window centered on source time; zero-padding at ends; not calibrated display/audio latency",
                         "noiseFloorDbfs": -65, "referencePercentile": 95, "compression": "square root"},
            "quantization": "bands: unsigned 8-bit interleaved; accents: uint16 centiseconds little-endian + uint8 strength; "
                            "bars: uint8 bar RMS relative to the 95th percentile",
            "numpyVersion": np.__version__,
        },
        "credit": "The Sovereign's Oath — supplied by Ael for Tervain; source metadata discloses creation with Suno.",
    }
    return f'''// Generated by tools/analyze-menu-rhythm.py; do not hand-edit the payloads.
// Measured beat grid, accents and spectrum of the approved score for the grove's dance (A32), not invented timings.
// Source authority/provenance: docs/engineering/menu-score.md. No audio samples are embedded here.
export const MENU_SCORE_RHYTHM_INFO = {json.dumps(info, indent=2)} as const;

/** Six bands per 20 Hz frame (sub, bass, low-mid, mid, high-mid, presence), unsigned 8-bit. */
export const MENU_SCORE_BANDS_BASE64 =
{b64(band_bytes)};

/** Accents: per event uint16 centiseconds (little-endian) and uint8 strength. */
export const MENU_SCORE_ACCENTS_BASE64 =
{b64(bytes(accent_bytes))};

/** Bar loudness (RMS relative to the 95th percentile), one byte per bar from the first downbeat. */
export const MENU_SCORE_BARS_BASE64 =
{b64(bar_bytes)};
'''


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Compare with the checked-in module without writing it")
    args = parser.parse_args()
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise SystemExit("FFmpeg is required; no packages will be installed by this script.")
    source, runtime, path = score.checked_audio()
    duration = source["durationSeconds"]
    onset, low, rms = onset_envelopes(decode(path, ONSET_SR, duration, ffmpeg))
    grid = beat_grid(onset, duration)
    bars = downbeat_and_phrase(grid, low, rms, duration)
    accents = accent_events(onset)
    bands, references = spectrum_bands(path, duration, ffmpeg)
    result = module(source, runtime, grid, bars, accents, bands, references)
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != result:
            raise SystemExit("Rhythm module differs; run the script without --check to regenerate it.")
    else:
        OUTPUT.write_text(result, encoding="utf-8", newline="\n")
    first_downbeat = grid["first"] + bars["downbeatBeat"] * grid["period"]
    bar_seconds = grid["period"] * BEATS_PER_BAR
    summary = {
        "output": str(OUTPUT.relative_to(ROOT)), "moduleBytes": len(result.encode("utf-8")),
        "bpm": round(grid["bpm"], 3), "period": round(grid["period"], 5), "firstBeat": round(grid["first"], 4),
        "trackedResidualRmsMs": round(grid["trackedRmsResidual"] * 1000, 2), "trackedResidualMaxMs": round(grid["trackedMaxResidual"] * 1000, 2),
        "gridAlignment": round(grid["alignment"], 3), "randomGridAlignment": round(grid["randomGridAlignment"], 3),
        "downbeatBeat": bars["downbeatBeat"], "downbeatScores": bars["downbeatScores"], "downbeatMargin": round(bars["downbeatMargin"], 3),
        "phraseBar": bars["phraseBar"], "phraseScores": bars["phraseScores"],
        "firstDownbeat": round(first_downbeat, 4),
        "phraseStartsSeconds": [round(first_downbeat + (bars["phraseBar"] + 8 * k) * bar_seconds, 2) for k in range(13)],
        "beatNear30": round(grid["first"] + round((30 - grid["first"]) / grid["period"]) * grid["period"], 4),
        "accents": len(accents[0]), "bandFrames": len(bands), "check": args.check,
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
