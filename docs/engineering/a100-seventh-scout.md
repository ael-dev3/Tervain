# Seventh pass of bug scouts (A100, 0.0.13)

The seventh pass read the areas the earlier passes had touched least:
- combat and the foes;
- water, riding and the props that can be picked up;
- the inventory, trade and the journal.

Each fault was confirmed against the code. Those marked *(test)* have a test that fails without the fix.

## Combat

| Fault | Fix |
| --- | --- |
| **A light blow landing during the Thornback's committed strike turned its lunge round.** The strike was not interrupted, as intended, but the blow still rewrote the lunge's heading: for the rest of the strike the creature slid away from the hero at 7 m/s and often missed. In effect, a free knockback. *(test)* | Only a blow that interrupts (a stagger) sets a new heading. A killing blow still does. |
| **The flinch played from the wrong point after a parry or a light blow.** Its progress was always measured against the heavy blow's 0.85 s. A parry (1.1 s) started it below zero: the torso leaned forward and then flipped, or a figure's flinch clip froze on its first frame. A light blow (0.3 s) skipped most of it. *(test)* | The flinch runs from start to end over whatever stagger length was set. |
| **A hero who died exhausted could rise exhausted on full stamina.** Respawn placed him before refilling stamina, and the placement takes its exhaustion flag from stamina. Heavy blows and dodges were refused on the first frame, and a paused respawn showed him spent throughout. *(test)* | Stamina is refilled first. |

## Riding and water

| Fault | Fix |
| --- | --- |
| **A rider struck in the saddle was still thrown off.** A94 kept him seated through the flinch, but the shell put down any rider who was not standing free, and a flinch counts as not free. *(test)* | A flinch keeps him in the saddle. |
| **Riding off a ledge left the rider seated in mid-air** above a deer already standing at the bottom of the drop, for the length of the fall. *(test)* | A rider who leaves the ground is put down, as the comments always said. |
| **On the footbridge, the stream under the planks counted as deep water.** Getting down there skipped the step-down. He was set 1.2 m under the deck, then snapped back up, with a false soaking and drip. *(test)* | Depth is measured from what he would stand on, so a deck counts as footing. Truly deep water still sets him down to swim. |
| **Barrels and crates could be picked up from the saddle.** A held one rode through the deer's back. *(test)* | Nothing is picked up while mounted or getting up or down. Anything held is let go on mounting. The interact key still gets him down. |
| **An arrow shot onto the footbridge splashed into the water beneath it and then lodged in the planks.** The surface crossing was tested before the impact. *(test)* | The splash comes only when the water is reached before anything is struck. |

## Inventory and the journal

| Fault | Fix |
| --- | --- |
| **The journal said Rowan pays two coins a cut** after a higher hunter's rank had raised the price. *(test)* | It no longer quotes a price; the trading prompt shows the true one. |

## Read and left as they are

- **Dialogue rewards and consents are unreachable in play.** These are the votive reed, the archive key, training, testimony and the rotation's consents. This follows from the owner's decision in A27 to have no dialogue windows. The prototype notes already record those conversation routes as future interface work, so it is not a fault here.
- **A heavy blow can be struck from a raised guard, a light one cannot.** A dodge from a raised guard is also allowed, and clears the guard deliberately. Guard-to-heavy is read as the same intended move.

## Found sound by the same reads

- **Health and death:** both pass through the game state with checked amounts.
- **Autosave:** it waits for play mode.
- **Respawn:** it resets living foes but leaves the defeated ones down. Loading revives foes defeated after the save.
- **One-time grants:** each is guarded by a saved record. Pickups stay taken through save and load.
- **Counts:** coins and counts never go below zero. The arrow cap cannot drop arrows in play.
- **Equipment and the hotbar:** both are rechecked on load.
- **Water:** the stream solve and its NaN guards hold. Held props float and are released correctly.
- **The saddle and loading:** a pending mount survives reloads and loads correctly.
