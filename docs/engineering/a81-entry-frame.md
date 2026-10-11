# The frozen first frame of a journey (A81, 0.0.13)

A80 measured the first minute from the benchmark's own start, which runs the world for a while before it is timed. A
journey begun from the menu (New journey, or a loaded save) was not covered. Measured that way, in the served build
(RTX 3080 Ti, High, 1920×1080), the first frame after the loading screen lifted took 0.88 s, every time.

## Causes, and what changed

| Cause | Change |
| --- | --- |
| **First updates.** The wanderer's, the bandits' and the residents' first updates paid their one-time costs (first calls, first poses) in the first frame: about 0.4 s. The first full picture added 0.16 s. | The journey's first step and picture are taken as soon as it is entered, before the page next paints, so the loading screen still covers them (`firstFrameUnderCurtain`). |
| **Catch-up after the first paints.** The page's first paints after the loading screen are slow, and the next frame ran nine catch-up steps for that time. | The frame clock counts the three frames after the loading screen as one step at most (`FrameClock.reset(settle)`): that time is the page's, not the world's. |
| **The grass field's passes on first use.** The grass trample field's shift and step passes were first drawn in play: the shift only once the wanderer had walked some metres, stalling that frame by 0.1–0.2 s. Compiling them early was not enough, because most of the cost is the driver's work on a program's first draw. | The grass field's and the water ripples' passes are each drawn once before the world opens (`World.warmPasses`); both fields are cleared before their first real step. |

## Measured

From the menu's New journey to 10 s after the loading screen lifts, served build:

| | First frame after the loading screen | Frames over 50 ms |
| --- | ---: | ---: |
| Before (A80 follow-up) | 881–883 ms | 2–3 |
| A81, four sessions | 27–127 ms | 0–2 |

The few frames of about 50 ms left follow pauses outside the game's frame, most likely the main-thread loading of
what arrives after the world opens.

## Playtest visuals, checked again

The four faults from the owner's playtest (A79) were captured again in the served build at the same camera views,
next to the build from before A79:

- **Grass:** fixed. Blades near the eye are narrow, with no wide ribbons.
- **Branch ribbons:** fixed. No stretched strips are left.
- **Window views:** fixed. From inside a house, the windows are real openings onto the world.
- **Crowns from the ground:** fine.
- **Crowns from inside** (the camera among the branches) **are still coarse.** About 8,000 triangles of wood per tree
  shows as flat facets at arm's length. Recomputing the wood's normals from the simplified shape made no visible
  difference, so the shading is not the cause. A finer branch mesh does not fit within the 20,000-triangle tree budget.

No Meshy credits spent.
