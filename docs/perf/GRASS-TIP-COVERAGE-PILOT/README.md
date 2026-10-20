# Grass tip coverage pilot — rejected production change

Live 0.0.33 · b317734. This diagnostic changed the existing tip-lift multiplier from `mix(0.4, 1.0, gBladeCov)` to `gBladeCov` in a session-only shader adapter. No product code or art was changed.

Nine walking/turning poses, 0.347 m at a synthetic 60 Hz cadence, hour 17.5, frozen wind and actors, native High post/MSAA4. Requested 1470×956 at DPR2; the native cap produced 2205×1434 at DPR1.5. The inactive adapter is RGB-exact. Every before/after pair restores exactly; draw and triangle rosters match.

| Affected observation | Original | Probe |
| --- | ---: | ---: |
| Warm-bright observations, luminance ≥140 | 1,289 | 1,211 |
| Bright temporal jumps >60, bright endpoint ≥140 | 4,707 | 4,655 |
| All affected temporal jumps >60 | 314,928 | 307,858 |
| Luminance ≥180 | 0 | 0 |
| Strict white, minimum RGB ≥245 | 0 | 0 |

Bright jumps fell only 1.1%. Mean whole-image luminance was 60.5291 versus 60.4950. The affected mask is the union of pixels changed by this probe, including post neighbours and disocclusions; it is not a semantic grass mask or a pure shimmer measurement. These short-path results do not clear longer walks or other angles.

This does not establish a white-speck cause or justify a production colour change. The probe is rejected. No product regression or budget PASS is claimed. Report and all nine matched PNG pairs are retained. Run the portable script from the repository with `node docs/perf/GRASS-TIP-COVERAGE-PILOT/repro.mjs --frames 9 --url https://ael-dev3.github.io/Tervain/ --out grass-tip-motion`. A software WebGL browser may be selected with the existing CHROME mechanism.
