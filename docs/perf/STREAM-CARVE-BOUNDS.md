# Stream carve influence bounds

Terrain stream-carving sampled every stream polyline at each query, even outside its finite influence. This function is used while constructing terrain and by repeated habitat/ground sampling. Conservative per-stream bounds now skip guaranteed zero contributions. Retained streams use the original distance, depth, ford adjustment and soft cut formula.

`node tools/repro-stream-carve-bounds.mjs --out stream-bounds.json` compares the actual production function with its original unpruned formula across 9,525 coordinates. Coverage includes a world grid, stream endpoint/support boundaries, ford depth transitions and non-finite inputs.

Polyline evaluations: **28,575 → 2,732 (90.4% fewer)**, with all values exactly equal. The before receipt intentionally fails the improvement assertion while passing value comparisons.

`node tools/repro-stream-carve-pixels.mjs --out stream-pixels` starts separate baseline/current servers and software-WebGL browsers. The baseline supplies the original terrain module from `0b45a36` to all importers. All **49,761 terrain vertex heights** and **712 grass instance buffers / 15,409,216 bytes** match, as do the rendered RGB pixels. Submitted draws/triangles remain **21 / 620,193**.

[Before](stream-carve-proof/before.png) · [After](stream-carve-proof/after.png) · [Counter receipt](stream-carve-proof/after.json) · [Terrain/buffer/rendering receipt](stream-carve-proof/rendering.json)

Build/typecheck and 16 terrain/habitat/contact tests pass. The fixture renders standalone High grass with stock exclusions, without registered crown assets or postprocessing. It is not a motion or hardware gate. Counts demonstrate reduced sampling work; no historical frame spike, live frame-time or thermal improvement is claimed. Hardware play-gate receipt remains outstanding.
