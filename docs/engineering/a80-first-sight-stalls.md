# First-sight stalls closed (A80, 0.0.13)

A79 left two open items: a 0.26–0.3 s stall the first time the animals' shadows were drawn, and shorter hiccups while
late residents took their models. This round traced every long frame of the first minute of play in the served build
(RTX 3080 Ti, High, 1920×1080, the benchmark route from a new game). Each was attributed by hooking the renderer's draws,
its program list and the GL texture uploads.

## Causes, and what changed

| Cause | Change |
| --- | --- |
| **Lights seen per pass.** three builds each material's program for the lights a pass sees. The passes look at different camera layers (the water's own layer, the shadow casters', the sky's), and the lights sat on only some of them. A pass that saw fewer lights made every material it drew compile another program the first time: 100–370 ms a frame. | Every light is on every layer (`WorldScene.shareLights`). A light lights only what it did; every pass now sees the same lights. |
| **The shadow pass has no fog.** Depth programs key on the scene's fog kind even though they ignore it, and the shadow pass draws without a scene. Programs prepared against the foggy world scene never matched. | The arriving objects' depth programs are prepared against fog-free scenes holding the world's lights, with and without its point lights. |
| **Textures uploaded at first draw.** The animals' maps cost a 160 ms frame when they first appeared. | Arriving objects' textures are handed to the GPU one a frame before they show (`uploadTextures`). |
| **Hidden pieces never prepared.** The renderer's first-view preparation passes over hidden objects: a room's furniture and clutter (shown as the camera comes near, A79), and the deferred furniture's pieces. | Hidden pieces are shown while their programs compile (synchronously; nothing is drawn meanwhile), for arrivals and for the whole world once it opens (`warmShaders`, `warmHidden`). |
| **The driver's first-draw work.** | Each arriving mesh is drawn once into a one-pixel target, a mesh a frame, in the world's own scene and light state, before it shows (`firstDraws`). Only drawable objects are hidden for that draw: hiding the groups the lights live in made it build programs no frame would use. |

## Measured

First minute of play on the route, the game's frame() time, two sessions each:

| | Worst frame | Frames over 100 ms | Frames over 50 ms |
| --- | ---: | ---: | ---: |
| `main` (A79) | 1,148–1,250 ms | 7 | 10 |
| A80 | 138–139 ms | 1 | 10–15 |

The one frame over 100 ms is the world's first. During the first minute, frames of 50–70 ms remain: one at a time,
while a late resident's rig is built step by step and an arriving mesh takes its first draw. No draw on the route
creates a shader program any more, and none takes over 40 ms.

No Meshy credits spent.
