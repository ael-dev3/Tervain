# Rejected forest work candidates

Baseline/source of live 0.0.37 `8a1746de59a18843bd7ff42bfb80e9b28af9a33a`. Neither proposal is included in an application PR.

## Forest finalization

The proposed patch reused part order and folded a separate visibility-only loop into count updates. Native High replay on actual original/candidate refresh closures: all 314 instanced forest meshes retain identical numeric state hashes, and all 20 native post/MSAA PNGs are RGB-identical by pose (independent Sharp/Pillow decoding). Source-level pair-array constructions fall 180→0 per refresh. That does **not** measure physical heap allocation: V8 may eliminate literals.

A separate CPU world refocused the shadow volume on the actual fence route before warm-up. Three warm replay pairs and nine rotating rounds ×120 walking/turning steps per mode; actual uninstrumented refresh closures, no raster. Original average **0.048704 ms**, candidate **0.046204**, unchanged-original control **0.045741**. All p95s tie at **0.100000 ms**, near clock resolution. Native stats.ms includes asymmetric counters and is not used. Raw per-round values are in [report.json](report.json).

The candidate does not clearly beat control noise, so it was **restored rather than shipped**. No GC, whole-frame, hardware, GPU or heat improvement claim; no budget gate was run or PASS invented for it. The historic 33 ms frames remain unresolved. [Rejected patch](proposal.patch), [pixel hashes](pixels.json).

To reproduce only this study, apply the patch to its baseline, then run `node tools/repro-rejected-forest-refresh.mjs [output-dir]` with dependencies and headless Chrome. The script imports baseline and working-tree source, verifies all poses and zero candidate pair-array constructions, then refocuses the fence shadow context for CPU replay. It invalidates stale completion before starting. `PROOF_CPU_ONLY=1` repeats CPU in a fresh world against a previously completed five-pose report.

## Inactive shake check

An isolated foliage-wind shader experiment checked zero-strength shake slots before age arithmetic. 256 instanced spheres, one draw /245,760 triangles; no game art changes. After warm-up, twelve rotating rounds/state/mode; render completion is forced using one-pixel readback (this is a benchmark barrier, not proposed game code). Inactive averages original **58.73 ms**, candidate **53.85**, unchanged control **52.57**; medians **52.35 /54.20 /47.30**. All three inactive/active/expired RGB pairs match. [Raw diagnostic](shader-probe.json), [fixture images](shader/).

Inactive results overlap control noise. No causal shader benefit was established and the change was not applied. These software completion times are not Mac or live-game frame timings. No foliage geometry, colours, menus or shader style was changed in production.
