# Constant animal normal textures

Four delivered animal normal maps are 1024×1024 JPEGs whose every decoded pixel is RGB (128,127,255). Keeping these large constant maps wastes upload bytes and texture storage when wildlife first appears. Replace only those images with lossless 1×1 PNGs. Keep the material normal-map reference and scale: the authored green value is 127, not 128.

## Reproduce

From the repository root, with dependencies installed and Chrome available:

```sh
node tools/check-constant-animal-normals.mjs 5da2776
node tools/repro-constant-animal-normals.mjs --baseline 5da2776 --out constant-normal-proof
```

The second command compares the baseline assets against current assets using actual rigged models, original materials, two authored Walk poses/views per animal and native Grade with 4× MSAA. It exits unsuccessfully on any RGB difference, changed draw/triangle count, decoded normal mismatch, missing MSAA or GL error.

## Results

| Counter | Before | After |
| --- | ---: | ---: |
| Normal image dimensions, each | 1024×1024 | 1×1 |
| Final nominal texture image/mip payload | 68,199,124 B | 45,829,524 B |
| Initial source uploads saved, four animals | — | 16,777,200 B |
| RGB channels changed across eight renders | — | 0 |
| Geometry/animation buffer views preserved | 714 | 714 |

The normal images save 22,369,600 bytes of nominal GPU image/mip payload (21.33 MiB). This is texture allocation accounting, not measured driver VRAM. Source uploads include geometry and other textures; only the exact before/after difference is attributed to this change. Draw calls and triangles are unchanged in each paired render. All other embedded images, mesh/animation payloads, nodes, skins, accessors and material settings are unchanged. The optimizer's second run leaves all four files unchanged.

[Render receipt](proofs/constant-animal-normals/render.json) · [Asset invariants](proofs/constant-animal-normals/integrity.json) · [Before](proofs/constant-animal-normals/before.png) · [After](proofs/constant-animal-normals/after.png)

These are software-WebGL correctness and byte-count checks; they do not establish hardware frame time, heat, or live release status. The live baseline is https://ael-dev3.github.io/Tervain/ .
