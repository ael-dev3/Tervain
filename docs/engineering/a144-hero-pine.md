# A144: the hero pine replaces the solitary pine, and the play gate stops counting scripted moves as jumps

## Hero pine (on by default; `?heropine=0` turns it off)

- `tools/tree-gen-pine` grows four seeded variants in near, mid and far models. The crown now starts at 26 % of the height (it was 36 %), limbs are longer, needle pads are larger and run along the limb from 20 % of its length (they sat in its outer half), and the mid model keeps pads down to a size factor of 0.72 (it kept only the tips, so the 30 m view showed bare limbs).
- Bark: softer relief (normal gain 3.4 against 5.5), lighter furrow occlusion (0.52 against 0.28 at the floor) and a warmer albedo.
- Needle colour: the conifer atlas is a pale grey-green and the foliage shader pulls saturation back, so the needle tint is 0.63, 0.68, 0.31. A same-camera capture at 30 m and 11:00 measured the crown's mean colour at 149, 152, 110 against the solitary pine's 153, 154, 114. `?pinetint=r,g,b` overrides it for look development.
- Budgets: near 9,800 triangles (largest variant 9,128), mid 4,300 (4,188; it was 3,700 before the lower-limb pads, and a hundred mid pines in view add under 1 % to the scene), far 320 (it was 300; the crown starts lower).
- Placement, colliders and seating still read the solitary pine's footprint, so no tree moves. The placement audit reports no floating root.
- Loading: the hero pine files count in the load progress as their own family and load in parallel with the solitary pine.

## Play gate

- The sampler marks the frames after a scripted placement and the frames of the aim camera's designed swing; the hero-jump check skips them. Those frames were the only jumps left on a quiet machine: a teleport at a stage start, and the aim swing moving the hero a third of the screen in one hitched frame.
- Frame-time failures on a loaded machine are GPU contention, not the build; the gate passes three runs in a row when the machine is quiet.

## Checks

- Same-camera stills against the live build at 3, 10 and 30 m, and the visual gate at 11:00 and 19:48: bow, vault 18 of 18, placement, shimmer pass.
