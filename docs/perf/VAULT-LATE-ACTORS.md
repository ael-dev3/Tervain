# Actors entering a fence vault after takeoff

Live reference: https://ael-dev3.github.io/Tervain/ (0.0.18 · 421d34b). Playtest tracking: [#326](https://github.com/ael-dev3/Tervain/issues/326).

A clear vault can land inside a resident, enemy or animal that enters its route after takeoff. Normal movement checks these contacts; the scripted executor does not. The takeoff actor check in #466 and late-cargo fix in #508 do not cover this case.

This change builds on #508. Before committing each arc step, query the current actor contacts using an actor-only collision collection. The crossed fence is deliberately absent from that query. The same conservative curve envelope used for cargo encloses the player's body and foot. If blocked, retain the last clear position, stop the scripted velocity and return to ordinary falling and collision handling. No reach, animation, geometry or material changes.

## Reproduce

```sh
git fetch origin codex/vault-late-cargo
node tools/repro-vault-late-actors.mjs --baseline dcd87c21d642eeb9400e2fc96efd73c1fa684a36 --out proofs/vault-late-actors
node tools/repro-live-vault-late-actors.mjs https://ael-dev3.github.io/Tervain/ live-late-actors
```

The first command runs both actual source controllers in headless Chrome/SwiftShader with the delivered hero rig. Two fence orientations × three slopes × three cadences (30/60/120 Hz) × four approach distances × three insertion phases × three actor sources × four obstacle controls = **2,592 cases per controller**. The actor enters at 10%, 20% or 30% of the arc, outside the current body. Nearby, inactive and overhead actors are controls.

| Measurement | Before (#508) | After |
| --- | ---: | ---: |
| Cases penetrating an active actor | 648 | 0 |
| Worst horizontal body overlap, with vertical overlap | 0.75 m | 0 m |
| Blocked arcs stopped before contact | 0 | 648 |
| Clear-control paths changed | — | 0 / 1,944 |

The same 2,592 cases also pass with #475's slope/rail-clearance arc (`a439113f2da59638dbfd6ac95e894699f5008275`): **648 penetrating cases → 0**, with all 1,944 control paths unchanged. [Integration receipt](../../proofs/vault-late-actors/slope-arc/report.json). Reproduce after fetching that branch:

```sh
git fetch origin codex/vault-slope-clearance
node tools/repro-vault-late-actors.mjs --arc-ref a439113f2da59638dbfd6ac95e894699f5008275 --out slope-arc-proof
```

That integration keeps #475's planning and shortened travel/lift functions while substituting the guarded executor, its actor-query field and runtime import. It is an explicit source integration fixture.

Every control finishes grounded. All path coordinates and vault-active flags match exactly for the controls. Three new full-update tests fail before the change and pass afterward, including ordinary falling and landing after cancellation. All **64 player-motion tests pass**; production build/type check passes.

[Report](../../proofs/vault-late-actors/report.json) and [compressed per-step traces](../../proofs/vault-late-actors/traces.json.gz) include hashes of each complete case array. Software-rendered collision diagrams: [before](../../proofs/vault-late-actors/before.png), [after](../../proofs/vault-late-actors/after.png). Cyan is the player capsule, orange the actor volume. Both renders use three draws, 1,860 lines, zero filled triangles/textures and 21,236 initial upload bytes. These diagrams do not measure whole-game rendering cost.

## Published-world check

The live script uses the native published controller, an authored field fence and an available resident. It moves that resident into the planned landing after eight 60 Hz arc steps. The candidate comparison borrows only the current source executor and its actor-query object into that same published controller; it is not a full candidate build. Both pictures use the real world's Grade/post/MSAA path.

[Published-world receipt](../../proofs/vault-late-actors/live18.json): **18 overlapping steps → 0**, with no overlap at insertion. [Before](../../proofs/vault-late-actors/live18-before.png) shows the deepest overlap; [after](../../proofs/vault-late-actors/live18-after.png) shows the last clear airborne pose on cancellation, before ordinary gravity resumes. The full-update tests separately verify falling and landing.

This is a controlled late-arrival repro, not evidence of an organic NPC walk crossing. It does not recover an actor teleported directly inside the player's current body or predict actor motion between game updates. Hardware play-gate and visual review remain required; no historical frame-time spike or hardware FPS improvement is claimed.
