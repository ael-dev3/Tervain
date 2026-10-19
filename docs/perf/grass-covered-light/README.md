# Covered grass-light interpolation

This sampling study is stacked on #700. It preserves the authored lighting formulas, transmission floor, colours, instance counts and draw distances. It changes the two lighting varyings to centroid interpolation, matching the existing colour/edge vector.

An isolated WebGL2 fixture imports the actual production shader declarations and lighting macros. It supplies bounded, valid light values on subpixel triangles under four-sample MSAA. Ordinary interpolation produces 160 observations outside the vertex-light bounds; centroid interpolation produces zero. Bounds allow two byte levels for storage and sample-resolve rounding. Coverage is identical. Single-sample controls are pixel-identical, and the large resolved-triangle control differs by at most one channel byte. This proves an interpolation defect, not a live white-speck count or hardware speedup.

Reproduce from this proof branch:

```sh
node tools/repro-grass-light-interpolation.mjs output d3f93f90e 8b1f9958f
```

The paired native walking capture and exact-head render-budget run are separate checks. Their receipts will be added after they complete; this document does not assert their success.

The preceding normal-distance pop-in probes are in [walk-popin](../walk-popin/README.md). They found no central abrupt events on the sampled short meadow and woods paths, so they do not justify changing fades, draw distance or density. They do not close the general pop-in report.
