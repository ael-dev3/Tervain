# Latest GPU play-gate data

The live build's most recent play-gate run on a GPU machine. It is refreshed after every run, and each run is also
posted on the pinned issue "Live GPU gate data". Profiles: `desktop` is 1280×720 at 1×; `mac` is 1440×900 at 2× (a
Retina window's pixel count, at a 60 Hz cadence). Timing runs record no video; the clips come from a recorded run of the
same build. "Busy" is main-thread time from an animation frame's start to its draw; "idle" is the rest of the frame
interval. Uploads are buffer and texture bytes handed to WebGL. Each slow frame's still shows what was on screen, with
the hero's and camera's world positions.

## Run live-7673e03: PASS · 0.0.14 · 7673e03

URL https://ael-dev3.github.io/Tervain/

Clean rerun on a quiet gate machine (no other build or render running), timing only (`--video false`). The 167–316 ms desktop inside-window stalls of the 5c4a499 run did not recur, so they were most likely CPU contention on the gate machine. Upload totals here still count null render-target allocations; corrected accounting (#337) reaches the live build with #342.

#### desktop (1280×720 @1×, CPU ÷1)

Frame ms p50 16.7 · p95 17.1 · p99 17.3 · max 33.8; over 25 ms 3, over 50 ms 0; main thread idle 40%.
Uploads 796.5 MiB in play, largest frame 9.8 MiB. Glitched frames: hidden hero 0, broken pose 0, screen jumps 0.
Clip: none

| Phase | Frame ms | Busy ms | Upload |
| --- | ---: | ---: | ---: |
| walk-fence | 33.4 | 11.1 | 0.1 MiB |
| walk-fence | 33.4 | 17.3 | 9.8 MiB |
| walk-fence | 33.8 | 14.3 | 0.1 MiB |


#### mac (1440×900 @2×, CPU ÷1)

Frame ms p50 16.7 · p95 17.1 · p99 17.2 · max 33.8; over 25 ms 1, over 50 ms 0; main thread idle 42%.
Uploads 685.3 MiB in play, largest frame 13.0 MiB. Glitched frames: hidden hero 0, broken pose 0, screen jumps 0.
Clip: none

| Phase | Frame ms | Busy ms | Upload |
| --- | ---: | ---: | ---: |
| run-fence | 33.8 | 14.4 | 0.1 MiB |

