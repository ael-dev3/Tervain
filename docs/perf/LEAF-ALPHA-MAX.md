# Bound the work in foliage alpha-max preparation

Input assets: published [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/). Related: [#326](https://github.com/ael-dev3/Tervain/issues/326), support preprocessing in [#611](https://github.com/ael-dev3/Tervain/pull/611) and [#613](https://github.com/ael-dev3/Tervain/pull/613).

The queued alpha-support preparation scans all four child pixels when building a max level, even after a child reaches 255. Read the guaranteed top-left child directly, then only existing neighbours while the maximum is below 255. This also removes nested child-loop and repeated index work. Odd and one-dimensional image sizes keep their edge texels.

The native-mask replay covers 17 far templates and 12 decoded atlases. It applies the same leaf repair with each sampler, checks every alpha-max level byte, every repaired geometry attribute/index hash, repair counts and native source immutability, then captures the native postprocessed scene with a hidden-far-leaf control.

| Check | Parent | Candidate |
| --- | ---: | ---: |
| Child-byte reads while building max levels | 67,108,848 | 58,786,939 |
| Reads after the running maximum already reached 255 | 8,321,909 | 0 |
| Max-level array bytes (base channels excluded) | 16,777,212 | 16,777,212 |
| Isolated hierarchy-build median | 386.7 ms | 198.7 ms |
| Scene draw calls / triangles | 121 / 824,790 | 121 / 824,790 |

The timing uses **uninstrumented** source modules, one warm-up per variant and five alternating timed runs, rebuilding all 12 hierarchies with fresh cache keys over the same decoded pixels. Samples are in the receipt. These are cloud CPU measurements of the isolated hierarchy builder, not Mac frame timings, a startup benchmark or a hardware play-gate PASS. This work is preparation added by the queued support changes; the published build supplies the assets, not an assertion that its existing runtime executes this new cache path.

Every hierarchy byte and repaired output matches. Before/after captures differ in zero channels; hiding far foliage changes 23,141 channels. Existing CPU-cache memory remains unchanged, including the separate decoded alpha channels. This does not reduce that memory tradeoff or establish a fix for the `live16` missed-refresh frames in `docs/perf/LATEST.md`.

[Receipt](proofs/leaf-alpha-max/report.json) · [Before](proofs/leaf-alpha-max/before.png) · [After](proofs/leaf-alpha-max/after.png) · [Hidden-leaf control](proofs/leaf-alpha-max/empty.png)

Run from the repository root:

```sh
node tools/repro-live-leaf-alpha-max.mjs --out leaf-alpha-max-proof
```

The default URL is the published build; `--url` accepts another served build. Parent source is pinned to `d78a9b87a`. The [pre-change unchanged-source control](proofs/leaf-alpha-max/unchanged-source.json) fails the reduction check with 67,108,848 reads in both variants. `--candidate-ref d78a9b87a` restores that parent for the same negative control.

31 surface-site, leaf-island, canopy and forest-contact tests pass, including the final opaque texel of odd and one-dimensional masks. Type-check and production build pass. Hardware verification remains pending.
