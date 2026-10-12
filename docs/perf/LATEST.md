# Latest GPU play-gate data

The live build's most recent play-gate run on a GPU machine. It is refreshed after every run, and each run is also
posted on the pinned issue "Live GPU gate data". Profiles: `desktop` is 1280×720 at 1×; `mac` is 1440×900 at 2× (a
Retina window's pixel count, at a 60 Hz cadence). Timing runs record no video; the clips come from a recorded run of the
same build. "Busy" is main-thread time from an animation frame's start to its draw; "idle" is the rest of the frame
interval. Uploads are buffer and texture bytes handed to WebGL. Each slow frame's still shows what was on screen, with
the hero's and camera's world positions.

## Run live-035a44c: PASS · 0.0.14 · 035a44c

URL https://ael-dev3.github.io/Tervain/

Clean run on a quiet gate machine, timing only (`--video false`), on the live build with #332, #336, #337 and #338. No stall: the 167–316 ms desktop frames of the 5c4a499 run, the pause-to-resume and the fence-walk stalls did not appear. The frames over 25 ms are single missed refreshes (about 33 ms; one 49.6 ms in run-fence) whose main-thread time was under 25 ms. Upload totals now count only real source bytes (#337).

#### desktop (1280×720 @1×, CPU ÷1)

Frame ms p50 16.7 · p95 17.1 · p99 17.2 · max 49.6; over 25 ms 9, over 50 ms 0; main thread idle 42%.
Uploads 752.1 MiB in play, largest frame 13.1 MiB. Glitched frames: hidden hero 0, broken pose 0, screen jumps 0.
Clip: none

| Phase | Frame ms | Busy ms | Upload |
| --- | ---: | ---: | ---: |
| walk-fence | 33.6 | 13.7 | 0.1 MiB |
| run-fence | 49.6 | 17.1 | 0.1 MiB |
| run-fence | 33.4 | 14.9 | 0.1 MiB |
| run-fence | 33.7 | 11.7 | 0.1 MiB |
| run-fence | 33.6 | 11.9 | 0.1 MiB |
| run-turn | 33.4 | 9.7 | 0.8 MiB |
| run-round | 33.4 | 24.6 | 1.5 MiB |
| run-round | 33.2 | 23.9 | 0.2 MiB |
| run-round | 33.5 | 19.1 | 0.2 MiB |


#### mac (1440×900 @2×, CPU ÷1)

Frame ms p50 16.7 · p95 17.1 · p99 17.2 · max 33.5; over 25 ms 2, over 50 ms 0; main thread idle 38%.
Uploads 729.2 MiB in play, largest frame 13.0 MiB. Glitched frames: hidden hero 0, broken pose 0, screen jumps 0.
Clip: none

| Phase | Frame ms | Busy ms | Upload |
| --- | ---: | ---: | ---: |
| resume | 33.1 | 13.1 | 0.7 MiB |
| walk-fence | 33.5 | 12.7 | 0.1 MiB |

