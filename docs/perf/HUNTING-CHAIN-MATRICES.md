# Hunting IK matrix walk

Each hunting IK chain performed a forced walk of the entire hero hierarchy before reading three joint positions. Three's `getWorldPosition` already refreshes each joint's ancestor path. Remove that redundant full walk; retain the existing final overlay and skinning matrix refreshes.

Run `node tools/repro-hunting-chain-matrices.mjs --out hunting-matrix-proof`. It compares the original/current production hunting overlay with the delivered hero model, authored posing, moving/turning root, software-WebGL colour and directional shadows.

| Matrix multiplications during posing | Before | After |
| --- | ---: | ---: |
| Bow, 45 steps | 67,770 | 58,230 |
| Skinning, 45 steps | 219,690 | 171,990 |
| Slung control | 12,792 | 12,792 |
| Unequipped control | 3,542 | 3,542 |
| Total | 303,794 | 246,554 |

The counted posing work falls **18.8% overall**, **14.1% during bow posing**, and **21.7% during skinning**. All **121 local/world transform snapshots** match exactly, and the four RGB capture pairs have zero differing pixels. Counter collection ends before the subsequent complete matrix refresh and render on both sides. The script also writes full pose data for inspection; the committed receipt and selected images keep the evidence small.

[Receipt](hunting-matrix-proof/report.json) · [Bow before](hunting-matrix-proof/before-bow.png) · [Bow after](hunting-matrix-proof/after-bow.png) · [Skinning before](hunting-matrix-proof/before-skinning.png) · [Skinning after](hunting-matrix-proof/after-skinning.png)

Build/typecheck and 36 focused hunting/hero/swim tests pass. A hero animation test initially hit its five-second timeout while the software renderer ran concurrently; the complete 23-test hero animation file passed when rerun alone with the normal timeout. No test limits changed.

This proves redundant work removal and unchanged poses/pixels. It does not establish Mac frame times or attribute the historical 32 ms bow frame to this walk. Hardware play-gate and live verification remain outstanding.
