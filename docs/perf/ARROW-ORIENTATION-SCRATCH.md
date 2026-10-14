# Reuse flying-arrow orientation vectors

`HuntingArrows.orient` constructed a forward-axis vector and cloned the arrow velocity on every flight update or impact. It now retains two instance-owned scratch vectors, copies velocity into the direction scratch, and computes the same quaternion. Flight integration, collisions and rendering resources are unchanged.

```sh
node tools/repro-arrow-orientation-scratch.mjs proofs/arrow-orientation-scratch/report.json
npx vitest run tests/presentation/huntingArrow.test.ts
npm run typecheck
```

The repro runs the published `421d34b` class and corrected class on the same 12-arrow stress case for 120 fixed 60 Hz updates. During updates, direct Vector3 constructions in the module fall 1,440 → 0 and velocity clones fall 1,440 → 0. All 1,440 position/velocity/quaternion records are exactly identical. Scratch initialization is outside the measured update interval. Segment clones and library-internal allocations remain outside these counts.

Twelve simultaneous arrows is the configured maximum, not typical play. This is an allocation regression check, not a hardware timing, image-quality or live-route receipt. It does not establish the cause or removal of the live16 bow frames around hero (-4, 46). GPU timing still requires an independent gate. Live reference: https://ael-dev3.github.io/Tervain/ ; tracking: issue #326.
