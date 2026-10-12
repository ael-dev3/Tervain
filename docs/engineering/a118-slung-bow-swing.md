# The slung bow swings (A118, 0.0.13)

Seen from behind, as Ael plays, the bow on the hero's back held the same diagonal in every frame of a walk or a run.
It was fixed rigidly to the upper spine, so it moved only exactly with his chest.

**Change.** A pivot between the strap and the bow carries a damped pendulum in the plane of his back (1.6 Hz, damping
0.25), driven by the sideways and vertical acceleration of the strap point, with a small vertical spring for bob. Both
are clamped (±5.2°, ±2.5 cm), ignore teleports, and settle back to the strapped pose when he stands still.

**Measured** on the dev build, reading the pivot every frame while walking and running with real keys:

| | Swing | Bob |
| --- | ---: | ---: |
| Walk | −1.6° to +2.1° | −0.3 to +0.4 cm |
| Run | −5.2° to +5.0° | −0.8 to +1.0 cm |
