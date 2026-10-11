# Third pass of bug scouts (A94, 0.0.13)

The third pass reread two areas:
- the game's rules and content, cross-checking every content id and text key by script;
- the player, combat, physics, the camera and the fixed-step clock.

It also added tests for the three A93 fixes that had none. Each fault below was confirmed against the code, and those
marked *(test)* have a test that fails without the fix.

## Rules and content

| Fault | Fix |
| --- | --- |
| **Killing the thornback never freed Ila.** Only a conversation could, and nothing in play reaches that conversation. She stayed on the ledge after "The ledge is clear", so the lever was the only way to free her. *(test)* | With the thornback dead she comes down by the ledge herself, as she does through the opened gate: once, with the same trust and investigation. |
| **Pell's night shift was wrong.** While the rotation was being agreed he worked days and nights with no rest, starting an hour after his day shift. Once it was settled the night shift vanished, although his lines speak of it. *(test)* | From the agreement onward he works nights at the quarry face and sleeps by day in the bunks, with no gap. |
| **Animals returned out of the hunter's sight, judged from where he was last saved**, up to 90 seconds earlier. A carcass could vanish in front of him. | The clock judges from where he is now. |
| **Three refusals had no words**: the hunter's trade while down or over a carry limit, and bracing a gate already braced. Each showed a raw text key. *(test)* | Each has its line. |

## The player and physics

| Fault | Fix |
| --- | --- |
| **The hero was never drawn between simulation steps, though the camera and the deer were.** On fast displays he juddered against the camera, and slipped back and forth in the saddle. *(test)* | The hero is drawn between steps like everything else that moves. |
| **Loose cargo was drawn one step behind its true place** and moved in 60 Hz jumps. A carried barrel trailed the hero. *(test)* | Cargo shows where it is, and is drawn between steps too. |
| **Struck in the saddle, the hero stood up on it** for the flinch. The on-foot step then ran on the gallop's speed, and could carry the deer partly into a wall. *(test)* | He flinches seated. The deer goes on carrying him without his steering, keeping its body clear, and the blow does not shove him off the seat. |

## Not changed

- **Dialogue trees are not played in this version.** Talking goes through spoken lines, by the 0.0.5 design
  ("observation only"). So the consents, permissions, the rite, the training and Ila's testimony cannot be obtained in
  play, and the gate's stabilising always surges. This is a design matter, left as it is.
- **Settling ignores a reward that would overflow the coin count.** This is only reachable by editing a save.
- **A teleport under 4 m made inside one step** (a dismount side-step, a respawn near where he fell) is smeared across one
  drawn frame. This is cosmetic.

## Found sound by the same reads

- **Content:** every item, place, evidence, phase, allocation, rank and species id resolves. Every text and voice key
  used exists. Every dialogue node is reachable and can end. Every schedule covers the day once.
- **Rules:** no reward, pickup or rescue can happen twice; trade prices have no NaN; hunting records survive a reload;
  saves revive their inventory and slots.
- **Camera:** it stays out of every room's walls and roof at every angle tried, and out of tree crowns and water.
- **Movement:** swept moves, falls onto decks and stairs, and ceilings.
- **Physics:** thrown and carried cargo, arrows against walls and cover, and sea drift back to shore.
- **Interruptions:** loading, respawning, death and panels clear what they should.
- **Swimming:** it starts and stops without flicker at the threshold.
- **Realm edges:** the nav grid and the realm's edges hold.
- **Clock:** the fixed-step clock behaves.
