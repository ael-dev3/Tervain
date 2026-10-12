# Compiled settled-carcass repro

Serve the baseline and patched production builds:

```sh
node tools/repro-settled-carcass.mjs --url <baseline-build-url> --expect before --out before
node tools/repro-settled-carcass.mjs --url <patched-build-url> --expect after --out after
```

The script waits for all nineteen actual delivered models, creates a diagnostic tiger death record, completes the native collapse/support scan and instruments that tiger's loaded skeleton. Across 120 stationary updates it requires identical root/bone pose, identical collision contact and completed skinning readiness. Before: 120 skeleton refreshes. After: zero. Each run saves the software-rendered actual carcass and artifact-stamped assertions.

The diagnostic browser's ordinary simulation and drawing are frozen; the final screenshot explicitly draws the native scene from a close camera. It is a controlled corpse-cache regression, not an input-driven hunting walkthrough or a GPU frame-time measurement. The browser is closed afterwards. No product visuals change.
