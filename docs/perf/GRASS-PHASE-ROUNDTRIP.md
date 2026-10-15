# Make grass phase controls round-trip safely

`capture-live-grass-walk` saved wind, sway and grade phases but omitted the hour used by its replay. Passing that saved object back through `--controls` sent undefined into `SkyRig.update`, producing nonfinite lighting. Its optional sky phase also wrote an unused `time` property instead of the actual `cloudTime` clock.

New records include the effective lighting hour and actual cloud phase. The replay validates every field before applying it. Legacy missing fields use the current scene values and are explicitly marked as defaulted in `setup.phaseControlFallbacks`; missing historical phases cannot be recovered retroactively. Explicit legacy `skyTime` numbers are accepted as cloud-clock aliases. The recorded effective lighting hour is distinct from `setup.actualHour`, which describes the game clock.

Invalid files are rejected before browser startup. The old final report is removed before CLI/control validation, so a failed rerun cannot leave a stale PASS. This changes capture tooling only, not production lighting, shaders or game visuals.

## Self-verification

`node tools/repro-grass-phase-roundtrip.mjs --baseline 421d34b --out grass-phase-proof`

The native fixture executes the actual baseline replay with its omitted-hour record and a real `SkyRig`. Baseline: **eight nonfinite state values**. Corrected replay: finite state, with both legacy/defaulted and complete controls rendering pixel-identically to a valid canonical sky. The invalid baseline state is checked numerically and is not rendered. Wind/grade hosts are small diagnostic adapters; this is not a full-world A/B test.

[Receipt and hashes](proofs/grass-phase-roundtrip/report.json), [finite native context](proofs/grass-phase-roundtrip/fixture.png). No GL error or context loss in the valid frames. Four tests cover JSON round-tripping, legacy fields, invalid inputs/array aliasing, and stale-report removal on failed CLI runs. Production build passes.

The separate [published 0.0.18 motion receipt](LIVE18-GRASS-REFRESH.md) verifies native pixels and metrics. It used the default no-control path before this metadata fix; it does not claim to test a full-world replay of the new canonical controls.
