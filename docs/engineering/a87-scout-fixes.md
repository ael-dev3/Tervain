# Bug scout: hunting, riding and a new journey (A87, 0.0.13)

Two independent reads of the game outside this session's earlier work found the following. Each was confirmed against
the code end to end and is fixed with a test:
- combat, hunting and riding;
- state, saves, quests and the clock.

| Fault | Fix |
| --- | --- |
| **The ridden deer sank under the footbridge.** It was set on the terrain under the planks while its rider stood on them, 1.3 m apart. Let go there, it stood in the stream bed with no path out. | The mount stands where a rider does (the ground including decks and floors), level on planks, ridden or not. |
| **Arrows hung in the air where a resident or a bandit had stood.** A shot at a person lodged on their moving capsule as if it were scenery, and stayed after they walked off. | The projectile trace names the person it met; such an arrow glances off and falls away. (Arrows still do no harm to people.) |
| **The bow could be drawn and loosed while getting onto or off the deer.** Melee was already locked then. | The bow is too. |
| **Skinning could start from the saddle**, then throw the rider off and cancel. | Refused, as any other busy moment is. |
| **Hunting could end for good.** Arrows came only from Rowan's table and his trade, hides only from game shot with them: an empty quiver with no hide left no way on, while the objective still said to trade a hide. | With none left and no hide, Rowan spares six arrows, and the objective says so. He gives no more while those last. |
| **"Your quiver is full" refused a hide while the quiver still had room** (35 of 40 at novice rank). | A hide buys what still fits; only a full quiver refuses it. |
| **A second New journey in one session was silent.** The arrival remarks and everyone's first words were remembered as already said. | A new journey forgets what was heard and said. A load still keeps it, as the same journey goes on. |

Checked and found sound by the same reads:
- **Saves:** the save and its recovery, every field of a save round trip, and the old-save migrations.
- **Quests and the clock:** quest commands; the clock and schedules across midnight.
- **Inventory:** its limits.
- **Hunting:** arrow lifetimes and limits, single resolution of each shot, the end of every channel and mount move on
  death, swim, load and hurt.
- **Enemies:** their chase, leash and respawn.

Noted, not changed: the consent, permission and testimony flags of the water story are set only by authored dialogue,
which the live game does not yet open; `docs/engineering/prototype.md` already records it.
