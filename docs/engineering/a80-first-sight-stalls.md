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

## Audit of A78–A80 (fixed)

An independent read of the new preparation, merging, window and wall code found the following, now fixed:

- **Hidden pieces' shadow programs were built for the wrong lights.** When the whole world was prepared, its own
  lights counted on top of the stand-in light scenes, so those programs matched no shadow pass. The world's lights are
  now left out of those two compiles.
- **Preparation outlived a rebuilt world.** Texture uploads and first draws went on after the world was rebuilt or
  disposed, re-uploading released textures (a GPU leak) and drawing into the old scene. Each preparation now stops as
  soon as its world is no longer the one being played.
- **A rig built and never adopted leaked.** A resident's rig was built but still waiting out of sight when the world
  was rebuilt (or its handover failed); it was dropped without releasing its geometries, materials and textures. It is
  now released (test in `residentArrivals.test.ts`).
- **Shadow preparation made a new depth material for every shadow-casting mesh,** for the whole world. There is now one
  per configuration.
- **The window cube's mipmaps were rebuilt after each face;** they are now rebuilt once a refresh.
- **Entering another painted room showed the last room's view** through its panes until the new capture was whole.
  Its panes now show plain daylight until then; the same room keeps its own view.
- **On the stone sluice hut, long corner stones reached about 0.2 m into the front window's opening.** They now stop
  short of it, drawing the same random choices.

## The 50–70 ms frames (follow-up)

The frames of 50–70 ms left above were traced frame by frame, timing each part of every frame over 40 ms and labelling
every step of a rig's staged build:

| Cause | Change |
| --- | --- |
| **Catch-up steps each spent the arrivals' budget.** A long frame runs several fixed steps to catch up, and each took another 3 ms (or more) of rig building, so one long frame made the next longer: one frame ran 15 build steps. | Rig building runs in a frame's first step only. |
| **A short step followed by a long one.** The budget let another step start while any time was left, so 2 ms then 20 ms made a 22 ms slice. | Another step starts only if one as long as the last still fits. |
| **A resident's first frame at work** sampled the whole work clip's hand and tool contacts at once: 30–53 ms. | Sampled while the rig is built, a few samples a step (`ResidentMotion.prepareWork`). |
| **Long build steps** (10–24 ms): hidden-layer passes cut by a count of points, a whole hand's finger plan, both hands' contact scans, a seated clip's retarget and its seat measured together, equipment, tools and grips. | The hidden-layer passes end each step by the clock (3 ms), the finger plan yields between its phases, each hand shape, seat moment, grip and the equipment are steps of their own. Longest step 24 → 13 ms. |

First minute on the route, served build, three sessions:

| | Worst frame | Frames over 100 ms | Frames over 50 ms | Frames over 33 ms |
| --- | ---: | ---: | ---: | ---: |
| A80 as merged | 138–152 ms | 1 | 8–15 | — |
| Follow-up | 90–115 ms | 0–1 | 1–4 | 5 |

The worst is the world's first frame. The few frames over 50 ms left are the frame after a slow draw catching up two or
three steps.

No Meshy credits spent.
