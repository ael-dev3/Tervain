# Retain falling-leaf buffers while their inputs are unchanged

Falling-leaf poses depend on the module's clock; distance opacity depends on horizontal camera position. Reduced motion freezes that clock. Previously every stationary reduced-motion update still rebuilt every pose, sampled terrain near landing and dirtied matrix/opacity buffers, despite identical output.

Cache the last completed clock and eye X/Z. Skip updates only when all three match. First update, clock advance and horizontal camera motion still refresh; vertical camera motion and rotation do not affect these buffers. Terrain is static after construction. Cache keys are saved after successful completion, so an interrupted update can retry. Disposal behavior stays unchanged.

## Published repro

On unmodified **0.0.18 · 421d34b**, Low, the 77-stream batch was visible. Across 120 stationary reduced-motion updates, matrix and opacity dirty versions each increased by 120 while both arrays retained identical values. `live18-before.json` records the published result.

```sh
node tools/repro-live-idle-falling.mjs --url https://ael-dev3.github.io/Tervain/ --quality low --out live-idle-falling.json
```

## Before/after native production-module fixture

The controlled High fixture instantiates the actual published and corrected production modules with the same 256-stream source. After warm-up it renders 120 stationary reduced-motion frames, then exercises far/near visibility and clock resume.

| Work in the 120 frozen frames | Before | After |
| --- | ---: | ---: |
| Actual WebGL matrix + opacity upload bytes | 2,088,960 | 0 |
| Matrix writes | 30,720 | 0 |
| Opacity writes | 30,720 | 0 |
| Terrain height queries | 29,640 | 0 |

All five states' raw Float32 words match exactly, including disappearance/reappearance and resume. Images are pixel-identical and contain visible leaves; GL errors are zero and neither context is lost. Receipt and PNGs are attached in `proofs/falling-leaf-idle/`.

```sh
node tools/repro-falling-leaf-idle.mjs falling-idle-proof
npx vitest run tests/presentation/fallingLeaves.test.ts
npm run build
```

The live repro and controlled High before/after fixture are separate evidence. This is a frozen-clock/reduced-motion optimization, not a reduction while normal animation advances or an explanation of the live16 stalls. It is not hardware FPS, an M5 result, a final post/MSAA quality gate or a full-world candidate replay. No animation, color, geometry, draw order or UI changes. Tracking: #326; live reference: https://ael-dev3.github.io/Tervain/ .
