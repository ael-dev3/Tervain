# Controlled full-path night stream crossing

This receipt compares published 0.0.18 · 421d34b with the existing preparation fixes, at 22:45 on the high preset. It is a controlled village-stream crossing, not a claim to reconstruct the uploaded video's exact route or preset.

The player walks with trusted forward-key input from (-28, 40), east across the village stream. The run keeps the native simulation, physics, water reflections and post-processing. Seed 1729, 300 fixed 1/60-second steps, one native render every ten steps, 320×180 at 1×. The inspection clip is therefore 6 fps; it is not a presented 60 Hz performance receipt. Capture readbacks invalidate timing comparisons.

The baseline walks 8.13 m, starts and ends dry, and records seven wet samples with maximum depth 8.35 cm. There are no new `linkProgram` calls in any sampled interval. In the wet section the largest source upload is 309,580 bytes. This does not rule out driver-side first-use work or other routes.

The derived comparison build combines the public runtime commits from #470, #473, #476, #477, #478 and #480. The source recipe and hashes identify the exact candidate; results cannot be attributed to any one PR alone. The combined candidate passes 81 transition/preparation/graphics tests and its production build.

Before and after must agree on route, camera position and quaternion, water depth, preset, dimensions, input cadence and audio state. Both must start dry, enter water and finish dry. Blank or missing captures are invalid.

## Result: matched reproduction, not a complete hitch fix

[Comparison](proofs/shadowless-warming/night-crossing/comparison.json) · [controls](proofs/shadowless-warming/night-crossing/controls.json) · [source recipe](proofs/shadowless-warming/night-crossing/source.json)

[Before clip](proofs/shadowless-warming/night-crossing/before/walk.mp4) · [after clip](proofs/shadowless-warming/night-crossing/after/walk.mp4)

Route, camera position, camera quaternion and water-depth errors are zero. Every sample has identical draw counts, triangles and source-upload bytes; the largest source upload remains 1,433,948 bytes. Both runs have zero new program links. Across all 30 captured pairs, 62 pixel observations differ, at most eight pixels in any frame; maximum channel difference is 31. This is not pixel-identical proof.

This high-preset night route does not show the shadowless cold-upload burst addressed by #478. It does not establish that the original hitch is gone. Captured diagnostic step/arrival wall times retain expensive turns, and cannot be used as hardware frame times or a timing A/B. The receipt intentionally retains `hitchFixed: null`. No hardware PASS or steady M5 60 fps is claimed.

```sh
node tools/replay-mud-crossing.mjs --url https://ael-dev3.github.io/Tervain/ --out night-before --quality high --size 320x180 --hour 22.75 --from '-28,40' --yaw 1.5707963267948966 --frames 30 --steps 10 --capture true --thread-cpu true
# Run the same command against the comparison build, changing only URL and output.
node tools/compare-mud-replays.mjs night-before/report.json night-after/report.json night-comparison.json
```

For timing investigation, disable capture and render every simulation step; software submission remains distinct from presented hardware frame time. The original video's exact camera path and graphics preset remain unconfirmed.
