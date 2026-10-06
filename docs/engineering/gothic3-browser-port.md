# Gothic 3 browser port

Date: 6 October 2026. Status: exploration, a moving Hero presentation and native-data foundations of an incomplete port.

## Owner request and route

The owner asked to rebuild the installed Gothic 3 in TypeScript and host it as
a second URL in Tervain. The repository is public and GitHub Pages is enabled.
The [Gothic 3 / Ardea route](https://ael-dev3.github.io/Tervain/gothic3/) is
live. The verified deployed checkpoint 73 is `main` commit
`0a439f819cfe51b20180765df8c58d278df4fa6b`, published by the successful
[workflow run 37520227542](https://github.com/ael-dev3/Tervain/actions/runs/37520227542).
The public route serves `gothic3-siaPiAJn.js`. The standalone admin modules in
checkpoint 74 were merged as `main` commit
`eec169d0002c2f9ec8c46585f9df18b69be1c4f1` in
[PR 41](https://github.com/ael-dev3/Tervain/pull/41). Its separate publication
receipt is [workflow run 37522723425](https://github.com/ael-dev3/Tervain/actions/runs/37522723425).
Those modules are not connected to the retained browser NPC read.
Checkpoint 75 adds isolated shared heap field/table/CString owners and keeps
full startup and browser integration as explicit prerequisites.
The [Pages workflow](https://github.com/ael-dev3/Tervain/actions/workflows/pages.yml)
records subsequent publication receipts.
It remains an incomplete exploration and gameplay prototype, not a finished
game.

Tervain's separate browser build keeps its own entry, content,
version, renderer, save namespace and original artistic direction.
This request authorizes the separate reconstruction; it does not redefine
Gothic assets as original Tervain content or change earlier Tervain asset rules.

## What this milestone does

- Uses a separate TypeScript / Three.js entry at `gothic3/index.html`.
- Reads the selected native scene and character derivatives from
  `public/gothic3/scene.json`, with per-file provenance in
  `public/gothic3/source-manifest.json`.
- Loads actual static geometry and original body/head meshes rather than
  generating an invented Ardea village or substituting Tervain's residents.
- Provides first-person exploration and a third-person Hero that follows the
  browser controller using recovered idle, walk and run motion clips. Ground
  support, collision and animation selection remain approximations; this is
  not the installed game's native actor/controller pipeline.
- Provides a grounded support/wall approximation,
  free flight, mouse look, character inspection, orbit/zoom, wireframe,
  rotation and a local position map. Browser saves retain exploration state,
  source-backed quest states and world-clock time; they are separate from
  Gothic 3 native saves.
- Presents recovered original quest references as inspection data and applies
  the single audited new-world `Xardas_FindXardas` transition. Remaining quest
  activation, dialogue choices and completion are not broadly playable.
- Loads the native skinned Hero and 11 source motion clips in the inspector,
  preserving every bone influence, body/head inverse binds and source poses.
- Provides a searchable catalog of all 641 original quests and 4,381 dialogue
  records with the original English, Italian, French, German and Spanish text.
- Indexes the native world/sector files for future streaming. A source-backed
  fresh-world journal now seeds all 641 native quest states and applies the
  audited startup `RunQuest("Xardas_FindXardas")` transition. Other startup
  callbacks and quest actions remain incomplete.
  Bounded `SucceedQuest` calls now apply captured PoliticalFame,
  attribute-base and GiveXP rewards to the retained Hero when all required
  services are present. Ardea_Pocket and Anog_ReportInog exercise the skill,
  fame and XP paths. Enclave rewards, arena status and Ardea_Revolution's
  tutorial popup remain gated; this is not broad quest completion.
- Loads PC_Hero's retained PlayerMemory when the browser session starts. Its
  verified `PlayerKnows` seed initializes an ordered browser game-event store.
  The Ardea interaction panel now preflights original dialogue records against
  the active scene, quest state, game events and InfoManager Given state. It
  runs General records when every command and completion callback is
  supported; conditions 6, 11 and 21 apply their bounded quest status
  transitions, condition 7 preserves quest status, and condition 8
  counts NPC delivery for Running numeric-type-1/type-4 quests. Supported
  conditions 3/5/6/7/8/10/11/19 retain source Say pairs; native condition 4
  remains gated on its unresolved overtime predicate. The fresh `Ardea_Pocket` state is Open,
  however, and its native pickpocket quest-start path is not connected, so this
  callback does not make that theft-reporting sequence reachable in a new game.
  Unsupported conditions and effects stay locked with their reason shown.
  The Hero's 121 hash-checked starting inventory stacks answer Ardea
  `CondItems` predicates, and an Inventory panel exposes current stack names,
  amounts and Learned flags. The Hero inventory is mutable and saved. Positive
  source `Give` commands for `It_Gold` can transfer between PC_Hero and the
  active Ardea dialogue owner; the host checks loaded quest delivery targets
  before treating the item-receive manager callback as a no-op. Other
  transferred items, linked stacks, item-receive quest deliveries, general
  loot, equipment changes and trade UI remain
  unimplemented. The browser transfer receipt is a simple host message, not
  the original localized Given/Taken GUI text.
  Jack's `BPANKRATZ31459` and Hamlar's `FILLER939` records now apply
  `SetTradeEnabled` to their source Dialog state, and browser saves preserve
  those flags. `SetPartyEnabled` and `SetTeachEnabled` now update and save the
  corresponding source Dialog fields as well. These flags do not implement
  party following, trainer interactions, trade UI or pricing.
  Diego's `BPANKRATZ31454` response exercises `Say` and
  `SetGameEvent("Diego_WarIsLost")`. The original `GiveXP` handler now awards
  XP through retained Hero PlayerMemory; bounded quest success also writes
  source-backed PoliticalFame and attribute rewards before XP.
  A threshold crossing also writes Level to a source-constructed Hero NPC
  property set, grants native LP through PlayerMemory and shows the localized
  level-up text. The hash-checked Hero NPC packet now passes through the
  registered accessor; its legacy `Level` payload is preserved as opaque
  `bCObsoleteClass` data, while the current property initializes to the
  verified start value and updates on supported threshold crossings. The
  Character panel displays that Level. This NPC property set is not attached
  to a live world entity, `Perk_Learn` is verified inactive at start, and the
  level-up visual effect is absent. Voice, camera direction,
  NPC routines and most of the original conversation flow remain unimplemented.
- Streams 782 original landscape cells across Myrtana, Nordmar and Varant,
  using recovered texture/UV/blend graphs and tangent-space normal maps.
- Offers landscape views near Ardea, Xardas's tower and Lago, plus read-only
  inspection of original player/clock data and all 641 quest seed records.

The TypeScript movement, raycast support and renderer are new implementations.
They have not been proved equivalent to Gothic 3's native physics or visuals.
Preview brightness can be adjusted in Help. Ambient fill and exposure are
browser display choices, not recovered native settings.
The native Normal/Masked/AlphaBlend modes and MaskReference byte are retained.
Masked cutoffs use byte/255 with a small comparison epsilon; the complete
native shader and fading behavior remain unimplemented.
The remaining native materials, global lighting, SpeedTree runtime,
NPC animation selection, sound, combat effects, AI, inventory, economy, most
quest progression, world-object streaming and native save compatibility are not
implemented.
The source-backed dialogue kernel is enabled only for bounded records; most
native dialogue conditions and effects remain unavailable. Mouse/key attacks
play the recovered Hero fist phases and sample the right-hand bone against
rendered character bounds at the hit window. A source-pinned Hero profile and
the 15 exact starting Ardea Raider identities and Jack's three coastal bandits
use that browser hit window and the audited damage formula to update NPC HP in
browser saves. Zero-HP visuals hide immediately and remain hidden after restore.
This does not implement native NPC activation/contact eligibility, AI, attacks
or responses, full Kill/Defeat handling, death animation, loot or
all quest reward services, so the campaign combat loop remains incomplete.
Source-directed lethal bandit hits schedule `ZS_RagDollDead`; a later original
script-processor frame runs its connected Kill prefix, dispatching exact-name
counters for numeric-type-2/3/4 objectives and supported success rewards, then
50 defeat XP per bandit. The prefix stops at `NotifyEnclave`, preserving its
applied state in the save. Raider
kill-versus-defeat disposition remains unknown and does not grant kill credit.
The audited native quest-manager callback iterates the registered quest array;
the browser retains its bounded supported callback/reward host. Only the audited first startup
quest run is connected; remaining startup callbacks and entity mutations are
pending. See [checkpoint
67](gothic3-rebuilding-process.md#67-persist-defeat-for-the-starting-ardea-raiders)
and [checkpoint
68](gothic3-rebuilding-process.md#68-dispatch-bounded-npc-kill-objective-counters).

This checkpoint resolves native distribution-0 Plunder
candidates, records the recovered stack-count/selection/amount draws, then
passes those records to the TypeScript `NativeInventory.createItems` path.
Source templates are resolved by exact GUID and checked source path/hash;
inventory stacks and the browser random state are saved, and restore rebuilds
the stack list against those source templates without rerolling. This is a
bounded browser integration. Generation still
runs at browser first contact with a separate seed and call sequence, not the
native cache-in callback or process-wide random stream. It creates no physical
ItemWorld objects; native entity activation, weapon/equipment cache-in, loot-
driven player inventory mutation, AI, NPC responses, native death handling and
defeat rewards remain incomplete.
This checkpoint also adds a PickPocket browser action that reads
the source Hero Theft and target LevelMax, applies the verified level/perk/roll
gate, and on success adds exact distribution-7 source loot to the saved Hero
inventory. The target's `Dialog.PickedPocket` state is saved. This action does
not use the native InfoManager lifecycle; its failure/caught response, enclave
crime effect and property-listener/quest-start path remain unresolved.
`Ardea_Pocket` therefore stays Open in a fresh game. See [checkpoint
66](gothic3-rebuilding-process.md#66-connect-source-backed-pickpocket-loot-to-hero-inventory).
This checkpoint applies the bounded browser fist calculation to
15 source-pinned starting Ardea Raiders and Jack's three source-placed coastal
bandits, and stores their HP in browser saves.
The contact detector and standing-target state remain browser-owned; defeated
visuals hide on zero HP and after restoring the NPC combat save. Source-resolved
lethal bandit hits schedule the recovered death state, whose connected prefix
dispatches exact-name counters for matching type-2/3/4
objectives. Eligible completion applies supported quest rewards; the quest save
retains the counters and terminal status. Jack's three targets can complete his
quest for 500 XP and unlock its condition-10 return Info for 50 gold and 250 XP.
The connected prefix awards another 50 defeat XP per bandit after the quest
event, then stops at the remaining enclave callback. Native activation,
ragdoll, speech playback, destination/plunder cleanup and several reward
services remain unconnected. See [checkpoint
67](gothic3-rebuilding-process.md#67-persist-defeat-for-the-starting-ardea-raiders)
and [checkpoint
70](gothic3-rebuilding-process.md#70-connect-jacks-bandits-and-correct-native-quest-callbacks).
The scheduled prefix and save boundary are described in [checkpoint
72](gothic3-rebuilding-process.md#72-schedule-the-bandit-death-state-and-preserve-its-applied-prefix).
This checkpoint also passes each resolved distribution-3 Weaponry
recipe through `NativeInventory.assureItems`, retaining the native `0x100`
quality bit and configured minimum stack amount. The Raider's source-bound axe
appears in its browser inventory at quality 256, amount 1; a primary-slot-6
`EquipStack` plan is saved only as a decision (`applied: false`). NPC save
schema v3 retains this source-bounded inventory and migrates v1 Plunder-only
saves. This does not attach the weapon to an actor or skeleton, create an
ItemWorld instance, or apply equipment statistics. See [checkpoint
57](gothic3-rebuilding-process.md#57-materialize-deterministic-weaponry-in-the-browser-npc-inventory).
The native UseType 2 two-hand split into slots 6 and 5 remains unimplemented.
The source bridge now also resolves the serialized slot17 body template's
`gCItem_PS.Robe` flag, used by the native armor-perk branch, and keeps
`gCScriptRoutine_PS` scheduling fields distinct from live combat animation
state. Those facts gate the bounded browser-hosted damage profile; NPC attack
responses and native damage/effect callbacks remain unavailable.
Original SpeedTree vegetation has not yet been placed in this scene.
Most NPC derivatives remain static bind-pose previews. In this checkpoint,
Diego is loaded from his original skinned body and head XACT files, and
the 11 audited Hero clips are mapped onto matching bones for an idle preview
and model inspection. This does not reproduce Diego's native animation
selection or schedule; see [checkpoint
59](gothic3-rebuilding-process.md#59-convert-and-connect-diegos-source-skinned-actor).
The moving Hero chooses one recovered idle, walk or run clip from
browser-controller displacement; an Attack or PowerAttack input plays its
three recovered fist phases. First-person arms and hit responses are absent. Hero
clip playback uses verified raw native keys, signed-short packing, shortest-sign
component interpolation, pose fallback and final normalization. Multi-layer
blending, effects and repositioning remain separate work. The visual Hero is
not yet constructed by the original entity/property-set readers. Missing attachments
and unsupported world entity types are recorded by the preparation pipeline.

The working snapshot contains 202 world instances, 70 NPC source records
(including Diego, Milten, Gorn, Lester, Jack, Hamlar and the three bandits),
134 exported models and 140 textures. The model/texture payload is
132,962,888 bytes; 652,328
triangles counts unique converted model assets, not every placed instance.
There are no missing diffuse maps in the final preparation audit; 39
multiple-diffuse shader graphs remain approximations. Six native landscape
LOD cells provide the legacy fallback terrain. The new landscape stream exports
2,082,155 native triangles in 782 cells, 65 graphs and 88 lossless PNG files.
One empty native sampler and nine primitives missing requested UV1 are marked
as unresolved materials. Native lightmaps, original lower mips and collision
companions remain unimplemented. See the
[rebuilding process](gothic3-rebuilding-process.md#8-terrain-streaming-and-reviewed-gameplay-kernels).

Arrival coordinates come from the patch-winning SysDyn PC_Hero entity,
371: native [87984.9375, 5145.56396484375, -10197.4775390625] centimetres;
browser feet [-40.150625, -0.544360, -18.025225] metres relative to the
recorded origin. The camera looks toward Ardea as an explicit browser choice,
not a claim that the original camera controller was recovered.

### Original NPC construction study

The Models inspector has a collapsed **Original entity study · developer
details** section for Jack's three coastal bandits. It loads hash-checked full
source records, constructs retained original entity storage and performs the
Node source-ID registration on that same owner. The current read stops at
338 of 6,544 bytes, during the first Navigation factory's unowned ErrorAdmin
prerequisite. Its serialized property packet and attachment callbacks have
not run: there are zero attached property sets, no NavigationAdmin membership
and no live graph context. The visible models and existing browser combat and
death state remain separate. See
[checkpoint 73](gothic3-rebuilding-process.md#73-construct-retained-npc-owners-and-reach-the-first-property-factory).

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
| Attack / PowerAttack motion | Left-click / C; right-click / V |
| Release mouse | Escape |
| Third-person Hero view | Third person / First person button |
| Talk to / inspect nearby person | E |
| Character model inspection | Tab or Models |
| Rotate / zoom / pan model | Drag / wheel / right-drag |
| Hero motion preview | Native motion selector / Play or Pause motion |
| Free flight / up / down | F / Space / Q |
| Return to scene arrival | R |
| Original quest reference journal | J |
| Source-seeded Hero inventory | I |
| Local position map | M |
| Save browser session | P |

Current save key: `gothic3:ardea:game:v2`. It holds browser exploration state,
landscape selection, the 641 quest states, world-clock date, PlayerKnows game
events, accepted dialogue `Given` flags, supported Hero XP and the mutable Hero
inventory snapshot. The NPC combat save holds initialized Ardea actor
inventories, source-separated live lifecycle fields, pending script-processor
state and retained speech-wrapper allocations. Blocked death prefixes restore
as inert checkpoints; loading does not replay quest or XP operations. Older
v1/v2 zero-HP actors remain explicitly unresolved and receive no inferred kill
credit. The outer browser save key is unchanged.
Restore checks the Hero
PlayerMemory and InfoManager provider identities as well as the quest/clock
hashes and the starting-inventory evidence hash; saved inventories are
rehydrated against source-resolved template definitions. Older saves without a
Hero inventory snapshot replay the verified starting inventory and retain
their saved consumable counts. Legacy key
`gothic3:ardea:exploration:v1` still restores position and view, then starts a
fresh quest session. Neither format imports original Gothic saves or changes
Tervain saves.

## Reproduction and publication

Start with the [rebuilding overview](gothic3-rebuild-overview.md) for the
workflow and reproducible commands. See the
[step-by-step rebuilding process](gothic3-rebuilding-process.md) for
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

1. Extend bounded Ardea dialogue to more source conditions, lifecycle
   callbacks, objectives, inventory and rewards; keep unported operations
   visibly unsupported.
2. Port a bounded original Ardea combat encounter and its native state
   transitions, then compare behavior with the installed game.
3. Extend the verified Hero skin/motion path to other rigs, original
   attachments, expressions, exact interpolation, animation selection and
   blending.
4. Replace collision approximations and extend world streaming, terrain,
   SpeedTree materials, original lighting and audio.
5. Expand region by region with save migration and measured performance.
   A whole-game completion claim requires corresponding content and behavior.
