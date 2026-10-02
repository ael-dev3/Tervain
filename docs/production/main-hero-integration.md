# Weathered Wanderer integration into 0.0.8

Owner decision **A37**, 2 October 2026: the approved finished Wanderer becomes the main playable character. This change is based on main `d0dc8de140ece35fe82b679beb6e9956055e316c` and retains version **0.0.8**. NPCs, enemies, ambient people and the menu warden retain their current procedural character-sheet pipeline. The hero's identity and story remain the existing amnesiac outsider; this selection does not give him a faction, remembered name or new equipment.

## Delivered behavior

The game loads the embedded [approved model](../../public/models/hero/weathered-wanderer-hero-50k.glb) before constructing its first world. The asset is 49,500 body triangles, 30 joints and five source clips. Its complete actor, including every equipment and standing-band attachment, is **49,784 triangles**. Lossless WebP reduces download size from 44,410,400 to 28,184,920 bytes without changing decoded texture pixels, geometry, UVs, skinning or authored curves. [Provenance and preparation](../engineering/main-hero.md) remain separate from the game integration checks.

The model's bones replace the procedural player rig. Its authored idle, breathing, look and upper-body walk curves are retained. The original walk covers only 0.516129 m in 1.2 seconds, so gameplay walking/sprinting uses an adapted distance-driven leg solver, heel/toe rollover, counter-swinging arms and small opposing torso/hip rotations. Jump, combat, guard, dodge, recoil and defeated poses are runtime adaptations; they are not new authored source clips. The imported root-motion clip is not applied to gameplay movement.

The first gait adaptation was visually rejected by the owner as crouched. Its wide inspection stance and long planted reach lowered the pelvis about 12 cm. The final adaptation narrows walking foot tracks from about 48 cm to 32 cm, permits near-full relaxed leg extension and uses foot rollover to reach forward without that squat. Walking remains upright; sprinting adds stronger arm pump and flexed elbows. Visible heel strikes drive existing surface footsteps. Collision-blocked movement produces neither gait travel nor phantom footsteps.

The player still begins unarmed. Collecting a sword leaves it in the bag; explicit equip/unequip controls its visibility and combat use. The blade follows the right palm, its sheath follows the pelvis, and grouped finger/thumb joints close around the grip. Earned standing bands retain existing inventory semantics. Movement, jumping, collision, action damage, stamina, saves and camera framing remain under their existing gameplay systems.

Loading is shared and cached, resolves through the built page's base URL, checks GLB framing and rejects HTML responses. A failed download/parser releases the request for Retry; download time is bounded to 60 seconds. The provisional procedural player is released only after its sheet jobs and their texture application settle. Graphics rebuilds retain the installed hero and its GPU resources rather than reloading or replacing the player.

## Local validation

Final checks on 2 October 2026:

- `npm run typecheck` — pass.
- `npm test` — **707 tests in 63 files**, pass (48.32 s), using the configured two-worker limit. The initial integration also passed 680 tests with that limit before the aggregate full-cast checks were split into named cases; the increased count reflects the same coverage with per-model failure reporting.
- `npm run build` — pass; the existing single-bundle size warning remains (1.497 MB minified / 498.45 kB gzip).
- `node tools/import-main-hero.mjs --check` — pass: exact shipped hash/size, 49,500 triangles, 30 joints and five clips.
- `git diff --check` — pass.

Actual-binary tests verify private skeleton/material instances, controller-owned transforms through all action overlays, equal distance phase at 30/60/120 Hz, planted-foot travel cancellation, upright/narrow stance, opposite arm swing, actual skinned boot-sole support on the flat test plane, local grip deformation, equipment visibility and contact-driven sound. Loader/lifecycle tests cover deployment paths, shared requests, malformed/failed responses, parser recovery, timeout cleanup, delayed worker disposal and once-only installation. Existing movement, collision, camera, inventory and save scenarios remain in the full suite.

Native desktop browser review used the actual game and production build, plus a motion-review page importing the same rig/animation modules. Observed: successful textured hero delivery; fresh unarmed arrival with ten empty slots; inventory sword equip/unequip; graphics changes Medium → Low → Medium preserving model, textures and position; quicksave/quickload; an unarmed attack; upright walk and stronger sprint from side/three-quarter views; guard grip and sheath clearance. These observations do not establish a minimum-spec performance certification, an independent per-foot terrain solver, a desktop package or a public deployment.

For future art review, run `npm run dev` and open `/tools/hero-motion-preview.html`. It offers the actual game adapter's walk, sprint, idle, attack, guard, dodge, airborne and defeated poses, equipment states, camera rotation and normal/half/quarter speed. This development page is outside the production build's entry points.

## CI timeout correction

The first [PR build](https://github.com/ael-dev3/Tervain/actions/runs/37066311931), against `fdb14e7147ff2e79057ea8141908ba495164483f`, passed type checking and 679 tests, including every new hero test. The existing aggregate character-sheet test took 5,104 ms and exceeded its unchanged 5,000 ms timeout. The build and artifact steps therefore did not run.

The full-cast sheet and NPC geometry checks now use a named test case for each model. All surface, material, detail-layer, vertex-part, finite-attribute, skin-weight, skeleton and triangle-budget assertions are preserved; actual model identities and catalog uniqueness remain checked. CPU-heavy geometry and inline painting tests use two workers to avoid contention. No timeout was raised, test skipped, required check removed or workflow trigger changed. The default test command passes locally after this correction; remote validation is pending at this source checkpoint.

## Publication boundary and Actions preflight

The change is published for review as [PR #11](https://github.com/ael-dev3/Tervain/pull/11) on `codex/wanderer-main-character`. A main merge/deployment is separate from creating its reviewable PR; do not claim the hosted game contains this hero until the merge and successful deployment are verified.

The read-only UTC-day preflight inspected all 43 available repository runs across workflows, branches and actors. On 2 October there were zero created/started/updated runs, zero queued/in-progress runs and no rerun attempts; every retrieved run had attempt 1. The server exposed one active workflow, `.github/workflows/pages.yml`, with a main-only push trigger, pull-request trigger and manual dispatch. There are no scheduled or downstream `workflow_run` chains in that workflow. A feature-branch push adds no run; creating one PR adds one Ubuntu build run and no deployment. The latest PR build took 43 seconds of runner time; conservatively estimate **1–3 runner minutes** for the larger hero checkout and tests. Monthly usage is **unknown**; no billing permissions were expanded. Refresh the preflight immediately before any remote action and preserve all required checks.

The first PR run consumed about 55 seconds of runner time and was not manually rerun. The corrective push is one coherent update and is expected to add one pull-request synchronize build, conservatively another **1–3 runner minutes**; a description-only edit has no matching event under the default pull-request trigger. Check the current UTC-day history again immediately before either action.
