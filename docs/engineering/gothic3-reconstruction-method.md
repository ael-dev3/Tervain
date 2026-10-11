# How we rebuild Gothic 3

## Target and current state

The target is a TypeScript browser implementation on Tervain's separate
`/gothic3/` route: start a new game, play the original campaign through an ending,
and save and reload progress. Complete startup and campaign integration remain
unfinished. Extracted model viewers and passing component checks demonstrate
their individual features; they do not establish a complete playable game.

## The process

1. **Inventory the installed game.** The local reference installation is
   `C:\Program Files (x86)\Steam\steamapps\common\Gothic 3`.
   Record archive names, internal resource paths, patch precedence and hashes.
   Determine compression and resource formats from their actual bytes before
   describing an archive as encrypted.
2. **Recover the assets and world records.** Decode meshes, materials, textures,
   skeletons, skin weights, animations, terrain and entity placement. Preserve
   resource relationships and provenance when converting them for the browser.
   Trees require their leaf transparency and materials; humans require their
   rig and animations as well as geometry.
3. **Recover behavior from matching native binaries.** Use original DLL bytes,
   disassembly and decompiled listings together. A decompiler produces an
   approximation of compiled logic, not the original source project. Capture
   relevant instructions, imports, literals and memory layouts in reproducible
   evidence packages before implementing their behavior.
4. **Implement the supported behavior in TypeScript.** Translate selected
   routines and execute captured instruction continuations against explicit
   memory owners and platform services. Preserve pointer identity, known and
   unknown bytes, allocation lifetimes, locks, callbacks and exception cleanup.
   Original addresses identify evidence; they are not browser memory addresses.
5. **Continue from the first unsupported operation.** Trace its actual caller
   and dependencies, implement the required state changes, then resume that
   caller. Keep an explicit pending boundary when evidence or implementation
   is missing. Do not manufacture a successful return to advance startup.
6. **Connect the runtime to gameplay.** Rendering, movement, animation, NPC
   decisions, combat, dialogue and quests must operate on the same live world
   state. Persist that state through saves and reloads, including the quest
   consequences needed to reach the campaign's ending.
7. **Validate and publish a reviewed checkpoint.** Inspect the diff, check
   source regeneration and relevant behavior, and build locally. Record the
   exact revision and results. Before remote changes, inspect repository-wide
   Actions runs, triggers and downstream workflows. Record deployment separately
   from local validation, and inspect the affected browser scenario.

## From installed files to a playable browser game

The reconstruction has two connected tracks:

- **Assets:** installed archives → decoded resources → meshes, textures, rigs
  and world placement → browser rendering. Geometry alone cannot reproduce the
  scene: materials, leaf transparency, lighting, animation and placement must
  also agree with the original resources.
- **Behavior:** matching executable and DLL bytes → recorded native routines
  and data layouts → TypeScript runtime services → startup and world systems →
  combat, dialogue, quests and saved progress.

These tracks meet when a world entity uses its recovered visual resources and
its implemented behavior in the same running scene. The final acceptance step
is a new game played through an original campaign ending, with save/reload
preserving that progress. Until that is demonstrated, the reconstruction is
incomplete.

## Repository folders

| Repository path | Purpose |
| --- | --- |
| `tools/gothic3/` | Resource readers, converters and source-evidence generators |
| `assets/gothic3/` | Captured native evidence, hashes and research receipts |
| `public/gothic3/` | Browser-served resources |
| `src/gothic3/` | TypeScript runtime and browser integration |
| `tests/gothic3-dialogue/` | Evidence and runtime checks |
| `.github/workflows/pages.yml` | Validation and Pages hosting |

The local native study reference is
`C:/Users/heyas/OneDrive/Рабочий стол/Gothic3_Decompiled_Study_2026-10-04`.
Its `00_Original_Runtime` directory contains reference binaries and
`01_Decompiled_Code` contains code research. These machine-specific paths are
inputs for research, not portable build requirements for every contributor.

## How progress is reported

Keep four claims separate: evidence captured, behavior implemented, checks
passed, and revision deployed. Each checkpoint records its actual supported
boundary and remaining work. The current local native continuation completes the camera and reference-base
property initializers, including their names, roots and shutdown registration.
It enters the next obsolete-class initializer and stops at its original
undecoration call (`3069b26b`). Complete engine
startup, world activation and campaign play remain outstanding.

For detailed commands and implementation history, see the
[step-by-step workflow](gothic3-rebuild-workflow.md),
[architecture overview](gothic3-rebuild-overview.md), and
[checkpoint history](gothic3-rebuilding-process.md).

## Working on the next missing behavior

Choose one pending operation from the runtime trace. Find its original caller,
callee and data layout in the matching binary, then capture the evidence with
an existing generator in `tools/gothic3/`. Record binary hashes and original
addresses so another contributor can reproduce the finding.

Implement the smallest complete continuation in `src/gothic3/`. A model viewer
can establish mesh decoding and camera controls; gameplay additionally requires
entity placement, materials, collision, animation and behavior. Keep these
claims distinct in the checkpoint description.

For a native continuation, check both the normal return and interrupted cases:
unknown source bytes, failed allocation, incomplete writes and cleanup failure.
Record the last supported instruction, live allocations and held locks. Resume
from that state only when the next dependency is supported.

The repository exposes these commands from its root:

```sh
npm run dev
npm run typecheck
npx vitest run tests/gothic3-dialogue/engine-io-frame.test.ts
npm run build
npm run preview
```

`npm run dev` serves the browser application; open its `/gothic3/` route.
Typechecking checks TypeScript consistency, the example Vitest command exercises
the native startup frame, and the production build prepares the hosted files.
Choose additional checks for the changed subsystem and document the actual
results. A passing startup check does not demonstrate a playable campaign.

## What a reconstruction checkpoint should contain

- The behavior added and the evidence identifying it.
- Original asset paths or binary hashes and instruction addresses.
- Changed runtime modules and resource relationships.
- Local checks, their exact revision and any failures.
- The next unsupported boundary and remaining gameplay integration.
- The deployed revision and URL, when publication has actually completed.

The hosted target is `/gothic3/` alongside Tervain. Local implementation,
repository publication and a successful Pages deployment are separate milestones.
