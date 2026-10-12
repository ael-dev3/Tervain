# Latest GPU play-gate data

The live build's most recent play-gate run on a GPU machine. It is refreshed after every run, and each run is also
posted on the pinned issue "Live GPU gate data". Profiles: `desktop` is 1280×720 at 1×; `mac` is 1440×900 at 2× (a
Retina window's pixel count, at a 60 Hz cadence). Timing runs record no video; the clips come from a recorded run of the
same build. "Busy" is main-thread time from an animation frame's start to its draw; "idle" is the rest of the frame
interval. Uploads are buffer and texture bytes handed to WebGL. Each slow frame's still shows what was on screen, with
the hero's and camera's world positions.

## Run live-d692526 (2026-10-12): PASS · 0.0.14 · d692526

URL https://ael-dev3.github.io/Tervain/

#### desktop (1280×720 @1×, CPU ÷1)

Clip (recorded run): [clip](https://raw.githubusercontent.com/ael-dev3/Tervain/2226428c5862496bfb65a28f5653bf2a68b0e557/live-d692526/live-d692526-clip-desktop/clip.mp4)

Frame ms p50 16.7 · p95 17.1 · p99 17.2 · max 17.3; over 25 ms 0, over 50 ms 0; main thread idle 40%.
Uploads 797.6 MiB in play, largest frame 13.0 MiB. Glitched frames: hidden hero 0, broken pose 0, screen jumps 0.



#### mac (1440×900 @2×, CPU ÷1)

Clip (recorded run): [clip](https://raw.githubusercontent.com/ael-dev3/Tervain/2226428c5862496bfb65a28f5653bf2a68b0e557/live-d692526/live-d692526-clip-mac/clip.mp4)

Frame ms p50 16.7 · p95 17.1 · p99 17.3 · max 33.6; over 25 ms 7, over 50 ms 0; main thread idle 40%.
Uploads 778.6 MiB in play, largest frame 42.2 MiB. Glitched frames: hidden hero 0, broken pose 0, screen jumps 0.


| Phase | Frame ms | Busy ms | Upload |
| --- | ---: | ---: | ---: |
| resume | 33.5 | 15.5 | 0.2 MiB |
| resume | 33.1 | 11.1 | 0.1 MiB |
| resume | 33.3 | 9.8 | 0.0 MiB |
| resume | 33.4 | 10.3 | 0.1 MiB |
| run-fence | 33.3 | 25.2 | 0.2 MiB |
| run-fence | 33.3 | 16.2 | 0.2 MiB |
| run-turn | 33.6 | 18.8 | 0.2 MiB |

- resume, 33.5 ms, hero (-268, 27), camera (-273.7, 3.9, 25.6): [still](https://raw.githubusercontent.com/ael-dev3/Tervain/2226428c5862496bfb65a28f5653bf2a68b0e557/live-d692526/live-d692526-mac/spike-1.jpg)
- resume, 33.1 ms, hero (-268, 27), camera (-273.7, 3.9, 25.6): [still](https://raw.githubusercontent.com/ael-dev3/Tervain/2226428c5862496bfb65a28f5653bf2a68b0e557/live-d692526/live-d692526-mac/spike-2.jpg)
- resume, 33.3 ms, hero (-268, 27), camera (-273.7, 3.9, 25.6): [still](https://raw.githubusercontent.com/ael-dev3/Tervain/2226428c5862496bfb65a28f5653bf2a68b0e557/live-d692526/live-d692526-mac/spike-3.jpg)
- resume, 33.4 ms, hero (-268, 27), camera (-273.7, 3.9, 25.6): [still](https://raw.githubusercontent.com/ael-dev3/Tervain/2226428c5862496bfb65a28f5653bf2a68b0e557/live-d692526/live-d692526-mac/spike-4.jpg)
- run-fence, 33.3 ms, hero (-11.8, 51.4), camera (-8.6, 4.9, 47.8): [still](https://raw.githubusercontent.com/ael-dev3/Tervain/2226428c5862496bfb65a28f5653bf2a68b0e557/live-d692526/live-d692526-mac/spike-5.jpg)
- run-fence, 33.3 ms, hero (-12.2, 51.8), camera (-8.9, 4.9, 48): [still](https://raw.githubusercontent.com/ael-dev3/Tervain/2226428c5862496bfb65a28f5653bf2a68b0e557/live-d692526/live-d692526-mac/spike-6.jpg)
- run-turn, 33.6 ms, hero (-13.2, 53.1), camera (-10.9, 5.1, 48.2): [still](https://raw.githubusercontent.com/ael-dev3/Tervain/2226428c5862496bfb65a28f5653bf2a68b0e557/live-d692526/live-d692526-mac/spike-7.jpg)

