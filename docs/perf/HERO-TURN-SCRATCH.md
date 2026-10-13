# Hero turn-axis scratch reuse

Each living hero pose allocated a new up-axis vector and a quaternion for its scene orientation, including idle poses with no turn. Keep these two scratch objects on the controller and reset their values before use. This removes two discarded objects per pose without changing the turn axis, authored animation, timing or skeleton results.

## Native proof

[Receipt](hero-turn-scratch-proof/report.json): the actual compiled hero controller over 120 turning poses, compared with a capture-only control that gives it fresh scratch objects every pose, matching the previous behavior.

| Scratch object | Fresh-object control: distinct identities | Candidate: distinct identities |
| --- | ---: | ---: |
| Vector | 120 | 1 |
| Quaternion | 120 | 1 |

All local positions, rotations and scales for all 66 native bones match exactly on every pose; the complete pose sequences have identical SHA-256 hashes. This measures these two scratch objects only, not all frame allocations, heap bytes, GC frequency or hardware timing. It is not a claim to resolve a particular recorded hitch or establish Apple frame rate.

The receipt separately identifies the candidate source commit; the compiled version metadata identifies its base. Type check, production build and all 10 existing turn-step tests pass, including planted feet and continuity at 30/60/120 Hz.

## Reproduce

Build and serve the candidate, then:

```sh
node tools/repro-hero-turn-scratch.mjs --url "$TERVAIN_URL" --out hero-turn-scratch-proof
```

The check fails on any native bone-pose mismatch or unexpected scratch-object identities. Live hardware verification remains separate: https://ael-dev3.github.io/Tervain/ and [LATEST.md](LATEST.md).
