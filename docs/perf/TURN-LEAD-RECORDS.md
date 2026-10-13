# Reuse turn-lead quaternion records

The head/chest turn layer saves each affected bone's before/after quaternions so a turn does not accumulate on joints an animation clip leaves untouched. It recreated these pairs every active pose. Each actor's `TurnLead` now reuses its pairs after restoration has completed, keyed weakly by bone. The standalone helper retains its fresh-record behavior unless a cache is supplied.

No authored pose, turn rate, step timing, joint share or restoration rule changes. Map bookkeeping and caller allocations remain; this does not eliminate all pose allocations.

## Native proof

[Receipt](turn-lead-record-proof/report.json): the actual compiled method on the native hero's three-bone turn chain, comparing a fresh-record control with the candidate. Fifty active poses are followed by ten zero-lead poses. Alternate frames leave the previous turn intact to exercise restoration.

Quaternion clones within the measured operation fall from **300 to 6**: one initial before/after pair per bone, then reuse. All 66 bones' local transforms and every held before/after quaternion record match exactly throughout the sequence; complete sequence hashes match. Both held maps are empty after fading to zero.

This measures quaternion clones in this operation only, not all allocations, heap bytes, GC frequency, frame timing or a specific recorded hitch. The captured source commit is recorded separately from base build metadata. Type check, production build, all 10 existing locomotion tests and a new restoration/edit/fade regression pass. The regression compares the existing standalone helper with actor reuse under transformed roots and observes 150 versus six clones.

## Reproduce

Build and serve the head, then:

```sh
node tools/repro-turn-lead-records.mjs --url "$TERVAIN_URL" --out turn-lead-record-proof
```

The check fails on any bone/held-record mismatch, unexpected clone counts or failure to release held poses. Hardware play-gate verification remains separate: https://ael-dev3.github.io/Tervain/ and [LATEST.md](LATEST.md).
