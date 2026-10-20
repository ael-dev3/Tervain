# Rejected forest part-culling prototype: cached reflection false pass

Read-only live **0.0.33 / b317734**, High 640x360, post/MSAA4. No production source is changed. The prototype filters packed wood and leaf instances separately against the main camera, using all source LOD boxes and the existing 2 m wind guard. Shadow casters stay untouched. A visible crown otherwise retains a trunk that lies off the main view. Main-view-only prefix removal is not sufficient: those same colour meshes also supply secondary captures.

## Same-session control

Fixed camera **(-300, 3, 27)**, yaw pi/2, pitch pi/6, time and wind frozen. Four states: original with fresh reflection; filtered with the original reflection cached; filtered with a fresh reflection; original restored with a fresh reflection. The native reflector callback is counted directly and restored after every render.

| State | Reflection captures in retained render | Draws | Triangles | RGB vs original |
| --- | ---: | ---: | ---: | --- |
| Original, fresh | 1 | 842 | 10,655,759 | reference |
| Filtered, cached | 0 | 513 | 6,384,334 | exact |
| Filtered, fresh | 1 | 842 | 10,220,615 | 153 pixels / 306 channels differ |
| Original restored, fresh | 1 | 842 | 10,655,759 | exact |

The fresh/fresh triangle difference is **435,144**, from 17 removed part instances. The cached row additionally skips an entire capture and is not a comparable geometry saving. These forced-refresh native render counts are not stock-gate counts or hardware timings.

All 153 changed pixels lie in the water region, box **(350,75)-(365,92)**. Maximum channel delta is **2**; zero pixels exceed a 20-level delta. This is a strict pixel-identity failure, not a claim of a large visible regression. Independent decoding confirms cached/original and restored/original RGB equality. All retained fresh states actually invoke one reflection capture, no console errors, and real raster is enabled. A cached image can hide this difference at the same pose even while the geometry is wrong for the secondary view.

The main-view-only optimization is **rejected**, not opened as a production PR. A future implementation must retain what each auxiliary camera needs or restore complete instance prefixes during its capture; several unchanged main-view screenshots do not prove that. No frame-time improvement, hardware result, stock budget PASS, foliage repair or general visual clearance is claimed.

`repro.mjs` contains the completed control, with only output/import paths made portable. From a checkout containing this proof, run `node docs/perf/FOREST-PART-CULL-STUDY/repro.mjs`. An optional capture startup raster override is restored before every retained scene. The repro intentionally asserts that the cached comparison is exact and the refreshed comparison differs, plus exact restoration and capture counts. Raw PNGs, native counts and the independent pixel-diff receipt are retained alongside it.
