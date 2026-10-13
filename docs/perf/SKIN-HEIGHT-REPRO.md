# Compiled skinning-height repro

Serve the baseline and patched production builds:

```sh
node tools/repro-skin-height.mjs --url <baseline-build-url> --expect before --out before
node tools/repro-skin-height.mjs --url <patched-build-url> --expect after --out after
```

The script executes the actual served hunting controller, domain Game and Player with the imported hero rig. A ready corpse and unobstructed line of sight are controlled I/O fixtures; the player stands at the correct horizontal stance with feet −4/−2/0/+2/+4 metres from the corpse's recorded height. Actual logical controller/player updates run the full skinning channel.

Before: both four-metre offsets offer/start skinning, but the domain rejects completion and awards no hide. After: those offsets do not offer/start it. The three legal offsets, including the inclusive ±2-metre boundaries, must still complete and award the hide. This verifies agreement between actual controller and domain rules; it is not a remote-loot exploit, an input-driven world route or a GPU timing measurement.

Each run records all five outcomes and renders the actual native player during the elevated case. The diagnostic browser freezes normal simulation/drawing and checks its compiled UI revision against the served artifact. No product visuals, menus or audio change.

[Before assertions](skin-height-proof/before/report.json) and [capture](skin-height-proof/before/native-skinning.png), compared with [after assertions](skin-height-proof/after/report.json) and [capture](skin-height-proof/after/native-skinning.png): both invalid four-metre offsets stop before animation after the fix; all three legal offsets still complete and award one hide. The domain rejects invalid completion in both builds.
