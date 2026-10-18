# A154: 0.0.29, orchard culling matches the audit's world reach

- The 0.0.28 cull compared a local distance with the audit's world-metre reach. PR #672 converts 1.5 m with the orchard maximum scale (1.15) before culling.
- Target tree:orchard:0:2: detached cards 143 → 0; all nine orchard trees 239 → 0.
- Budget gate against live 0.0.28 (30d1f0d): draws 225 (live 237); triangles 2,421,092 (live 2,863,509); console errors 0.
- Same-pose target captures (proof in docs/perf/ORCHARD-WORLD-REACH-FIX.md): silhouette and density held in the before/after pair.
