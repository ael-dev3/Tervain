# Refresh packed skin data once within a frozen world draw

The native repro in [#405](https://github.com/ael-dev3/Tervain/pull/405) finds the hero's 66-bone data computed twice in one world draw, with no changed words on the second computation. Three advances its renderer frame counter between object projection and shadow work. The existing unchanged-upload guard saves texture uploads but repeats the matrix/decomposition work.

The fix uses an explicit static-pose epoch only around the existing matrix-frozen `Grade.render()` block, after world matrices are updated. A dual-quaternion skeleton refreshes once per epoch. Every new complete draw gets a new epoch; outside that scope, update behavior is unchanged. Nested renders invalidate the resumed outer scope conservatively. Failed updates are not cached; `finally` restores the scope and the scene's matrix update setting. No shader, geometry, animation, camera, menu or sound changes.

## Reproduce the packed-data comparison

```sh
node tools/repro-static-skin-frame.mjs --out packer.json
npx vitest run tests/presentation/npcStaticSkinFrame.test.ts tests/presentation/npcSkinUploads.test.ts tests/presentation/npcSkinning.test.ts tests/presentation/heroAnimation.test.ts
```

The standalone script loads the actual production packer. It compares two uncached updates per frame with two scoped calls over 120 changing bone poses and bind matrices. The [receipt](static-skin-proof/packer.json) records **15,840 → 7,920** decompositions and **192,000 exact packed-word comparisons**. These are component operation counts, not a whole-frame CPU percentage or hardware timing measurement.

32 affected tests pass. New lifetime tests cover multiple passes, successive changed poses/binds, independently posed skeletons, nested scope invalidation, failed-update retry and ordinary updates after exception cleanup. TypeScript and production build pass.

## Reproduce the native world view

```sh
node tools/repro-world-skin-updates.mjs --url http://127.0.0.1:4173/ --pose run --out world-skin-proof
```

Serve the production build first. Node, Chromium, Sharp and Vite are required. An optional `--driver` selects a compatible CDP launcher. The probe uses High post-processing, all adopted actors and the actual world render. It replays two controller-produced running poses and checks packed values and decoded RGB against a capture-only per-frame control.

The before receipt in #405 records **276** skin-update decompositions per native draw and **210** with the control, with all 19,008 final words and pixels identical. Two running poses change 1,320 hero words between complete draws. The current patch makes this reuse part of the production draw scope. The production [after receipt](static-skin-proof/native-after.json) records **210** decompositions in both native draws, down from **276** in the [before receipt](static-skin-proof/native-before.json). Update function invocations remain six; the repeated call now returns before recomputing data. Both builds pass the packed-value/control assertions, and the [before](static-skin-proof/before.png) and [after](static-skin-proof/after.png) native images have **zero changed decoded RGB pixels** at 320×180. Native code revisions are `a2e8259f4` (baseline renderer plus unused offline canopy diagnostics) and `f717def9c` (this fix); subsequent commits contain proof/tooling only.

This is a narrow CPU cost reduction under the unchecked turning/hitch item. It does not establish that duplicate skin refresh caused the reported hitch or certify 60 fps on hardware. A hardware play gate is still required. The live version manifest remained `0.0.15 · 0b45a36` when checked; this branch is not deployed.
