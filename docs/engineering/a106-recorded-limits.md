# Recorded limits, taken up (A106, 0.0.13)

Three limits recorded by the A103 pass were taken up again:
- refused moves that still pushed cargo;
- the window view's trees;
- the water clock.

## Refused moves no longer push cargo

**Fault.** Asking the physics world where the hero could step also pushed any loose body in the way. Rapier's character
controller applies its impulses inside that query, so a step the game then refused still shoved the barrel. Walls,
deep water, too high a step and crowded doorways all refuse steps, and each refusal retries along each axis alone.
That made up to three shoves per sub-step. In a test, querying alone moved a crate 3.3 m. *(test)*

**Fix.** The query no longer pushes anything. A step the game accepts pushes the bodies in its way, along the step the
hero asked for: a crate he leans on still gives way at the same pace as before (0.17 m in two seconds, measured both
ways). *(test)*

## Trees in the window view: checked on the GPU, left as they are

The windows' captured view reuses the main camera's choice of trees, so a cube face looking away from the camera can
miss trees behind it. A per-face choice of trees was built and tried in the served build on the GPU. It was compared
before and after from the shrine's middle, looking at each of its four walls. No view showed any difference. The panes
show the outside roughly along the line of sight, where the trees are already chosen. The change cost an extra pass
over every tree on each capture frame, so it was not kept.

## The water clock: left as it is

The water's clock is kept in double precision on the CPU; only its copy in the shaders loses precision, after about
nine hours. Wrapping that copy would set the drawn wind waves out of step with the ones floating props ride, a worse
fault than the one it removes.
