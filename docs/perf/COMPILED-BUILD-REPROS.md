# Compiled-build regression evidence

These scripts exercise actual classes from served production builds under SwiftShader. Their explicit fixture scopes and limitations are documented individually. Historical baseline/patched receipts include artifact revisions; captures show native game models where the behavior is visual. Software-renderer timings are not Mac GPU performance evidence.

| Regression | Before | After | Repro and proof |
| --- | --- | --- | --- |
| Empty spray uploads | 1,152,000 requested bytes / 120 frames | 0; emission and final clearing preserved | [Spray](IDLE-SPRAY-REPRO.md) |
| Distant animal arrow misses | 1560 skeleton refreshes / 120 rays | 0; nearby hits preserved | [Animal rays](ANIMAL-RAY-REPRO.md) |
| Settled carcass | 120 skeleton refreshes / 120 frames | 0; exact pose/contact preserved | [Carcass](SETTLED-CARCASS-REPRO.md) |
| Airborne mount | Jump and vault requests accepted | Both rejected; landed controls accepted | [Mount](PLAYER-CONTACT-REPRO.md) |
| Adjacent fence arc | 126 unsafe crossings accepted | 126 rejected; 576 controls preserved | [Vault](VAULT-CONTACT-REPRO.md) |
| Rock support | 1800 coordinate reads | 9; all 400 delivered-rock results identical | [Rock](ROCK-SUPPORT-REPRO.md) |
| Skinning height | Invalid ±4 m channels started; completion rejected | Invalid channels never start; ±2 m boundaries preserved | [Skin reach](SKIN-HEIGHT-REPRO.md) |

Build and serve the production application using the software mode described in [software WebGL setup](SOFTWARE-WEBGL.md). Keep the served artifact unchanged throughout each run. Player-contact and skin-reach scripts additionally compare the compiled UI revision with the artifact stamp. Re-run both historical revisions for before/after evidence; these receipts alone do not establish a live fix.

The controls use deterministic I/O and terrain where stated. Native classes and imported models run in Chrome; no Node-side implementation substitutes for them. The checks certify the documented regression scopes, not complete gameplay coverage, art quality or a hardware play gate.

All seven checks were also replayed against the integrated production code, with zero failures. The [integrated summary](integrated-repro-proof/summary.json) links the artifact revisions; individual JSON reports in that directory retain the full results, including all 702 contact cases. This replay adds no new product logic or art changes. Hardware frame pacing remains a separate gate.
