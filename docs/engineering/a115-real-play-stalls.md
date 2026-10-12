# The last real-play stalls (A115, 0.0.13)

After A114 the play gate still failed the Mac profile: single frames of 160 to 220 ms while walking and running. A CPU
profile of the gate's route traced them to work done in one go during play:

- **Seat measurement while a resident's rig is built.** The rig is built a step at a time against a 3 ms frame budget,
  but one step measured a seat over a whole posed body, 10 to 25 ms. It now yields every 256 vertices.
- **Synchronous shader checks.** When a material is first drawn, three asks for the new program's link status and log,
  and the browser has to finish compiling before it can answer. Production builds skip the check. Development builds
  keep it, with its error logs. The game's own shader patch checks do not depend on it.
- **Wildlife arriving after the world opened** fitted, cloned and prepared all nineteen animals at once. #277 spreads
  that across frames, and #279 shares the arrivals' 3 ms budget across figures.

## Measured

Play gate, video off, on a preview of `main` with #275, #276, #277, #279 and this change (commit `9eaa004`):

| Profile | Median | p95 | Frames over 25 ms | Over 50 ms | Long tasks |
| --- | ---: | ---: | ---: | ---: | ---: |
| desktop 1× | 16.6 ms | 17.1 ms | 1.2% | 0 | 0 |
| mac 2× | 16.6 ms | 17.1 ms | 0.1% | 0 | 0 |

Before this change, the same route on the Mac profile had frames of up to 217 ms and long tasks of up to 171 ms.
