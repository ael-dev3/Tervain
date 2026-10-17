# Respect active body contacts at fence-vault landings

A separate fence-only landing check tests every registered box in 2D, including inactive rails and rails wholly above or below the player's body. It runs before the normal active/height-aware body check. Consequently an irrelevant neighboring rail can reject a clear vault or change which rail is selected.

Remove that redundant check. The existing body-height landing query and swept arc checks still reject actual obstacles. This changes no vault arc, clearance radius, animation, art or camera behavior.

## Published controller repro

```sh
node tools/repro-live-vault-landing-state.mjs --out live-vault-landing-state-proof
```

The tool defaults to https://ael-dev3.github.io/Tervain/. On 0.0.18 · 421d34b it uses the native controller, context and authored field fence, placing a controlled neighboring collider at the clear landing. Only the candidate selector method is borrowed from source.

| Neighbor state | Landing body blocked | Published selector | Candidate |
| --- | --- | --- | --- |
| Inactive | No | Rejects | Exact clear-control vault |
| Above body/arc | No | Different, higher vault | Exact clear-control vault |
| Buried below body | No | Rejects | Exact clear-control vault |
| Active body obstruction | Yes | Rejects | Rejects |

In the native overhead fixture, the selected peak is 7.101 m before and 2.789 m after, with the latter matching the clear control. This is an injected neighboring collider, not a claim that a naturally occurring inactive rail was encountered during a walk. [Native receipt](../../proofs/vault-landing-state/live.json).

## Deterministic coverage

```sh
node tools/repro-vault-landing-state.mjs vault-landing-state-proof
npx vitest run tests/presentation/playerMotion.test.ts
npm run build
```

The actual source selectors and real `Colliders` run 288 cases: eight rotations, three slopes, three takeoff distances and four neighbor states. All 216 irrelevant-neighbor cases fail before and select the exact clear-control vault after. All 72 active-obstacle controls remain blocked.

[Summary](../../proofs/vault-landing-state/report.json), [complete cases](../../proofs/vault-landing-state/cases.json.gz), software-WebGL diagnostic diagrams [before](../../proofs/vault-landing-state/before.png) / [after](../../proofs/vault-landing-state/after.png). The gray box represents the controlled inactive collider; the capsule illustrates the rejected start or accepted mid-arc. These are collision diagrams, not full-game visual approval or a recorded organic approach.

The new real jump-input regression fails in 24 of 32 cases on the baseline; all 92 motion tests and production build pass with the fix. This does not supersede the separate slope/rail, cargo or actor arc fixes, prove every vault approach clear, or provide hardware frame-time evidence. Hardware play gate remains required before shipping.
