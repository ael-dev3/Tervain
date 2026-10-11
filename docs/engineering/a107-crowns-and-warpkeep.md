# Crown edges and the Warpkeep records (A107, 0.0.13)

## Crown silhouettes, without new exports (backlog 9)

The leaf cut-out already ramped over about two pixels under alpha-to-coverage (A75). Crowns kept their body with
distance by a lift of alpha per mip level, and leaves thinned between masses on the outer shell (A76). Against the sky
the crown's outline still read as the cards' own cut shapes.

**Change.** On the crown's outer shell the ramp widens, rising smoothly with the leaf's depth in its crown from about
two pixels to about three and a half. Inside the crown nothing changes. The width follows depth continuously and does
not depend on distance or level of detail, so nothing pops.

**Checked on the GPU** in served builds of main and this change, from ael's playtest crown cameras:
- **Widened 2.5 times:** the fringe cards went pale and hazy. Rejected.
- **Widened 1.8 times:** the outline feathers against the sky, and the cards stay solid. Kept.
- **The close views:** they do not change, since near leaves already give way.

What remains for item 9 needs new crown exports, which in turn need a Meshy key.

## Warpkeep per-set provenance (backlog 11)

`tools/model-ledger/warpkeep-provenance.mjs` writes [warpkeep-provenance.json](warpkeep-provenance.json), one record
per set. The tool recomputes every file's SHA-256 and size, and all 209 match the archive manifest. Each record holds:
- the set's assets, files and bytes;
- its source folders in Warpkeep `786c0b2`;
- the copyright and exporter lines its files embed;
- its terms status (`LicenseRef-Warpkeep-Provenance-Required`);
- its use in Tervain: archive-only, so no Warpkeep file is served or loaded.

The summary table is in the [model ledger](model-licenses.md#warpkeep-per-set-provenance-a107). These are provenance
facts only. They assert no open-content licence and no commercial clearance.

Backlog 11 now waits on one question alone: where the animated hero's Mixamo-named skeleton and clips came from.
