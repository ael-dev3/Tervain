# Matrix prefixes inflate dual-quaternion texture uploads

The installed dual-quaternion skin texture contains CPU bone matrices followed by rigid-motion texels. The production vertex position/normal/depth chunks read the rigid motions. This controlled native repro keeps the CPU matrices for bounds/queries but uploads only the motion texels, changing the capture shader's base offset to zero.

```sh
node tools/repro-bone-texture-prefix.mjs --out bone-texture-proof
```

The script starts/stops an isolated Vite fixture server and its own Chromium instance. It uses actual `installDualQuaternionSkinning()` and production skin shader hooks on synthetic 36/66-bone meshes, with nonidentity rotations, mixed weights, PBR lighting and directional shadows. An optional `--driver` selects a compatible CDP launcher. Node, Chromium, Vite and Sharp are required.

## Native source-byte proof

The [receipt](bone-prefix-proof/report.json) instruments actual `texImage2D`/`texSubImage2D` calls and counts only the two known bone-texture source arrays. It does not count shadow-target allocations or unrelated textures.

| Bones | Current texture bytes | CPU-matrix prefix | Motion texels | Compact control bytes |
| --- | ---: | ---: | ---: | ---: |
| 36 | 4,096 | 2,304 | 1,152 | 1,152 |
| 66 | 6,400 | 4,224 | 2,112 | 2,112 |

Measured source uploads are **10,496 → 3,264 bytes** (68.9% less in this two-mesh fixture). The control uses rectangular textures (12×6 and 12×11); texel indexing already uses texture width. The [before](bone-prefix-proof/before.png) and [compact control](bone-prefix-proof/compact-control.png) images have identical decoded RGB, including directional shadows. Native byte-count and pixel assertions pass.

## Production direction and limits

A production change could separate CPU matrices from the GPU motion texture, leaving standard CPU skin/bounds queries intact. It must update metadata/base-offset consumers and verify changing poses, bind matrices, viewers, actual hero/resident rigs and other shadow passes. The fixture tests one held pose and directional shadows; it does not cover point-light distance shadows, tangents/normal maps, all materials or animation lifetimes.

This PR changes only diagnostic tooling. The compact layout is capture-only; application skinning, shaders and visuals are unchanged. The known whole-run upload total is not attributed by this experiment. No Mac hardware frame-time or whole-run percentage is claimed, and the hardware play gate remains required before a production layout change.
