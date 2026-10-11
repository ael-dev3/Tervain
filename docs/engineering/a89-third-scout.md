# Third bug scout: water, sound, light and interactions (A89, 0.0.13)

Three more independent reads covered the areas left after A87 and A88:
- the water, physics and footing;
- the sky, lighting and world sound;
- the interactions, journal and content.

Every fault below was confirmed against the code. Those marked *(test)* have a test that fails without the fix.

## Water and footing

| Fault | Fix |
| --- | --- |
| **Standing in the surf began and ended a swim with every wave.** Depth was measured to the moving wave surface, and the swell near shore is far taller than the 0.2 m between starting and ending a swim: eight entries in thirty seconds, each with its splash, and any blow, guard, aim or channel cut short. *(test)* | Out of one's depth in the sea is judged from the calm sea level. |
| **Loading or respawning while swimming put the hero on the seabed**, the camera under with him. The standing rule ignored the saved height. *(test)* | A swimmer is put back afloat at the saved height, above the bed. |
| **Some 960 m² of dry or trickling carved bed were invisible walls.** The terrain's guess at deep water (a carved bed) fenced them, whatever water was actually there. *(test)* | Once the realm's water is known, a bed with little in it is walked, and one with more is waded or swum. |

## Sound and light

| Fault | Fix |
| --- | --- |
| **Every room floor sounded like grass underfoot**, the player's and everyone else's. The ground height already includes a room's floor, so the outdoor rules beneath decided. *(test)* | Boards in every room, stone in the shrine hall. |
| **The inn's music was quieter inside the inn than from the lane outside.** It was muffled whenever the listener was indoors, which since rooms became walkable includes the inn itself. *(test)* | Heard whole inside the inn; still through walls from anywhere else. |
| **The lighthouse beam popped on and off at dusk and dawn**, and turned at full speed with motion reduced. *(test)* | The cones fade with the light; with motion reduced the beam turns slowly. |
| **Foes a loaded save had already killed were heard to die**, because the sound world remembered them alive. *(test)* | It forgets the actors whenever the world is set from a save. |
| **The sun turned 66° at midnight**, and the night clouds' lit side with it. *(test)* | By night the sun goes on round below the horizon, so the day wraps without a jump. |

## Interactions

| Fault | Fix |
| --- | --- |
| **The arrow trade promised the rank's count with the quiver nearly or wholly full**, then gave fewer or refused. *(test)* | It promises what fits, and is not offered with a full quiver. |
| **The meat sale was offered while a foe was near**, then silently did nothing. | It is not offered then. |
| **The archive key's and the votive reed's remarks were never heard**: rewards went by a path without the remark. | Rewards are remarked on as finds are. |
| **A number key bound to an action also used that quick slot.** With Interact on 1, the hero picked something up and ate the bread in slot 1 at once. *(test)* | A digit bound to an action is that action's alone. |
| **"Shelves of records…" was said walking past the archive's locked door.** | Said once the archive stands open: on finding it open, or as its door opens or its shutter gives. |

## Found sound by the same reads

- **Simulation:** the fixed steps, the physics floors and buoyancy, held cargo, falls and ceilings, and the world's
  edges.
- **Sky and light:** the sky's keys, the moon, lantern and interior lighting, and window glow.
- **Audio:** the volumes and buses, voice caps, the music director, crickets and birds by time and place.
- **Content:** every string key and its placeholders, inspect points, prompts' reach through walls, overlapping
  prompts, pickups after a load, and the journal.

Noted, not changed: dismounting does not check the realm's edge, and can put the rider up to 2.2 m past it, from where
he walks back in.
