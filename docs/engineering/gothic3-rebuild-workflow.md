# Gothic 3 rebuild: step-by-step workflow

## Local continuation — 11 October 2026: original bounded cache copy

The type-name routine publishes its actual six-byte cache allocation in the
original type-info slot, then passes that allocation, its derived capacity and
the live constructed source to the captured `3068a84a` bounded copier. The copier
reads and writes six actual bytes including NUL, retains one byte of remaining
capacity, restores its registers and returns status zero through the physical
caller. Execution stops at `3067db48` after 4,147 admitted operations, before
cache-list linking. Lock 14 remains held and the original output is still live.

Ten runtime checks plus the dedicated unknown-byte check and all 19 source/image
checks pass. Interrupting the third write or making the third source byte unknown
retains the actual published prefix and held lock. Exact source regeneration
matches independently. The preceding allocation revision passed 209 startup
integration checks and a production build. The earlier scan revision's full
suite is still running and has reported two failed files; that full validation
is not claimed as passing. This checkpoint is local. List publication, cleanup,
complete startup and the finishable browser campaign remain unfinished.

## Local continuation — 11 October 2026: original type-name cache allocations

The type-name caller inspects the final character of the actual constructed
name, acquires its original CRT lock 14, and verifies the cache slot is still
NULL. It allocates an eight-byte cache-list node, derives the six-byte text
request from the measured length, and obtains a distinct six-byte logical
allocation. Alignment is retained separately from usable span size. Execution
stops before cache-slot publication at `3067db21` after 4,069 admitted operations.
Both new allocations remain uninitialized and owned by the same live Engine CRT.
The original undecoration output is still live; its temporary arena is released.

Typechecking and 16 distinct runtime checks pass, including lock failure, NULL
node/text allocations, aliased backing and an incorrect logical extent. Scan
length and restored ESI are retained at their actual earlier instructions for
later observations. The preceding scan revision passed all 203 startup
integration checks and has entered full-suite validation. This checkpoint is
local. Cache copying, list publication, cleanup, complete startup and the
finishable browser campaign remain unfinished.

## Local continuation — 11 October 2026: original type-name length scan

The actual type-name caller removes the six undecoration arguments and passes
its retained live output to `30679ad0`. The original optimized strlen uses the
runtime's canonical heap alignment proof, reads two DWORDs, selects the known
zero second byte in the second DWORD and returns length 5 at `3067dae2` after
4,043 admitted operations. Padding remains unconstrained: stored padding bits
of zero or 255 produce the same result without changing their unknown masks.
An unknown terminator stops at the original ambiguous DWORD predicate.

Typechecking and seven scan/return/failure checks pass. The captured source
independently regenerates byte-for-byte. Earlier source/image validation passed
all 19 checks; broader integration validation follows. This work is local;
cache publication, complete startup and a finishable campaign remain unfinished.

## Local continuation — 11 October 2026: original undecoration return

The original finally helper passes lock ID 5 to the retained Engine CRT unlock
service. On success it clears the held-lock state, returns through its physical
caller, reloads the actual saved output and executes the original EH epilog.
The outer undecoration routine returns at `3067dacb` after 4,009 admitted
operations. The eight-byte output remains owned and live; its temporary arena
is released. Type-name cache publication, complete engine startup and the
finishable campaign remain unfinished.

Lifetime checks observe parser field values before the actual free callback and
assignment flag operands at the original XOR instruction. Historical records do
not grant authority to read freed allocations. Unavailable unlock preserves the
pending actual call, held lock and live output rather than fabricating return.

Typechecking, 18 selected runtime checks and all 19 source/image checks pass.
This checkpoint is local; broader integration validation follows.

## Local continuation — 11 October 2026: original parser arena release

The returned name now enters the original HeapManager destructor at `30696606`.
It loads the next block before calling the retained Engine CRT free callback,
releases the actual 4,104-byte parser arena, and returns at `3069b2f0` after
3,989 admitted operations. The separate eight-byte output remains live with
`float` followed by NUL and two unknown padding bytes. Historical text-node
records are retained before release; `undecorationTextNodeLive` distinguishes
those records from live allocation authority. Interrupted release preserves the
actual callback boundary, live output, held lock and unreleased allocation.

Typechecking, 17 selected runtime/source checks and byte-identical independent
regeneration pass. This checkpoint is local. Lock release, outer undecoration
return, type-name cache publication, complete engine startup and the playable
campaign remain unfinished. The preceding parser-return revision passed 194
focused integration checks and a production build; the earlier output-allocation
revision passed 3,496 tests across 316 files and a production build.

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

For the latest local implementation boundary, read the
[rebuild guide](gothic3-rebuild-guide.md#current-implementation-boundary-11-october-2026).
The following example records an earlier checkpoint.

### Historical startup example: 2026-10-09

[PR #161](https://github.com/ael-dev3/Tervain/pull/161) merged as
`d6b28f9e37e9dfce20a89e5afc2ab0aa2a107cf6`. The selected SharedBase
continuations execute version-resource allocation and querying, hexadecimal
query formatting, FileVersion copying, the original tokenizer and integer
scanner, and both original buffer cleanup paths. The recovered version is
`1, 60, 25931, 29`. Execution reaches the separator logger call
`100a15cd -> 1000840e`.

That checkpoint passed 2,954 tests across 275 files, typechecking, the production
build and exact regeneration of both source packages. Its
[Pages deployment](https://github.com/ael-dev3/Tervain/actions/runs/37852424019)
completed successfully; merge and deployment are separate receipts.

Further local logging work captures MessageAdmin construction, initializes its
original physical critical section, and allocates the holder through the actual
12-byte pool selected by `1003d304 -> 100028f6`. The original bitmap claim and
three DWORD initialization stores execute, with the common MemoryAdmin lock and
saved registers restored. The ErrorAdmin getter and cold invalidation now execute; construction reaches
the 12,500-byte buffer-allocation call at `100227a8 -> 10004133`. Shortened Root strings also complete through this newly supported
pool. The checkpoint passes 2,961 tests in 275 files, typechecking, the production
build and exact independent regeneration of both evidence packages. The
initializer package now has 134 bodies and 5,358 instructions. This MessageAdmin
checkpoint merged in PR #162; its Pages deployment completed successfully.
Later local work executes the original variable-size buffer allocator and
callback registration through the dedicated 112-byte pool. The constructor
returns and registers its shutdown through the original CRT exit table.
Execution reaches the SpyAdmin getter at `10049799 -> 10008b11`.
It passes 2,967 tests, typechecking, the production build and exact regeneration
of both evidence packages.

These are selected component continuations. Complete DLL wrapper and exception
handling, live Game startup, world/NPC activation and campaign integration remain
unfinished. The repository does not yet demonstrate a campaign playable through
an ending.

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


### 11 October 2026: original basic-type value copy

The M qualifier comparisons follow their actual branches into the temporary-empty
helper. Its zero-node branch returns one, and the basic parser calls the original
value-copy routine at `30696c93`. All 54 instructions of that routine now execute:
each masked XOR assignment preserves the unchanged destination's other bits,
and the text-node pointer retains its Engine allocation identity. The physical
RET 4 returns to `3069b553`; the selected path reaches 3,531 admitted operations.
The basic, compound and data-type parser returns remain pending, followed by
name output, cleanup, cache publication and later initialization.

Typechecking passed; nine existing focused checks and one new ownership/flag
check passed. Independent regeneration reproduced JSON and TypeScript exactly.
The earlier `a8f295e60` checkpoint passed 173 focused checks, all 3,475 tests in
315 files, and a production build. That full-suite receipt predates this copy
implementation. This continuation is local and has not been deployed.


### 11 October 2026: original parser returns

The basic parser now executes its saved-register restoration, LEAVE and RET,
then the compound parser releases its two arguments and returns through its own
saved ESI/frame. The data-type parser releases its arguments and returns to
`3069a321`. Twenty additional captured instructions bring the selected path to
3,551 operations. Each return is checked against the actual pending CALL and
retained return-word identity. The type parser still owns its frame; name output,
cleanup, cache publication and later Engine startup remain unfinished.

Ten distinct focused runtime checks pass: eight in the initial run and two after
updating their observations from pending calls to returned calls. All 16 source
and image checks pass. The copy checkpoint `a43e29021` is undergoing combined
validation in a separate unchanged checkout; that run predates these returns.
This local continuation has not been deployed.


### 11 October 2026: name-parser value assignment

The type parser restores its working flags from 0x0800 to 0x2800, copies the
constructed value through the same 54-instruction routine, restores its saved
registers and returns to `3069b044`. The name parser then executes the original
assignment helper `30696da9`. That helper preserves the receiver's other flag
fields and carries the same retained text-node pointer into the name local.
Its physical RET 4 reaches `3069b04e` after 3,666 admitted operations. Output
buffer sizing/writing, name-parser return, cleanup, cache publication and later
startup remain unfinished. Captured length and writer routines are source
evidence for upcoming work; their capture does not establish runtime execution.

Typechecking, 14 focused runtime checks and 17 source/image checks pass.
Independent regeneration reproduced the JSON and generated TypeScript byte for
byte. The copy checkpoint `a43e29021` completed its combined focused run with
180 passes and four failures across five files (265.15 seconds). Full-suite and
build stages did not start. Two failures expected the earlier stack position;
two read temporary character buffers after later startup reused them. The latest
checks observe those buffers at the original argument-setup return and verify
the current stack position. Fresh combined validation is required for publication.

Remote PR #239 passed its existing CI and was merged externally as
`2f721b1525291936b7ce51cdea5939b6c7d4cb37`. Its main Pages deployment was still
running when checked. Local native startup work remains separate from that PR.


### 11 October 2026: original name length and output allocation

The name parser follows its completed-input branch and assigns the retained
value into its output local. The original length routine checks that value,
walks its actual node, dispatches through the readonly original vtable to
`30696ec5`, reads the stored five-character length and returns through the
physical stack. It does not substitute a hardcoded decoded name for that call.

The caller adds the NUL byte to obtain capacity six, aligns the actual malloc
request to eight and invokes the retained Engine allocator callback. The new
output allocation has its own canonical heap capability. The caller publishes
its owned pointer and capacity and calls the original writer `30697171` after
3,783 admitted operations. Its eight bytes remain unknown; writing, final name
return, cleanup, cache publication and later startup are still pending. Allocation
unavailability retains `30672ec7`; NULL follows the original branch to `3069b102`
without a fabricated buffer. A stale arena allocation returned for the smaller
output request is rejected at the allocator boundary before pointer publication.

Typechecking, ten existing focused runtime checks, five ownership/configuration
and allocation-failure checks, and 17 source/image checks pass. Independent JSON
and TypeScript regeneration is byte-identical. Combined validation of the earlier
`d56fad61f` checkpoint ended with 184 passes and one stale flag assertion in five
files (259.31 seconds); full-suite and build stages did not start. The latest
configuration check accounts for restored flags and the newly published output.
Fresh combined validation remains required before publishing this continuation.

Main revision `2f721b1525291936b7ce51cdea5939b6c7d4cb37`, including Claude's PR
#239, completed both build and Pages deployment in workflow `38102253395`.
That deployment does not include this local native continuation or prove a
browser campaign playable through an ending.


### 11 October 2026: original writer and name-parser return

The readonly text-node vtable evidence now includes all three entries (12 bytes),
including the original writer target `306973db`. The string writer checks the
retained node, obtains its length through the original virtual callback and
invokes that writer. The node writer shares the original bounded copy loop with
the literal-to-node path, but reads its input from the owned character storage.
It writes five characters into the separate output allocation; the outer writer
writes the NUL byte and physically returns to `3069b0d3` after 3,914 operations.

The name parser then reads and processes that actual output through its original
completed-input path. It writes the final terminator, restores its frame, and
returns the canonical output pointer to `3069b2e3` after 3,965 operations. The
six bytes are `float` followed by NUL; the allocation's two padding bytes remain
unknown. Original writer arguments and parsed-value metadata are recorded while
their source slots are live, before those slots are reused or their frame returns.
The outer undecoration call, arena cleanup, lock release, type-name cache
publication and remaining Engine startup are still pending.

Typechecking, 17 focused runtime checks and 19 source/image checks pass.
Interruption checks preserve two copied characters with the remaining bytes
unknown, or five characters without a fabricated terminator. Pending calls stay
pending and cannot replay. Readonly checks reject altered writer-target bytes
and masks. Independent source regeneration reproduced JSON and TypeScript
exactly. The earlier `424effb33` combined run passed all 189 focused checks in
five files (282.02 seconds) and is running its full suite in a separate unchanged
checkout. Its result does not validate this newer writer implementation.
This continuation has not been deployed; a complete browser campaign remains
unverified.
