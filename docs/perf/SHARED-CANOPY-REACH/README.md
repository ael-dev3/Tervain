# Shared canopy contact radius

Candidate `6bc50eff19fd0659c525c57dbb179230410caa68`, compared with published **0.0.33 · b317734**.

When the connectivity gap exceeds wood reach, `detachedClumpSet` searches for contact out to the larger gap. `contactDistances` intentionally returns after the first witness within its search radius; it does not promise an exact nearest distance. A witness outside wood reach can therefore hide another branch which actually touches the leaf. The independent canopy audit keeps searching to its smaller classification threshold and disagrees.

The fix passes **wood reach** to contact search. Connectivity still uses the original gap. No tree geometry, art, material, shader, distance or density changes.

## Reproduction and results

Run `node tools/repro-live-shared-canopy-reach.mjs output-directory` with Chrome available. It opens the published build, reads eight smallest distinct wood/leaf geometry pairs at each retained Low-detail LOD, and compares original/candidate shared detection against the independent audit. It does not edit the native scene. See [raw report](report.json).

| Measurement | Original | Candidate |
| --- | ---: | ---: |
| Detached-card flags, 24 targets, diagnostic reach 0.2 m / gap 0.75 m | 6,736 | 3,823 |
| Targets whose strict-reach flag count differs from the independent audit | 22 | 0 |
| Normal reach 1.5 m / gap 0.75 m controls | 24 | 24 exact matches, including operation counts |
| Strict diagnostic operations | 554,956 | 651,660 |
| Browser console errors | 0 | 0 |

For example, near `tree:wild:70:3` reports **486 → 142**, matching the independent audit's 142. These are unmasked geometric diagnostic flags, not verified visible floating leaves. The 0.2 m threshold is deliberately stricter than the ordinary 1.5 m world reach. This is not a claim that visible floating crowns are fixed.

The additional strict-diagnostic work is necessary to look past a misleading first contact. It is **not per-frame CPU work**. Current oak construction uses `reach = 1.5 / 1.46`, larger than its `gap = 0.75`, so that call's input radius is numerically unchanged.

The new regression fails on the original source at both tested connectivity gaps: `[true, true]` instead of `[false, true]`. Reversing the two wood triangles is also checked. [Original failure](original-regression.txt). All 34 focused canopy tests and `npm run build` pass.

## Production cost and appearance

[Compiled comparison](compiled-delta.json) checks all 23 emitted files against a baseline build using the original helper, with the same revision stamp. Hash-derived chunk references are mapped explicitly. The **only code difference is the intended single helper argument token**; every other emitted byte matches after that mapping. This is compiled-code proof, not a claimed screenshot comparison. There are no rendering-code or shader changes.

| Cost | Delta |
| --- | ---: |
| Per-frame JS, shader operations, texture operations | 0; code unchanged |
| Current oak preparation contact-search radius | 0 |
| Tight-reach offline diagnostic operations | +96,704 (+17.4%); correctness tradeoff |

The [stock exact-head budget](budget.txt) passed, actual exit 0: live b317734 and candidate 6bc50eff1 both **285 maximum draws / 3,048,306 maximum triangles / zero console errors**. Two same-revision live probes, four completed samples per probe, zero allowance, no raster-suppression preload.

play-gate: PASS 6bc50eff1

Software rendering cannot establish hardware frame pacing or laptop heat.
