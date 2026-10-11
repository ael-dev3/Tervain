# Leaf atlases feathered at their tile borders (A110, 0.0.13)

## What was left of the crowns' cut look (backlog 9)

The leaf atlases of the woodland trees are 8 by 8 views of 256 px each, taken from their Meshy sources. Many leaf
clumps run off the edge of their view and are cut there. On a leaf card that cut is a ruler-straight line, and where
it falls on a crown's outer shell it shows in the crown's outline against the sky. No shader ramp can soften it: the
texture itself goes from leaf to nothing in one step.

## Change

`tools/flora/feather-leaf-atlases.py` fades each view's alpha over its last 18 px (smoothstep), so a clump at the
border thins out instead of ending in a line. It then splices the new image into the tree's near file, shifting every
later buffer offset, and verifies that the image round-trips. The middle and far files borrow the near file's images,
so all three distances change. It also updates the tree receipts and the model ledger, and
`tools/model-files.mjs` refreshes the size and hash table.

- **Changed:** the 11 atlases whose every leaf triangle lies inside one view: fir-spire, oak-elder, palm-fan,
  palm-lean, tree-0208, tree-1505, tree-1521, tree-1537, tree-4815, tree-4949, verdant-sentinel.
- **Left as they are:** palm-date, tree-1459, tree-1527 and tree-3106. About 8% of their cards span two views, so
  fading the borders would cut into leaves.
- **Encoding:** WebP at quality 100, with the alpha exact. Colours stay within 47.6 dB of the source on opaque pixels.
  The new files total slightly smaller than the old.
- **Budgets:** no triangle changed, and no Meshy credit was used.

## Checked on the GPU

Served builds of main and of this change, from ael's playtest crown cameras, High at 11:00. Clumps cut by their view
now taper out, and the outline is a little softer. The crowns are no thinner and have no new gaps. Nothing depends on
distance or level of detail, so nothing pops.

The receipts, ledger and size table tests pass. `tools/check-meshy-trees.mjs` fails on main and here alike: it is the
0.0.12 audit, written before these files carried WebP and meshopt.

Together with A107's softer shell ramp, this is as far as backlog 9 goes without new crown exports.
