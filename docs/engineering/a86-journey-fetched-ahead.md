# The journey's files fetched from the menu (A86, 0.0.13)

The last open handover item was staged loading of the near tree files: open the world on the middle models and swap
the near ones in as they arrive. Before building it, the wait it was meant to shorten was measured on a 20 Mbit/s link
(Medium, served build, cache off).

| From New journey to the world | Time |
| --- | ---: |
| Clicked at once | 43–47 s |
| After 30 s in the menu | 35 s |

The handover thought the trees were fetched while the menu was open. They were not: all 26.5 MiB of them were asked
for only after the click, and finished 20 s later. The whole journey downloads 56 MiB.

## Change

While the title menu is up and idle, the journey's largest files are fetched into the content cache (A68's Cache
Storage, by hash), one at a time, without being read (`warmJourney`, `warmContentCache`):
- **Order:** the wanderer's model, every tree's near file, then their middle and far files, then the conifers and the
  rock pile.
- **Skipped:** files already cached.
- **Stopping:** as soon as a journey begins. A file still downloading at that moment is shared with the journey's own
  request (`downloadAsset` asks once for a file of known hash at one address), never fetched twice.
- **Save Data:** nothing is fetched when the browser asks to save data.
- **Unchanged:** nothing is parsed or drawn, and no model file changed.

## Measured

Same link, served build:

| From New journey to the world | Before | After |
| --- | ---: | ---: |
| After 30 s in the menu | 35 s | 20 s |
| After 60 s in the menu | 35 s | 20 s |
| Clicked at once | 43–47 s | 43–47 s (unchanged) |

## The near-model swap, not built

Opening on the middle models and swapping the near ones in would shorten the wait only for a click made before the
files arrive. On High it is not possible without a visible swap, since there the near model is drawn at every distance.
It would also need re-exported middle files with their own images, plus a manifest of each tree's measurements. With
the menu now fetching the files, it is left undone; the notes under "Staged loading" in the handover still apply.
