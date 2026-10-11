# Tenth pass of bug scouts (A103, 0.0.13)

The tenth pass read:
- the HUD and panels;
- the world's streaming and rendering;
- the physical props.

Each fault was confirmed against the code. Those marked *(test)* have a test that fails without the fix.

## Rendering

| Fault | Fix |
| --- | --- |
| **The water-only draw wiped the sun's shadow map every frame**, by day on Medium and High with water in view. It runs after the main draw, and redrawing the shadow for the water layer alone first cleared it. The next frame's reflection and the window view then read an empty map, and every frame paid for a second shadow pass. *(test)* | That draw leaves the shadow map alone, as the reflection and window captures already did. |
| **Gull wingbeats, chimney smoke, drifting clouds and stars used clocks that were never wrapped.** Past about nine hours of world time their motion moved in visible steps. | They are wrapped like the grass and sway clocks (A90). |

## Props

| Fault | Fix |
| --- | --- |
| **The stone steps before every house door did not exist for props.** A crate set on a doorstep sank 0.48 m to the ground beneath, inside the stone. *(test)* | The physics world has the same treads Terrain stands on. |
| **A barrel that fell asleep in the surf never floated again.** The sea moves on its own clock without the re-solve that wakes props. | A sleeping prop the sea reaches is woken. |
| **A respawn moved the hero's physics body from where he died to the checkpoint as one swept step.** | A move of over 4 m in a frame places the body instead of sweeping it. No gait moves that far. This could not be made to fling a prop in the test world, so it is kept as a guard. |

## Panels

| Fault | Fix |
| --- | --- |
| **A rebind's outcome was never seen.** It went to a toast, and toasts are hidden under the title and the pause menu: "Jump bound to E. Interact is now on Space" went unseen, and so did the news that an action lost its key. | The rebuilt settings panel shows it in a status line, which screen readers announce. |
| **Reset to defaults with a different Quality left nothing focused**, so keyboard and controller could not act until Tab or a D-pad press. The control was redrawn during the world rebuild, and focus went back to the old, removed one. *(test)* | Its redrawn successor takes focus. |
| **The satchel, journal and map made their closing sound only when closed with their own key.** Escape, the Close button, gamepad B and the backdrop were silent. *(test)* | The sound plays however they close. |

## Read and left as they are

- **Trees are chosen for the main camera's view, and the reflection and the window view reuse that choice.** Trees behind the camera are missing from a window's rear faces, and trees just above the frame from a steep reflection. Choosing per view would cost a pass over every tree for each capture; recorded as a limit.
- **The water clock is not wrapped.** Floating props read the same clock for the swell, so wrapping it means wrapping both by whole swell periods. Recorded for a later pass.
- **A hero who presses against a barrel at a blocked edge can still nudge it**: the physics pushes props as part of a move the game then refuses. Fixing it means reworking how pushes are applied.

## Found sound by the same reads

- **Grass streaming:** the tile pool is bounded by its peak, a teleport fills the view at once, and tile bounds include wind and trampling.
- **Instances and targets:** furniture instance bounds are recomputed when moved. Render targets and MSAA resize with the canvas.
- **Quality changes:** a change rebuilds the world, so nothing of the old preset is left behind.
- **Saved props:** saved poses are checked, normalised and come to rest. Stepping is fixed at 1/60 s.
- **HUD:** bars, prompts, captions, the hotbar, panel stacking and relocking on close are sound.
