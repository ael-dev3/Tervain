# Proof startup failure receipt

Source `3337b0053e1649e8ab3c6a2e556c3a5357b15e8b` (#720), based on published 0.0.33 b317734. This changes the capture helper and its regression test only. The application, shaders, public assets and package/build configuration have no Git diff against live. It is not a floating-crown repair or game performance change.

The browser fixture serves a required module as HTTP 404/HTML. Original helper: still waiting when the external watchdog closes the page after 3,000 ms. Candidate: detects the script failure after 23.99 ms from browser connection, without watchdog intervention. These exclude browser launch and are not game frame times. The old helper's full readiness timeout was not measured to completion.

The helper also rejects JavaScript console errors and uncaught exceptions during startup and preserves warning logs for callers. The actual regression fails on old source; three focused tooling tests pass on candidate. Typecheck and production build pass. CI build, software-WebGL and all test shards pass; the legacy receipt check is refreshed after publication of the real result.

The stock budget gate uses normal startup, no init override or changed sampler/allowances, and two live probes before the exact candidate. Its literal result and counts are in `budget.log`. This helper is not imported by that gate, and no game renderer code changes. Draw/triangle/shader/texture-tap cost delta from application code is zero. There is one startup error check per readiness poll, no new per-frame game work. No Mac/hardware timing or heat claim.

Run the browser fixture from the repository root with `node docs/perf/PROOF-STARTUP-FAILURES/repro.mjs report.json` on this source, setting `CHROME` as appropriate and unsetting `REPRO_INIT_FILE`. The retained script starts and stops its own HTTP fixture and browsers sequentially, and applies the external cutoff to the old control. The old helper is read from b317734. The regression itself is `npx vitest run tests/tooling/liveProofStartup.test.ts tests/tooling/canopyAuditReceipt.test.ts`.
