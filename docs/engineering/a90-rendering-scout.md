# Fourth bug scout: rendering and long sessions (A90, 0.0.13)

A last read covered the rendering pipeline and what changes over a long session, the areas the three earlier scouts
left. The one fault A89 noted but did not change is fixed here too. Each fault was confirmed against the code, and its
test fails without the fix.

| Fault | Fix |
| --- | --- |
| **The film grain broke into blocks over a long session.** Its pattern was picked from an hours-long clock added to the pixel's position: after four hours a single float no longer told neighbouring pixels apart (2,666 grain values across a 64-pixel block at the start, 241 after four hours, 61 after ten). | The grain's clock starts again every 4,096 s, a whole number of its 24 patterns a second. |
| **Shadows shimmered while walking.** The sun and its target were each rounded to the shadow grid apart, which tilted the light by up to 0.005 rad as the player moved, more than A71's steps for the sun's direction. That slid shadows by up to four texels, and walking up a slope slid them too. | The focus is snapped once, in the light's own plane, and the sun set back from it along the exact shadow direction: walking moves the shadow camera without turning it. Shadows in the served build are unchanged. |
| **Leaf, grass and tree sway began to stutter after about nine hours.** Their clocks reached 2^15 s, where a single float moves in 4 ms steps. | The shaders get these clocks modulo 2^14 s. The cost is one small jump in the sway about every four and a half hours. Slow motions (cloud drift, star twinkle, the sea) stay precise for far longer and are left as they were. |
| **One frame that threw an error broke the GPU timer for the rest of the session.** Its query was never ended, and every later one failed. | A frame begins by ending and letting go of a query left open. |
| **Stepping down from the deer at the realm's edge could set the rider up to 2.2 m beyond it.** (Noted in A89.) | Only spots inside the realm are stepped down to. |

Found sound by the same read:
- **Render targets:** the grade's and the water pass's follow resizes and quality changes.
- **Tree level of detail:** cross-fades, and refreshes after a teleport.
- **Streamed grass tiles:** release with hysteresis, are pooled, and never exceed their buffers.
- **Trample field, pools and caps:** the field handles recentring and teleports; leaf bursts, splashes, ripples, arrows
  and impact marks all have their pools and caps.
- **Listeners:** none are added per frame or per world in the rendering code.

The bow is a hunting bow, as its description says ("brings an animal down"): arrows not harming bandits is the design,
not a fault.
