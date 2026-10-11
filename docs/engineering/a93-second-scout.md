# Second pass of bug scouts (A93, 0.0.13)

A second pass reread the code that changed most in 0.0.13:
- the residents, the bandits, the rooms and the deer;
- the input, the panels, mode changes and the saved settings.

Each fault was confirmed against the code. Those marked *(test)* have a test that fails without the fix. Both bandit
fixes were also checked in the served build on the GPU.

## The world

| Fault | Fix |
| --- | --- |
| **A graphics change could lock the player inside the archive.** Inside a reported archive, the rebuilt world closed the door and shutter, not knowing anyone was in. Only loading a save got them out. | A new world learns who is in the archive before it closes anything. |
| **A bandit whose model arrived while play was held** (a panel open) appeared at the world's origin, in its bind pose, until play resumed. *(test)* | The model is set at their post, and shown once it is posed there. |
| **A resident whose model arrived late sat down from inside the bench** for the rest of that part of their day. Their spot had been measured on the stand-in, which knows no seat approach. | Their spot is measured again with their own model. Someone already there is put at the right spot (unseen until now); someone on the way heads for it. |
| **A graphics change while riding threw the rider off**, and the deer walked home once the animals arrived. | The rider steps down and is put back in the saddle when the deer arrives, as after loading a save. |

## Input and settings

| Fault | Fix |
| --- | --- |
| **Where the browser refuses pointer lock** (an embedding page without the permission, or the pause after Escape), every click went to asking for the lock. Attack and block by mouse never worked, and each respawn opened the pause menu. *(test)* | A refusal is noted. Clicks then play as clicks, with drag-to-look; the lock is still asked for, and taken when given. Respawn no longer pauses for it. |
| **Settings saved before a newer action existed could bind one key to two actions.** For example, a player who had put Interact on V got Skin on V as well, with no conflict shown. *(test)* | A newer action takes only those of its default keys that the player has not given to another action. |
| **Tab to close the journal could carry focus out of the page**, leaving the journal open with the key lost. *(test)* | The key no longer moves focus, and still closes the journal. |
| **Clicking a quick slot on the hotbar gave it keyboard focus**, so Space and Enter pressed the slot again (another poultice eaten) instead of jumping or striking. | A click on a world hotbar slot no longer takes focus. Tab still reaches the slots. |

## Not changed

- **The quarry hand's night rotation starts at seven**, an hour after their day's work ends at six. They walk to the
  bunks for that hour and back. That may be a shift change written that way on purpose, so it is left as it is.

## Found sound by the same reads

- **Arrivals:** clearing on rebuild, failed builds and adoptions, and furniture or animals arriving after the world is gone.
- **Rooms:** step surfaces, rooms, doorways, hearths, door swings and indoor light.
- **Schedules:** the hour sums, midnight wrap, and partial overrides.
- **Enemies:** reset on respawn and load.
- **Animals:** riding and releasing, arrows sparing the mount, and hunting state across loads.
- **Input:** held keys across panels and blur, chords, rebinding, and the gamepad.
- **Mode changes:** quickload in play, quitting to the title, death and respawn, and a world build paused and finished.
- **Saves:** writing, verifying and keeping the previous copy, recovering, refusing a newer version, and validating what
  is restored.
- **Settings:** clamping, live application, and reset to defaults.
- **Panels:** the focus trap, arrow navigation, the panel stack, quick-drag cleanup, and the map's pointer capture.
