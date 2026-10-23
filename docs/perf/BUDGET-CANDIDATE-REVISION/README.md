# Candidate revision validation

Live reference checked: 0.0.45 / 9394371 at https://ael-dev3.github.io/Tervain/.
This is a gate correctness fix, not a live rendering or frame-pacing fix.

The executable regression copies the real play-gate CLI and provides a deterministic browser adapter. Live revision is `1111111`, requested candidate head is `3333333`, both scenes report 285 draws / 3,061,335 triangles / zero errors. Returning an empty candidate revision previously exited 0 and printed `play-gate: PASS ` because `head.startsWith('')` is true. Returning `333` also falsely matched.

After the fix these cases exit 1 with no PASS receipt. Missing and malformed candidate revisions also fail. Stable valid candidates still pass; changed/missing live baselines, draw/triangle increases, console errors and mismatched heads still fail.

Reproduce:

```
npx vitest run tests/tooling/budgetBaselineRevision.test.ts tests/tooling/budgetCompletedFrames.test.ts tests/tools/budgetFrameSamples.test.ts
npm run build
```

Before: regression fails on empty-candidate (actual exit 0, expected 1).
After: 3 test files / 6 tests pass; production build passes.

| Cost | Delta |
| --- | ---: |
| Game/render/shader source | No changes |
| Per-frame draws / triangles / uploads | 0 by construction |
| Per-frame JS CPU work | 0; validation runs after sampling |
| Pixels | No rendering changes; no new native capture claimed |

The browser adapter is test evidence for the false PASS, not a hardware or software-WebGL performance receipt. No cost allowance or budget threshold was changed.
