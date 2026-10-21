# A161: 0.0.41, the floor under near grass takes the light the blades take

## Grass shimmer against Gothic 3

- Gothic 3's meadows hold still in motion. Tervain's near grass shimmers: blades under a pixel wide alias as they move (A159). The question here was what they alias against.
- A walk through the low-sun meadow (the masked grass walk, four lights, 60 frames at 15 fps) compares the mean brightness of grass pixels with the ground showing between blades, in the lower 55% of the frame. The jumps are grass pixels changing 40+ and 60+ levels between frames.

| Light | Grass | Ground | Ratio | Jumps 40+ | Jumps 60+ |
| --- | ---: | ---: | ---: | ---: | ---: |
| Low sun behind the viewer | 103.2 | 44.7 | 2.31 | 18.3 M | 8.33 M |
| Noon, sun behind | 123.9 | 97.5 | 1.27 | 6.86 M | 1.82 M |
| Low sun ahead | 53.7 | 48.0 | 1.12 | 2.38 M | 0.53 M |
| Noon, toward the sun | 82.9 | 83.7 | 0.99 | 3.37 M | 0.74 M |

- Most of the shimmer is one light: a low sun behind the viewer. Then the blades show their lit faces while the flat floor between them catches the sun at a grazing angle, so sub-pixel blades flicker over gaps half as bright.
- Looking into the sun, the blades are no brighter than the floor. That is why a uniformly lighter ground (A159) cut the jumps at a low sun behind and raised them at noon toward the sun.

## Change

- **The floor's colour** (terrainMaterial.ts):
  - Under near grass, the floor's colour is multiplied by up to the measured ratio: 1 + 1.3 at a low sun and 1 + 0.27 at noon.
  - The gain scales with how squarely the sun stands behind the viewer, as seen from that patch of ground.
  - It also scales with the grass's cover, and fades out where the blades end.
- **What this models**: real vegetation brightens with the sun behind the viewer (the opposition effect), and the floor between blades is mostly lower blades.
- **What it leaves alone**:
  - Looking into the sun, nothing changes.
  - The gain follows where the ground lies from the viewer, not where the camera looks, so turning in place changes nothing.
  - Paths and bare ground have no cover, so they keep their colour.

## Not taken: a floor lit like a blade

The first try turned the floor's normal toward the viewer and 40% toward the sky, as the blades' faces turn (grassMaterial.ts). It raised the ground only from 44.7 to 51.5 at a low sun behind, cutting jumps of 60+ by 29%. But the floor faced away from the sun in every other light: there the ground darkened and the jumps rose (noon ahead +43%, noon behind +45%, low sun ahead +95%). The blades' brightness comes from their wrapped and translucent light, not from the direction of their faces alone.

## Evidence

The same masked walk on the release head, against the same build without the gain:

| Light | Ground | Jumps 40+ | Jumps 60+ |
| --- | ---: | ---: | ---: |
| Low sun behind | 44.7 → 56.4 | −25.8% | −47.6% |
| Noon, sun behind | 97.5 → 103.9 | −15.9% | −18.5% |
| Low sun ahead | 48.0 → 48.0 | +0.1% | +0.1% |
| Noon, toward the sun | 83.7 → 83.7 | 0% | 0% |

- With the 0.0.35 tip cap, grass pixels at 180+, near-white pixels and flashes stay 0 in all four lights.
- GPU time at a frozen grass-heavy pose (low sun behind, 1470×956 at 2×, 150 frames), alternating builds over five rounds: median 4.334 ms against 4.328 ms, within the run-to-run spread (4.30 to 4.52).

## Self-score against Gothic 3

| | Before | After |
| --- | ---: | ---: |
| Grass in motion | 7 | 7.5 |
| Birches | 6.5 | 6.5 |
| Hero oaks | 7.5 | 7.5 |

- At a low sun behind the viewer the near meadow flickers half as much in its largest jumps, and its gaps read as grass rather than dark ground. The remaining shimmer is the blades themselves, under a pixel wide.
