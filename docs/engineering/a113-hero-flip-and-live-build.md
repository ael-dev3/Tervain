# The hero no longer flickers; the hosted build names its commit (A113, 0.0.13)

## The flicker

**Seen.** In real play the hero flickered between a full-size figure and a small, crouched one, many times a second.
It happened whenever he faced more than a quarter turn away from the world's +Z axis, so about half of all headings.
Hiding, culling, shadows and the camera were all steady. The pose itself alternated: on some frames the hips sat
0.15 m above the ground and the head at ground level.

**Cause.** The fixed-step simulation (A72) draws moving objects between their last two steps. To do that it writes
each object's quaternion, then puts the latest one back after the draw. three rebuilds an object's Euler angles from
a written quaternion. For a heading past a quarter turn the rebuilt angles take the other valid form, (π, π − yaw, π).
Gameplay then sets only `rotation.y`, which kept the two π terms and turned the root upside down. The next draw blended
between the flipped and the upright root, and that alternated with the number of steps in each frame.

**Change.** Each recorded step also keeps the Euler angles exactly as gameplay wrote them, and restoring puts those
back rather than the quaternion. Residents, enemies, animals, props and arrows go through the same path, so the same
fix covers them.

**Checked.** A unit test fails without the change and passes with it. In a served build on the GPU, the hero was
walked with real key events after the pause menu, and the canvas was copied after every draw. Before: big and small
figures alternate. After: 48 consecutive frames, all upright.

## Which build is live

The hosted build at https://ael-dev3.github.io/Tervain/ deploys on every merge to `main`. Its assets carry content
hashes, but GitHub Pages lets browsers keep `index.html` for ten minutes, so a page opened soon after a merge can be
the older build.

- The title and pause screens print the version with the commit it was built from (`v0.0.13 · 1a2b3c4`).
- Each build publishes `version.json` (version and commit). On start, the game fetches it past every cache. When the
  live commit differs from the running one, the game reloads once (at most once per commit, so it cannot loop).
- If a newer build goes live during a session, opening the pause menu shows a notice with a reload button.
