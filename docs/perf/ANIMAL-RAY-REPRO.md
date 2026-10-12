# Compiled animal arrow-query repro

Serve the baseline and patched production artifacts, then run:

```sh
node tools/repro-animal-ray.mjs --url <baseline-build-url> --expect before --out before.json
node tools/repro-animal-ray.mjs --url <patched-build-url> --expect after --out after.json
```

The script waits for all nineteen delivered animals, freezes the diagnostic browser's simulation and drawing, instruments the actual loaded skeletons, and performs 120 short distant misses in one synchronous task. It restores every instrumentation method before scanning actual boar surfaces for nearby hits. Assertions require all nineteen animals/skeletons, zero distant hits, and valid nearby surface hits. The baseline requires repeated skeleton updates; the patched build requires zero on misses.

The baseline receipt reports 1560 skeleton refreshes for 120 misses. These are actual compiled wildlife-query counts, not GPU timings or frame-time attribution. Ordinary play is unchanged by this diagnostic; the frozen browser is closed afterwards.
