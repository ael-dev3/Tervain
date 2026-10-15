# Skip settled grass request-grid scans

On published [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/), every grass layer update scans its full streaming grid and checks tile residency even when the camera has not moved and all reserve requests are complete. Wind and interaction animation do not require rebuilding this request list.

The candidate skips only the drop/request/build phase when the existing last camera position matches and there are no outstanding request-list entries. Initial preparation, camera movement and pending reserve work still enter that phase. Per-tile distance/rank selection, draw ranges, visibility, counters and render-pass culling still run. There is no new retained cache or shader/material change.

## Native before/after replay

`tools/repro-live-grass-idle-stream.mjs` obtains the actual published near/far layer options and constructs fresh native layer instances with their exact geometry, materials, generator and terrain/habitat closures. It borrows the actual baseline and candidate `update` methods onto those instances. All other helpers are the published methods.

Both layers share a deterministic two-tile reserve quota. The wall-clock deadline is omitted to prevent timing noise from changing the generation schedule. The first relocation update has zero reserve, testing that visible holes still finish while unseen tiles remain deferred.

| Tile-residency `Map.has` calls | Baseline | Candidate |
| --- | ---: | ---: |
| Cold preparation | 130 | 130 |
| 120 native camera-follow updates, target x=-2, z=34.6→39.5 | 16,076 | 16,076 |
| 120 updates at a settled, fixed camera position | 15,600 | 0 |
| 121 updates after an 80 m relocation | 15,730 | 3,312 |

The source still performs normal request scans while the relocation reserve drains. Active resident tiles grow **78→133** in both versions, and both finish with an empty request list. The report's `pendingStart=69` is the first relocation request-list length, which includes entries filled during that update; it is not a count of remaining unbuilt tiles.

All 361 recorded per-update resident-key/count/range/visibility states match exactly (`68dbad15…d20f96b`). Both versions generate the same **184 tiles in the same order**, with identical **6,111,744 bytes** of generated attribute buffers (`e737c0c1…6e8abad`). Native Grade/post walking pixels are identical.

Receipts: [JSON](../../proofs/grass-idle-stream/report.json), [before](../../proofs/grass-idle-stream/before.png), [after](../../proofs/grass-idle-stream/after.png).

The diagnostic temporarily intercepts array iteration to obtain the two published layer instances, restores the iterator immediately, and uses their options without changing the published layers. Residency counters instrument only the fresh layers' maps. Borrowed geometry/material resources remain confined to the disposable proof page.

## Validation

```sh
node tools/repro-live-grass-idle-stream.mjs --url https://ael-dev3.github.io/Tervain/ --out grass-idle-stream-proof
npx vitest run tests/presentation/grassEngine.test.ts tests/presentation/grassCaptureRanks.test.ts tests/presentation/groundVisibility.test.ts
npm run build
```

All **30 grass/visibility tests** and the production build pass. The added regression checks disabling and reenabling a settled stationary layer: visibility and all draw counters return without regeneration. Existing tests cover quota sharing, catch-up updates, deadlines, visible holes, capture ranks, blade prefixes and distance bands. The native replay additionally requires deferred relocation work to complete and all state/data/pixel hashes to match.

These are CPU-work counts on the Low-preset published input, not elapsed frame times, measured hardware cadence or an Apple GPU PASS. The change does not claim to fix grass flicker, distance appearance, historical live16 missed refreshes or the night/mud hitch. Complete candidate-build hardware play-gate evidence remains required.
