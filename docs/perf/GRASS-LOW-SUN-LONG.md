# Low-sun long grass replay — live 0.0.26

Measured published **0.0.26 · 03d82c3**, using the loaded application's compiled revision. This is a diagnostic software-WebGL capture, not a hardware pacing or visual-quality PASS. No production code changed; no causal fix is established by this run.

## Results

| Measurement | Result |
| --- | ---: |
| Captures / synthetic walk | 181 / 7.8 m |
| Grass-mask pixel observations | 11,424,830 |
| Strict near-white observations | **0** |
| Grass observations with luminance ≥180 | **0** |
| Maximum grass luminance | 172.6622 / 255 |
| Consecutive grass-mask intersection observations | 9,816,877 |
| Luminance changes >20/255 | 2,129,782 (21.6951%) |
| Mean / p95 changed pixels per pair | 11,832.1 / 18,323 |
| Strict near-white changed pixels | 0 |
| Grass-mask entry/exit observations | 3,091,510 |
| Repeated first-pose changed pixels | 0 / 71,052 eligible |
| Inactive instrumentation changed image channels | 0 |

Near-white means min RGB ≥180, decoded RGB luminance ≥200 and channel spread ≤40. Luminance uses 0.2126/0.7152/0.0722 weights. Grass contribution uses mask ≥64; consecutive-change eligibility is the intersection of both masks. Masks preserve native depth/discards and pass through post/MSAA; they are not exclusive semantic ownership.

The raw temporal count includes ordinary camera motion and parallax. It is **not a sparkle-only score**. The existing motion-compensated whole-ROI residual reports 2.2780% sparkle share, 99.3151% alignment and mean residual 5.1519/255; this generic residual is also not proof that those pixels are white grass specks.

This run does not reproduce strict white specks. It does not establish that the playtester’s report is fixed: software rendering, resolution-dependent blade coverage, lighting, route and fixed wind all limit transfer to hardware. There is no matched before/after product change in this evidence. The earlier noon capture differs in lighting and look direction and is not an A/B comparison.

## Acquisition

High, 640×360 at 1×, ANGLE SwiftShader, native post enabled with four MSAA samples; hour 17.5. Fixed clock, cloud phase, wind, actors and interactions. Synthetic camera movement at 2.6 m/s, 60 samples/s, x=6, terrain sample z=26→33.8. Camera is `(6, terrainHeight+1.4, z-3)` and looks at `(6, terrainHeight+0.3, z+29)`: **32 m horizontal look-ahead**. ROI is x64/y126/w512/h216.

Only groundcover preparation/update runs at each sampled camera pose. This is not a full-world streaming replay or a simulated player walk. Shadows are held after warm-up. Each native draw checks fresh GL errors and context loss; acquisition completed without either. Inactive mask instrumentation is asserted byte-identical to the original image before capture. No raster-suppression preload was used.

Reproduce from the repository root with a software-WebGL Chrome selected through `CHROME`:

```sh
node docs/perf/proofs/grass-low-sun/acquisition.mjs --controls docs/perf/proofs/grass-low-sun/controls.json --x 6 --z 26 --frames 181 --modes baseline,mask --out grass-low-sun-capture
node docs/perf/proofs/grass-low-sun/temporal-counts.mjs grass-low-sun-capture
node docs/perf/proofs/grass-low-sun/brightness-counts.mjs grass-low-sun-capture
```

The acquisition controller is the measured controller with import locations normalized for the repository. It records the compiled loaded revision; future deployments may produce different output. The controller's report route omits look-ahead, so the exact camera formula above and retained controller are authoritative.

## Evidence

- [Viewing clip, 4× slow](proofs/grass-low-sun/walk-4x-slow.mp4) — encoded video is for viewing; metrics use lossless PNG pixels.
- [Start](proofs/grass-low-sun/start.png), [middle](proofs/grass-low-sun/middle.png), [end](proofs/grass-low-sun/end.png), [middle grass mask](proofs/grass-low-sun/middle-mask.png).
- [Acquisition report](proofs/grass-low-sun/report.json), [per-pair temporal counts](proofs/grass-low-sun/temporal.json), [per-frame brightness](proofs/grass-low-sun/brightness.json), [all capture PNG hashes](proofs/grass-low-sun/capture-sha256.json).

No draw/triangle budget receipt is claimed: this evidence branch changes no shipped code, and diagnostic mask renders are not a production budget comparison. A production fix needs a causal before/after result and its own exact-head budget gate.
