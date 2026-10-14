# Reject missing required crown cutouts

`leafCutoutSampler` returns null both for opaque materials and for masked materials whose pixels cannot be decoded. The forest audit previously passed either result into the detector without distinguishing them. An alpha-aware scan could silently inspect opaque geometry instead of visible texels and claim complete coverage.

The selected leaf material now supplies a diagnostic-only `cutoutRequired` flag. An alpha-aware scan fails explicitly if a leafy target requires a mask that is unavailable. Geometry-only scans, opaque materials, decoded masks and leafless trees retain their behavior.

```sh
node tools/repro-canopy-missing-cutout.mjs proofs/canopy-missing-cutout/report.json
npx vitest run tests/presentation/canopyAudit.test.ts
npm run typecheck
```

The repro supplies a controlled unreadable texture to the real material sampler and production detector. Before: complete, zero masked trees, zero candidates. After: missing-cutout error. Three valid controls remain complete. This does not establish that live assets currently fail decoding, fix floating foliage, or supply hardware performance evidence. No rendering or production asset changes. Live reference: https://ael-dev3.github.io/Tervain/ ; tracking issue #326.

A read-only published-build check is also available:

```sh
node tools/check-live-crown-masks.mjs --url https://ael-dev3.github.io/Tervain/ --out live-crown-mask-coverage.json
```

It reports each native LOD target's material alpha-test threshold and sampler availability, rejecting unknown leafy materials or required missing masks. Its mask-availability result is not a crown-connectivity or LOD-pop quality gate. The recorded build revision identifies the build actually inspected.
