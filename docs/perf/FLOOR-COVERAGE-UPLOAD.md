# Skip unchanged forest-floor coverage uploads

Forest-floor batches repack when the camera turns or moves. Their distance-coverage attribute was marked dirty on every refresh even when its stored Float32 values were unchanged. Zero-count batches also received a one-slot update range.

Compare the actual Float32 values before writing, and upload only changed coverage prefixes. Preserve static transform/colour updates when packed occupants change, and omit empty-prefix uploads. Geometry, culling, fade distances and materials are unchanged.

## Reproduce

`node tools/repro-floor-coverage-upload.mjs --baseline 421d34b --out floor-coverage-proof` loads both actual medium forest-floor producers and shaders in native software WebGL. The deterministic fixture uses terrain and a local terrain mesh, warms buffers, then pans for 18 frames and walks for six. It instruments actual `bufferData` / `bufferSubData` payload bytes, excluding textures.

| Measurement | Before | After |
| --- | ---: | ---: |
| 18 small pan frames: buffer bytes | 42,568 | 0 |
| Six walk frames: buffer bytes | 19,776 | 19,488 |
| Draws / triangles / visible population per frame | reference | identical |
| Three sampled images | reference | pixel-identical |

Walking retains necessary coverage changes and transform repacking. The native replay draws 294–296 floor instances and 12 calls per frame. No GL error or context loss. [Full receipt](proofs/floor-coverage-upload/report.json) includes every frame, source hash and sampled image hashes; [final context](proofs/floor-coverage-upload/fixture.png).

The unchanged-buffer regression fails on baseline. All 18 selected forest-floor/distance-visibility tests pass, including continuous fade and offscreen-shadow retention. The shadow-refresh test checks actual frustum probes rather than treating an unnecessary coverage upload as proof that the refresh happened. Production build passes.

This is a small, bounded upload/driver-work reduction. It does not reduce triangle counts, change foliage quality, or prove the live village/mud hitch is gone. This standalone producer view has no registered trees, grass, post-processing or hardware timing gate.
