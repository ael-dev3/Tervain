# Real-play lag: posing, scene walks and resolution (A114, 0.0.13)

The benchmark laps held 60 frames a second while real play stuttered. The play gate (see [play gate](play-gate.md))
now measures real play, and a CPU profile of a run along the fence on the GPU showed where the frame went. The main
thread was idle only 8% of the time, so a Mac with less headroom missed frames.

| Share of main-thread time | Before |
| --- | ---: |
| Drawing (all passes) | 44% |
| Water reflection | 12% |
| Posing every resident every step | 13% (resident updates 10%) |
| Matrix updates (the scene walked before each pass) | about 10% |
| Building a resident's rig mid-play | 10% when one arrives |

## Changes

- **Residents are posed by distance and view.** Within 30 m they are posed every step, from 30 to 60 m every other
  step, beyond 60 m every fourth, and off screen eight times a second. Shadows still move. Distance walked and turn
  carry over to the next pose, and the gait phase is a running total, so a later pose is still in step.
- **One walk of the scene graph per frame.** A frame draws the world several times (reflection, water depth, the
  picture, light probes), and three updated every matrix before each pass. The world's matrices are now updated once
  after objects are placed, and the passes reuse them.
- **Dynamic resolution.** A preset's pixel ratio is now a ceiling. On a Retina MacBook, High drew four times the
  pixels of a 1× screen. The drawing resolution now steps down by 15% while more than a tenth of recent frames miss
  60 Hz, and back up by 10% after ten steady seconds. It never goes below one drawn pixel per point on a Retina screen,
  or 0.75 on an ordinary one. It runs in play only (not menus, benchmarks or captures), and Settings can turn it off.

## Measured

CPU profile on the same route: main-thread idle went from 8% to 43%. Resident updates fell from 10% to 1.5%, posing
from 13% to 5%, and matrix updates from about 10% to 3%.

Play gate on served builds, measured without video:

| Profile | Build | Median | p95 | Frames over 25 ms | Long tasks |
| --- | --- | ---: | ---: | ---: | ---: |
| mac (2×), CPU ÷2 stress | A113 only | 68.1 ms | 126.9 ms | 100% | 368 |
| mac (2×), CPU ÷2 stress | A114 | 33.2 ms | 66.6 ms | 64.7% | 78 |
| mac (2×), CPU ÷1 | A114 | 16.7 ms | 17.1 ms | 0.1% | 0 |

Under the stress case, dynamic resolution went down to 1× and the frame was then held by the slowed main thread. The
test machine's GPU cannot stand in for an Apple laptop's, so a weaker GPU is left to dynamic resolution, which steps
down when frames are missed for any reason.
