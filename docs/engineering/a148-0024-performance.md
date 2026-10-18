# A148: 0.0.24, performance merges since 0.0.23

- Adds #657 (foliage mover uniform slots cached with the shake uniform cache, so unchanged uploads are skipped), #658 (wildlife bone uploads cached when unchanged) and #659 (leaf batch bounds limited to leaf geometry, so culling no longer counts trunks, roots and other LODs).
- Each merged head carried a play-gate PASS line. The budget gate passes against live: draws and triangles not above live, no console errors.
- The oak floating-clump work is not in this release. An approach that removed cards thinned the upper crown in the same-pose check, so it was not shipped.
