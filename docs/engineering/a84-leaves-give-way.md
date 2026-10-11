# Leaves near the camera give way (A84, 0.0.13)

A82 kept the follow camera out of tree crowns. Just below a crown, though, the frame's edges were still filled with dark
leaf masses. Those were leaves 1.6–3 m from the lens, just beyond the near fade A79 gave the cards (0.6–1.6 m).

## Change

The app now tells every leaf material what the follow camera looks at: the wanderer's chest, and a radius
(`FOLIAGE_FOCUS`). This holds only while the camera follows him. It is off in the menu, in a cut, on the benchmark
flight, and in any capture taken with the manual camera.
- **Near fade.** With a focus set, the leaves' near fade reaches further out the further the camera stands back:
  45% of the way to the wanderer, from 1.6 m up to 2.6 m. What grows beside him is never faded.
- **Occluders.** A leaf between the lens and the wanderer gives way within 1.3 m of the line to him. It fades most on
  the line itself, and not at all beyond him.

Both fades go through the cards' alpha to coverage, so a leaf dithers away rather than popping. Shadows, drawn by the
leaves' own depth materials, are unchanged.

## Checked

The real follow camera beside the oak of the owner's crown views (the A82 set), main against this change:
- **Fixed:** the large leaf masses at the frame's left edge (views a, c and d) are gone or thinned.
- **Unchanged:** the wanderer, the trunk and the ground; view b, where the camera was already clear of the crown.
- **What remains in view:** branches, and leaves further than 2.6 m out.

A test checks that the leaf shader takes the focus, that the near fade's reach follows it, and that the focus starts
switched off.
