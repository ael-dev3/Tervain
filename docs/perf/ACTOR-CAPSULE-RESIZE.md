# Stale actor capsule dimensions

Wildlife supplies different `PhysicalActor` dimensions for living animals and carcasses (`animals.ts`, `physicalActors`). `RealmPhysics.syncActors` updated position and activation, but constructed the capsule only on first registration. Changing an existing actor's radius or height left the original standing shape in physics.

A controlled actual-Rapier repro starts with radius 0.25 m and height 1.8 m, then changes the same actor to radius 0.2 m and height 0.4 m. The original capsule retains radius 0.25 m and half-height 0.65 m. A horizontal direct collider ray at y=0.95 m hits that obsolete shape at distance 2.771 m. With the fix, radius is 0.2 m, half-height zero, and the ray misses. This is a deterministic collision-contract repro, not a claim about a recorded playtest frame.

Update the existing collider's shape only when its capsule radius or half-height changes. Keep body and collider identities, handles, activation and motion history. Mark the shape for existing projectile query synchronization. No mesh, animation or visual changes.

Run `node tools/repro-actor-capsule-resize.mjs report.json`. [Receipt](actor-capsule-proof/report.json) compares baseline `0b45a36` with the changed source, covering unchanged dimensions, shrink, expansion, resize while inactive and reactivation. Unchanged geometry produces equal ray results. Exactly three dimension changes cause three shape writes; reactivation does not rebuild the shape. Handles remain unchanged throughout. Direct collider rays inspect geometry even when the body is disabled; the report separately checks body activation.

Validation: 19 rigid-body tests including a new shrink/expand regression, production build, and numerical before/after repro. Hardware play gate remains separate. No performance or visual-quality claim.
