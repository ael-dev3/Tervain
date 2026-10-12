# Compiled fence-vault contact repro

Serve the baseline and patched production builds:

```sh
node tools/repro-player-contact.mjs --url <baseline-build-url> --case vault --expect before --out before
node tools/repro-player-contact.mjs --url <patched-build-url> --case vault --expect after --out after
```

The script runs the served Player, Game and Colliders classes with the actual imported hero rig. It checks 702 controlled combinations: three fence orientations, 13 approach directions spanning crossing/tangent/away motion, slopes −0.2/0/+0.2 m/m, steady walking/running, and absent/active/inactive adjacent rails. Sixty actual input updates establish approach speeds of 1.65 or 5.85 m/s before rewinding the fixture origin without clearing velocity and pressing jump.

Crossing directions (−75° through +75° samples) must vault when the other rail is absent/inactive. Tangent/away directions must not vault. Before: all 126 crossing cases with an active intervening rail incorrectly accept the arc. After: they reject it. The remaining 576 controls retain their expected results. Each run saves the full assertion table, artifact stamp and a native software-rendered player with schematic rail volumes.

Ordinary simulation/drawing in the diagnostic browser is frozen. Terrain and external I/O are fixtures; this verifies actual compiled controller behavior, not an input-driven world route, animation quality or GPU frame timing. The script verifies the running UI revision matches the served artifact. No product visuals change.
