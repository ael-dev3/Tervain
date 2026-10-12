# The play gate

Unit tests and the benchmark laps passed while the hosted build flickered and stuttered in real play. The play gate
plays the game the way a player does and fails on what a player would see. No change counts as done until the gate
passes on the live build.

    npm run play-gate                     # live build, checked against main, both profiles
    npm run play-gate -- --url http://127.0.0.1:4173/ --against head   # a local preview of the checked-out commit

## A required check

Hosted runners have no GPU, so the gate runs on a machine that has one. For a pull request, build and preview its
head, run `npm run play-gate -- --url http://127.0.0.1:4173/ --against head`, and paste the summary into the pull
request (description or a comment). A passing run ends with `play-gate: PASS <commit>`. The **Play gate** workflow
looks for that line for the current head commit and sets the `play-gate` status, which branch protection on `main`
requires. Every new push to the pull request needs a new run. After the merge, run the gate on the live build
(`npm run play-gate`) once the deploy lands.

## A required check

Hosted runners have no GPU, so the gate runs on a machine that has one. For a pull request, build and preview its
head, run `npm run play-gate -- --url http://127.0.0.1:4173/ --against head`, and paste the summary into the pull
request (description or a comment). A passing run ends with `play-gate: PASS <commit>`. The **Play gate** workflow
looks for that line for the current head commit and sets the `play-gate` status, which branch protection on `main`
requires. Every new push to the pull request needs a new run. After the merge, run the gate on the live build
(`npm run play-gate`) once the deploy lands.

Run it on an otherwise idle machine with a visible Chrome window: other work running alongside skews frame times.

## What it does

1. **Stale build check.** The hosted build's `version.json` must name the commit on `main`, and the title screen must
   print it. A stale deploy or a page the browser kept from before fails before anything is played.
2. **Real play with real input** (key and mouse events through the browser): New journey from the title menu, pause
   and resume, walk then run along the fence and around the house turning the camera, inside a house looking out of the
   window, then aim and loose the bow twice. Only placing the hero at the start of each stage is scripted.
3. **Every presented frame** records its vsync-aligned time, whether the hero is drawn, the camera distance, the
   hero's pose (root upright, head height above the root), where his hips land on screen and the drawing pixel ratio.
   Long tasks and console errors are collected, and the screen is recorded to `clip.mp4` (`--video false` skips it).

## What fails it

| Check | Limit |
| --- | --- |
| Hero hidden while the camera is clear of him | any frame |
| Hero visibility flipping | more than 4 flips within one second |
| Hero pose broken (root tilted, head under 0.8 m above the root) | any frame, except swimming |
| Hero jumping across the screen between frames | any frame within a stage |
| 95th-percentile frame | over 20 ms |
| Frames over 50 ms | more than 2, or any over 100 ms |
| Frames over 25 ms (a missed refresh) | more than 3% |
| Long tasks in play | more than 3, or any over 100 ms |
| Console errors or exceptions | any |

## Profiles

- `desktop`: a 1280×720 window at 1×.
- `mac`: a MacBook's 1440×900 window at 2× (the Retina pixel count). The test machine's GPU is much faster than an
  Apple laptop's, so this profile shows the cost of Retina resolution, not an Apple GPU. The game's dynamic resolution
  covers a weaker GPU. `--mac-cpu 2` adds a main thread slowed by half as a stress case.

Each run writes `<out>/<tag>.md` and `<tag>.json`, and a folder per profile with `clip.mp4` and the per-frame samples.
