# Wood bounds with forced water refresh

Production source 8847b57702e1a9bb8deddfbc354217eea668307f (#718). High 640x360, native post/MSAA4, seven fixed camera/wind poses. Before/after/restored RGB match exactly at all seven poses, with zero console errors. Native raster is restored before retained rendering.

The repro invalidates the water reflection immediately before every render and wraps the native reflector callback to count invocations. That callback is invoked once per measured render at the forest control (-210, terrain+2, 0), yaw 3, and sea control (-300, 3, 27), yaw pi/2, pitch pi/6. The first five views invoke it zero times; those do not claim a fresh water capture. This check does not force or validate every cached window-cubemap face.

| Control | Draws before/after | Triangles before/after | RGB |
| --- | ---: | ---: | --- |
| Forest, water refresh requested | 314 / 312 | 5,114,280 / 5,097,146 | exact |
| Sea, water refresh requested | 738 / 738 | 10,335,587 / 10,335,587 | exact |

Other five views have equal draw/triangle counts. Upload bytes and texture counts are unchanged at each paired pose. These are per-render submission counts under deliberately refreshed auxiliary captures, not normal-play pacing or hardware GPU timings. They supplement the existing exact-head stock budget PASS; they do not replace or modify that gate. No floating-crown repair is claimed.

Run the retained repro from the repository root with `node docs/perf/WOOD-FRESH-REFLECTION-PROOF/repro.mjs --url BUILD_URL --out capture --assert-production` on #718. It checks production bounds and requires the sea control's reflection callback. The existing optional startup raster override may accelerate loading, but the retained images require native raster, real draw instrumentation and MSAA4.
