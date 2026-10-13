# Empty animal-impact upload repro

The impact pool dirtied its 48-instance matrix every update, even before any hit and after all droplets expired. Three.js consequently issued an unchanged 3,072-byte `bufferSubData` upload every rendered frame. Returning early for an empty particle list also avoids the empty-array filter allocation.

Run against a served production build with Chromium and software WebGL:

```sh
node tools/repro-idle-impact.mjs --url http://127.0.0.1:4173/ --expect before --out before.json
# Build the fixed revision and serve it at the same URL.
node tools/repro-idle-impact.mjs --url http://127.0.0.1:4173/ --expect after --out after.json
```

The script loads the actual journey and all 19 animals, isolates the native impact mesh in a render scene, and counts actual WebGL buffer uploads for that mesh's array. It asserts 120 idle frames, a six-droplet body hit, expiry, and another 120 idle frames. It does not measure full-world frame timing or hardware GPU performance.

| Check | Before | After |
| --- | ---: | ---: |
| Initial idle matrix dirty requests | 120 | 0 |
| Initial idle uploaded bytes | 368,640 | 0 |
| Body-hit droplets / dirty requests | 6 / 1 | 6 / 1 |
| Expired pool count | 0 | 0 |
| Post-expiry dirty requests | 120 | 0 |
| Post-expiry uploaded bytes | 368,640 | 0 |

Receipts: [before](idle-impact-proof/before.json), [after](idle-impact-proof/after.json). The baseline uses the integrated product code preceding this fix. Unit checks also cover reduced-motion suppression; the change does not alter particle transforms, materials, stains, or embedded arrows. This is a deterministic upload reduction, not an attribution of the earlier bow-stage stall.
