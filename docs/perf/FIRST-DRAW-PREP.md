# Submit arriving meshes during first-draw preparation

A mesh can be visible while its room or animal parent remains hidden pending adoption. `firstDraws` selected such meshes but the renderer submitted no geometry. Furniture also starts with `InstancedMesh.count = 0`, which likewise submitted no draw. Compilation and texture preparation alone do not exercise the first geometry dispatch.

The fix temporarily reveals the selected mesh’s ancestors and submits one existing instance slot when capacity is nonzero. It restores visibility, instance count, matrices and cached bounds. A pending full-scene shadow update is preserved rather than consumed while the rest of the scene is hidden. Shadow programs remain compiled separately.

## Matched native proof

The reusable fixture calls the actual App preparation methods with delivered cat geometry/materials in software WebGL. The zero-instance case uses static instancing. Shadows are enabled, with no shadow-casting lights; this is not a full lighting or hardware timing gate.

| Case | Warm geometry draws before → after | First-visible source uploads before → after | Changed RGB channels |
| --- | ---: | ---: | ---: |
| Hidden parent | 0 → 1 | 2,479,012 → 2,304 bytes | 0 |
| Zero instances | 0 → 1 | 0 → 0 bytes | 0 |

Both final views submit one draw / 45,798 triangles with no GL errors. Hidden-parent uploads move into preparation (12,582,912 → 15,061,924 bytes); this is not a total memory reduction. Zero-count instancing already uploads buffers, so its benefit is submitting the previously skipped geometry draw, not reducing bytes.

[Hidden-parent receipt](proofs/first-draw-prep/hidden-parent/report.json) · [before](proofs/first-draw-prep/hidden-parent/before.png) · [after](proofs/first-draw-prep/hidden-parent/after.png)

[Zero-instance receipt](proofs/first-draw-prep/zero-instances/report.json) · [before](proofs/first-draw-prep/zero-instances/before.png) · [after](proofs/first-draw-prep/zero-instances/after.png)

Reproduce from the repository root:

```sh
node tools/repro-first-draw-prep.mjs --baseline 421d34b --variant hidden-parent --out first-draw-hidden-proof
node tools/repro-first-draw-prep.mjs --baseline 421d34b --variant zero-instances --out first-draw-instance-proof
npx vitest run tests/presentation/hiddenWarmDraws.test.ts tests/scenarios/appTransitions.test.ts tests/platform/graphicsReady.test.ts
npm run build
```

The six regression tests fail 5/6 on the published baseline and pass after the fix; the selected suite passes 76 tests. Tests cover zero capacity, nested hidden groups, pending shadow updates, bounds restoration and render failures. The pending-shadow check establishes state preservation, not a reproduction of outdoor shadow flicker.

This complements the separate shadowless-continuation fix in #478. It does not establish that the original night mud/water hitch is gone, nor a hardware frame-time or Mac performance PASS.
