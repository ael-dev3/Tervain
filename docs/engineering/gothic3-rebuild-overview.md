# Rebuilding Gothic 3 for the browser

This repository contains a new TypeScript browser implementation of Gothic 3,
guided by the owner's local installation. The Windows game is a read-only
reference during preparation; it is not converted into a web program. Native
executables and decompilation listings are studied to understand selected
formats and behaviors, then the browser runtime is implemented separately.

The goal is a game a player can start, progress through, save and finish at one
of Gothic 3's endings. A scene viewer, a decoded model or a successfully read
native data structure is a useful component milestone, but it does not by
itself establish a playable reconstruction.

## The rebuilding loop

The work follows two tracks—recovering original game data and reconstructing
game behavior—and joins them in playable slices:

```mermaid
flowchart LR
  I[Read-only local game and study] --> S[Inventory and verify resources]
  S --> D[Decode selected data formats]
  D --> A[Portable assets with provenance]
  I --> N[Study bounded native behavior]
  N --> T[Implement that behavior in TypeScript]
  A --> W[Connect assets to the browser world]
  T --> W
  W --> R[Review against source evidence]
  R -->|gaps| N
  R -->|complete progression| G[Playable game through its endings]
```

### 1. Inventory the source

The preparation tools read a local installation and its offline study. They
record hashes and determine which archive or patch layer supplies each logical
resource. This makes it possible to select the same winning file consistently
instead of silently using an older duplicate. Archive extraction only exposes
bytes; meshes, images, world records and behavior still require separate
readers.

### 2. Decode only what the browser needs

Format-specific tools decode world placements, meshes, actors, textures,
materials, motions and gameplay records. Conversion outputs keep source
provenance, hashes, coordinate transforms, assumptions and known omissions.
The browser loads these portable outputs; it does not need access to the
player's installation. The first data slice is Ardea, with landscape and
gameplay foundations being added as their readers are verified.

### 3. Reconstruct native behavior in small, evidenced pieces

For a behavior such as constructing the Hero, starting a quest or changing a
game event, the study follows the relevant native functions, call paths,
callbacks, layouts and object lifetimes. Decompiled C-like listings are
reference material, not original buildable C++ source. The implementation
checks claims against captured native bytes or source data where possible,
then writes a bounded TypeScript equivalent. Unknown engine calls stay
explicit rather than being filled in with guesses.

### 4. Join data and behavior in a playable slice

Recovered assets and reconstructed behavior must share the same live game
state. Entity identity, Hero properties, world time, input, movement, animation,
interactions, NPCs, quests and browser saves need to work together. Start with
one concrete encounter or progression step, connect its prerequisites and
effects, and preserve enough state to continue after loading. A standalone
reader or inspector remains a study tool until it participates in this flow.

### 5. Review the exact claim

Review each change against the evidence it is intended to reproduce: resource
hashes and conversion receipts for assets, tests for state transitions, and a
browser exercise for rendering and interaction. Compare behavior with the
installed game where a direct comparison is possible. Record unsupported
branches and separate build success, browser observations and original-game
equivalence; each proves a different thing. Keep coherent checkpoints so the
same sources and steps can reproduce the result.

## Example: rebuild one behavior end to end

The Hero's `GiveXP` path shows how a small Gothic behavior moves through the
rebuild. The native `Script_Game.dll` handler was traced to its machine-code
instructions and checked against the installed binary. That evidence resolves
a disagreement in the decompiled listing: this call form multiplies the
requested amount by five. It also establishes that one award can increment the
Hero's level once and add 10 learning points when it crosses a threshold. The
captured source identity and byte-level audit are kept with the
[combat evidence](../../assets/gothic3/combat/native-source-evidence.json) and
[public evidence receipt](../../public/gothic3/combat/native-combat-evidence.json).

The browser implementation then divides that behavior across its boundaries:
[`combat.ts`](../../src/gothic3/combat.ts) plans the supported XP transition;
[`live-dialogue.ts`](../../src/gothic3/live-dialogue.ts) accepts it only for the
recognized Hero-targeted command; [`quest-runtime.ts`](../../src/gothic3/quest-runtime.ts)
applies and validates the saved progression; and
[`npc-reading.ts`](../../src/gothic3/npc-reading.ts) retains the source-backed
Hero NPC property data. Focused cases live in
[`give-xp.test.ts`](../../tests/gothic3-dialogue/give-xp.test.ts) and
[`hero-progression.test.ts`](../../tests/gothic3-dialogue/hero-progression.test.ts).

This is a bounded feature, not a completed game mechanic: the Hero NPC property
set is not yet attached to the live world entity, the native level-up visual
effect is absent, and combat task execution is not connected. The next work is
to close those world/entity lifecycle gaps and exercise the behavior in the
browser. The same evidence-to-runtime-to-playable-review chain is required for
each quest, NPC, interaction and campaign transition.

## Where each stage lives

| Stage | Repository location | Result |
| --- | --- | --- |
| Inspect and decode local files | [`tools/gothic3/`](../../tools/gothic3/) | Offline readers and preparation scripts verify selected inputs and convert native records. The installed game and full study remain outside the repository. |
| Keep browser-ready source data | [`assets/gothic3/`](../../assets/gothic3/) and [`public/gothic3/`](../../public/gothic3/) | Reviewed portable assets and JSON catalogs, with provenance and conversion limits recorded alongside the data. |
| Implement game behavior | [`src/gothic3/`](../../src/gothic3/) | TypeScript modules model selected native state and operations; unsupported behavior stays unavailable or explicitly unknown. |
| Present and connect the game | [`gothic3/`](../../gothic3/) | The separate browser route connects the runtime, scene, controls and UI. |
| Check and document the result | [`tests/`](../../tests/) and [`docs/engineering/`](./) | Focused checks cover bounded behavior; engineering notes preserve evidence, limitations and reproducible checkpoints. |

The boundary between stages matters: a successful decoder proves that a data
format was read; a passing runtime check proves a bounded state transition; and
a browser interaction proves that the pieces are connected for that case. None
alone proves that the original game has been rebuilt. Each playable slice should
carry its source evidence through conversion, TypeScript behavior, browser use
and saving before the next campaign feature is treated as integrated.

## Current milestone

The current browser project has an Ardea exploration scene, a moving third-
person Hero presentation, original-data inspectors, streamed landscapes for
Myrtana, Nordmar and Varant, and a source-backed fresh-world quest journal. The
audited startup path runs `Xardas_FindXardas`; browser saves retain exploration
state, the world clock, quest states and the Hero's `PlayerKnows` game events.
A bounded Ardea dialogue slice now adds selected native predicates, event
changes, ended actor flags and quest-log pairs; its panel still needs manual
browser review. Source-backed `GiveXP` awards update retained Hero PlayerMemory;
threshold crossings also update a source-constructed Hero NPC Level, grant LP,
show the localized level-up text and persist through save/restore. The
hash-checked Hero NPC packet now reads through its registered accessor; the
old `Level` record is preserved as opaque `bCObsoleteClass` bytes. The property
set is not attached to a live entity, and the level-up visual effect is absent.
These are integrated foundations, while most original dialogue
progression, combat, NPC routines, inventory, faction consequences and endings
still need to be rebuilt. A byte-audited combat kernel covers bounded damage
and defeat arithmetic, but `ordinaryPlayIntegrated` remains false: the live
Ardea actors do not yet pass the original entity construction, context,
cache-in and processing-range lifecycle needed to accept combat. The entity
lifecycle evidence explicitly leaves those world-activation steps unresolved,
so a verified damage formula is not yet an encounter the player can fight.
The next integration gate is to construct and activate a source-backed NPC
through that lifecycle, then connect contact, state changes, defeat and quest
counters as one playable encounter. The current limits and controls are listed in the
[browser-port scope](gothic3-browser-port.md); native readers, conversion
choices and dated implementation checkpoints are in the
[detailed process record](gothic3-rebuilding-process.md).

## Completion standard

The reconstruction is complete when a player can start a new game and play
through Gothic 3's progression to its available endings, with the required
worlds, NPC routines, factions, dialogue, quests, combat and save/load working
together. A successful build or faithful conversion validates only its own
part of that experience.

For local asset preparation and source requirements, see the
[preparation guide](../../tools/gothic3/README.md).
