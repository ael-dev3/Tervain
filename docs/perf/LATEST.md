# Latest GPU play-gate data

The live build's most recent play-gate run on a GPU machine. It is refreshed after every run, and each run is also
posted on the pinned issue "Live GPU gate data". Profiles: `desktop` is 1280×720 at 1×; `mac` is 1440×900 at 2× (a
Retina window's pixel count, at a 60 Hz cadence). Timing runs record no video; the clips come from a recorded run of the
same build. "Busy" is main-thread time from an animation frame's start to its draw; "idle" is the rest of the frame
interval. Uploads are buffer and texture bytes handed to WebGL. Each slow frame's still shows what was on screen, with
the hero's and camera's world positions.

## Run live16: PASS · 0.0.16 · 9ab40b3

URL https://ael-dev3.github.io/Tervain/

Clean run on a quiet gate machine. The bow stage no longer stalls on the first loosed arrow (its program was linked in that frame); every stage holds a 16.7 ms median on both profiles.

#### desktop (1280×720 @1×, CPU ÷1)

Frame ms p50 16.7 · p95 17.1 · p99 17.3 · max 33.6; over 25 ms 9, over 50 ms 0; main thread idle 34%.
Uploads 645.1 MiB in play, largest frame 13.0 MiB. Glitched frames: hidden hero 0, broken pose 0, screen jumps 0.
Clip: none

| Phase | Frame ms | Busy ms | Upload |
| --- | ---: | ---: | ---: |
| walk-fence | 33.6 | 14.2 | 0.0 MiB |
| walk-fence | 33.3 | 19 | 0.0 MiB |
| walk-fence | 33.3 | 15 | 0.0 MiB |
| walk-fence | 33 | 15.1 | 0.0 MiB |
| walk-fence | 32.9 | 17.6 | 0.7 MiB |
| walk-fence | 33.3 | 15.2 | 9.0 MiB |
| run-round | 33.4 | 13.2 | 0.1 MiB |
| bow | 33.3 | 19.4 | 0.1 MiB |
| bow | 33.2 | 20.9 | 0.2 MiB |

- walk-fence, 33.6 ms, hero (-2, 39.5), camera (-2, 4.9, 45.4)
- walk-fence, 33.3 ms, hero (-2, 39.3), camera (-2, 4.8, 45.2)
- walk-fence, 33.3 ms, hero (-2, 39.2), camera (-2, 4.8, 45.1)
- walk-fence, 33 ms, hero (-2, 39), camera (-2, 4.8, 44.9)
- walk-fence, 32.9 ms, hero (-2, 35.3), camera (-2, 4.6, 41.2)
- walk-fence, 33.3 ms, hero (-2, 34.8), camera (-2, 4.6, 40.8)
- run-round, 33.4 ms, hero (-12.3, 44.8), camera (-11.3, 4.2, 45.3)
- bow, 33.3 ms, hero (-4, 46), camera (-1.5, 4.1, 45.1)

#### mac (1440×900 @2×, CPU ÷1)

Frame ms p50 16.7 · p95 17.1 · p99 17.2 · max 33.5; over 25 ms 2, over 50 ms 0; main thread idle 30%.
Uploads 569.8 MiB in play, largest frame 9.2 MiB. Glitched frames: hidden hero 0, broken pose 0, screen jumps 0.
Clip: none

| Phase | Frame ms | Busy ms | Upload |
| --- | ---: | ---: | ---: |
| resume | 33.4 | 12.9 | 1.0 MiB |
| walk-fence | 33.5 | 20.9 | 0.0 MiB |

- resume, 33.4 ms, hero (-268, 27), camera (-273.7, 3.9, 25.6)
- walk-fence, 33.5 ms, hero (-2, 34.6), camera (-2, 4.5, 40.5)
