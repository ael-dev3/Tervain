# Second bug scout: residents, menus and world rebuilds (A88, 0.0.13)

Three more independent reads covered what A87's two had not:
- residents' and enemies' behaviour and navigation;
- the menus, input, settings and audio;
- the world's lifecycle (rebuilds, loads, returning to the title, what is left behind).

Every fault below was confirmed against the code, and those marked *(test)* fail without the fix.

## Residents

| Fault | Fix |
| --- | --- |
| **The shrine's steward and warden stood in the hall's doorway all day.** The shrine door stands 2 cm proud of the others. The tread outside it began 1.5 cm short of the hall floor's edge, leaving bare ground 0.8 m below, and walkers at 30–60 frames a second stopped there every morning. (Tests at 20 a second stepped over it.) *(test)* | The tread runs from the wall line out. |
| **A resident replanned off their usual line walked into furniture and froze**: Ila into the inn's fireplace after the player had stood in her way, the steward against a shrine pillar. The route's first short step clear of the furniture counted as passed within 0.2 m. *(test)* | A waypoint that near counts as passed only if the way on to the next is clear. |
| **A sleeper 25–60 m away lay half a second unposed** after a load or after their model arrived. *(test)* | Posed on the first frame they are shown. |
| **One finished model held on screen kept every other late model from being built**, even for residents out of sight. *(test)* | Finished rigs wait to change over on their own; the next build goes on. |
| **The respawn point could be set beside the bandits' post before their models had arrived.** *(test)* | Never within 18 m of a foe's post that has not been defeated. |

## Menus and input

| Fault | Fix |
| --- | --- |
| **Taking up or putting away the bow stopped a held walk and a toggled sprint.** Changing the controller layout reset all input. *(test)* | Only the right trigger, whose meaning changes, must be let go. |
| **Up and down on the Quality list changed the quality, rebuilding the world, and focus could not get past it.** *(test)* | Up and down move on through the panel; left and right still change the option. |
| **Spoken captions stayed their full length after the voice was cut** (a menu opened, a load, death), even over a freshly loaded game. | They are taken down with the voice. |
| **A rebinding that took another action's key said so only in a note the rebuilt panel discarded.** | The toast says it. |
| **A long journal page could not be scrolled with a controller.** | The right stick scrolls an open panel. |

## World rebuilds

| Fault | Fix |
| --- | --- |
| **A world disposed while its animals or furniture were still downloading built them anyway**, then had them prepared, uploaded and first-drawn into the new world before throwing them away. | Nothing is built for a disposed world, and preparation hooks act only for the world that set them. |
| **The water pass kept the previous world's meshes reachable** after a switch to Low. | Released with its targets. |
| **A quality change made while the first journey loaded left the menu's backdrop at the old quality.** | The backdrop follows it. |
| **The depth materials kept for preparing shadows grew with every rebuild**, holding the old textures. | Released with the world. |

Found sound by the same reads:
- **Residents and enemies:** schedules across midnight, beds and waking, shared doorways, and stand-ins (which cannot be
  met, bumped, overheard or count as witnesses). Doors never trap the player. Enemies leash and respawn correctly.
- **Menus, input and audio:** panel focus and Tab trapping, the pause, load and quit flows, settings persistence,
  brightness, the frame cap, and the menu score against the world's sound.
- **World disposal:** releases the scene, shadow maps, window and sky captures, and staged casts, and failed builds
  recover.
