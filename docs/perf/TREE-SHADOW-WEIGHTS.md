# Tree-shadow LOD result storage

This is a focused tree-refresh allocation follow-up to the turn/streaming work in #326.

## Published reproduction

[Pages 0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/) retains 169 shadow trees in each of twelve small stationary camera turns with the existing sun shadow volume and conservative window-style receiver policy. This demonstrates that the shadow-weight selection path is active. It does not directly count live heap allocations. The source calls `floraShadowWeights` for each accepted shadow candidate, and the helper returns a fresh three-number array each time.

```sh
node tools/repro-live-shadow-weights.mjs https://ael-dev3.github.io/Tervain/ live-shadow-weights.json
```

See [published receipt](../../proofs/tree-shadow-weights/live18.json).

## Change

Allow caller-owned output storage in `floraShadowWeights`, and give each forest instance one scratch tuple for its synchronous visibility refresh. Each tree's three values are consumed before the next tree. Default callers still receive independent arrays. Arithmetic, LOD thresholds, draw order, shader inputs and visual appearance are unchanged. The diagnostic forced-LOD override is outside this change.

## A/B verification

```sh
node tools/repro-tree-shadow-weights.mjs tree-shadow-weights-proof
```

The fixture builds a High forest from the supplied pine models and procedural catalog, installs the actual shadow-only render hooks and renders five stationary turns plus two shadow-LOD blend controls. Both source versions receive a diagnostic callback at the weight helper's return. It records output identities and numeric values; it changes neither weight calculations nor rendering. Diagnostic collections allocate their own bookkeeping, which is excluded from the output identity count.

Assertions require baseline distinct result identities to equal call count, candidate calls to reuse one result identity per step, exact weight sequence equality, exact active caster coverage/matrix equality, identical rendered receiver frames, unchanged upload bytes/draw calls/triangles and no WebGL errors. The image must contain more than 100 non-background pixels. Raw traces and PNGs are under [proofs/tree-shadow-weights](../../proofs/tree-shadow-weights).

Result: **385 calls and 385 distinct outputs → 385 calls and one reused output** at each of seven refreshes. The complete weight sequence, caster buffers and all seven receiver images are exact matches; the comparison image has 35,818 non-background pixels. Upload bytes, draw calls and triangles are unchanged at every step. There are no WebGL errors.

Validation: 16 affected forest tests, type-check and production build pass. The regression test switches species and both blend bands through reused storage and verifies that ordinary callers retain independent results.

These counts demonstrate explicit result-array reuse. V8 may optimize some temporary arrays away; this is not a heap/GC profile, hardware timing or M5 performance result. No claim is made that the historical live16 >25 ms frames or the night/mud hitch are resolved. Hardware play-gate remains required.
