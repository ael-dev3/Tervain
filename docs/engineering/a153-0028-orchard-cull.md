# A153: 0.0.28, orchard cards beyond the audit reach are culled

- Trace of tree:orchard:0:2 (5,674 cards, 12,750 wood vertices): 188 cards lie 1.51 to 1.78 m from the nearest wood vertex; the audit's 298 counts components.
- The orchard path culls any card whose centre is farther than 1.5 m from wood after the twigs are grown. No card moves. The oak path is unchanged.
- Audit (lod 0, alpha false, gap 0.75, woodReach 1.5): tree:orchard:0:2 detached cards 298 → 143 (one clump remains). Orchard totals: 949 → 239 detached cards. Oak unchanged at 530 clumps.
- Budget gate against live 0.0.27: draws 237 (flat); triangles 2,859,645 (live 2,863,131, lower); console errors 0.
- Same-pose orchard-target captures (live 0.0.27 vs this build): crown coverage matches.
