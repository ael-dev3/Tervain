# Resident contact allocation reuse

Active residents constructed a new combined contact array, a filtered array, and a player-circle record each update. Contacts are consumed synchronously by movement, wake-up clearance and passing checks; they are not saved as routes. Each resident now owns a reusable contact list and player record. Every update rebuilds membership in the original order and refreshes the player's current position and vertical bounds.

`node tools/repro-npc-contact-reuse.mjs --out contact-proof.json` compares original/current actual actors and rig poses across 720 updates with controlled terrain/navigation. It moves the player, changes player height, toggles animal/resident contacts and changes the schedule.

| Measured identities across 720 sampled calls | Before | After |
| --- | ---: | ---: |
| Returned contact lists | 720 | 1 |
| Player contact records | 720 | 1 |
| Unequal contact snapshots | 0 | 0 |
| Unequal actor/rig snapshots | 0 | 0 |

These counts track sampled returned objects, not all allocations or GC time. The repro also performs actual updates, but their internally generated identities are not counted. The additional temporary combined array removed from the original implementation is not included in the table.

[Before/after receipt](npc-contact-proof/report.json). Build/typecheck and 25 focused resident movement/behaviour tests pass, including independent per-actor scratch and current activation/height controls. No rendering formula or animation changes. This is deterministic collision/motion verification, not a hardware frame-time or live-stall claim; a hardware play-gate receipt remains outstanding.
