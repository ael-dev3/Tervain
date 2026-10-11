# How we rebuild Gothic 3

This document describes the rebuilding process. The target is a TypeScript game
on Tervain's separate [`/gothic3/` route](https://ael-dev3.github.io/Tervain/gothic3/):
start a new game, play through the campaign, save and reload, and reach an ending.
Complete engine startup and campaign integration remain unfinished.

## 1. Preserve the reference

The reference installation is
`C:\Program Files (x86)\Steam\steamapps\common\Gothic 3`.
Read it without modifying the installed game. Inventory archives and their patch
order, then record each selected resource's original path and hash. Preserve the
matching `SharedBase.dll`, `Engine.dll` and `Game.dll` for behavior research.
Contributors need their own matching reference inputs; these local paths are
not paths served by the website.

## 2. Recover the world and its assets

Use the readers and exporters in [`tools/gothic3/`](../../tools/gothic3/).
Decode the relevant archive and resource formats, preserve conversion receipts
in [`assets/gothic3/`](../../assets/gothic3/), and prepare browser resources in
[`public/gothic3/`](../../public/gothic3/).

An asset includes its relationships: a Myrtana tree needs its geometry,
materials, leaf alpha textures and placement; an Ardea human also needs a
skeleton, skin weights and animation. Terrain, entity records and collision
connect individual resources to the world. Inspect scale, axes, normals,
materials and animation, then compare the rendered result with the installed
game. A model viewer is an intermediate result; visual fidelity needs this
comparison. Archive compression, proprietary formats and encryption require
separate evidence before identifying a file as encrypted.

## 3. Recover behavior from the original binaries

Trace a missing operation from its caller through the matching DLL's
instructions, imports, globals and object layouts. Check decompiled listings
against disassembly and original bytes. Record allocation sizes, pointer
relationships, return values, callbacks and cleanup order.

Preparation scripts capture reproducible evidence packages and generated
instruction records. Regenerate them independently and compare the outputs.
Decompilation supplies research listings; it does not recover the original
source project or automatically produce a browser game.

## 4. Implement the supported operation in TypeScript

Runtime code lives in [`src/gothic3/`](../../src/gothic3/). Selected x86
continuations and translated routines operate on TypeScript memory owners,
thread stacks, heaps, locks and platform services. Original addresses identify
reference instructions; browser references carry the actual object identity.
Preserve each module's ownership, allocation lifetime, known and unknown bytes,
exception state and callback ordering.

Follow the retained caller into the next supported operation. At a missing
dependency, report the original address and keep the state already produced.
Implement that dependency before continuing. This makes partial progress
reviewable without claiming successful startup at an unsupported call.

## 5. Connect the systems into a playable game

Rendering, movement, collision, NPC animation and interactions must consume the
same live entities. Connect NPC decisions, combat, inventory, dialogue, quest
conditions and faction consequences to that state. Save and restore the world
and campaign consequences, including those needed for ending conditions.

Work proceeds in connected slices: recover the inputs, implement the behavior,
join it to its dependencies, and exercise it in the browser. Asset extraction
and isolated runtime checks establish their own components; campaign completion
requires ordinary play through an ending with working persistence.

## 6. Validate, review and publish

Inspect a coherent diff and run checks proportionate to the change. Runtime
changes use focused checks, source regeneration comparisons, TypeScript
checking and the applicable full-suite/build checks. Integrated gameplay also
needs browser observations, including save/reload when persistence changes.

Before a push, pull-request change or deployment that can start Actions, inspect
repository-wide runs, rerun attempts, workflow triggers and downstream jobs.
Reuse applicable evidence and avoid duplicate runs. The
[Pages workflow](../../.github/workflows/pages.yml) checks pull requests and
builds and deploys `main`. Record local validation, the reviewed revision,
deployment success and observed gameplay separately.

## Where to read the evidence

- [Step-by-step workflow and reference paths](gothic3-rebuild-workflow.md)
- [Implementation guide and current boundary](gothic3-rebuild-guide.md)
- [Architecture and implementation background](gothic3-rebuild-overview.md)
- [Dated technical checkpoints](gothic3-rebuilding-process.md)

The checkpoint history distinguishes captured evidence, local implementation
and published behavior. Older stopping addresses describe their dated revision.
The completion standard remains a deployed game playable from a new game through
an ending, with save and reload preserving campaign state.
