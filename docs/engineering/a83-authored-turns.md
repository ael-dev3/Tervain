# Authored turns on the spot (A83, 0.0.13)

The one animation item the handover left open (backlog 6) was authored turn clips. Since A71 a resident turning on the
spot has stepped with poses taken from their own walk: each leg's mid-stride pose at 60%, eased in and out, with the
planted foot held and the lifted one carried to where it lands. It reads as a stride marched in place, the foot kicked
forward rather than stepped round.

## Clips

Two actions from Meshy's animation library, Idle Turn Left (576) and Idle Turn Right (586), were applied to the same
reference rig as the residents' other 40 clips, while Meshy still held it, so they share its skeleton exactly
(`build-motion.mjs` checks every joint's rest against the reference to within 1e-4).
- **Cost:** 9 credits.
- **The library:** it now holds 42 clips, 27 KB larger. The other 40 clips carried over from the shipped file within
  one 16-bit quantisation step.
- **Tools:** the rig tools' GLB reader now decodes EXT_meshopt_compression, so a shipped, compressed library can be
  rebuilt from.

## Stepping from them

Each leg's stepping pose comes from the authored turn toward that side (`authoredStepPoses`):
- **The pose:** at the moment the clip bends that leg's knee most, the change each of the leg's joints has made since
  the clip began, applied to the figure's own stand pose.
- **Hips:** the clip turns its hips as it steps, and the game turns the body itself, so the thigh's turn about the
  vertical is taken out.
- **Lift:** only a leg the pose lifts at least 2.5 cm keeps it. The right turn shuffles its right foot round rather
  than stepping it, so that foot keeps the walk's step.
- **Unchanged:** the step timing, the foot planting, the head and chest leading the turn, and the fades.

The wanderer still steps from his own walk: his skeleton and clips are his own, not the residents'.

## Checked

- **Tests:**
  - For a real resident, the feet that step lift at least 2.5 cm.
  - The knee opens into the turn by less than 70°; with the clip's own hip turn left in, it pointed past square.
  - At least three of the four steps come from the authored clips.
  - The A71 turn test still holds: planted feet slide under 2 cm at 30, 60 and 120 Hz, the feet come home, no pops.
- **Served build:** the village baker turned a quarter turn on the spot. Frame by frame, the step that kicked forward
  now lifts lower and lands turned into the turn.

Meshy credits for trees and fingers: 39 of 100.
