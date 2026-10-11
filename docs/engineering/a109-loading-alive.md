# The loading screen keeps moving; the playtest fixes checked again (A109, 0.0.13)

## The loading screen through the build's heaviest steps

After A108 a journey still builds a few large pieces in one go: the trees (about 1.7 s), the physical contacts (about
1.5 s), and the sky and water (about 1 s). While they run, the page cannot draw, and the loading screen stood still.
Splitting them would not shorten the wait.

**Change.** A sheen crosses the loading bar's stage under way. It is a transform animation, which the browser's
compositor runs on its own thread, so it keeps moving while the page is busy. It is off under reduced motion.

**Measured** with a Chrome trace of the first 16 s after New journey, in a served build on the GPU, counting the
frames the compositor presented (swaps):

| | Sheen hidden | Sheen shown |
| --- | ---: | ---: |
| Longest gap between presented frames | 2.45 s | 0.41 s |
| Gaps over 150 ms | 11 | 2 |
| Frames presented during the 1.7 s tree step | 10 | 322 |

## The playtest-2 fixes, checked again on today's build

All 23 of ael's playtest-2 camera angles were captured again on the GPU in served builds: main before A79 (`f2305b5`)
against main after A108 (`ab20dbe`), High at 11:00. One sheet each:
- **the tree crowns:** near and inside crowns no longer read as black blotches;
- **the leaf strips:** the dark stretched strips are gone;
- **the grass:** no oversized or floating blades, and none standing through the field (picket) fences;
- **the windows from inside and out:** the panes show the real outside through the openings, not a smeared painted sky,
  and read as glazed from outside;
- **the palisade.**

Every fix holds on today's build.
