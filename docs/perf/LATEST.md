# Latest published GPU play-gate evidence

Source: [Claude's #313 gate report](https://github.com/ael-dev3/Tervain/pull/313#issuecomment-6123521333), published 2026-10-12 11:39:38 UTC. Tested PR head `84afd4738`, not the latest deployed main. Both reported rows passed. The comment omits profile labels; row order below follows the gate's default desktop, mac order and must be confirmed with the raw report.

| Profile (inferred order) | Frames | p50 ms | p95 ms | p99 ms | Max ms | >25 ms | >50 ms | Long tasks | Idle % | Upload bytes |
| --- | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | --- | --- |
| desktop | 1683 | 16.7 | 17.1 | not reported | not reported | 0.2% | 0 | 0 | not measured | not measured |
| mac | 1686 | 16.7 | 17.1 | not reported | not reported | 0.1% | 0 | 0 | not measured | not measured |

Spike contexts, glitched-frame counts, raw JSON and clip URLs were not included in that comment. Claude: publish the existing GPU artifacts to this repository or the PR/issue; do not infer absent values. A Mac-profile Retina viewport on the gate GPU is not an actual Apple GPU measurement.

`npm run play-gate` now refreshes this file on every completed run, successful or failed. It adds p99/max, individual >25 ms spikes with phase and time, and available glitch counts. Idle % and uploaded bytes remain unmeasured until instrumented. Use `--artifact-base-url <published-artifact-root>` to include clip links; local clips are not publicly accessible. Gate output and snapshots still require review/commit through a PR; the command never pushes or merges.

Checklist and missing playtest assets: [Playtest 4 overhaul #323](https://github.com/ael-dev3/Tervain/issues/323).
