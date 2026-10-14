# Tavern exit camera clearance

Published baseline: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/).

The exit-camera report led to a reproducible mismatch between the tavern's generated roof and its camera collision volume. The roof extends 0.45 m beyond the building ends and 0.6 m beyond the front/back walls. Its fascia hangs 0.32 m below the wall top. The old roof collider covered only the wall footprint and started at the wall top, allowing a boom to cross the overhang while its endpoint remained outside the old box.

The fix adds one camera-only envelope for this existing tavern roof. It changes no meshes, player obstacles or NPC navigation obstacles. The small margins cover the fascia and authored edge variation. Other building roof styles are outside this change.

## Reproduce

At the tavern entrance, stand two metres outside the front wall, aligned with the door. Turn the camera toward the roof and raise its boom pitch. The source fixture sweeps 41 positions through the doorway approach, five pitches and 24 headings, testing the actual generated timber triangles between the player pivot and camera. The moving door leaf is excluded because the doorway is open; the static frame stays.

```sh
node tools/repro-tavern-eaves.mjs artifacts/tavern-eaves 421d34b
npx vitest run tests/presentation/cameraRig.test.ts tests/world/colliders.test.ts
npm run build
```

The fixture compares the published collider source with the candidate, asserts zero candidate roof crossings, and hashes every actor collider to prove that navigation geometry remains identical. Screenshots render the native procedural building in isolation with vertex colours, a ground plane and a diagnostic player capsule; they are software WebGL evidence, not a hardware performance or visual-quality gate.

See [the machine-readable receipt](proofs/tavern-camera-eaves/report.json), [before](proofs/tavern-camera-eaves/before.png) and [after](proofs/tavern-camera-eaves/after.png).

The separate sign/lantern contacts reported by the sweep are retained as further leads. This receipt proves roof-overhang clearance; it does not claim every doorway prop or camera transition is fixed. A full-world recorded gate remains required before calling the reported exit completely verified live.
