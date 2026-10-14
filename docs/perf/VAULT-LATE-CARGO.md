# Cargo entering a vault after takeoff

## Published reproduction

On [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/), place a loose crate at a clear vault's landing after takeoff. The preflight sweep has already passed, and the executor writes the complete arc without checking current bodies again. The hero passes through the crate, then snaps onto it.

```sh
node tools/repro-live-vault-late-cargo.mjs https://ael-dev3.github.io/Tervain/ live-late-vault.json before
```

The native controller, authored field fence and real crate reproduce **47.3 cm penetration over five frames** after a controlled crate pose change eight 60 Hz arc steps after takeoff. This injects a newly obstructed landing deterministically; it is not a recording of a naturally rolling crate. [Full published trace](../../proofs/vault-late-cargo/live18.json).

An earlier scan of all nine authored fence segments found **450 eligible approaches, 420 accepted arcs, zero terrain crossings** at 199 samples per arc. It also checked the corrected takeoff/landing trajectory. That lead did not justify a terrain change. [Scan receipt](../../proofs/vault-late-cargo/live18-terrain-scan.json); rerun with `node tools/repro-live-vault-terrain.mjs URL report.json`.

## Fix

Before advancing an active vault, sweep the next airborne segment against current loose bodies. Include the full foot volume and a conservative curvature envelope. When newly blocked, retain the last clear position, cancel the vault, zero scripted velocity and leave the player airborne so ordinary falling/collision handling resumes. Clear arcs use the same time, position and facing calculations.

The envelope covers both the original smoothstep and a travel phase shortened to 60% of the arc. The foot padding matters: the existing planning sweep intentionally omits three centimetres below its body capsule; reusing it without that allowance left up to 1.9 cm of penetration in the first experiment.

This does not undo cargo already moved into the player's current body, change actor collision, or alter visuals/animation. It adds one loose-body sweep on each active vault step. It does not run during ordinary walking.

## Matched before/after proof

```sh
node tools/repro-vault-late-cargo.mjs --baseline 421d34b --out vault-late-cargo-proof
node tools/repro-vault-late-cargo.mjs --arc-ref a439113f2da59638dbfd6ac95e894699f5008275 --out vault-late-cargo-arc-proof
```

Both runs use the delivered hero/controller and actual RealmPhysics capsule sweeps. The second transplants only the guarded executor onto #475's source while preserving its phased travel and corrected slope amplitude; it is a source integration check, not a merged build.

Each matrix covers **648 cases**: uphill/flat/downhill ground, two rail orientations, four approach distances, three insertion phases, 30/60/120 Hz, and absent/landing/nearby cargo. Every insertion starts outside the player body.

| Result | Before | After |
| --- | ---: | ---: |
| Penetrating cases | 216 | 0 |
| Deepest penetration | 58 cm | 0 |
| Newly obstructed arcs cancelled | 0 | 216 |
| Unobstructed arcs cancelled | 0 | 0 |

The diagnostic wireframe image costs match before/after: 3 draws, 1,704 lines (0 filled triangles), 0 textures and 18,180 first-draw buffer-upload bytes. These are the collision illustration's costs, not gameplay budgets.

All **432 clear/nearby trajectories match exactly**, all clear arcs finish grounded, and neither renderer reports GL errors. Both original and #475 arc matrices pass. Diagnostic capsule/rail/crate PNGs, concise reports and compressed per-case/frame traces are under [proofs/vault-late-cargo](../../proofs/vault-late-cargo).

Validation: 74 player-motion/swimming tests plus the physics scout pass, as do type-check and production build. The controller regression confirms cancellation remains airborne, removes scripted velocity and subsequently lands through ordinary falling.

Software WebGL and fixed-step collision evidence only. This is not hardware frame timing, a visual gate or proof of the historical night/mud hitch. Hardware play-gate remains required.
