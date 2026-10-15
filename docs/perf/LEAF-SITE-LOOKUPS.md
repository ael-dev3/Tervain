# Reuse texture transforms during leaf emission-site scans

Live reference: https://ael-dev3.github.io/Tervain/ (0.0.18 · 421d34b). Tracking: [#326](https://github.com/ael-dev3/Tervain/issues/326).

The emission-site sampler rebuilt an effective UV matrix and a temporary UV vector for every masked triangle it examined. Tree loading uses this sampler for near-detail emission sites; the material is constant for the duration of that synchronous scan.

Prepare one matrix and one scratch UV per texture per scan. Keep alpha filtering, image decoding, UV-channel selection, wrapping, opacity, cutoff and output sites unchanged. A new call still reads current texture transforms, so there is no cross-call transform cache. The separate cutout-audit sampler is unchanged.

## Reproduce

```sh
node tools/repro-live-leaf-site-lookups.mjs --url https://ael-dev3.github.io/Tervain/ --out leaf-site-proof
```

The script loads the published Low forest (use `--quality high` for the heavier capture) and replays its unique masked geometry/material pairs through the actual baseline and candidate samplers. All retained detail levels are included as additional input coverage; this is a regression workload, not an estimate of calls or allocations during one real world load. Rendering follows the frozen native Grade/post/MSAA path.

The matched run uses published **0.0.18 · 421d34b**, Low software rendering, 60 unique masked geometry/material pairs and **15,395 returned sites**. Every per-source site-array hash matches; decoded capture pixels are identical.

| Workload measurement | Before | After |
| --- | ---: | ---: |
| Effective UV-matrix builds | 27,623 | 60 |
| Temporary UV-vector constructions | 27,623 | 60 |
| Returned emission sites | 15,395 | 15,395 |

[Full receipt and per-source hashes](../../proofs/leaf-site-lookups/report.json), [before capture](../../proofs/leaf-site-lookups/before.png), [after capture](../../proofs/leaf-site-lookups/after.png). The production loader samples near detail; this workload deliberately includes other retained detail levels as extra controls, so its totals must not be presented as allocations saved per real world load.

Source instrumentation counts calls to the effective texture-matrix builder and UV-vector constructions. It excludes arrays, closures, site records, image decoding and all other allocations. No load-time, GC, hardware FPS or historical hitch improvement is inferred from those counts.

Existing coverage includes alpha-map green, separate UV channels, transform changes between scans, unavailable images, invalid transforms, cutoff/opacity and bounded work. No new implementation-mirroring test was added. All 19 existing leaf-site/falling-leaf tests and production build/type check pass. Hardware play-gate remains required.
