# Actor synchronization translation reads

`RealmPhysics.syncActors` read each actor body's Rapier translation to test teleport distance, then read it again to capture the start position for the fixed-step sweep. Normal movement made no intervening body change.

Reuse the first value when no teleport occurs. After a teleport or reactivation, retain the second read: Rapier's stored coordinates are authoritative and can differ from the supplied JavaScript coordinates. The captured `from` remains a fresh plain object. Actor enablement, removal, targets and sweep behavior stay unchanged.

Run `node tools/repro-actor-translation-read.mjs report.json`. It compares original `0b45a36` and changed implementations using actual Rapier worlds, 32 controlled actors and 180 updates. Controls include ordinary movement, a non-integer teleport, deactivation/reactivation, roster removal/return and a loose crate. Every actor's start/target/activity/body position and every prop pose match exactly after each fixed step.

[Receipt](actor-translation-proof/report.json): 5,760 equal actor states; body translation calls **11,480 → 5,743** (about 50% fewer). Both implementations perform the same three teleports. These are calls at the JavaScript/Rapier API boundary, not a hardware timing measurement. No Mac frame-time gain is claimed.

Existing 18 rigid-body tests and production build pass. No rendering, animation or visual changes. Hardware play-gate verification remains separate; tracked live GPU data is in [LATEST.md](LATEST.md).
