# Repeated skin refresh within one draw frame

The visible hero's packed bone texture is computed twice within one native world draw even when its pose is unchanged. Three caches skeleton updates by renderer-pass frame number, which advances between projection and shadow work. The unchanged-upload guard avoids the extra texture upload, but still copies packed words, computes bone matrices and decomposes every dual-quaternion bone again.

```sh
node tools/repro-world-skin-updates.mjs --url http://127.0.0.1:4173/ --out world-skin-proof
```

The probe loads the complete cast, places the hero beside the village house at `(-7,45)`, freezes simulation/post clocks, and renders High through native `renderWorld()`. It instruments production skeleton updates and counts `Matrix4.decompose()` only while those updates execute. An optional `--driver` selects a compatible CDP launcher. Node, Chromium and Sharp are required.

It compares two native draws with two capture-only controlled draws. The control permits one update per skeleton per complete frozen draw frame, then skips subsequent calls within that frame. It resets on every draw; this is not a global unchanged-pose cache and makes no changes to application code.

| Per-frame counter | Native | Capture-only control |
| --- | ---: | ---: |
| Executed skeleton updates | 6 | 5 |
| Bone decompositions in those updates | 276 | 210 |
| Repeated hero packed-word changes | 0 | 0 |

The same result held for both sampled frames in each mode. All **19,008 packed words** across 18 registered skeletons match exactly after both sequences. Decoded RGB pixels are **identical** between the [native image](world-skin-proof/native.png) and [control image](world-skin-proof/per-frame-control.png). The complete [receipt](world-skin-proof/report.json) records each update and its current renderer target/camera context.

This removes 66 redundant decompositions, about 23.9% of the measured skin-update decompositions in this view. It is **not** a 23.9% whole-frame CPU saving, a GPU saving, or evidence that this caused the reported village hitch. No hardware frame-time claim is made. The build is `a2e8259f4`, whose rendering/skinning code matches `0b45a36`; its only application changes are offline canopy coverage diagnostics.

## Minimal production direction

An explicit static-pose epoch could surround only the existing matrix-frozen `Grade.render()` block, after `scene.updateMatrixWorld()`. Each installed dual-quaternion skeleton would refresh once per epoch. Calls outside that scope would retain current behavior. The epoch must reset every complete world draw and restore in `finally`; never cache across animation frames. Window preparation and independently posed viewer renders must remain outside this scope.

Before shipping that change, verify moving poses, bind-matrix changes between frames, nested scopes, thrown updates and scope cleanup. The current proof covers a frozen pose and demonstrates a narrow code-cost opportunity; it does not validate those production lifetime cases. Application visuals, skinning code and camera behavior are unchanged in this PR.
