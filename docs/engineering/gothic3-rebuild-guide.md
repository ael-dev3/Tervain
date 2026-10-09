# Gothic 3 rebuilding process

## Goal and current state

Rebuild Gothic 3 in TypeScript on Tervain's separate `/gothic3/` route. Completion
means starting a new game, progressing through the campaign, saving and reloading,
and reaching an ending through ordinary browser play.

As of 9 October 2026, asset readers, viewers and selected native runtime
continuations exist. Complete engine startup, live world activation and campaign
integration remain unfinished. The hosted route does not yet demonstrate a
finishable campaign.

## 1. Record the original inputs

The reference installation is
`C:\Program Files (x86)\Steam\steamapps\common\Gothic 3`.
Inventory archives and patch precedence. Record original resource paths, input
hashes and extraction commands. Determine compression and encryption from each
format's bytes and reader before making claims about them.

Preserve matching native module bytes and disassembly. Decompiled C helps explain
a function; verify its behavior against original instructions, callers, imports
and static data.

## 2. Prepare browser assets

Readers and exporters in `tools/gothic3/` recover meshes, textures, skinned humans,
animations, terrain, world placement and gameplay records. Store source receipts
in `assets/gothic3/` and browser resources in `public/gothic3/`.

For Myrtana trees, inspect geometry, texture alpha, normals, scale, materials and
placement together. For Ardea humans, also recover skeletons, skin weights,
clothing and animations. Rotate and zoom models in a viewer, then compare their
rendered appearance with the original game. Opening a model establishes an asset
inspection milestone.

## 3. Recover and implement behavior

Trace one missing operation and its dependencies. Capture original addresses,
bytes, globals, allocation sizes, callback order and cleanup with a repeatable
preparation script.

Implement supported state changes in `src/gothic3/`. Selected original x86
instructions execute through the TypeScript interpreter against owned memory,
pointer identities, thread stacks and implemented platform imports. Browser
systems provide rendering, input and gameplay integration.

Preserve object lifetime, locks, exception frames and the state passed between
functions. At an unsupported operation, report its original address and retain
the state already applied. Capture, component execution and live game integration
are separate milestones.

### What a native continuation means

A checkpoint follows a real call chain from the original DLL. For example, the
current startup work follows SpieAdmin opening zSpie.txt: acquire a CRT FILE
record, allocate and lock descriptor 3, invoke CreateFileA, apply its return,
and run the original error mapping or publish the opened handle. The TypeScript
platform supplies owned memory and a virtual filesystem for these operations.

The captured instructions, source addresses and input hashes live beside the
implementation. Unsupported calls retain their address and current state so the
next checkpoint can continue from that point. This is incremental behavior
reconstruction; complete decompilation of every game module has not been
established. These startup continuations currently have no production callers.

### A repeatable checkpoint

1. Identify the next unsupported call and its original caller.
2. Capture its instruction bytes, imports, static data and cleanup dependencies.
3. Generate the source-evidence package and TypeScript instruction tables.
4. Implement the required platform operation with explicit ownership and lifetime.
5. Check successful, failed and damaged-state paths against the original flow.
6. Regenerate independently, inspect the diff and record local validation.
7. Publish a reviewed revision and record its deployment separately.
8. Connect the resulting state to browser gameplay and observe that integration.

## 4. Connect a playable world

Complete startup and activate the world, player and NPCs. Connect rendering,
movement, collision, animation and interaction. Integrate combat, inventory,
dialogue, routines, quests and faction consequences. Each subsystem must consume
the actual state produced by its dependencies.

Persist and restore the connected campaign state. Check progression across quests
and scene changes, then play through an ending.

## 5. Validate and publish checkpoints

Regenerate evidence into a separate directory and compare it with committed
packages. Inspect the diff and run checks proportionate to the change. Runtime
work uses focused checks, typechecking and a production build. Integrated gameplay
also requires browser observations and save/reload evidence.

From the repository root:

```sh
npm ci
npm run dev
```

Open the development server's `/gothic3/` route. Validation commands are
`npm run typecheck`, `npm test` and `npm run build`.

Before remote changes, inspect repository-wide Actions runs and workflow triggers.
Pull requests validate the proposed revision; reviewed merges to `main` build and
deploy through `.github/workflows/pages.yml`. Record deployment separately from
gameplay evidence.

## Repository map

| Location | Purpose |
| --- | --- |
| `tools/gothic3/` | Readers, exporters and evidence generators |
| `assets/gothic3/` | Original paths, hashes, captured instructions and receipts |
| `public/gothic3/` | Resources served to the browser |
| `src/gothic3/` | TypeScript runtime and gameplay integration |
| `tests/gothic3-dialogue/` | Runtime and source-evidence checks |
| `.github/workflows/pages.yml` | Validation and deployment |

Each checkpoint records its input, implementation, tested revision, validation
results, next unsupported dependency and deployment receipt.

## Published checkpoint and further reading

[PR #170](https://github.com/ael-dev3/Tervain/pull/170) merged original
file-open results, error mapping and FILE publication at commit
`9551188c86977ead4507f2e133f24f2b3d67e129`.
Its [validation run](https://github.com/ael-dev3/Tervain/actions/runs/37868656842)
completed successfully. The [Pages deployment](https://github.com/ael-dev3/Tervain/actions/runs/37869293906)
completed successfully. This establishes a deployed component checkpoint.

Further local work executes the original `CreateFileA` return against an owned
virtual filesystem. Missing and denied files use the original error table and
cleanup; an existing regular file is published into descriptor 3 and its FILE
record. Execution reaches original SpieAdmin shutdown registration or `fclose`,
respectively. These operations and complete startup, world activation and
campaign integration remain unfinished.

Further local work executes original `fclose`, closes the owned regular-file
handle, clears descriptor and FILE flags, restores exception frames and releases
their locks. It reaches SpieAdmin callback registration at `1004b226`.
Typechecking, focused close checks, all 3,007 tests and the production build pass.
The close continuation merged in [PR #171](https://github.com/ael-dev3/Tervain/pull/171)
at `97b5cc081a9f70fc6ba886bc062ffd0ead61363e`. Its
[validation](https://github.com/ael-dev3/Tervain/actions/runs/37870906965) passed;
[deployment](https://github.com/ael-dev3/Tervain/actions/runs/37871431726) completed successfully.

New local work registers SpieAdmin's original callback for a present file, then
reaches the Winsock ordinal-115 import. For an absent file it registers original
SpieAdmin and MessageAdmin shutdown callbacks and returns to initial logging.
Four focused checks and typechecking pass. The production build passed;
all 3,011 tests passed across 278 files. These registrations merged in
[PR #172](https://github.com/ael-dev3/Tervain/pull/172) at
`6b0d904b33a1ac561aa77992b3c92ae2c280bce3` after
[successful validation](https://github.com/ael-dev3/Tervain/actions/runs/37871922842).
Deployment of that revision is pending.

Further local work executes the original logging submission and callback
dispatcher. It enters MessageAdmin's actual critical section and reaches its
stored ErrorAdmin callback at `100494db`, retaining the entered lock and original
context. Typechecking, three focused checks and independent source regeneration
pass. All 3,013 tests and the production build passed at `58033ca8`.
This logger continuation has not yet been published.

- [Detailed workflow and reference paths](gothic3-rebuild-workflow.md)
- [Architecture and implementation background](gothic3-rebuild-overview.md)
- [Dated technical checkpoint history](gothic3-rebuilding-process.md)
- [Hosted reconstruction route](https://ael-dev3.github.io/Tervain/gothic3/)
