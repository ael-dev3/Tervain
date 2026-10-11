# Eighth pass of bug scouts (A101, 0.0.13)

The eighth pass read:
- the camera and controls;
- residents' days, the doors and the archive;
- the wildlife and hunting.

Each fault was confirmed against the code. Those marked *(test)* have a test that fails without the fix.

## The archive

| Fault | Fix |
| --- | --- |
| **A sealed archive could trap the player in its doorway.** He counted as out once his centre left the roofed room. That point is still inside the 0.6 m-deep opening, so the door closed on his body and its collision pushed him back in, again and again, with the "sealed" notice each time. *(test)* | He counts as in until his whole body is clear of the door's opening, and of the shutter's. |
| **A load set the archive's door and shutter for where he stood before it.** Loading from outside into a save made inside the sealed archive closed them round him. Loading the reverse way left them open. *(test)* | They are set for where the load puts him, before the world is synced. If he is set down somewhere safer, they follow him there. |

## Residents

| Fault | Fix |
| --- | --- |
| **Pell's rotation night shift began an hour before the quarry's.** From 18:00 to 19:00 he chiselled at a stopped quarry, with no work sound and the mill still turning. *(test)* | His shift has the water's hours: 19:00 to 6:00. |
| **The quarry-at-work scene was set to play under the rotation, where it never could.** It is a daytime scene, and under the rotation the quarry stands still by day while Pell sleeps. *(test)* | It plays only when the quarry has the water by day. |

## Wildlife

| Fault | Fix |
| --- | --- |
| **A wounded animal ran forwards, often straight at the archer, and its herd followed.** The injury fright fled from a point just behind the animal, so it ran along its own facing. An animal that had turned to watch the hunter ran at him. *(test)* | It flees from the shot it already took fright at, or from the hunter. |
| **After a load, animals settled away from where the hunter stood before it**, not from where he arrived. One could be put right beside him. *(test)* | The load passes where he arrives. |

## Controls

| Fault | Fix |
| --- | --- |
| **The map key did nothing while the map's place list had focus.** Only Escape closed the map. *(test)* | The panel's own key still reaches the game from a list. |
| **With block as a toggle, a block press during a blow, a dodge or a flinch was lost.** *(test)* | The press is kept, and the guard comes up once the action ends, as when holding the key. |
| **Two quick D-pad taps in a menu moved focus one row.** *(test)* | Back at rest, the next tap moves at once. Held, it still repeats at its steady pace. |
| **Arrow Up on the title, with nothing focused, skipped the last choice.** | Up starts from the last choice, down from the first. |

## Read and left as they are

- **Block as a toggle does not make aiming the bow a toggle**, though they share a key. Aiming is a separate action; turning it into a toggle would be a new setting, not a fix.
- **A `?fov=` shot parameter is overridden by the camera's own easing unless `cam=` is also given.** This is a capture aid, not part of the game.
- **A face-blend case in the hit zones applies only to the cats, which cannot be hunted.** The per-model test already checks every huntable animal's head shots.

## Found sound by the same reads

- **Look settings:** sensitivity, invert and reduced motion are read live. The camera steps at the fixed rate. Resets on load and respawn hold.
- **Schedules:** each one covers all 24 hours, and midnight wraps correctly. Every bed has one sleeper. Swinging doors carry no collision. Sleepers witness nothing.
- **Hunting:** a kill or a harvest cannot be granted twice. Respawn clocks survive save and load. The saddled deer cannot be hunted. Arrows are swept at a fixed rate.
