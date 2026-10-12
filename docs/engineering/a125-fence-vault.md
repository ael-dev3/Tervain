# Fences: a wall to walk into, a vault to cross (A125, 0.0.14)

Ael's playtest 4: the hero glided over the field fences as if up a ramp, and could not jump them. A fence's collider rose
only to its top rail, about 1 m. The hero steps up anything within 0.8 m, so on any slope the rail came within a step,
and he walked onto it and along it. A jump peaks at 0.86 m and never cleared it.

**Change.**

- A fence blocks as a wall 0.6 m above its top rail (`FENCE_WALL_LIFT`), so it is never a step and never a floor. The
  camera ignores fences: it is seen through, and its wall pulled the camera to a metre from the hero when it swung across.
- Jump, facing a fence within 0.85 m of it, is a vault: a 0.55 s arc from this side to open ground 0.7 m beyond. It
  needs the far side walkable, within 0.6 m of the hero's height and clear of other fences, and the hero facing the
  fence squarely enough (within about 57°). Anywhere else a jump is an ordinary jump. A vault costs a jump's stamina
  and lands with its sound.

**Checked** on the dev build with real keys at a field fence: Space carried the hero from 0.67 m on one side to 1.02 m on
the other, his feet peaking 1.25 m up over a 1.04 m rail. Walking straight into the fence from the far side stopped him
against it with no rise.
