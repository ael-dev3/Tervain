# Matched corrected placement receipts on the 0.0.18 world

Both diagnostic implementations ran against one frozen scene after furniture arrival, with identical geometry, populations and terrain. The served build was 0.0.18 · `4234920b2`: the diagnostic-budget candidate based on live 0.0.18 · `421d34b`. This is a delivered-world diagnostic comparison, not a live16 gameplay or frame-time replay.

The before audit is pinned to `4234920b2` (#485/#487 compact/lazy support indexing plus explicit vertex budget). The after module adds only the referenced-vertex section from `1915d729b` (#488) and the represented-batch guard from `566a435a9` (#490). Exact module/support/postprocessor hashes are in the [receipt](proofs/corrected-world-placement/report.json).

| Prop scan | Before | After |
| --- | ---: | ---: |
| Component checks | 26,458 | 26,373 |
| Directional candidates | 2,823 | 2,832 |
| Skipped / invalid / truncated | 0 / 0 / false | 0 / 0 / false |
| Furniture ready / scan complete | true / true | true / true |

85 duplicate source checks disappear, including seven previously flagged candidates. Sixteen retained rendered components change from cleared to candidate; no new check identities appear. These are mostly hunter-counter and animal-camp components whose hidden source copies previously supported their rendered batches. This is not sixteen confirmed floating props: rails, mounting blocks, signs, hides and straps can have legitimate nonvertical supports. The source/component counts are not distinct object counts.

## Tracked route regions

Selection uses component centres within 10 m in X/Z, at all heights, including nearby interiors. It is not a footprint-intersection or visibility query.

| Region centre | Before checks / candidates | After checks / candidates |
| --- | --- | --- |
| Walk-fence (−2, 37.25) | 1,455 / 136 | 1,455 / 136 |
| Run-round (−12.3, 44.8) | 1,203 / 158 | 1,203 / 158 |

The fixes do not change these regional candidate sets. Shelf brackets, peg rails and hanging cookware are among the candidates, so a count alone cannot establish a floating-object bug. [Walk-fence context](proofs/corrected-world-placement/walk-fence.png), [run-round context](proofs/corrected-world-placement/run-round.png). These are native software-rendered context shots, not collision or stutter videos. The run-round centre puts this diagnostic camera inside a house in this build; it does not reconstruct the original gate camera.

## Root coverage and limits

Both audits check all **341 registered near/collision wood basal rings**, with no invalid/skipped/truncated checks. Both flag zero roots at the existing rule (at least 25% of sampled sectors unsupported beyond 8 cm). **Ten roots still have individual probes over 8 cm; maximum gap is 0.17249 m.** The receipt retains those checks explicitly. Zero thresholded candidates does not mean every root is flush, and this does not cover all rendered LODs or wind-deformed geometry.

Raw data: [before props](proofs/corrected-world-placement/before.json.gz), [after props](proofs/corrected-world-placement/after.json.gz), [roots](proofs/corrected-world-placement/roots.json.gz). Gzip records retain all check positions/gaps/identities for review. The candidate lists and changes are also readable in the main JSON receipt.

## Reproduce

Serve the 0.0.18 build with its assets, install headless Chrome, and run `node tools/repro-corrected-world-placement.mjs --url <served-build-shot-URL> --out corrected-world-placement-proof`. The shot URL must start a journey and reach READY; the recorded run used Low, Rillford, hour 11, HUD hidden. Optional `--init` supplies a test-host browser preload. TLS verification is retained; no application geometry/terrain/pose shim is required.

The tool imports the pinned diagnostics from a temporary module server, freezes simulation/render scheduling after arrival, compares both prop/root audits, validates complete denominators, and takes the context shots. The positive explicit vertex budget is the maximum measured source position count (114,839 in this run); max prop checks is 100,000. Two postprocessor tests reject incomplete/unready/duplicate/inconsistent receipts and verify candidate/root/region changes. Production build passes.

This is measurement coverage, not a prop-quality PASS or proof that the night/mud hitch, walk-fence spike or run-round missed refresh is gone. No hardware frame-time or M5 performance claim is made.
