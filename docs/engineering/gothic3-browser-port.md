# Gothic 3 browser port

Date: 4 October 2026. Status: first exploration milestone of an incomplete port.

## Owner request and route

The owner asked in the Gothic study chat to rebuild the installed Gothic 3 in
TypeScript and host it as a second URL in Tervain. GitHub reported the repository
and Pages site as public; the owner answered, “let's host it there anyway.”

The separate route is
[Gothic 3 / Ardea](https://ael-dev3.github.io/Tervain/gothic3/).
The existing [Tervain game](https://ael-dev3.github.io/Tervain/) keeps its own
entry, content, version, renderer, save namespace and original artistic direction.
This request authorizes the separate reconstruction; it does not redefine
Gothic assets as original Tervain content or change earlier Tervain asset rules.

## What this milestone does

- Uses a separate TypeScript / Three.js entry at `gothic3/index.html`.
- Reads the selected native scene and character derivatives from
  `public/gothic3/scene.json`, with per-file provenance in
  `public/gothic3/source-manifest.json`.
- Loads actual static geometry and original body/head meshes rather than
  generating an invented Ardea village or substituting Tervain's residents.
- Provides first-person exploration, a grounded support/wall approximation,
  free flight, mouse look, character inspection, orbit/zoom, wireframe,
  rotation, a local position map and isolated browser camera-position saves.
- Presents recovered original quest references as inspection data.
  It never invents quest activation, dialogue choices or quest completion.

The TypeScript movement, raycast support and renderer are new implementations.
They have not been proved equivalent to Gothic 3's native physics or visuals.
Preview brightness can be adjusted in Help. Ambient fill and exposure are
browser display choices, not recovered native settings.
The native Normal/Masked/AlphaBlend modes and MaskReference byte are retained.
Masked cutoffs use byte/255 with a small comparison epsilon; the complete
native shader and fading behavior remain unimplemented.
The native materials' full shader graph, lighting, SpeedTree runtime, skinning,
animation clips, sound, combat, AI, inventory, economy, original quests,
whole-world streaming and native save compatibility are not implemented.
Original SpeedTree vegetation has not yet been placed in this scene.
Character derivatives are static bind-pose previews. Missing attachments
and unsupported world entity types are recorded by the preparation pipeline.

The prepared snapshot contains 202 world instances, 67 NPC source records
(including Diego, Milten, Gorn, Lester, Jack and Hamlar), 130 exported models
and 139 textures. The model/texture payload is 130,869,971 bytes; 634,836
triangles counts unique converted model assets, not every placed instance.
There are no missing diffuse maps in the final preparation audit; 39
multiple-diffuse shader graphs remain approximations. Six native landscape
LOD cells provide the current terrain.

Arrival coordinates come from the patch-winning SysDyn PC_Hero entity,
371: native [87984.9375, 5145.56396484375, -10197.4775390625] centimetres;
browser feet [-40.150625, -0.544360, -18.025225] metres relative to the
recorded origin. The camera looks toward Ardea as an explicit browser choice,
not a claim that the original camera controller was recovered.

## Why decompilation does not produce a finished port

The local study contains 36 runtime/script/updater modules, 224,676 native
C-like functions, one exact machine-code forwarding entry and a managed IL/C#
supplement. These are reconstructed representations, not original buildable
C++ source. Native Windows x86 calling conventions, inferred types, external
libraries, packed asset formats, rendering shaders and engine services need
deliberate replacements.

This scene demonstrates an asset conversion and browser interaction path.
It does not demonstrate a completed game, a translated native engine,
an original-game fidelity result, or a measured performance target.

## Source and terms

Gothic 3 assets and their recognizable characters remain third-party material
from the owner's installed game. No open-content license or copyright transfer
is asserted. File presence and the owner's hosting request are not relicensing.
The source manifest records hashes, archive/resource names, conversion steps,
known defects and terms where available. It omits personal local filesystem
prefixes from hosted records.

Three.js remains under its MIT notice in `public/third-party-notices.txt`.
Any GPL-3.0 preparation code is confined to the offline preparation tool and
retains its own source and license; it is not bundled into the browser runtime.
The prepared derivatives and newly written renderer have separate provenance.

## Controls

| Action | Input |
| --- | --- |
| Move / run | WASD or arrows / Shift |
| Look | Drag mouse, or click scene for captured mouse |
| Release mouse | Escape |
| Inspect nearby person | E |
| Character model inspection | Tab or Models |
| Rotate / zoom / pan model | Drag / wheel / right-drag |
| Free flight / up / down | F / Space / Q |
| Return to scene arrival | R |
| Original quest reference journal | J |
| Local position map | M |
| Save exploration position | P |

Save key: `gothic3:ardea:exploration:v1`. It holds only the browser camera
position/orientation and flight mode. It neither imports original Gothic saves
nor changes Tervain saves.

## Reproduction and publication

See the [step-by-step rebuilding process](gothic3-rebuilding-process.md) for
source study, native formats, conversion decisions and runtime responsibilities.

`npm ci` installs the pinned repository dependencies. `npm run build` builds
both HTML entries into one `dist` artifact; `npm run dev` serves the Ardea
entry at `/gothic3/`. Asset preparation requires the separately installed
original game/study resources and the recorded offline tool dependencies.
The original installation and completed Desktop study are read-only inputs.

The existing Pages workflow remains intact. A main-branch push starts its
required typecheck, scenario suite and build, followed by the Pages deploy job.
No extra dispatch or deployment workflow is needed. Inspect all workflow runs
and attempts before publication, and confirm the served second route after
a successful deployment. Local compilation, manual browser observations and
CI results should be reported separately.

## Next port milestones

These are implementation proposals, not completed work:

1. Recover skeletons, weights and motion clips; implement native body/head/
   attachment binding and an animated protagonist.
2. Port a bounded original Ardea combat encounter and its native state
   transitions, then compare behavior with the installed game.
3. Execute a reviewed subset of original dialogue predicates and commands,
   inventory/progression and quest state; preserve unsupported-command errors.
4. Replace collision approximations and extend world streaming, terrain,
   SpeedTree materials, original lighting and audio.
5. Expand region by region with save migration and measured performance.
   A whole-game completion claim requires corresponding content and behavior.
