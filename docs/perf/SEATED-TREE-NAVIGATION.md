# Navigation follows final seated tree wood

Related: #326 tree/root and movement checks. Target: [published 0.0.18](https://ael-dev3.github.io/Tervain/), revision 421d34b.

## Repro and cause

The oak near **(-228.28, 5.01)** has a planted navigation radius of **2.556 m**. Seating its root flare lowers the whole source tree another **0.384 m**, bringing outer wood into the existing walking-height slab. That slab requires **8.274 m** after seating, but navigation still uses the earlier radius.

On the published build, cell centres **(-223, -1)** and **(-221, 3)** are marked walkable while the actual standing-player Rapier capsule intersects that oak's finite wood. Three further cells near the oak at **(-173.93, 7.32)** have the same failure. These cells can be selected as route goals despite their physical obstruction.

The original radius matches a fresh pre-flare computation exactly for all 22 affected trees, confirming the stale seating order rather than a different source geometry. No tree moves in the fix.

## Fix

Register an optional navigation radius from each tree's **final** seated transform. Navigation uses it for grid occupancy; the collider index covers its extent. Original circle radii continue to serve normal collision, camera and ground-cover queries, preserving placement and grass generation. Source-exact physical wood is unchanged.

The existing conservative 2.6 m walking-height policy remains. It adds 525 blocked grid cells and opens none. The replay checks 29 routes (eight main links plus scheduled commutes); all remain reachable. Other untested route/goal combinations still need gameplay review.

## Self-verification

```sh
node tools/repro-live-seated-tree-navigation.mjs --url https://ael-dev3.github.io/Tervain/ --out seated-tree-nav-proof
```

The script captures the published forest's actual source variants and seated transforms, then runs the production registration, collider and navigation code on copies of the full native collider set. The reconstructed baseline grid must match the published grid exactly. It independently tests the native standing capsule against the real Rapier wood colliders.

[Receipt](../../proofs/seated-tree-navigation/report.json) · [before](../../proofs/seated-tree-navigation/before.png) · [after](../../proofs/seated-tree-navigation/after.png).

- Open navigation cells intersecting native wood: **5 → 0** among the discovered cases; goal snapping also moves off all five.
- Affected final tree footprints: **22**; pre-seating radius controls all match.
- Existing checked routes reachable: **29 → 29**.
- Normal collision query disagreements: **0** across the inspected tree regions.
- Native camera path (120 steps) and Grade/post pixels: **identical**.

The images show the actual oak/branch area. They are intentionally identical: this fixes navigation, not tree styling, floating foliage, shimmer or terrain contact. Software WebGL provides rendering proof; no hardware frame-time improvement is claimed.

Validation: production build and **50 focused tests pass**, including collider/navigation/population tests, all preset/LOD pine integration cases, Meshy route checks, cooperative navigation construction and stockade navigation. The canonical pine fixture now includes final navigation bounds while still comparing the complete original physical collider data.
