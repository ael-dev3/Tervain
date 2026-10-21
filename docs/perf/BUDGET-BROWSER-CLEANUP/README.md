# Await browser profile cleanup

Head `c1804f6e874a9499283d83595ebcaa94313ea213`, based on 0.0.44 `fcfd79966`.

The budget command calls `process.exit` after the final probe. Before this fix, `close()` returned before the browser exit callback removed its temporary profile. One completed earlier world gate retained 311,428,580 bytes (that gate itself failed because its candidate predated the newer live geometry budget; the cleanup leak is independent of that result).

## Reproduce

```sh
CHROME=<Chrome-binary> node tools/repro-cdp-cleanup.mjs
```

The tool uses its own temporary directory, opens a minimal page, awaits close and explicitly exits its child. It reports retained profiles/bytes and exits unsuccessfully if anything remains. Original implementation: child exit 0, one retained profile, 2,501,638 bytes. Fixed: child exit 0, zero profiles/bytes.

Process regressions exercise delayed exit, idempotent close and already-signalled exit. The unmodified budget sampler and existing timing tests also pass (16 focused tests in total); type-check/build pass.

An earlier attempt crossed a live deployment and correctly failed its revision guard; both profiles were removed despite exit code 1. Its raw failure and cleanup counts are retained without a PASS claim.

The full compiled-head gate uses the same two-live/four-completed-frame probes and unchanged acceptance rules. It passes against live with 285 draws / 2,965,136 triangles / 0 console errors (live: 285 / 2,965,136 / 0). After its Node process exits, no temporary profiles remain. The raw receipt and cleanup counts are adjacent files.

No game, renderer, shader, package or build-configuration source changed. This is a gate disk/resource correctness fix, not a game frame-time/heat improvement or hardware timing proof. No screenshot change is asserted or needed for the tooling-only change.
