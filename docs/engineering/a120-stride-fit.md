# Feet that stay where they land (A120, 0.0.13)

Ael saw the hero's feet skate. A probe on the live build tracked each ankle while walking and running with real keys
and measured how fast it moved over the ground during stance (ankle within 3 cm of its lowest point). The planted foot
crept **forward**, along the direction of travel. The clips' soles sweep a little less ground per gait cycle than the
game's stride lengths allowed, so the body outran the stance.

**Change.** Shorter strides per cycle: walk 8%, run 5.5% (`HERO_STRIDE_FIT`). Cadence rises to match the ground
covered. No leg is bent away from its clip.

Ankle drift along the direction of travel during stance (m/s; walk 1.65 m/s, run about 5.5 m/s):

| | Walk left | Walk right | Run left | Run right |
| --- | ---: | ---: | ---: | ---: |
| Before (live) | +0.077 | +0.185 | (+2.80)* | +0.487 |
| After | −0.027 | +0.059 | +0.392 | +0.268 |

\*At a run the swinging foot passes within 3 cm of its lowest point, so that column includes swing frames. It is not a
clean stance figure in either row, though its 8 m/s spikes are gone.

An IK lock holding each foot at its landing point was tried first and not kept. It needed up to 19° of thigh rotation
away from the clip at a run, and when stopping it let the planted foot slide into the stand.
