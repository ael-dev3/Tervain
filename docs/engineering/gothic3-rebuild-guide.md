# Gothic 3 rebuilding process

## Goal and current state

Rebuild Gothic 3 in TypeScript on Tervain's separate `/gothic3/` route. Completion
means starting a new game, progressing through the campaign, saving and reloading,
and reaching an ending through ordinary browser play.

As of 9 October 2026, asset readers, viewers and selected native runtime
continuations exist. Complete engine startup, live world activation and campaign
integration remain unfinished. The hosted route does not yet demonstrate a
finishable campaign.

## How the rebuild works

### Current local checkpoint: Running enum enters with retained registries

Startup now selects the actual Running initializer table slot at offset
`0x378`. It requires the preceding None initializer's actual completed owner,
constructs the original Running name, allocates a separate twelve-byte value
with category `0x2a` and executes the recovered base/vtable stores. It reads
the existing scratch scalar, then writes supplied value one without modifying
scratch. Both registry guards and their prior allocations remain retained.
Startup stops at Running name lookup at `200719d7 -> 200708b0`, which must
handle the existing bucket state. Repeated entry preserves the interruption
and allocation. Typechecking and seven focused checks across three files pass.
The integrated build at `352ab998` passed in 38.34 seconds; its full suite
remains running and does not cover this later local continuation.

### Current local checkpoint: first enum initializer returns

The value-registry cleanup callback `20549a60` is captured through its final
RET: sixteen instructions and 74 PE-verified bytes. The actual exit-table
registration completes. Value lookup selects the original scalar bucket,
allocates its sixteen-byte entry, constructs the value and CString, links the
entry and assigns the retained enum name. The descriptor then allocates its
twelve-byte value-array holder, reserves nine slots through the existing heap
and stores the actual twelve-byte enum object in slot zero. Its count is one.
The temporary CString is destroyed and the original initializer returns at
`204b1ea2` through the retained startup frame. Startup reaches `204b1eb0`.

Typechecking, 22 focused checks across four files and exact independent source
regeneration pass. The earlier full suite at `158af101` finished with 3,193
passing tests and one image-metadata failure; that issue is corrected locally
and its regression passes. A fresh full suite is required before publication.
Full campaign completion remains unproven.

### Current local checkpoint: enum value assignment and second registry

The actual original value-base vtable slot `+0x1c` resolves through
`200067f8` to the five-instruction body `2006d540`. It copies the retained
value DWORD into the name entry's actual value subobject and returns one.
The subsequent value-registry guard and constructor now execute with their
separate canonical image and allocation. Its independently captured reserve
helper `2006e860` produces 43 active buckets and capacity 51, clearing all
204 bytes. Startup reaches cleanup registration for callback `20549a60` at
`20071a07`; lookup and descriptor insertion remain unfinished.

Typechecking and 22 focused checks across four files pass. Broad validation of
the earlier checkpoint exposed incorrect image-receipt metadata for the enum
constants: their scope and capture flag are now corrected, and the independent
Game image-admission regression passes. The earlier full-suite run does not
validate this correction or continuation. The work remains local and undeployed.

### Current local checkpoint: enum name lookup returns

The cold name lookup hashes the actual retained CString with the existing
original hash implementation and selects its bucket modulo 43. The original
empty-bucket branch allocates sixteen bytes with category `0x199`, constructs
its CString and value-base subobject, shares the temporary name through the
recovered assignment and stores value zero and a NULL next link. It publishes
the actual entry in that bucket and increments entry count to one.
The actual +4 subobject is now available for the next virtual assignment at
`200719e8`, which remains unsupported. Nonempty bucket comparison is also
unfinished. Typechecking and six focused production checks pass; checks inspect
the actual entry identity, bucket link, remaining empty buckets and scalar
fields. These later local changes remain undeployed.

### Current local checkpoint: enum name registry cleanup registers

Targeted recovery captures callback `20549ac0` through its final RET at
`20549b09`: sixteen instructions and 74 bytes, checked against the matching
Game PE. Exact generated JSON admission supplies this callback's receipt to
both exit-table capability construction and registration validation. The
actual `_atexit` registration completes without invoking shutdown.
Startup reaches name lookup at `200719d7 -> 200708b0`. Typechecking, seven
focused checks and independent exact regeneration pass. The value registry
cleanup target `20549a60` remains unadmitted; enum insertion and campaign
completion remain unfinished. This checkpoint is local and undeployed.

### Current local checkpoint: enum name registry constructs

The enum naming path sets the original name-registry guard bit and zeros the
four canonical registry DWORDs. Its cold reserve(43,0) selects growth eight,
allocates 204 bytes through the same existing MemoryAdmin, clears all 51 DWORDs
and publishes capacity 51. The constructor then stores bucket count 43; entry
count remains zero. The actual buffer and fields survive interruption.
Startup reaches cleanup registration at `200719c5`, with callback `20549ac0`
still requiring admission. Lookup and value insertion remain unfinished.
Typechecking and six focused production checks pass; regressions inspect the
actual guard, counts and all 204 cleared bytes and their known masks.
This continuation remains local and undeployed.

### Current local checkpoint: enum base construction returns

The original SharedBase default `bCObjectBase` constructor resolves from
`10007c11` to `1004a1c0`. Its three exact instructions return the actual
receiver and store vtable `100e7e1c`. The enum continuation applies this to its
retained allocation's +4 subobject, then restores derived value-base vtable
`2065902c` and writes the actual scratch value zero at +8.
Startup reaches value naming at `20071eab -> 200719a0`; the shared name/value
registries remain unfinished. The initializer has not returned or inserted a
value. Typechecking, seven focused checks and byte-identical independent
regeneration of both source JSON and generated TypeScript pass. These later
local changes remain undeployed.

### Current local checkpoint: first enum initializer enters

Startup selects the actual `204b1e70` table entry at offset `0x374` and retains
its original CALL frame. The translated owner constructs `gEArenaStatus_None`
from the canonical nineteen-byte image, checks the live Status descriptor,
writes enum scratch zero, allocates twelve bytes with original category `0x46`
from the same MemoryAdmin and stores vtable `20659c74`. The next unsupported
operation is the original SharedBase base-object constructor at `20071e89`,
through IAT `207d8700`. The allocation and temporary name remain live; repeated
entry retains the interruption without replaying allocation or writes.

Typechecking and seven focused checks across three files pass. The preceding
initializer-return checkpoint `c2b9593a` separately passed 3,193 tests across
296 files in 479.54 seconds and built in 49.10 seconds. Those broad results do
not cover this later enum continuation. Publication and full campaign remain
unfinished.

### Current local checkpoint: first Arena property initializer returns

The Status initializer now registers its original cleanup callback `205499a0`
through the existing same-CRT exit table. The complete callback's eleven
instructions are checked against original Game DLL bytes; admission pins its
entry, body and instruction hash. Registration preserves the existing exit
table and ordering. This registers callback data; its shutdown execution is
still unfinished. The caller ignores a known `_atexit` failure as the original
code does, without inventing a successful entry.

The initializer returns at `204b1e4c` through the actual startup CALL/RET frame.
Startup reaches the next C++ initializer, `204b1e70`, which is not yet supported.
Typechecking and six focused production checks pass, including actual Status
registration, temporary destruction, cleanup registration and initializer
return. This checkpoint remains local; campaign completion is unproven.

### Current local checkpoint: Status registration returns

After the actual filtered Debug return, property registration follows its
original success epilogue at `10088196` through `1008819e`, returning AL=1.
The retained Arena array still owns the actual Status descriptor. The caller
then destroys its temporary CString at `204b1e39` using the existing recovered
destructor; regression checks confirm the temporary's destroyed state.
Startup reaches cleanup registration at `204b1e44 -> 204637ce`, which remains
unfinished. The initializer has not returned. Typechecking and six production
checks pass, followed by two focused checks with explicit registration and
temporary-destruction assertions. This continuation is local and undeployed.

### Current local checkpoint: filtered diagnostic returns

The registration diagnostic now executes OnMessage's original signed threshold
comparison against the returned MessageAdmin owner's actual DWORD at offset
`0x1c`. Type one and threshold one take the original immediate-success branch,
return AL=1, and execute the six-argument return. Debug then returns at
`10049931`. No callback is dispatched for this filtered message.
Types above the live threshold retain an explicit unsupported callback-loop
boundary. Startup advances to the unfinished property-registration return after
Debug. Typechecking and six focused checks across combined startup and browser
NPC services pass, including signed comparison and unsupported-loop checks.
This local continuation has not been deployed or broadly validated.

### Current local checkpoint: actual MessageAdmin getter returns

Registration Debug now looks up the runtime-admin factory's unique actual
same-platform MessageAdmin module. Missing or ambiguous owners are rejected;
lookup does not initialize or substitute a module. Its original getter runs
through the existing recovered singleton implementation and returns the same
owner, including its actual shutdown registrations and callback allocations.
The retained diagnostic confirms that owner is ready and its threshold is one.
Startup now stops at OnMessage, `1004992b -> 10005560`. Dispatch and the return
from the Status initializer remain unfinished.

The preceding formatter-return revision `3d59cf3d` passed 3,193 tests across
296 files in 523.96 seconds. That full-suite receipt does not cover this later
getter integration, which has typechecking and focused production checks.

### Current local checkpoint: registration formatting returns

At `3d59cf3d`, the selected original narrow-string formatter path writes the
property-registration message into the actual SharedBase TLS buffer. It uses
captured classification and dispatch tables, the initialized locale and the
original FILE cursor/count behavior. The recovered security-cookie check and
formatter return complete, and the caller writes the terminating NUL.

The retained next call is MessageAdmin's getter at `10049924 -> 100088b4`, with
the actual message buffer and original arguments. Message dispatch, the return
from the Status initializer and subsequent world activation remain unfinished.
Eight focused checks across three files and typechecking pass. The production
build passed in 47.06 seconds. Independent regeneration of both the source JSON
and generated TypeScript matched their SHA-256 hashes exactly. Full-suite and
browser validation of this revision have not yet been recorded here.
This continuation is local and has not been deployed.

### Production prerequisite ordering: local integration

The browser NPC service now invokes the existing SharedBase CRT helper before
Game startup when using the complete browser process-input profile. It retains
the actual initialized CRT owner. The CRT GUID copy and the GUID service share
the canonical module source and destination, and the service adopts the completed
CRT execution instead of replaying the selected initializer. Cold, incomplete
and repeated adoption are rejected. Prefix-only research profiles retain their
selected initializer path.

The integrated service reaches Arena Status with its actual PTD and returns
from LocaleUpdate. Its next unsupported formatter instruction is `100b53b0`.
Five focused checks across the combined-startup and production-service files
pass using the repository's 30-second CI timeout; typechecking also passes.
The production build at `968db386` passed in 49.28 seconds. Its full suite
passed 3,190 tests across 295 files in 542.94 seconds against unchanged sources
in the separate validation checkout.
The preceding canonical GUID storage change passed 350 checks across the
SharedBase CRT and combined-startup files in 348.49 seconds. This receipt covers
the storage change, rather than the later production ordering and adoption.
A fresh production browser observation at `968db386` entered Ardea and inspected
`Ardea_OutNovice_01` (11,280 triangles, two material meshes). The actual developer
panel reports the formatter interruption at `100b53b0 (LocaleUpdate returned)`,
4,576 environment/startup source operations and incomplete NPC activation:
zero of sixteen attached property sets, with the ScriptAdmin getter still
unconnected. The scene reports 202 objects, 70 characters and three source
routine positions. This establishes production integration of the locale
prerequisite, rather than campaign playability. The complete DLL wrapper,
NPC activation and campaign remain unfinished.

### SharedBase prerequisite integration finding

A local integration check now runs the existing SharedBase CRT process-attach
helper on the actual browser compatibility platform with its process inputs,
I/O selections and logical stack. The helper returns `1`, with its real PTD
installed and initialized. This proves the selected helper path; the complete
DLL wrapper remains unfinished.

The initial combined check stopped at Game's I/O entry because its controller
required a cold stack. The local handoff now admits the returned SharedBase
helper only after checking its actual canonical owner, installed PTD, completed
CALL records, restored ESP and saved registers, restored FS chain and original
`100adc7e` return continuation. It retains the same physical thread stack.
Game then completes I/O and reaches its C++ initializers, stopping at
`204b11b0` in the fixture without the class-name memory pools. Production
ordering and complete DLL-wrapper integration remain pending. See
`tests/gothic3-dialogue/browser-shared-crt-startup.test.ts` for the regression.

All nine focused checks across three files and typechecking pass for the local
locale-entry and prerequisite investigation. The preceding formatter-entry
revision `dd1c79d2` passed 3,189 tests across 294 files in 548.19 seconds; that
full-suite receipt does not cover the later local changes. PR #202's Pages run
`37928617229` completed successfully. Hosted gameplay still needs observation,
and these new local continuations have not been deployed.

### Practical development cycle

For each feature, follow one complete cycle:

1. Locate the original resource or native function and record its path, version
   and SHA-256. Resolve archive patch priority before exporting an asset.
2. Recover the format or behavior from original bytes and disassembly. Keep
   decompiled pseudocode as supporting research, and record unresolved behavior.
3. Write a repeatable preparation tool in `tools/gothic3/`. Store source evidence
   in `assets/gothic3/` and browser-ready resources in `public/gothic3/`.
4. Implement the recovered behavior in `src/gothic3/`, preserving actual object
   identity, allocation ownership, initialization order and cleanup. Stop at an
   unsupported operation with the completed state retained.
5. Connect the implementation to `/gothic3/`. Check the visible model or gameplay
   result, including materials, animations and entity state where applicable.
6. Inspect the diff, reproduce generated evidence independently and run the
   relevant tests, typecheck and production build. Record the revision and results
   in the checkpoint history.
7. Inspect repository-wide Actions runs and workflow triggers before publishing.
   Review the pull request, deploy the accepted revision and record the hosted
   observation separately from local validation.

Continue this cycle through startup, world activation, NPC behavior and campaign
systems. Completion requires a demonstrated new-game-to-ending playthrough with
save and reload; each intermediate checkpoint records only its verified scope.

### From installed files to a playable browser game

The rebuild follows two tracks that meet in the browser: converting the game's
resources and reconstructing the behavior that uses them. Extracting a tree or a
human mesh gives us a viewable model. Rebuilding a character also requires its
materials, skeleton, animations, entity properties, routines and gameplay state.

| Stage | Work | Result needed before advancing |
| --- | --- | --- |
| Reference inventory | Identify installed archives and matching Game, Engine and SharedBase DLLs; retain paths and hashes. | Traceable inputs for every export and recovered function. |
| Asset recovery | Decode archive entries, meshes, textures, materials, animations and world records. | Browser resources linked to their original archive paths. |
| Rendering | Reproduce material settings, foliage transparency, lighting, animation and placement. | Models and scenes compared with the installed game. |
| Runtime recovery | Follow original calls and data, capture instruction bytes and implement their effects in TypeScript. | The supported operation returns with the original state and ownership rules. |
| World integration | Connect initialization to entities, NPC property sets, navigation, routines and interactions. | Actors and the world update during ordinary play. |
| Campaign integration | Connect dialogue, quests, combat, inventory and persistent saves. | A new game can progress, reload and reach an ending. |
| Publication | Review changes, validate the exact revision and deploy `/gothic3/`. | A recorded deployed revision and observed browser behavior. |

The matching local research inputs are in
`C:/Users/heyas/OneDrive/Рабочий стол/Gothic3_Decompiled_Study_2026-10-04`.
`00_Original_Runtime/` contains the reference DLLs;
`01_Decompiled_Code/Game_dll/` contains `functions.csv`,
`full_disassembly.asm` and the `pseudocode/` directory. These are local research
paths, not files required on a player's computer. Decompiled names can be
misleading, so instruction bytes determine the implementation.

For the current startup continuation, follow the next unsupported initializer
from its captured table entry to its actual callee. Recover the required imports,
globals, allocation rules and cleanup callbacks, then connect the implementation
to the existing startup walker. Preserve completed behavior and record the next
unsupported address. Repeat until startup can activate the world, then apply the
same evidence-driven process to gameplay systems.

### Local checkpoint: primitive templates and scoped struct names

The latest local Arena registration continuation executes the SharedBase
singleton getter, registration-enabled check and root-flag query. It follows
the empty factory-array branch into the original insertion body and requests
space for one entry. The original reserve body computes capacity nine and a
36-byte allocation request. Its MemoryAdmin getter uses the existing recovered
implementation and returns the actual same-platform owner through the retained
CALL/RET frame. Its opaque identity becomes the original realloc receiver.
The first NULL-old-buffer realloc now uses that actual owner and allocates the
36-byte request from its audited 40-byte pool. The original pointer publication
executes. The captured memset body zeroes nine DWORDs, reserve returns, and
the insertion body stores the actual root-wrapper pointer in slot zero.
Factory count is one and capacity nine. Registration, the final IsRoot query
and wrapper initialization return. Root cleanup registration now uses its
captured Game function receipt and the existing CRT exit table. The original
initializer returns, with 155 completed C++ initializer calls and 158 shutdown
callbacks. Startup stops before `204b1dd0`, the first Arena status-property
initializer. Cleanup execution remains unimplemented. Existing-buffer
realloc is still unsupported in this bridge.

The subsequent startup bridge invokes the existing translated Arena Status
initializer through its original table slot `2056c370`. Its actual CALL frame
remains pending. Descriptor construction, Create and property-array insertion
complete: the canonical Arena type retains one Status descriptor with capacity
nine. Browser startup now loads the pinned SharedBase static TLS template on
the retained logical thread before entering Game startup, using the existing
virtual loader's declared slot zero. This supplies loader state; SharedBase CRT
initialization and DLL attachment remain separate unfinished prerequisites.
Canonical startup checks retain the actual same-platform TLS owner.
At revision `1f31a021`, the production build passed in 46.82 seconds. A fresh
local production browser entered Ardea and inspected `Ardea_OutNovice_01`.
The developer panel reported 4,576 environment/startup source operations and
the same translated Status initializer interruption at the SharedBase output
formatter. NPC activation remained incomplete, with zero of sixteen property
sets attached and an unconnected ScriptAdmin getter. This browser observation
does not establish a finishable campaign; full-suite validation of that revision
is still running, and these Arena changes have not been deployed.

Full validation subsequently passed all 3,185 tests across 294 files in 481.17
seconds at `1f31a021`. Main revision `5a348b20` is integrated at `37455aa9`;
its Gothic runtime, evidence, generators and dialogue tests remain byte-identical
to that validated revision. All 41 integrated checks across four files passed,
including the main quest and model-ledger changes, and the integrated build
passed in 45.53 seconds. Publication is pending; the supported startup still
stops at the output formatter, and campaign completion remains unproven.
Registration passes TLS lookup and prepares its actual FILE buffer, then stops
at the unsupported output formatter (`100b5355`, called from `100a7eff`).
This bridge does not interpret the initializer's
lower instructions on the startup stack, and it does not claim a returned
initializer or completed property registration. Eleven focused checks across three
files and typechecking pass; broad validation and browser proof remain pending.
The preceding root-return build at `45b1e5d5` passed in 43.99 seconds.

The next local diagnostic continuation translates the formatter entry's retained
frame from the exact 25-instruction source selection. Its FILE, format and
varargs inputs are actual diagnostic objects. Saved caller-register bits remain
unknown, and cookie XOR EBP retains an opaque expression over the canonical
cookie image and relative frame. Seven local DWORDs are zeroed; the pending
LocaleUpdate call retains its NULL locale argument and uninitialized 16-byte
receiver. Execution stops at `100b53ab -> 100a74b6`. This local frame is separate
from instruction interpretation on the Game startup stack. Eight focused checks
pass; LocaleUpdate, formatting, diagnostic dispatch and return remain unfinished.
At local revision `892186f7`, typechecking, byte-identical independent evidence
regeneration and the production build (35.62 seconds) pass. Full-suite and
production-browser validation of this later formatter entry remain pending.

The preceding Arena startup batch merged through PR #202 at
`8e86398264d3a29983c762190cd6f90ff09b4243`. CI run `37927335964` passed all
3,189 tests across 294 files, typechecking and the production build. Main Pages
run `37928617229` completed successfully. The later local continuations above
are not included in that deployment.
The root-insertion revision `6d7c14a7` passed all 3,185 tests across 294 files
in 485.24 seconds and built in 44.31 seconds. These results apply to that earlier
revision, before root cleanup registration, Status integration and TLS loading.
The source package captures 589 instructions. Nineteen focused checks across two files
and typechecking pass for this continuation; broader validation remains pending.
The preceding MemoryAdmin-getter revision `e67f69e8` has a passing production
build (43.94 seconds) and all 3,185 tests across 294 files passed in 473.83
seconds. Those results apply to that earlier revision.
Full-suite, build, browser and deployment evidence for this continuation remain
pending.

The preceding local Arena factory bridge reads the current original type vtable
and captured virtual slot, executes `2002adfb -> 2006d780`, and returns the
factory subobject through the retained CALL/RET frame. The pushed wrapper
argument remains available for the following SharedBase registration call.
Startup next stops at `200705d6 -> [207d86e0]` (`RegisterPropertyObject`).
Twenty focused checks and typechecking pass; the 282-instruction source package
and generated runtime independently reproduce byte for byte. Its full-suite,
build, browser and deployment evidence remain pending. The preceding registration
continuation at `137b6da2` passed all 3,185 tests across 294 files in 447.44
seconds, and its production build passed in 42.36 seconds. Those results apply
to that earlier revision.

The latest local Arena replacement now returns. The captured registration
toggle executes twice on the canonical SharedBase singleton, restoring its
enabled flag and clearing the temporary wrapper pointer. Both getter imports,
toggle calls and replacement return through the original stack frames. Startup
next stops at `200705ce`, loading the Arena type's factory virtual slot.
Twenty focused checks and typechecking pass; the 280-instruction source package
and generated runtime independently reproduce byte for byte. Full-suite, build,
browser and deployment evidence for this continuation remain pending.

The latest local replacement continuation enters `2006f930`, executes the
original root-flag query through its retained indirect-call capability, and
stops at the property-singleton import `2006f985 -> [207d8868]`. Twenty focused
checks and typechecking pass; the 263-instruction source package and generated
runtime independently reproduce byte for byte. This replacement continuation
has not returned, and its full-suite, build, browser and deployment validation
remain pending.

The preceding type-bridge revision `58e32391` passed all 3,185 tests across
294 files in 452.05 seconds, and its production build passed in 42.26 seconds.
Those results validate the type bridge, rather than the later replacement
continuation. PR #200's Pages deployment completed successfully; actual hosted
browser verification of that deployed 154-class-name revision remains pending.

The subsequent local wrapper-initialization prefix now enters
`204b1daa -> 200705b0`, preserving the original argument and parent frames.
The captured MOVZX/XOR/AND/XOR sequence sets the root bit and preserves the
other wrapper flags, leaving flags value 11. Execution next stops at
`200705c4 -> 2002dc8b` (wrapped-object replacement). Twenty focused checks and
typechecking pass. This prefix has not returned; its full-suite, production
build, browser and deployment evidence are pending.

The latest local Arena type bridge returns through `204b1d8f -> 2000d152` using
the existing canonical type owner and the original retained CALL/RET frame.
The type is constructed and registered, its original pointer is stored in the
root wrapper, and startup next stops at `204b1daa -> 200021d5` (wrapper
initialization). The exit table now retains 157 callbacks. Twenty focused checks
across two files pass, including the independent image receipt contract.
Source and generated runtime reproduce byte for byte. The preceding constructor
full suite finished with 3,184 passing tests and one receipt-scope failure;
the new generator fixes that runtime receipt label while keeping the captured
loader-zero-fill provenance. Full-suite, build, browser and deployment validation
of the type bridge remain pending.

The subsequent local Arena-root continuation now enters initializer `204b1d70`,
executes SharedBase's original wrapper constructor `10089290` on the retained
startup stack, returns to `204b1d7b`, and installs the original Arena vtable.
It next stops at the type-singleton call `204b1d8f -> 2000d152`. Five focused
checks and typechecking pass. The first 154 class-name initializers remain
returned, with 155 retained shutdown callbacks; the Arena initializer itself
has not returned. The production build passes in 47.08 seconds. An actual
production browser enters Ardea and reports 4,317 startup operations at the same
type-singleton boundary; NPC activation still has 0/16 attached property sets.
Full-suite and deployment validation of this subsequent continuation are pending.

The preceding 154-class-name continuation merged through
[PR #200](https://github.com/ael-dev3/Tervain/pull/200) as
`af18502c3c1e464b6255ddffc994845c926290ef` after its exact-head CI passed.
Its Pages deployment is running; this merge does not include the subsequent
Arena constructor continuation.

The next continuation reuses the original primitive primary-type parser inside
template arguments, recovers the original 57..64-byte allocation pool, and executes
the selected ordinary scoped-name loop and `U` struct keyword branch. The scoped
package captures four methods and 585 original instructions; its JSON and generated
TypeScript reproduce byte for byte. The two additional allocator pools capture
14 methods and 573 instructions, including their physical dispatch and geometry.

Runtime revision `a2691946` returns from the first block's 154 class-name
initializers, retaining 155 shutdown callbacks. Its checks verify
`bTValArray<float>`, `bTObjArray<struct gCQuest_PS::SLogEntry>` and the nested
`bTObjArray<class bTAutoPOSmartPtr<class gCQuest_PS> >`. All five focused checks
pass. Startup next stops at table call `20466654 -> 204b1d70`: that callback
has a different structure and is not yet admitted. The production build and
typechecking pass in 34.33 seconds. The complete suite passes 3,185 tests across
294 files in 437.60 seconds. An actual production browser enters Ardea and reports
4,299 environment/startup operations at the same `204b1d70` boundary. The selected
Ardea NPC still has 0/16 attached property sets at the unconnected ScriptAdmin
getter. Deployment of this 154-initializer revision is pending.

The preceding 146-initializer runtime `70da7405` passed all 3,185 tests across
294 files in 500.45 seconds, typechecking, five focused checks and a production
build in 48.05 seconds. An actual production browser confirmed Ardea entry and
4,220 startup operations at its then-current `204b1cf0` scoped-struct boundary.
These earlier results do not validate the newer 154-initializer revision.
The 64-initializer checkpoint merged through
[PR #198](https://github.com/ael-dev3/Tervain/pull/198) as
`6be9a3314032824e646ee63e595ff4d9f91ab9e0`; its Pages deployment succeeded.
Full startup, world/NPC activation, campaign saves and ordinary play through an
ending remain unfinished.

### Local checkpoint: pointer templates and their original allocator pool

At runtime revision `f511a790`, the selected `PAV` class-pointer template argument
uses the recovered Game DName operations and SharedBase's original 49..56-byte
allocation pool. Six demangler functions (1,077 instructions) and seven pool
functions (288 instructions) are captured against the matching original binaries.
The capture generators reproduce their outputs byte for byte.

Startup returns from 64 original class-name initializers and retains 65 shutdown
callbacks. It next stops at `204b17d0 -> 20011d06`, whose descriptor is
`.?AV?$bTValArray@M@@`; primitive template arguments remain unsupported here.
Typechecking and five focused checks pass. The complete suite passes 3,180 tests
across 293 files in 437.35 seconds; the production build passes in 44.78 seconds.
An actual production browser enters Ardea with 202 scene objects, 70 character
resources and 3,400 environment/startup operations, confirming that next boundary.
NPC activation still has 0/16 attached property sets at the unconnected ScriptAdmin
getter. Full startup, world activation, campaign saves and an ending remain unfinished.

The preceding class-name family checkpoint merged through
[PR #197](https://github.com/ael-dev3/Tervain/pull/197) as
`41a9391b1173628e19c7b1f6ab693c0e1179d06b` after its CI build passed.
Its Pages deployment is still running at the time of this record. The pointer
checkpoint above is local and has not yet been deployed.

### Practical sequence

1. Inventory the installed game at `C:\Program Files (x86)\Steam\steamapps\common\Gothic 3`.
   Record each original archive, resource path and binary hash before conversion.
2. Read the archive and resource formats with the tools in `tools/gothic3/`.
   Export meshes, textures and scene records into browser resources while retaining
   their original names and provenance. Compare rendering with the game: geometry
   alone does not reproduce materials, foliage transparency, lighting or animation.
3. Study the matching DLLs, disassembly and decompiled functions. Capture the
   original instruction bytes, addresses, data tables and dependencies in
   `assets/gothic3/`; decompiled text is a guide that must agree with those bytes.
4. Implement a bounded continuation in `src/gothic3/`. Preserve its memory ownership,
   pointer identity, stack arguments, return sequence and state changes. Stop at an
   unsupported operation and report its address instead of inventing a result.
5. Connect recovered behavior to the browser's world and actors. Asset rendering,
   engine initialization, NPC activation, quests and saves each require their own
   integration; a visible scene does not establish that the campaign works.
6. Record reproducible evidence, inspect the diff and validate the affected behavior.
   When publishing an implementation checkpoint, also record typechecking, the
   complete test suite, production build and an actual browser observation.
7. Review the checkpoint, inspect existing GitHub Actions runs and publish through
   the repository's Pages workflow. Record the deployed revision and observed
   behavior separately from results obtained only in a local build.
8. Repeat from the next unsupported operation until ordinary play can start a new
   game, progress through quests, save and reload, and reach a campaign ending.

For each checkpoint, the documentation should answer: which original files and
functions were used, what now executes, what evidence supports it, where execution
stops, and whether that exact revision has been deployed.

The work has three connected parts: recover the original assets, reconstruct
engine behavior from the matching native binaries, and connect that behavior to
browser gameplay. TypeScript supplies the runtime; the original files supply
the evidence for what it must do.

```text
Local Gothic 3 installation and matching DLLs
    -> inventory, extract and record original paths and hashes
    -> export browser assets and capture native instructions
    -> implement the next supported runtime operation in TypeScript
    -> validate its state changes and connect it to the browser
    -> publish a reviewed checkpoint at /gothic3/
    -> continue until a campaign can be played, saved and finished
```

This is an incremental reconstruction. Decompiled output is reference material;
it is not a complete TypeScript game generated automatically from the DLLs.
Each checkpoint records exactly what executes and where execution next stops.

## Repository map and a typical rebuild checkpoint

| Location | Role in the rebuild |
| --- | --- |
| `tools/gothic3/` | Inventory, archive readers, asset conversion and repeatable native-source capture scripts. |
| `assets/gothic3/` | Source receipts, captured instruction bytes, original addresses, hashes and format evidence. |
| `public/gothic3/` | Resources loaded by the separate browser route, including converted scene and model data. |
| `src/gothic3/` | TypeScript implementations of recovered behavior and its browser integration. |
| `tests/gothic3-dialogue/` | Checks of implemented behavior, memory ownership, interrupted calls and retained state. |
| `docs/engineering/gothic3-rebuilding-process.md` | Dated technical checkpoints and their validation/publication evidence. |

A contributor starts with the next reported unsupported call. Follow its original
caller and callee in the matching DLL, capture the required instructions and data,
then implement their effects in TypeScript. Keep the original argument order,
allocation geometry, pointer ownership, return value and cleanup behavior. Connect
the implementation to the existing startup or gameplay caller so the browser
actually reaches it.

Regenerate the capture independently and compare the outputs. Check ordinary and
failure paths, inspect the diff, run the relevant checks and typecheck, then build
and inspect the production browser. Record the revision, observed state and next
unsupported address. Review existing GitHub Actions runs and workflow triggers
before publishing a coherent checkpoint; record merge and deployment separately.
The [step-by-step workflow](gothic3-rebuild-workflow.md) expands these steps.

For example, class-name startup work recovers a C++ initializer, its RTTI
descriptor, string cache and shutdown callback. Implementing that getter must
preserve the shared heap and the physical startup CALL/RET frames. Success means
the original initializer returns and the walker reaches the next original table
entry. Later engine attachment, NPC activation and campaign progression each
need their own connected implementation and browser evidence.

### Work in progress in this checkout

The class-name family and primitive-demangler changes currently in this checkout
continue the second-initializer checkpoint described below. Local focused
execution now returns from the first 37 C++ initializers and stops at
`204b1620 -> 2000fed4`. Initializer addresses are not uniformly spaced; the count
comes from the captured initializer specifications and their returned CALL frames.
The exit table has 38 callbacks including the preceding static callback. Its
original CRT growth path now relocates the table from 128 to 256 bytes, preserving
encoded callback pointers and unknown masks, and frees the old table. Template class arguments now reuse
the same recovered primary-type branch as ordinary class RTTI. The `bool` getter
now succeeds without making unknown bytes after its NUL terminator known: the
space-search result is proved across possible padding values. The latest 22
growth, heap and startup checks, typechecking and independent byte-identical
growth-source regeneration pass. Earlier demangler/space-search checks also pass.
The complete suite passed 3,166 tests across 292 files in 446.85 seconds. The
production build passed in 47.18 seconds. A rendered production preview entered
Ardea, loaded 202 scene objects and 70 character resources, and confirmed the
next getter at `204b1620` after 3,130 environment/startup source operations.
The interruption is `getTemplateArgumentList` parsing the pointer argument in
`.?AV?$bTRefPtrArray@PAVbCPropertyObjectBase@@@@`. The continuation is local and
not published. Original NPC activation remains at 0/16 attached property sets;
complete engine attachment and a finishable campaign remain unfinished.

Integration `af55ce5f` includes main's merged #195 presentation changes and
preserves every Gothic runtime, test, asset and preparation-tool path from
`3c84d749`. Its complete suite passes 3,179 tests across 293 files in 480.11
seconds, and its production build passes in 37.87 seconds. Publication of this
family continuation remains pending. A hosted-browser check of the preceding
ObjectRef checkpoint confirms `204b11d0` and 2,779 startup operations after the
successful #194 and #195 deployments.

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
file-opening work follows SpieAdmin opening zSpie.txt: acquire a CRT FILE
record, allocate and lock descriptor 3, invoke CreateFileA, apply its return,
and run the original error mapping or publish the opened handle. The TypeScript
platform supplies owned memory and a virtual filesystem for these operations.

The captured instructions, source addresses and input hashes live beside the
implementation. Unsupported calls retain their address and current state so the
next checkpoint can continue from that point. This is incremental behavior
reconstruction; complete decompilation of every game module has not been
established. The selected SharedBase continuations have no production callers;
Game startup continuations are connected to the browser startup stack.

### Current implementation status — 9 October 2026

| Area | Supported result | Remaining work |
| --- | --- | --- |
| Assets | Selected readers and viewers expose original world, tree and human resources for inspection. | Complete coverage and in-game visual fidelity. |
| SharedBase startup | The supported absent-`zSpie.txt` profile returns `1` from the direct DLL entry after logging and callback dispatch. | Surrounding CRT wrapper, additional profiles and live Game integration. |
| Game startup | Merged code completes all five C callbacks, registers the static shutdown callback and executes the first C++ class-name initializer, stopping at `20466654 -> 204b11c0`. | Execute the remaining C++ initializers on the retained startup stack, then finish engine attachment. |
| Campaign | The separate browser route can display the reconstructed Ardea scene. | Connected world/NPC activation, quest progression, campaign saves and a playthrough to an ending. |

The first C++ class-name checkpoint connects the initializer,
`204b11b0`, to the browser's existing SharedBase heap. Its original CALL, static
result store and RET execute on the retained startup stack. The translated
getter uses the actual `eCProcessibleElement` descriptor, both guard fields and
the original cleanup callback. Successful startup reaches the next table
target, `204b11c0`; a missing string pool retains the nested CALL frames and
completed state. This checkpoint has passed 86 focused runtime checks,
TypeScript checking, all 3,160 tests across 291 files and the production build
after integrating current main. The rendered production preview reports
2,769 environment-source operations and the next target `204b11c0`. It
merged through [PR #193](https://github.com/ael-dev3/Tervain/pull/193) at
`839e005433314be9149fd82c81dabdd9b60d0958`; Pages run `37904247366` succeeded.
The PR's foreign-heap test was corrected to avoid a redundant complete engine
boot after CI hit its five-second timeout. Updated CI passed at `47e02907`.
Original NPC activation remains at the separate ScriptAdmin
getter boundary, with 0 of 16 property sets attached.

The next local checkpoint executes the second initializer, `204b11c0`, using
the original `bCObjectRefBase` descriptor and separate cache. Its source CALL,
result store and RET reach `204b11d0`. The same SharedBase heap supplies the
24-byte CString allocation; missing that pool retains the second getter's
physical CALL and guard/RTTI effects. Component and startup checks also verify
separate cleanup ownership and the original destructor's stale pointer bits.
The broader source package captures 363 matching initializer/getter/cleanup
patterns, including 59 recovered directly from original PE bytes where both
the catalog and full assembly listing have gaps. Those additional patterns
are evidence, not executed callbacks. At runtime revision `5d6f6770`, all 3,162
tests across 291 files passed in 497.01 seconds, TypeScript checking passed and
the production build passed in 48.84 seconds. The rendered production preview
reports 2,779 environment-source operations and next target `204b11d0`.
The first full run hit a five-second timeout while an unrelated forest test
imported the entire Tervain application inside its timed body. Moving the
unchanged import outside that body preserves all 11 collision assertions;
the final full run passes. This second initializer merged through
[PR #194](https://github.com/ael-dev3/Tervain/pull/194) at
`93d38c8a70d080002234376bd3be8bbef880d8b7` after CI run `37906324563`
succeeded. Pages run `37909527638` succeeded; hosted-browser confirmation for
this merge remains pending.

The Game PE checkpoint passed 3,082 tests, typechecking, source regeneration and
the production build at runtime revision `9540631a`. It merged through
[PR #183](https://github.com/ael-dev3/Tervain/pull/183) as
`cfc14f1f16b620c86a3133321be5e2fad95530a7`. Pages run `37884441618` completed
successfully for that revision.

The local math-initializer work at revision `37859a9e` reaches the next original call,
`20466617 -> 20469672`, in focused execution. Its caller passes `0`, so the
original branch skips optional precision setup. Conversion-pointer stores,
processor-feature lookup and exception clearing are implemented locally.
All 15 focused checks pass, typechecking passes and independent regeneration
matches both outputs byte for byte. At integrated revision `db71a0b3`, all 3,084
tests passed with a 30-second per-test allowance, and the production build passed.
The math checkpoint merged through [PR #184](https://github.com/ael-dev3/Tervain/pull/184)
as `b03a143f0b01839430046792b8ea51132c5b3220` after successful CI run
`37886867264`. Its Pages run `37887566918` completed successfully.
These results do not establish complete
startup or campaign play.

Further local revision `0dd36cdf` executes the ten-pointer encoding loop using
the existing source-admitted Game CRT codec. It preserves duplicate code/encoded
identities, actual table storage and original CALL/RET cleanup. The loop reaches
`20466626 -> 2046643f`, before the C initializer walker. All 56 focused checks
across four files pass, including changed/unknown later slots and a foreign PTD
codec. The production build passes, and a production browser observed the
actual continuation at `20466626`. All 3,087 tests across 284 files pass with
a 30-second per-test allowance. The checkpoint is submitted in
[PR #185](https://github.com/ael-dev3/Tervain/pull/185), merged as
`773e5a907d5ea89dfe94e4a9413004fc80d4ac9d` after CI run `37888291714` passed.
Its Pages run `37889214077` completed successfully.

Local revision `afc083df` connects the original C initializer walker to the existing
Game exit-table owner and reaches the second callback, `20466452 -> 20469f3a`.
All 60 focused checks pass, typechecking passes and both generated source files
reproduce byte for byte. All 3,091 tests across 284 files passed in 373.81 seconds
with a 30-second per-test allowance. The production build passed in 37.36 seconds.
A production browser loaded 202 Ardea scene objects and 70 character resources,
entered the scene with HP 100, and reported the actual next callback at
`20466452 -> 20469f3a` after 1,330 environment/startup source operations.
NPC attachment still stops at the unconnected ScriptAdmin getter, with 0 of 16
property sets attached. These results are separate from the pointer
checkpoint above. The five non-null C initializers must execute in their original table
order before startup can enter the C++ initializer table. Later world and NPC
activation still require their own implementation and browser evidence.

The walker checkpoint merged through [PR #186](https://github.com/ael-dev3/Tervain/pull/186)
as `07595915ef24d6b84e18a0379d280b133bf8b32c` after CI run `37890008569` passed.
Its initial deployment was superseded when main advanced through PR #187;
the combined main deployment is recorded below.

Local revision `f84aff4a` executes the original second C callback's EFLAGS, CPUID
and normal SSE2 probe against declared virtual CPU state, then reads the third
callback's already-initialized multibyte state from argv. It reaches
`20466452 -> 2047470c`, the FILE-table initializer. All 67 focused checks across
four files pass, typechecking passes and both generated source outputs reproduce
byte for byte. At that revision, all 3,098 tests across 284 files passed in
356.87 seconds with a 30-second per-test allowance. Subsequent integrated build
and browser results are recorded below. Fixed-ID and absent-SSE2 profiles return zero through original branches;
undeclared CPU, missing CPUID leaf and SIMD-exception profiles retain the actual
interrupted frame and earlier exit allocation. These results do not establish
native exception dispatch, complete startup, NPC activation or campaign play.

Integrated revision `cf6300de` incorporates main `03e7cb02aa6b5a0064124b879c7359f5101d713b`,
including Claude's externally merged [PR #187](https://github.com/ael-dev3/Tervain/pull/187).
A path comparison proves that integration changed none of the local Gothic
runtime, source packages, generators or checks. Installation from the updated
lockfile succeeded. All 67 integrated focused checks and typechecking pass;
the production build passed in 27.68 seconds. A production browser entered
Ardea with 202 scene objects, 70 character resources and HP 100, reporting
`20466452 -> 2047470c` after 1,443 startup operations. NPC activation remains
incomplete at the unconnected ScriptAdmin getter, with 0/16 property sets
attached. All 3,123 tests across 287 files passed in 390.38 seconds on the
combined runtime, with a 30-second per-test allowance. Its newer
main Pages run `37891214623` supersedes cancelled walker run `37890987247` and
completed successfully for main `03e7cb02aa6b5a0064124b879c7359f5101d713b`.
No deployment rerun was requested. The SSE continuation subsequently merged through
[PR #188](https://github.com/ael-dev3/Tervain/pull/188) as
`586377b3212f1a8d8bac234745b0db72dd5c99a5` after CI run `37892602492` passed.
Pages run `37893245041` completed successfully for this revision.

The next source checkpoint, `0d1fb9cb`, captures the FILE-table initializer at
`2047470c`: 69 instructions verified against the original Game PE and cold
receipts for the count, pointer vector and twenty FILE records. Six source checks
and typechecking pass, and independent regeneration matches JSON and TypeScript
byte for byte. This callback still needs runtime execution on the existing heap
and I/O descriptor graph. Its capture does not advance the browser frontier.

Subsequent local runtime work executes that initializer on the retained Game
heap and descriptor graph, then executes the fifth C callback and returns from
the C walker. Focused execution reaches `20466638 -> 204637ce`, the original
atexit registration call. All 74 focused checks across four files pass,
typechecking passes and the production build passes in 34.06 seconds. Count
profiles check the original default/clamp branches, FILE aliases, zeroed unused
entries, unknown physical allocation padding and prevention of replay.
Production browser verification entered Ardea with 202 scene objects, 70
character resources and HP 100, and reached the same atexit boundary after
2,359 startup operations. NPC activation still stops at the unconnected
ScriptAdmin getter with 0/16 property sets attached. All 3,130 tests across
287 files passed in 380.66 seconds with a 30-second per-test allowance.
These results do not establish complete startup or campaign play.

Integration revision `bc1dc060` incorporates main
`64af8d5f6be1734c124bb1b8c1d3cbc3f5eb2339`, including externally merged
[PR #189](https://github.com/ael-dev3/Tervain/pull/189). Its four changed paths
concern Tervain riding and saves. All seven squash-history conflict paths were
verified identical between main and the reviewed PR #188 head before preserving
the local continuation. Integration changed no Gothic runtime, source evidence,
generators or checks. Combined-revision validation passed: 85 focused checks
across five files (including riding), typechecking and a production build in
28.79 seconds. The full-suite and browser observations above apply to the Gothic
runtime preserved unchanged by this integration.

The FILE continuation merged through [PR #190](https://github.com/ael-dev3/Tervain/pull/190)
as `b2c6524392bcb60e8f6b307868a72bc8d87042ad` after successful CI run
`37894880852`. Its Pages run `37895942991` completed successfully.

Further local revision `5481b8fa` registers the original static shutdown callback
through the existing Game exit-table owner, preserving CALL/RET and source
argument cleanup. It admits the full original C++ initializer table and traverses
65 leading null entries to `20466654 -> 204b11b0`. The callback requires the
gCLayerBase property-type factory, whose native behavior remains unfinished.
All 53 focused checks across three files, typechecking and source regeneration
pass; the production build passed in 40.69 seconds. A production browser entered
Ardea with 202 scene objects, 70 character resources and HP 100, observing
`20466654 -> 204b11b0` after 2,759 startup operations. NPC activation remains
incomplete at the ScriptAdmin getter with 0/16 property sets attached. All 3,135
tests across 287 files passed in 422.29 seconds with a 30-second per-test allowance.
Reconciliation revision `503de5e2` incorporates merged main `b2c65243`; all eight
conflict paths matched the reviewed PR #190 head, and reconciliation changed no
runtime, evidence, generator or check. The hosted campaign is still unfinished.

Independent review of PR #187 decoded all 9,147 buffer views in its 107 changed
GLBs against the previous revision: geometry, images and semantic metadata
matched, and all 107 runtime size/hash receipts matched the reviewed blobs.
That evidence concerns Tervain's model compression; it does not establish Gothic
campaign completion.

### Original files and reproducible outputs

The study root on the reference machine is
`C:/Users/heyas/OneDrive/Рабочий стол/Gothic3_Decompiled_Study_2026-10-04`.
Matching DLLs live under `00_Original_Runtime/`; retained disassembly lives under
`01_Decompiled_Code/<module>_dll/full_disassembly.asm`. These local paths identify
preparation inputs; contributors must provide their own matching files.

For example, `tools/gothic3/prepare_game_cinit_math_evidence.py` reads the original
Game module and disassembly, writes
`assets/gothic3/game-cinit-math-source/source.json`, and generates
`src/gothic3/native-game-crt-cinit-source.ts`. The runtime continuation is owned
by `native-game-crt-setenvp.ts` and `native-x86-thread-stack.ts`. Source capture
does not automatically admit every captured function for execution.

For each checkpoint, retain the input hash, original resource/function address,
generator command, generated-output comparison, supported cases and next boundary.
Do not use a checkpoint's successful checks as validation of later local edits.

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
continuation at `20466610` after entering Ardea. PR #183 merged this checkpoint;
Pages run `37884441618` succeeded. Complete startup,
world activation, campaign saves and a playable ending remain unfinished.

- [Detailed workflow and reference paths](gothic3-rebuild-workflow.md)
- [Architecture and implementation background](gothic3-rebuild-overview.md)
- [Dated technical checkpoint history](gothic3-rebuilding-process.md)
- [Hosted reconstruction route](https://ael-dev3.github.io/Tervain/gothic3/)
