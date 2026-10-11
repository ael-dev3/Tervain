# The wanderer turns with authored steps too (A85, 0.0.13)

A83 gave the residents' turns on the spot their steps from Meshy's Idle Turn Left and Right. The wanderer still stepped
from his own walk. His skeleton is his own, but it matches the residents' library rig joint for joint under Mixamo
names, which is how he already swims with two of their clips (A65).

## Change

- **Clips:** once the residents' library is here, the two authored turns are retargeted onto his skeleton the same way
  as the swim clips (`heroTurnClips`, sharing the swim clips' retargeting).
- **Steps:** his turning steps are rebuilt from them with A83's `authoredStepPoses`. Each leg's pose is the authored
  change applied to his own stance, without the clip's hip turn, and only where it lifts the foot.
- **Fallback:** without the library, he keeps the steps from his walk.
- **Credits:** none. No new clips; the library already holds them.

## Checked

- **Tests:** the A71 quarter-turn test now runs for both his walk's steps and the authored ones. With the authored
  steps, the lifted leg's pose differs from the walk's. In both cases:
  - planted feet slide under 2 cm at 30, 60 and 120 Hz;
  - the turn completes;
  - his feet come home;
  - there are no pops.
- **Served build:** turning a quarter turn on the spot through his own controller. The step that rose like a stride
  now lifts lower, and the pose is sound in every frame.
