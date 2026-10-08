# Gothic 3 rebuild: step-by-step workflow

## Goal and current scope

Rebuild Gothic 3 as a TypeScript game on the separate `/gothic3/` browser route.
Completion means starting a new game, progressing through the campaign, saving
and reloading, and reaching an ending through ordinary play. Engine startup,
world/NPC activation and campaign integration remain unfinished. A hosted build
or a model viewer establishes only the behavior actually demonstrated.

Read the [rebuild overview](gothic3-rebuild-overview.md) for architecture and the
[checkpoint history](gothic3-rebuilding-process.md) for dated implementation evidence.

## How the reconstruction works

There are two connected preparation paths:

```text
Installed archives -> format readers -> converted assets + provenance
                                            |
                                            v
                                      browser renderer

Original DLL bytes + disassembly -> captured instruction/source evidence
                                            |
                                            v
                              TypeScript runtime + platform imports
                                            |
                                            v
                          world, actors, quests and persistent saves
```

Asset conversion supplies the visible world. Behavior recovery supplies the
state changes that make that world playable. A decompiled function must be
checked against its original instructions and connected to the runtime's real
memory and objects before it can support a gameplay claim.

### Repository map

| Location | Role in the rebuilding process |
| --- | --- |
| `tools/gothic3/` | Readers, exporters and reproducible evidence generators |
| `assets/gothic3/` | Source receipts, hashes, captured instructions and research evidence |
| `public/gothic3/` | Resources served to the browser |
| `src/gothic3/` | TypeScript runtime, memory owners, interpreters and game integration |
| `tests/gothic3-dialogue/` | Focused runtime and evidence checks |
| `docs/engineering/gothic3-rebuilding-process.md` | Dated checkpoint history and validation receipts |
| `.github/workflows/pages.yml` | Pull-request validation and main-branch deployment |

### Current startup work: 2026-10-08

Published main revision `4298947b6ecad748fbbf166dca53f7f27466385d`
([PR #157](https://github.com/ael-dev3/Tervain/pull/157)) includes the selected
SharedBase CRT initialization, DLL entry prefix, module lookup and version-resource
fallback. The original MemoryAdmin instructions allocate a 1,792-byte pool slot;
the recorded Windows version API fills 1,740 bytes and execution reaches the
language-helper call at `10002d42`. Its Pages deployment succeeded.

Later local work retains the nested language-helper frame, requests 1,741 bytes,
claims a second pool slot and fills its resource buffer. That continuation stops
at `1004c30e`, before formatting the translation query. It is unpublished. The
nested allocation checkpoint passed 2,924 tests across 275 files; the subsequent
buffer-fill change passed 316 focused checks, typechecking and the production
build, with its full-suite checkpoint still pending.

The next dependencies are query-string formatting, translation and FileVersion
queries, version parsing, buffer cleanup and logging. The surrounding DLL wrapper
and SEH execution, complete DLL initialization, Game/world activation and campaign
integration remain unfinished. Consult the checkpoint history and deployed commit
when distinguishing local implementation from hosted behavior.

### Reference inputs and reproducibility

The installed reference root is
`C:\Program Files (x86)\Steam\steamapps\common\Gothic 3`.
The local research archive used for the startup checkpoints is
`C:/Users/heyas/OneDrive/Рабочий стол/Gothic3_Decompiled_Study_2026-10-04`:

- `00_Original_Runtime/SharedBase.dll`: the matching reference DLL.
- `01_Decompiled_Code/SharedBase_dll/full_disassembly.asm`: retained disassembly.
- Installed and archived SharedBase SHA-256:
  `5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214`.

These paths describe the developer's reference machine. Contributors supply their
own matching installation and study directory; the paths are not browser URLs.
Asset-specific archive paths, source hashes and conversion receipts belong in the
corresponding evidence package, so tree and human resources remain traceable.

For startup evidence, the principal generators are:

| Generator | Output and purpose |
| --- | --- |
| `prepare_shared_initializer_source.py` | Initializer bodies, allocator instructions and cold memory images |
| `prepare_shared_dll_entry_evidence.py` | DLL entry bodies, thunks, VERSION imports and literal images |
| `capture_shared_version_api.py` | Windows API observations for the matching file's version resource |

The initializer package currently records 130 bodies, 5,196 body instructions and
480 CALL receipts. A body without a matching decompiled C record is explicitly
captured as assembly-only evidence. Windows API observations read the file through
system resource APIs without loading or executing Gothic code.

## 1. Inventory the installed game

The local reference installation is
`C:\Program Files (x86)\Steam\steamapps\common\Gothic 3`.
Record archive names, patch precedence and the original resource paths before
extracting anything. Hash the exact inputs used by a checkpoint. Treat the
installation as a read-only reference; format decoding and archive unpacking
need their own evidence before making claims about encryption.

## 2. Recover assets and their relationships

Use the readers and exporters in [`tools/gothic3/`](../../tools/gothic3/).
Prepare meshes, textures, skinned humans, animations, terrain, world placement
and gameplay records. Preserve original paths and conversion metadata so each
browser asset can be traced back to its installed resource.

Keep evidence under [`assets/gothic3/`](../../assets/gothic3/) and browser resources
under [`public/gothic3/`](../../public/gothic3/). Inspect geometry and materials,
including texture alpha, normals, scale, skeletons and animation. Compare a
rendered asset with the original game's appearance before accepting fidelity.

## 3. Recover engine behavior

For a missing behavior, follow its original caller, callee and dependencies.
Compare decompiled C with disassembly and original DLL bytes. Record the module
hash, function addresses, imports, globals, allocation sizes, callbacks and
cleanup order. Decompiled listings are research evidence; each browser behavior
still requires implementation.

Generate reproducible evidence packages with the appropriate preparation script.
Regenerate into a separate directory and compare the generated files and
instruction module with the proposed checkpoint.

## 4. Implement connected TypeScript state

Runtime code lives in [`src/gothic3/`](../../src/gothic3/). Selected original x86
instructions execute through the TypeScript interpreter against owned memory,
thread stacks and implemented platform imports. Implement dependencies while
preserving pointer identity, known and unknown bytes, exception frames, locks,
callback ordering and object lifetime.

At an unsupported operation, report its original address and retain the state
already applied. Continue from that boundary when the dependency is implemented.
Record the distinction between captured evidence, locally implemented behavior
and a reviewed revision that has actually been deployed.

## 5. Join the runtime to gameplay

Complete startup, activate world entities and connect player movement,
collision, rendering, animation and interaction. Integrate NPC routines, combat,
inventory, dialogue, quest conditions and faction progression. Save and restore
the connected state, including consequences that affect later quests and endings.
Each stage must consume the actual state produced by its dependencies.

## 6. Validate a coherent checkpoint

From the repository root:

```sh
npm ci
npm run dev
```

Open the development server's `/gothic3/` route. For runtime changes, run focused
checks first, then the appropriate repository checks:

```sh
npm run typecheck
npm test
npm run build
```

Inspect the diff and source regeneration comparison. Record the revision,
commands, results and next unsupported boundary in the checkpoint history.
For integrated gameplay, include browser observations and save/reload evidence.
Campaign completion requires a playthrough to an ending.

## 7. Review and host the checkpoint

Inspect repository-wide Actions runs, attempts and workflow triggers before
remote changes. Reuse applicable evidence and avoid duplicate runs. The current
[Pages workflow](../../.github/workflows/pages.yml) validates pull requests;
a reviewed merge to `main` builds and deploys the site. A successful deployment
and a successful gameplay check are separate receipts.

The hosted route is [Gothic 3 reconstruction](https://ael-dev3.github.io/Tervain/gothic3/).
Record its deployed revision and supported behavior. Continue through remaining
startup, world and campaign dependencies until the completion criteria above
are demonstrated.
## A reproducible behavior checkpoint

For example, the SharedBase startup work follows this cycle:

1. Hash the local `SharedBase.dll` and retain the matching disassembly.
2. Use `prepare_shared_initializer_source.py` or
   `prepare_shared_dll_entry_evidence.py` to capture the relevant bodies,
   thunks, import slots, globals and resource/export receipts.
3. Regenerate the source package and emitted TypeScript instruction table into
   a separate directory, then compare them with the checked-in files.
4. Implement the missing dependency in its owning runtime component. The
   current stack interpreter is `native-x86-thread-stack.ts`; the SharedBase
   startup owner is `native-shared-crt.ts`.
5. Execute the original supported instructions against retained stack and
   memory state. Import services must validate their caller, arguments,
   pointer identity and lifetime before applying changes.
6. Check the expected continuation and corruption/failure cases. Record the
   exact next unsupported address, including any state already applied.
7. Review the coherent diff, validate it locally, inspect Actions and publish
   a reviewed checkpoint. Continue from the retained boundary.

Windows version-resource observations are captured separately with
`capture_shared_version_api.py`. This reads the file through Windows resource
APIs without loading or executing Gothic code. Its recorded API buffer is
separate evidence from the raw PE resource; the runtime must preserve the
selected buffer layout and query mutations when connecting those imports.

## What establishes completion

A complete reconstruction needs evidence for all of the following:

- A new game reaches an active world with the player and NPCs initialized.
- Movement, collision, rendering, animation and interaction work together.
- Combat, inventory, dialogue, quests and factions consume connected game state.
- Saves restore the world and campaign consequences needed for later progress.
- Ordinary browser play can reach a supported ending.
- The reviewed revision is deployed at the separate `/gothic3/` route.

Keep a build receipt, deployment receipt and playthrough receipt as separate
records. Compilation and hosting alone do not establish campaign completion.
