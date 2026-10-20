# Hero-oak twig-tip contact follow-up

Read-only measurement on published **0.0.35 · 15de8cc**. This is a diagnosis, **not a production repair, detached-clump count, quality PASS, or budget-gate receipt**.

The three shared hero templates were checked at their largest-scale planted instance. Each planned twig endpoint was compared with every retained near leaf triangle. The minimum unmasked triangle distance is a lower bound on opaque contact distance. A closest point passing the decoded atlas alpha test, or an opaque barycentric sample, gives an upper bound. The refinement grid has 48 steps; absence of a sampled opaque point does not prove absence of thin opaque geometry.

| Tree / template | Instance scale | Twig, zero-based | Tip-to-triangle lower bound | Witnessed opaque-point upper bound |
| --- | ---: | ---: | ---: | ---: |
| tree:wild:32:27 / hero-oak | 1.416488 | 18 | 0.230919 m | 0.269271 m |
| tree:wild:68:13 / hero-oak-c | 1.246642 | 0 | 0.313601 m | 0.352143 m |
| tree:wild:79:22 / hero-oak-b | 1.437450 | 8 | 0.157670 m | 0.303955 m |

The endpoint world coordinates, complete per-twig results and atlas sample counts are in `measurements.json`. These are **planned endpoints**, not distances from every rendered wood triangle. Other branches or parts of a clump could provide support; these values alone must not trigger deletion or an arbitrary twig extension. They do not supersede the retained-root repair in #696.

From the repository root, with dependencies installed and a headless Chrome executable selected through `CHROME`:

```sh
node docs/perf/HERO-OAK-TIP-CONTACT/repro.mjs
```

This loads the published High world, freezes native frame/presentation callbacks, imports the repository's existing alpha-aware component sampler through a temporary local development server, and rewrites `measurements.json`. It does not change saved games or production source. Use the matching source revision for comparisons. Browser/software rendering is not Apple GPU frame-time or thermal evidence.

The general crown-clump issue remains open. A repair needs same-camera visible proof and the unchanged budget gate before review readiness; none is claimed here.

## Fixed-camera native views

[Eye-height view](hero-tip-eye.png) at (65.077685, 7.055294, −66.218270) and [elevated diagnostic](hero-tip-detail.png) at (56.077685, 22.358015, −79.218270) both look at the hero-oak-c endpoint (53.077685, 22.358015, −82.218270). High preset, noon, 640×360, frozen wind/time. The eye-height position is terrain +1.7 m, **not a verified navigable player path**. The elevated view is inside a dense canopy. Neither image establishes a clearly isolated, player-visible clump at that endpoint; nearby overlapping foliage/boughs obscure it. No geometry change is justified from this measurement alone.

Native draw counts are observations of two distinct cameras, **not before/after budget comparisons**: eye 194 draws / 3,409,459 triangles; detail 229 / 3,017,607; zero captured console errors. `views.json` records both poses. Raster suppression is explicitly restored and checked before rendering. These are baseline captures only, with no candidate and no claim of pixel identity or a repaired crown.

To regenerate the two views from the repository root:

```sh
node docs/perf/HERO-OAK-TIP-CONTACT/capture.mjs
```
