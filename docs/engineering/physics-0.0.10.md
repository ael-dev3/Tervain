# World physics in 0.0.10

This revision adds nine movable work supplies and improves steep-ground movement while retaining Tervain's authored world and controller. The owner-authorized `0.0.10` scope is recorded under [A44](../decisions.md); combined release acceptance belongs to the [release record](../production/releases/0.0.10.md). This is an original implementation using Rapier, not a claim of Half-Life 2 feature parity.

## Runtime and provenance

[`@dimforge/rapier3d-compat`](../../package.json) is pinned to **0.21.0**, under Apache-2.0. Its compatibility package embeds the WebAssembly binary and requires asynchronous initialization, which world construction awaits. Primary references are Rapier's [JavaScript initialization guide](https://rapier.rs/docs/user_guides/javascript/getting_started_js/), [rigid bodies](https://rapier.rs/docs/user_guides/javascript/rigid_bodies/), [colliders](https://rapier.rs/docs/user_guides/javascript/colliders/), [character controller](https://rapier.rs/docs/user_guides/javascript/character_controller/) and [upstream source](https://github.com/dimforge/rapier). Dependency notices are retained in the repository and shipped notices. No Valve assets, code or engine binaries are imported.

[`RealmPhysics`](../../src/world/physics.ts) steps at **60 Hz**, with gravity −17 m/s². The app supplies active gameplay time only; title/menu/panel pauses, hidden tabs and hit stop do not accrue simulation time for later catch-up. The accumulator bounds long frames rather than simulating arbitrarily large delays. Rendered positions interpolate between steps, and rotations use a normalized shortest-path quaternion blend. This separates physics frequency from display refresh rate; it establishes no frame-rate target or measured performance result.

## Movable objects and controls

There are **seven barrels and two crates**: two barrels and two crates at the inland waystation, plus five existing loose barrels elsewhere in the world. Their old stationary copies are removed. The renderer reuses Tervain's original closed barrel/crate construction and generates timber/plank textures at 1,024/512/256 px for High/Medium/Low. Barrels have cylinder colliders and crates have box colliders; those collision shapes approximate the detailed visible shells. Bodies use continuous collision detection, friction, limited restitution, damping and sleeping. Barrels are assigned 18 kg and crates 12 kg; these are implementation controls, not lore.

| Default input | Behavior |
| --- | --- |
| **F** | Lift the facing reachable supply, or drop the held supply. |
| **R** | Throw the held supply in the camera's direction. |
| **E** | Existing inspection, item pickup and NPC observation. |

F/R are remappable keyboard actions. Fixed controller bindings use left/right stick clicks; physical controller verification remains pending. Lift selection tests reach, facing and line of sight against other bodies and static contacts. A held object follows a bounded damped spring, remains collidable and releases when its connection is obstructed or too distant. Full-shape sweeps limit the hold target; it is not teleported through a wall. Throwing applies linear and angular impulses. No object damage, physics combat weapon, remote gravity tool, destruction or inventory duplication is added.

## Contact authority

The terrain collider uses the original **2 m grid's exact triangle diagonal**, including the seabed. The finer 1 m visual terrain subdivision samples those same planes; it creates no second physical topography. Existing finite architecture contacts and authored deck/archive support slabs participate in cargo collision. Most architecture remains represented by canonical boxes/cylinders rather than every visible mesh face. Quest-controlled contacts follow their existing active state.

For all 376 canonical blocking trees, [`buildFlora`](../../src/presentation/flora.ts) exports the exact near variant's **wood positions and indices** through the renderer-free [`PhysicalWoodGeometry`](../../src/world/physicsGeometry.ts) interface. Per-variant buffers are shared; each record carries the original grounded translation, yaw and uniform scale. Rapier applies those transforms to a fixed triangle collider and omits the corresponding fallback solid cylinder. Foliage cards are excluded. Thrown cargo can therefore contact the source trunk, roots and branches, including spaces the source wood actually leaves open. Source GLBs and tree geometry are unchanged.

**Player, NPC and navigation static-world checks retain their canonical swept footprints.** Exporting source wood does not replace those footprints with a mesh controller. The player's additional kinematic capsule queries the movable bodies, pushes them and can use a reachable top as support. Curved-foot and head casts check partial edges and movable ceilings. First-frame queries after save restoration use the bodies' current poses rather than waiting for a stale broad phase to refresh. Living named residents and enemies have kinematic cargo contacts; dead/inactive contacts are disabled and restored actors do not sweep through the intervening world. This does not turn people into dynamic ragdolls or guarantee exact hand/foot contact.

## Slopes, jumps and falls

The player's controller no longer treats the ordinary walking-slope threshold as an invisible wall on steep terrain. Supported movement retains authored obstacle sweeps and a bounded step height. Steep unsupported ground adds downhill acceleration with reduced damping; deliberate travel and jumping remain possible, and airborne motion retains horizontal momentum. Jump height follows a ballistic integration, large ledges produce a fall instead of snapping the feet to remote ground, and ceilings constrain ascent. Solid walls, deep water and the realm boundary remain legitimate travel limits. These changes add no swimming, unrestricted climbing or fall-damage system. Native movement feel still requires review alongside the automated regressions.

## Persistence and lifecycle

Format-1 saves now include known supplies' IDs, positions and normalized rotations. The parser bounds record count, world coordinates and quaternion norms, rejects malformed/duplicate entries, and retains older format-1 saves that have no object field. Unknown object IDs are ignored by the physics world. New games reset supplies to their initial arrangement.

**Velocities and held state are not saved.** Loading restores poses with zero linear/angular velocity and releases any hold. A graphics rebuild preserves current object poses through world replacement, also without retaining velocities. The engine world and its resources are freed on disposal; shared tree buffers remain valid until their owning world is disposed. Finite save validation is not a guarantee that every manually fabricated pose is free of penetration.

## Verification boundary

Targeted physics, persistence and player-motion regressions cover falling/stacking, spring lift/throw, obstruction and thin-wall contact, player pushes/support/head clearance, actor contact, fixed-step timing, exact transformed source wood, restored first-frame queries and format-1 compatibility. These are implementation checks, not a substitute for visual or input review.

The coordinating assistant reports final combined typecheck, **881 tests in 84 files (43.61 s)** and the production build passing. Native camp review exercised F lift with the held prompt, pause-menu v0.0.10, then Resume/R throw with one awake body and none held. Reviewed forest/coastal views had no runtime errors. This is a targeted native observation, not proof of every physics scenario: native save/load round-trip, broad steep-travel/jump/support and controller review remain outstanding. Full source checks, captures and final hosted evidence belong to the [release record](../production/releases/0.0.10.md); publication requires the final-source Pages success and served-version observation. Reference-hardware performance, physical controllers and packaged desktop behavior remain unmeasured.
