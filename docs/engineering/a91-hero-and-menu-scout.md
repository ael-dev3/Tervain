# Fifth bug scout: the hero, the menu and the map (A91, 0.0.13)

Two last reads covered what the earlier scouts had not:
- the hero's combat and animation;
- the title and pause menu, the loading screen and the map.

Each fault was confirmed against the code. Those marked *(test)* have a test that fails without the fix.

## The hero

| Fault | Fix |
| --- | --- |
| **Killed in the saddle, the body lay in the air at the saddle's height** for the whole fall. Nothing cleared the mount once dead. *(test)* | He falls beside the deer; the deer is let go when play resumes. |
| **On the first frame of death the arms jumped into place**: guard, swing, blade and grip overlays all vanished at once, the hand moving 0.37 m from a guard and 0.49 m from a heavy blow. *(test)* | The overlays ease out at their own pace as he falls, and the grip relaxes into the fall's own hands. |
| **Struck while swimming, he was stood upright with a jump's legs** for the length of the flinch. *(test)* | Struck while swimming, he keeps swimming. |
| **The sword stayed drawn in hand through a swim**, indefinitely while a foe was near. *(test)* | It goes back in its sheath as he starts to swim. |
| **A respawn or load counted as a turn**, so he stepped round on the spot as he appeared. *(test)* | A placement sets the facing the pose takes as its own. |

## The map, the menu and the loading screen

| Fault | Fix |
| --- | --- |
| **The chart ended short of the walkable ground**: up to 26 m to the east and 18 m to the north. The player's arrow left it there, and his own spot could not be pinned. *(test)* | The chart, and the extent pins may be placed in, cover all of it. The chart's proportions are unchanged. |
| **The player's arrow grew with zoom**, four times larger at full zoom, over the labels. | It keeps its size, as the pin does. |
| **Enter pinned where the view had eased to, not where it was heading**, up to 70 px short just after a pan. | It pins where the view is going. |
| **A rebuilt menu scene (after a quality change) started its clock again**: the stag set off on its round from beyond the stones, and the fire and clouds jumped back. | The scene goes on from the old one's moment, and the stag from where it was in its round. |
| **A second world build in one load would hold the bar at its last stage.** Not reachable from the menus today, since settings are closed while loading. | The bar starts again for each pass. |

Not changed: a dodge or a blow can begin in mid-air. That is a matter of how the game should play, not a fault, so it is
left as it is.

Found sound by the same reads:
- **Hits:** each swing lands once, and never through walls or across floors.
- **Stamina and guard:** stamina never goes below empty and recovers; the parry window, guard break and dodge
  invulnerability behave.
- **Hit and death:** hit-stop and the end of death and respawn are sound.
- **Menu scene:** the visiting ships, the score's sync and its own disposal.
- **Loading screen:** the bar never runs backward or past full, and Retry and Back work.
- **Map:** it redraws new places and pins at once, its zoom and pan are clamped, and dragging is told from clicking.
