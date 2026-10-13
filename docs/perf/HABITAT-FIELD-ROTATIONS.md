# Fixed habitat field rotations

Habitat evaluated four sine/cosine calls per authored field at every raster node, although field yaw is static. Cache each field's rotation once at module initialization, retaining the original local-coordinate arithmetic and margins.

`node tools/repro-habitat-field-rotations.mjs --out field-rotations.json` compares original/current production Habitat on actual terrain and exclusions. Across 1,920 deterministic queries and 30 cold tiles, total sampling sine/cosine calls fall **518,140 → 414,100**: **104,040 redundant calls removed (20.1%)**. This counter includes other trigonometry during sampling; constructors and module initialization are outside the counted interval. The cache computes two rotation values per field once, rather than eliminating those calculations altogether.

All interpolated samples and **43,350 raster words** remain exact. `node tools/repro-habitat-field-pixels.mjs --out field-pixels` confirms all **712 grass instance buffers / 15,409,216 bytes** and RGB pixels match. Submitted draws/triangles remain **21 / 620,193**. Standalone High grass fixture with stock exclusions, no registered crown assets or postprocessing; not a shimmer or hardware gate.

[Operation receipt](habitat-field-proof/operations.json) · [Rendering receipt](habitat-field-proof/pixels.json) · [Before](habitat-field-proof/before.png) · [After](habitat-field-proof/after.png)

Build/typecheck and 10 habitat/contact tests pass. No live frame-time or thermal improvement is claimed; hardware play-gate receipt remains outstanding.
