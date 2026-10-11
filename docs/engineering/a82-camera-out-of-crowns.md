# The camera keeps out of tree crowns (A82, 0.0.13)

The one playtest fault A81 left open was the crowns seen from inside: from among the branches, a tree's wood (some
8,000 triangles a tree, within the 20,000-triangle budget) filled the screen with flat facets and the leaf cards near
the eye with dark blotches. The owner's views of it were all taken from 4–8 m up, inside a crown. In play the follow
camera gets there: its boom is 6.2 m (up to 9 m) and tilts up to 1.25 rad, so looking down beside a tree put the lens
among the limbs.

Two cheaper fixes were tried first and dropped, each having made no visible difference at those views:
- **Wood normals recomputed** from the simplified shape: the shading was not the cause.
- **Wood faded within 1.4 m of the eye**, as the leaves are: the facets in view were 2–5 m away.

## Change

Each leafy tree's crown is the ellipsoid its leaves fill, placed as its instance is (`CrownIndex`, built with the
forest). The follow camera keeps out of a crown's core, three quarters of its size, where the limbs are
(`crownBoom`):
- **Pulling in:** the boom is drawn in quickly but not at once (it never snaps as it does for walls). It lets out
  slowly as before, and is never shorter than 1.6 m.
- **Where it stays free:** below 2.6 m above the tree's foot, among the low leaves, the camera moves freely. A crown
  that holds the wanderer's own head is passed over.
- **Unchanged:** walls and the ground still shorten the boom at once.

## Checked

In the served build, the real follow camera beside the oak of the owner's crown views, tilted down from four sides:
- **Where the boom went into the crown's core** (4.7 m instead of 6.2 m), the screen of leaf masses and branches is
  gone, and the wanderer and the ground under the tree are seen.
- **The three views where the camera stayed below the core** are unchanged.

Unit tests cover the boom limit, the floor, a crown that holds the wanderer, and the crowns' neighbourhood lookup.

No Meshy credits spent; no triangle budget changed.
