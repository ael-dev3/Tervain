# Latest GPU play-gate data

The live build's most recent play-gate run on a GPU machine. It is refreshed after every run, and each run is also
posted on the pinned issue "Live GPU gate data". Profiles: `desktop` is 1280×720 at 1×; `mac` is 1440×900 at 2× (a
Retina window's pixel count, at a 60 Hz cadence). Timing runs record no video; the clips come from a recorded run of the
same build. "Busy" is main-thread time from an animation frame's start to its draw; "idle" is the rest of the frame
interval. Uploads are buffer and texture bytes handed to WebGL. Each slow frame's still shows what was on screen, with
the hero's and camera's world positions.

## Run live-ec2b282: PASS · 0.0.14 · ec2b282

URL https://ael-dev3.github.io/Tervain/

Clean run on a quiet gate machine, timing only (`--video false`). No stall: pause-to-resume and the fence walk show at most one missed refresh. Leads for the slow frames that remain:

- **Bow (desktop):** two frames with 32 ms of main-thread time; this stage is main-thread bound, not only a missed refresh.
- **Inside-window (mac, 2×):** twelve missed refreshes in this stage, several with 22–32 ms of main-thread time. Interiors cost more since the A123 room dressing.
- **Uploads:** about 675–715 MiB of real source bytes in a three-minute run (#337 accounting), up to 13 MiB in one frame. Worth finding what re-uploads every frame.

#### desktop (1280×720 @1×, CPU ÷1)

Frame ms p50 16.7 · p95 17.1 · p99 17.3 · max 33.6; over 25 ms 8, over 50 ms 0; main thread idle 45%.
Uploads 674.0 MiB in play, largest frame 13.1 MiB. Glitched frames: hidden hero 0, broken pose 0, screen jumps 0.
Clip: none

| Phase | Frame ms | Busy ms | Upload |
| --- | ---: | ---: | ---: |
| resume | 33.5 | 8.8 | 0.0 MiB |
| run-fence | 33.5 | 9.9 | 0.1 MiB |
| run-turn | 33.2 | 12.3 | 0.8 MiB |
| run-round | 33.5 | 19.8 | 0.2 MiB |
| bow | 33.6 | 20.2 | 0.1 MiB |
| bow | 33.6 | 32.1 | 0.3 MiB |
| bow | 33.3 | 32.4 | 0.3 MiB |
| bow | 33 | 15.6 | 0.2 MiB |


#### mac (1440×900 @2×, CPU ÷1)

Frame ms p50 16.7 · p95 17.1 · p99 17.3 · max 50.2; over 25 ms 14, over 50 ms 1; main thread idle 43%.
Uploads 714.5 MiB in play, largest frame 13.1 MiB. Glitched frames: hidden hero 0, broken pose 0, screen jumps 0.
Clip: none

| Phase | Frame ms | Busy ms | Upload |
| --- | ---: | ---: | ---: |
| walk-fence | 50.2 | 14.6 | 0.1 MiB |
| run-fence | 33.6 | 8.2 | 0.1 MiB |
| inside-window | 33.4 | 15.5 | 0.2 MiB |
| inside-window | 33.1 | 11.7 | 0.1 MiB |
| inside-window | 33.3 | 11.8 | 0.1 MiB |
| inside-window | 33.3 | 15.9 | 0.1 MiB |
| inside-window | 33.1 | 13.3 | 0.1 MiB |
| inside-window | 33 | 32.4 | 0.1 MiB |
| inside-window | 33.6 | 27.5 | 0.2 MiB |
| inside-window | 33.1 | 18.8 | 0.3 MiB |
| inside-window | 33.1 | 22.2 | 0.8 MiB |
| inside-window | 33.4 | 14.8 | 2.6 MiB |
| inside-window | 33.4 | 23.2 | 0.1 MiB |
| inside-window | 33.4 | 24.8 | 0.1 MiB |

