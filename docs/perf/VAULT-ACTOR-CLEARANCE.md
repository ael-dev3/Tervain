# Fence vault clearance against actors

The published [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/) fence controller checks static scenery and cargo along a vault arc, but omits the resident, enemy and wildlife volumes used by normal movement. A vault can therefore commit to a landing occupied by a standing body.

Pass those existing contacts to the same swept arc query. Gather them lazily once for a jump that reaches clearance checking, retaining the current active/hidden/dead and vertical-bound rules. Vault reach, animation, landing selection and ordinary movement remain unchanged. This does not recheck actors that enter the route after the vault starts.

## Reproduce and verify

```sh
node tools/repro-vault-actor-clearance.mjs --baseline 421d34b --out vault-actor-proof
npx vitest run tests/presentation/playerMotion.test.ts
npm run build
```

The native fixture loads the delivered sealed hero GLB and actual Player controller. A level fence lies 0.8 m ahead. Place a resident, enemy or wildlife contact at the planned landing. Test three fence orientations × both directions × three contact sources × four conditions (occupied, nearby, inactive, above).

| Native result per version | Before | After |
| --- | ---: | ---: |
| Occupied landings accepted | 18 / 18 | 0 / 18 |
| Smallest signed horizontal body gap while vertically overlapping | −0.75 m | +0.87 m |
| Nearby/inactive/above controls accepted | 54 / 54 | 54 / 54 |

All control rows are identical before/after. Grade/4×MSAA renders validly with zero WebGL errors. The red wire capsule marks the tested collision volume; it is diagnostic geometry only. Images show the same controller step near the old landing; 14,520 RGB channels differ as expected for the corrected position. All 63 player-motion tests and the production build pass. These tests use controller jump input on a controlled fence, not live-world keyboard input or hardware timings.

[Native receipt](proofs/vault-actor-clearance/report.json) · [before](proofs/vault-actor-clearance/before.png) · [after](proofs/vault-actor-clearance/after.png).

## Published fence controls

A separate published-build run used real keyboard events, native player/physics and three existing field fence segments: both directions, walk/run, and −75°, −45°, 0°, +45°, +75° approaches. **60/60 accepted and landed beyond the planned landing**, with starting heights spanning 1.06–2.35 m. Cargo at the landing was already rejected; absent/nearby cargo controls crossed without deep contacts. The old cargo defect is not reported as still open.

[Published result](proofs/vault-actor-clearance/live-fence-0018.json). The runner was mistakenly selected with its legacy pre-fix expectation; that assertion rejected the already-correct cargo behavior. Its saved observations were checked separately against the post-fix assertions. This full-world run verifies the existing fence controls, not the new occupied-actor scenario. No hardware play-gate PASS or exhaustive all-fence coverage is claimed.

## Published occupied-resident repro and compiled fix

```sh
node tools/repro-live-vault-actors.mjs --url https://ael-dev3.github.io/Tervain/ --expect before --out published-actors.json
node tools/repro-live-vault-actors.mjs --url <candidate-build-url> --expect after --out candidate-actors.json
```

Both full-world probes pass with the delivered hero, a native resident and real jump-key events. Position the resident at the first field fence's planned landing (approximately −4.798, 1.451, 54.052). Other actor-contact sources are excluded to isolate this check. On published 421d34b the occupied vault starts; on compiled c16f01e3f it is rejected. Nearby, hidden and overhead resident controls start on both builds, with identical recorded control rows.

[Published receipt](proofs/vault-actor-clearance/published-actors.json) · [compiled candidate receipt](proofs/vault-actor-clearance/candidate-actors.json). These tests assert initiation; the 72-case fixture above covers the subsequent controller motion. No hardware frame-time claim.
