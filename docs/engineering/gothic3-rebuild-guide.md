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

[PR #165](https://github.com/ael-dev3/Tervain/pull/165) merged original
ErrorAdmin buffer handling, shutdown registration and selected SpyAdmin startup
at commit `4e24c2f4728a2f5abddadb5f4d7e8f2c4a60723d`.
Its [validation run](https://github.com/ael-dev3/Tervain/actions/runs/37859998746)
succeeded. The [Pages run](https://github.com/ael-dev3/Tervain/actions/runs/37860775993)
records deployment separately; merging alone does not establish deployment or
campaign playability.

Further local work traces SpieAdmin construction and the original CRT file-open
path for `zSpie.txt`. It currently stops at the shared file-open call
`100d1a2d`, retaining the reserved FILE slot and its lock. This continuation is
not yet a published checkpoint. Completing this dependency still leaves broader
startup, world activation and campaign integration work.

- [Detailed workflow and reference paths](gothic3-rebuild-workflow.md)
- [Architecture and implementation background](gothic3-rebuild-overview.md)
- [Dated technical checkpoint history](gothic3-rebuilding-process.md)
- [Hosted reconstruction route](https://ael-dev3.github.io/Tervain/gothic3/)
