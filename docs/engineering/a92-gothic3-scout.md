# Sixth bug scout: the Gothic 3 study pages (A92, 0.0.13)

The last two reads covered the study pages, which the earlier scouts had not:
- the local viewer, which reads the visitor's own installation;
- the reconstruction, which plays the game's own dialogue and quest rules.

Each fault was confirmed against the code. Those marked *(test)* have a test that fails without the fix. The tests use
small synthetic files only, never game data.

## The local viewer

| Fault | Fix |
| --- | --- |
| **An image header with an absurd size or level count** (from a damaged file) was trusted. That could mean a gigabyte allocation, or a short image read as black. *(test)* | Sizes outside 1 to 16384, level counts beyond the image's own size, and data short of a whole image are refused. |
| **An image that could not become a texture failed the whole load**, not just its own surface. *(test)* | It counts as missing, and the surface takes the neutral texture. |
| **An archive entry reaching past the end of its file was read short without complaint**, and a stored entry's size was never checked against its table. *(test)* | Both are errors, and the entry is skipped like any other unreadable one. |
| **One unreadable tree species stopped the trees from planting**, because its file and textures were read outside the guard. | That species is skipped, and the rest grow. |
| **A failed load kept its renderer and everything it had drawn**, so a second try ran beside a dead world. | A failed load frees what it had put on the GPU first. |
| **A folder that could no longer be read** (moved, or permission withdrawn) gave no message, and the page sat idle. | The page says what went wrong, including when permission was not given. |
| **A refused pointer lock** (a click too soon after Escape) left an unhandled error in the console. | It is ignored, and the next click asks again. |

## The reconstruction

| Fault | Fix |
| --- | --- |
| **A delivery whose quest completion could not be applied still counted**, so each retry added progress unseen. *(test)* | A delivery that cannot complete leaves the counter as it was. |
| **The check just before a dialogue starts looked at each command alone.** Planning had weighed each command after the ones before it, so experience awards added up toward a level. A change between planning and starting could pass a run that stops part-way. *(test)* | The recheck weighs each command with the ones before it, as planning does. |

## Not changed, pending evidence

- **The "highest quality" stack search starts from zero**, so a stack of negative quality is never chosen. This
  has no effect today, since nothing in the reconstruction asks for the highest quality. The starting value stays as
  written until the original code settles it.
- **A delivery dialogue whose first command is a Description might skip its delivery.** No such dialogue is known, and
  what the original does there is unproven.

## Found sound by the same reads

- **World clock:** rounding, day and year carry, and the times of day.
- **Interaction rules:** pickpocketing, fist fights, the hero's attack phases, and combat and experience formulas.
- **Dialogue:** roles, availability, secondary characters, and going back.
- **Quests:** status changes, kill and area objectives, prerequisites, and save and restore.
- **Navigation:** zones, paths and the grid.
- **Low-level helpers:** text encoding and case tables, hashes, inventory stacks and hotkeys.
