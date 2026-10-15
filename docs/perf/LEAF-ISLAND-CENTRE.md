# Transparent centres can bypass the load-time foliage repair

The runtime `anchorLeafIslands` repair accepts the opaque bounds' centre as a wood contact. A cutout's centre can be transparent. The nearest-move calculation also includes that centre, so changing the initial contact predicate alone would still skip the repair.

This is separate from the diagnostic audit correction in #489: it reproduces the same failure in the production load-time repair itself. This PR changes only diagnostic tooling and evidence; it leaves production tree appearance untouched.

## Reproduce

`node tools/repro-leaf-island-centre.mjs --baseline 421d34b --out leaf-island-centre-proof`

A triangle has opaque tips but a transparent centre near a small wood cube. The actual production repair reports zero islands and leaves the positions unchanged although the nearest sampled opaque point is **2.9 m** from wood, beyond the requested **0.5 m** reach.

The fixture includes an explicitly diagnostic reference: retain every opaque N=6 sample, and use only opaque samples for masked contact and move origins. It finds/moves one island and leaves its nearest opaque point **0.4 m** from wood. A genuinely supported opaque tip and an entirely opaque cutout both remain unchanged. This reference is not a shipping visual patch or an approved repair policy.

[Receipt](proofs/leaf-island-centre/report.json) records baseline/support/reference hashes and all controls. [Native context](proofs/leaf-island-centre/fixture.png): left is the production false pass; right is the diagnostic reference movement. Native WebGL has no error/context loss. Existing leaf-island/surface-site tests pass.

## Minimal fix direction to evaluate

- Keep the bounds-centre probe for broad rejection, but require a real opaque point to establish masked contact.
- Remove transparent centres from masked movement origins too.
- Preserve real interior contacts on opaque cards. Merely deleting centre probes while retaining the first six biased samples can lose valid contacts.
- Bound retained samples and check load allocations before adopting a fix. The reference retains up to 28 points per triangle instead of six and is intentionally not a production performance proposal. A bounded extra sample nearest the centre could be evaluated with scratch storage.

These samples and bounds links are approximate. Contact of one sample does not prove every disconnected opaque island inside a triangle is attached. This synthetic counterexample does not give a live forest island count, visual score or hardware timing result; native asset and walk-clip gates are still required for any production change.
