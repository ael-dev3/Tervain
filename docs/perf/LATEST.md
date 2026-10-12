# Latest GPU play-gate data

The live build's most recent play-gate run on a GPU machine. It is refreshed after every run, and each run is also
posted on the pinned issue "Live GPU gate data". Profiles: `desktop` is 1280×720 at 1×; `mac` is 1440×900 at 2× (a
Retina window's pixel count, at a 60 Hz cadence). Timing runs record no video; the clips come from a recorded run of the
same build. "Busy" is main-thread time from an animation frame's start to its draw; "idle" is the rest of the frame
interval. Uploads are buffer and texture bytes handed to WebGL. Each slow frame's still shows what was on screen, with
the hero's and camera's world positions.

## Run live-5c4a499: FAIL · 0.0.14 · 5c4a499

URL https://ael-dev3.github.io/Tervain/

Note: during the desktop profile's inside-window stage another build and render ran on the gate machine; its 167–316 ms frames (main-thread time longer than the frame) may be that contention. A clean rerun follows before it is treated as a regression. The mac profile ran clean.

#### desktop (1280×720 @1×, CPU ÷1) — 4 frames over 50 ms (longest 316 ms); 8 long tasks in play (longest 367 ms)

Clip (recorded run): [clip](https://raw.githubusercontent.com/ael-dev3/Tervain/a582ce8884dec910c6dd7108c8a99155eb1ba674/live-5c4a499/live-5c4a499-clip-desktop/clip.mp4)

Frame ms p50 16.7 · p95 17.1 · p99 17.4 · max 316.4; over 25 ms 10, over 50 ms 4; main thread idle 52%.
Uploads 238.9 MiB in play, largest frame 5.6 MiB. Glitched frames: hidden hero 0, broken pose 0, screen jumps 0.


| Phase | Frame ms | Busy ms | Upload |
| --- | ---: | ---: | ---: |
| run-fence | 99.7 | 28.8 | 0.1 MiB |
| run-fence | 33.5 | 12.3 | 0.1 MiB |
| inside-window | 33.3 | 39 | 0.1 MiB |
| inside-window | 33.7 | 52.8 | 0.1 MiB |
| inside-window | 216.2 | 355.8 | 0.3 MiB |
| inside-window | 166.9 | 121.8 | 0.3 MiB |
| inside-window | 316.4 | 43.3 | 0.4 MiB |
| inside-window | 34 | 13.9 | 0.2 MiB |
| inside-window | 33.1 | 14.9 | 1.1 MiB |
| bow | 33.4 | 16.3 | 0.1 MiB |

- run-fence, 99.7 ms, hero (-2.1, 37.3), camera (-0.7, 3.5, 35.6): [still](https://raw.githubusercontent.com/ael-dev3/Tervain/a582ce8884dec910c6dd7108c8a99155eb1ba674/live-5c4a499/live-5c4a499-desktop/spike-1.jpg)
- run-fence, 33.5 ms, hero (-7.6, 45.8), camera (-4, 5.4, 41.4): [still](https://raw.githubusercontent.com/ael-dev3/Tervain/a582ce8884dec910c6dd7108c8a99155eb1ba674/live-5c4a499/live-5c4a499-desktop/spike-2.jpg)
- inside-window, 33.3 ms, hero (-5.2, -4), camera (-4.3, 3.7, -6): [still](https://raw.githubusercontent.com/ael-dev3/Tervain/a582ce8884dec910c6dd7108c8a99155eb1ba674/live-5c4a499/live-5c4a499-desktop/spike-3.jpg)
- inside-window, 33.7 ms, hero (-5.2, -4), camera (-4, 3.7, -5.9): [still](https://raw.githubusercontent.com/ael-dev3/Tervain/a582ce8884dec910c6dd7108c8a99155eb1ba674/live-5c4a499/live-5c4a499-desktop/spike-4.jpg)
- inside-window, 216.2 ms, hero (-5.2, -4), camera (-3.2, 3.8, -5.4): [still](https://raw.githubusercontent.com/ael-dev3/Tervain/a582ce8884dec910c6dd7108c8a99155eb1ba674/live-5c4a499/live-5c4a499-desktop/spike-5.jpg)
- inside-window, 166.9 ms, hero (-5.2, -4), camera (-2.9, 3.8, -4.1): [still](https://raw.githubusercontent.com/ael-dev3/Tervain/a582ce8884dec910c6dd7108c8a99155eb1ba674/live-5c4a499/live-5c4a499-desktop/spike-6.jpg)
- inside-window, 316.4 ms, hero (-5.2, -4), camera (-4.8, 3.2, -3.8): [still](https://raw.githubusercontent.com/ael-dev3/Tervain/a582ce8884dec910c6dd7108c8a99155eb1ba674/live-5c4a499/live-5c4a499-desktop/spike-7.jpg)
- inside-window, 34 ms, hero (-5.2, -4), camera (-4.9, 3.2, -3.7): [still](https://raw.githubusercontent.com/ael-dev3/Tervain/a582ce8884dec910c6dd7108c8a99155eb1ba674/live-5c4a499/live-5c4a499-desktop/spike-8.jpg)

#### mac (1440×900 @2×, CPU ÷1)

Clip (recorded run): [clip](https://raw.githubusercontent.com/ael-dev3/Tervain/a582ce8884dec910c6dd7108c8a99155eb1ba674/live-5c4a499/live-5c4a499-clip-mac/clip.mp4)

Frame ms p50 16.7 · p95 17.1 · p99 17.3 · max 33.5; over 25 ms 1, over 50 ms 0; main thread idle 59%.
Uploads 310.5 MiB in play, largest frame 42.1 MiB. Glitched frames: hidden hero 0, broken pose 0, screen jumps 0.


| Phase | Frame ms | Busy ms | Upload |
| --- | ---: | ---: | ---: |
| inside-window | 33.5 | 10.1 | 4.1 MiB |

- inside-window, 33.5 ms, hero (-5.2, -4), camera (-3, 3.8, -5): [still](https://raw.githubusercontent.com/ael-dev3/Tervain/a582ce8884dec910c6dd7108c8a99155eb1ba674/live-5c4a499/live-5c4a499-mac/spike-1.jpg)
