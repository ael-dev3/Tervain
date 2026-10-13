# Grass mover history reuse

The world collects animal grass movers on each update. It previously replaced each active animal's private `{ x, z }` history and allocated a new seen-set every call, even for steady movement. The change updates existing history records in place and clears a per-world set. Histories still disappear when an animal becomes inactive, so reappearance starts with zero velocity. Returned mover records remain fresh.

## Compiled-build reproduction

Run `tools/repro-grass-history-allocations.mjs` against previews of the before and after production builds:

```sh
node tools/repro-grass-history-allocations.mjs --url "$BEFORE_URL" --expect fresh --out before-proof
node tools/repro-grass-history-allocations.mjs --url "$AFTER_URL" --expect reused --baseline before-proof/report.json --out after-proof
```

The script uses native Chrome software WebGL, starts the actual build and calls its compiled mover collector with five controlled actors for 120 updates. One actor disappears for ten updates, returns, and another teleports; one call uses zero `dt`. It counts retained object identities and compares a hash of every emitted mover and history value. Optional `--driver` selects a CDP launcher module; the isolated launcher from #397 was used for the after run.

| Counter | Before | After |
| --- | ---: | ---: |
| History record identities | 590 | 6 |
| Seen-set identities | 120 | 1 |
| Inactive/reappearing/teleport assertions | pass | pass |
| Output/history snapshot hash | `794ed99bdaa92b88f1ef6dddd9abfa9515915bb07b82f235dd2690b65a448f22` | identical |

Receipts: [before](grass-history-proof/before.json), [after](grass-history-proof/after.json). Before build metadata is `e3b274bca`, whose application source is unchanged from main `0b45a36a0`; its differences are diagnostic tooling. The after build was compiled from the source subsequently committed as `913b7e23b`; its generated version metadata still reports the base revision because compilation preceded the commit.

Production build/type check and 23 existing grass-trample/foliage tests passed. This is a CPU allocation check on Low for software-renderer startup; the collector is shared across presets. It does not measure all allocations, garbage collection pauses, GPU cost or hardware frame times, and does not attribute any recorded hitch to these allocations. No visual output is changed.
