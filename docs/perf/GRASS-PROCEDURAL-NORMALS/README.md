# Procedural grass normal-path repair

PR #710, candidate `928241370413ca14839152d4dca3e9d581a926bd`, paired with published 0.0.33 `b317734`.

The encoded blade geometry has no normal attribute. Three r186 therefore defines `FLAT_SHADED` for the Lambert material even though its `flatShading` property is false. That makes fragment lighting use triangle derivatives and bypass the curved, view-facing normals already computed in the grass vertex shader. A valid shared placeholder attribute restores the existing procedural normal path and configured normal-aware shadow bias. Both effects are part of this measured change; the experiment does not attribute the result solely to the smooth-normal component. The shader replaces the placeholder: no normal formula, colour, exposure, blade position/index, density, texture or animation tuning is added.

This changes lighting and rendered brightness. It is not a pixel-identical optimization or a claim that all sparkle is fixed. The paired captures expose that change for review.

## Reproduction and controls

Use `tools/repro-live-grass-procedural-normals.mjs` on the PR branch. `--url` accepts a published or served build; `--native candidate` checks the compiled candidate against its active normal mode. The default baseline path imports the actual candidate geometry factory, verifies all encoded positions and indices, and toggles only the normal attribute on the published scene. Native shader hooks stay intact.

High preset, native post/MSAA4, fixed hour 17.5, cloud and wind phase, no actor/world simulation, camera yaw -8 to +8 degrees while translating at 2.6 m/s in synthetic 60 Hz steps from x=6, z=23. Native water reflections are refreshed equally in every mode. Shadows are held after initial warmup. Every pose is followed by an exact RGB-restored baseline control. The screenshot/diff source is retained raster from the native post/MSAA path.

Requested 1470×956 at DPR2 is capped by the native High preset to DPR1.5: effective framebuffer 2205×1434. This is reported rather than overriding the device-pixel-ratio cap. The independent compiled-candidate check uses 640×360 at DPR1; it is a source-path/control verification, not the Retina motion score.

The temporal metric counts display-luminance jumps over 60 between consecutive frames on the union of same-pose changed pixels in the current/previous pair. Bright observations use luminance >=140, near-white >=180, and strict-white minimum RGB >=245. This is a causal-effect mask, not a semantic grass mask: post neighbours, camera disocclusion and normal motion are included. It is not a pure shimmer score or unique-blade count.

The lossless clips retain a native-pixel grass crop, with every decoded RGB frame hash checked against the PNG crop. Full-size stills provide context. The quarter-speed side-by-side MP4 is lossy and illustrative; it is not the measurement source or a hardware-FPS recording.

## Deterministic cost and correctness

- Unmodified stock gate: two same-revision live probes, four distinct completed samples per probe, then four candidate samples; no allowances. Both builds: **285 draws, 3,048,306 triangles, zero console errors**. Exact-head receipt in `budget-gate.md`.
- Compiled candidate: five complete paired poses, exact inactive and restored controls, exact unshadowed wireframe, equal per-pose scene draw/triangle rosters, zero console errors. Both grass programs have `FLAT_SHADED` absent, `HAS_NORMAL` present and no active placeholder input (`normal` location -1).
- Shared High normal payload: **+2,016 CPU-array bytes and matching 2,016 GPU-buffer bytes**, excluding driver/object overhead. The instrumented buffers uploaded twice total on activation; the count/bytes stayed unchanged through the five captured poses.
- No buffer uploads in either mode during those five recorded frames. Average all-scene mat3 uniform payload 2,102.4→2,044.8 bytes/frame (58.4→56.8 calls). These are renderer-state measurements, not an isolated grass CPU/performance claim.
- No source texture operations added. Candidate texture objects after activation: 274; no before/after memory delta is claimed.
- Shader trade-off: existing vertex normal interpolation and normal-aware bias become active; fragment derivative normals are removed. Hardware shader cost and hardware frame pacing are unmeasured.
- 15 grass/wind tests and production build pass. The normal-attribute regression fails on the original geometry. CI build, test shards and software-WebGL pass.

The full source regression, draw/triangle gate and restored-image controls are correctness evidence. They do not certify final art quality or Mac hardware performance.

## Interrupted extended run

An earlier 31-pose Retina run completed 24 exact-restored pairs, then a CDP evaluation timed out. Its raw `interrupted-31-pose-progress.json` remains explicitly incomplete and is not a PASS receipt. A separate shorter completed run supplies the motion score and clips. The independently completed compiled-candidate and stock budget checks are separate from that interruption.

## Repeat

From this proof branch (which includes the source PR head), with a compatible Chrome available:

```sh
node tools/repro-live-grass-procedural-normals.mjs --frames 13 --out normal-motion
node tools/measure-grass-normal-motion.mjs normal-motion normal-motion/summary.json
node tools/encode-grass-normal-proof.mjs normal-motion normal-proof
```

The last two read-only analysis/encoding helpers are retained on this proof branch. For a built candidate, pass `--url <candidate-build-url> --native candidate`; native candidate geometry is checked before any session-only swap. Read the requested/effective framebuffer and console/control results in the report; do not compare screenshots at different resolutions as if they were the same pixel measurement.

Code references: Three [program parameters](https://github.com/mrdoob/three.js/blob/r186/src/renderers/webgl/WebGLPrograms.js), and the existing [grass normal formula](https://github.com/ael-dev3/Tervain/blob/928241370413ca14839152d4dca3e9d581a926bd/src/presentation/grass/grassMaterial.ts#L227). The repair activates that formula; it does not change it.

## Completed Retina motion result

13 paired poses, 0.52 m translation with a -8→+8° turn; every pose has an exact restored control. This is a completed synthetic camera-path experiment on the published scene using the actual candidate normal attribute, not a 13-frame recording of the compiled candidate build. The separately completed compiled-candidate check confirms the same source path at 640×360.

| Measurement | Original normal path | Restored procedural normals |
| --- | ---: | ---: |
| Warm bright observations (Y>=140, causal-effect mask) | 14,517 | 4,588 |
| Luminance jumps >60 (same mask union across adjacent frames) | 1,485,390 | 1,389,129 |
| Bright luminance jumps (>60 and Y>=140 in either adjacent frame) | 19,879 | 5,688 |
| Near-white observations (Y>=180) | 0 | 0 |
| Strict white observations (minimum RGB>=245) | 0 | 0 |
| Single-pixel bright components in fixed grass crop | 416 | 183 |
| Mean full-scene display luminance | 60.6292 | 63.4773 |
| Maximum scene draws / triangles across the paired path | 199 / 2,972,047 | 199 / 2,972,047 |

That is **68.4% fewer warm bright observations**, **6.5% fewer large luminance jumps**, and **56.0% fewer single-pixel bright components** in the measured crop. Components are observations across frames, not tracked particles. Mean full-scene luminance rises **4.70%**: the correction visibly changes lighting and needs appearance review. Near-white/strict-white pixels do not reproduce in this completed route, so it is not a demonstrated white-speck cure. The metric has no subjective quality PASS.

The completed Retina path also records zero buffer bytes in every captured mode, the two normal payload uploads remain 2,016 bytes total after activation, and the average all-scene mat3 payload is 2,043.7→1,996.6 bytes/frame (56.77→55.46 calls). These cache-dependent uniform counts are not a hardware performance claim.

### Captures

- [Quarter-speed comparison](comparison-quarter-speed.mp4), illustrative lossy crop.
- [Before lossless crop](before-crop-lossless.mkv) / [candidate lossless crop](after-crop-lossless.mkv), native pixels and decoded frame hashes checked in [video-verification.json](video-verification.json).
- Full-size stills: [before 0](before-000.png) / [after 0](after-000.png); [before 6](before-006.png) / [after 6](after-006.png); [before 12](before-012.png) / [after 12](after-012.png).
- [Raw Retina report](retina-report.json), [derived summary](summary.json), [compiled-candidate controls](candidate-controls.json), [validation](validation.json).
