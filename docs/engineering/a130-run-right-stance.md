# The right foot holds at a run (A130, 0.0.15, playtest item 9)

Foot sliding was measured again at the ball of the foot (the toe-base bone), which stays put through a stance while
the ankle rolls forward over it, with real keys and a GPU. Mean drift along the direction of travel during stance:

| | Walk left | Walk right | Run left | Run right |
| --- | ---: | ---: | ---: | ---: |
| Before | +0.09 | −0.10 | +0.02 | +0.75 |
| Run stride 5% shorter (not kept) | +0.09 | −0.10 | −0.21 | +0.60 |
| After | +0.09 | −0.10 | +0.11 | +0.06 |

(m/s; walk 1.65 m/s, run about 4.2 m/s over the measured stretch.)

The walk holds within ±0.1 m/s, in opposite directions on each foot, which is the clip's own asymmetry. At a run the
left foot was planted, but the **right foot slid forward at about 18% of the body's speed**: the run clip's right stance
sweeps less ground than its left. A shorter stride for the whole cycle (as in A120) only made the left foot slip back.

**Change.** The run clip's time is warped within each cycle (`runClipPhase`, `HERO_RUN_RIGHT_STANCE`): its rate is
1 + gain·(cos 2π(p − c) + cos 4π(p − c)), with c the middle of the right stance and gain 0.11. It plays 22% faster
through the right stance, at its own speed through the left stance, and 11% slower through both swings. A cycle keeps
its length, the left contact keeps its moment, and the right footfall moves by about 1.5% of a cycle. No bone is bent away
from its clip, and the walk is unchanged.
