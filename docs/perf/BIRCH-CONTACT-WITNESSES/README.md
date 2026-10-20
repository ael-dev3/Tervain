# Birch unmasked contact witnesses

Live-exported 0.0.33 · b317734, High, `tree:wild:58:16` (birch/tree-1527), base (-12.341, 4.212, -62.428), scale 1.0850455875083804. The source position/index buffers are retained in checksum-verified `native.json.gz`; no texture or renderer is needed for this read-only replay.

The current shared unmasked detector flags **55 cards** at world wood reach 1.5 m and gap 0.75 m. **Ten of these cards contain points on their original indexed triangle surfaces within reach**: distances 1.408269–1.482063 m. These are sampling false positives against continuous unmasked geometry, not ten proven opaque leaf contacts. The current component samples (projected box centre and a few vertices) miss those points.

`witnesses.json` records triangle IDs, nonnegative barycentric weights summing to one, local leaf points and the corresponding nearest wood points. A separate 32-step barycentric grid supplied these positive witnesses; the retained replay reconstructs each point directly from the original native triangle, confirms the old flag, and independently re-queries production `woodAnchor`. All ten distances match within 1e-6 m. The earlier triangle-pair search is not required by this receipt and is not used to assert exact minimum distances.

From a checkout with the repository dependencies, run:

```sh
node docs/perf/BIRCH-CONTACT-WITNESSES/repro.mjs
```

The fixture checksum, old flag count, positive contacts and barycentric validity are asserted. `receipt.json` contains the completed result. The script accepts an optional fixture-directory argument. A future live build needs a fresh export rather than relabelling this fixture.

This finding does **not** clear the other 45 sampled flags or establish separate visible islands, opaque alpha contact, a visual repair, a hardware timing or a budget PASS. No generator, geometry, material or production detector is changed. It explains why blindly culling the flagged set is unsafe; the native render study is linked on issue #326. Production distance refinement still needs its own cost and output validation.
