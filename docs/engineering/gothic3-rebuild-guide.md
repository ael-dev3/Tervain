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
Its [Pages deployment](https://github.com/ael-dev3/Tervain/actions/runs/37872657537)
completed successfully.

Further local work executes the original logging submission and callback
dispatcher. It enters MessageAdmin's actual critical section and reaches its
stored ErrorAdmin callback at `100494db`, retaining the entered lock and original
context. Typechecking, three focused checks and independent source regeneration
pass. All 3,013 tests and the production build passed at `58033ca8`.
The logger continuation merged in
[PR #173](https://github.com/ael-dev3/Tervain/pull/173) at
`43bff246c1491dd1128365a4f11f058eef76d4ff`; its
[validation](https://github.com/ael-dev3/Tervain/actions/runs/37872785554) passed.
Its [Pages deployment](https://github.com/ael-dev3/Tervain/actions/runs/37873976543)
completed successfully.

The next local checkpoint recovers ErrorAdmin's callback from the original DLL
bytes and disassembly, including a function omitted from the function catalogue.
It executes the original string scans and retains the original temporary-buffer
allocation request at `10022613`. The callback's formatting, buffer insertion,
cleanup and return still need implementation. This work has no production
callers and does not establish complete engine startup.
At revision `a03998a4`, typechecking, three focused checks, independent source
regeneration, all 3,015 tests across 278 files, and the production build passed.

Local revision `06d998a8` executes the original CRT allocation from that pending
call. It verifies the return frame, requested size, restored caller registers and
same owned buffer passed to the original formatter at `10022632`. Damaged return
words and requests are rejected before allocating. Two focused checks,
typechecking, all 3,017 tests across 278 files (329.09 seconds), and the production
build pass at `06d998a8`. This checkpoint merged in
[PR #174](https://github.com/ael-dev3/Tervain/pull/174) at
`ee0a6c2c9129dd3749b51aad6314cfa850795a72` after successful
[validation](https://github.com/ael-dev3/Tervain/actions/runs/37874648063).
Its [Pages deployment](https://github.com/ael-dev3/Tervain/actions/runs/37875181203)
completed successfully.
Formatting, insertion into ErrorAdmin's ring buffer and cleanup remain pending.

Local revision `fdbac97f` executes the original `sprintf` and output engine using
the callback's actual buffer, format, string arguments and line number. It writes
the original separator and source location with a terminating NUL, restores the
formatter caller and reaches ring-buffer insertion at `10022680`. Damaged return,
destination and format arguments are rejected before writing. Three focused
checks, typechecking, independent evidence regeneration and the production build
pass. All 3,020 tests across 278 files passed in 309.13 seconds at `fdbac97f`.
Ring insertion, cleanup and callback
return remain pending; these continuations still have no production callers.

Local revision `6b77e3be` executes original ring insertion, padded record copying,
full-ring removal and cursor wrapping. It frees the same formatting allocation,
returns from ErrorAdmin and reaches SpyAdmin's stored callback at `100494db`.
The scratch areas use canonical mapped-image storage; reacquisition preserves
their contents and CRT alignment geometry. Four focused checks, typechecking,
independent evidence regeneration and the build pass. All 3,023 tests across 278
files passed in 315.11 seconds at `6b77e3be`. MessageAdmin's section remains held
until dispatch completes.

Local revision `64c62d8d` executes SpyAdmin's original absent-window return,
finishes MessageAdmin dispatch and releases its actual critical section. The
first separator logger returns and DLL initialization reaches the version-log
call at `100a15ed`. Three focused checks, typechecking, independent regeneration
of 93 methods and 5,461 instructions, the production build and all 3,025 tests
across 278 files pass (321.63 seconds). Version formatting and subsequent startup
remain unfinished; these continuations have no production callers.

The preceding insertion checkpoint merged through
[PR #176](https://github.com/ael-dev3/Tervain/pull/176) as
`6562df265c7224aa863f0bac52eb11d9c4f4bcba` after successful validation.
Its Pages deployment has not yet been verified for this record.

Local revision `f6e9bbfe` executes the version formatter, both remaining callback
cycles and the final separator, then returns `1` from the original direct
SharedBase DLL entry. Six focused checks, typechecking and the production build
pass. All 3,076 tests across 283 files passed in 373.05 seconds. This uses the supported virtual filesystem profile with
no `zSpie.txt`. The direct DLL call does not execute the surrounding CRT wrapper.
Production startup, live world activation, saves and campaign completion still
need integration. The preceding formatter revision passed all 3,030 tests.

### Game startup: original PE protection check

The next local checkpoint enters Game's original `__cinit` call at `204678f2`
on the existing browser startup stack. It executes PE validation, section lookup
and the protection check using current owned header bytes. The original readonly
math callback slot reaches the indirect call at `20466610`; that callback remains
unimplemented. Invalid headers or writable sections follow the original branch
to the pointer-initialization call at `20466617`.

The preparation tool captures 16 methods and 660 instructions. Runtime admission
selects four methods and 150 instructions; floating-point dependencies remain
context evidence. Thirteen focused checks and typechecking pass, and independent
regeneration reproduces both JSON and TypeScript byte for byte. At runtime revision
`9540631a`, all 3,082 tests across 284 files passed in 397.79 seconds and the
production build passed. A local production-browser observation confirmed the
continuation at `20466610` after entering Ardea. Publication remains pending. Complete startup,
world activation, campaign saves and a playable ending remain unfinished.

- [Detailed workflow and reference paths](gothic3-rebuild-workflow.md)
- [Architecture and implementation background](gothic3-rebuild-overview.md)
- [Dated technical checkpoint history](gothic3-rebuilding-process.md)
- [Hosted reconstruction route](https://ael-dev3.github.io/Tervain/gothic3/)
