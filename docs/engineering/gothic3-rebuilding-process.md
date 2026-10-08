# How Gothic 3 is being rebuilt for the browser

For a short, reader-facing explanation of the approach and completion standard,
start with the [rebuilding overview](gothic3-rebuild-overview.md). This document
is the detailed technical record and dated checkpoint history.

## Repeatable rebuilding process

Each checkpoint should make one source-backed behavior usable by the browser
runtime and record exactly where execution still stops.

1. Inventory the local installation and resolve archive/patch precedence. Record
   the original resource path, effective archive, input hash and tool revision.
2. Extract the required data or capture the relevant native function and its
   original bytes. Keep disassembly and decompiler output as research evidence;
   implement the recovered behavior in TypeScript.
3. Trace dependencies before connecting the feature: constructors, shared
   globals, callbacks, memory ownership, call order and failure cleanup. Capture
   the needed cold image data alongside the function evidence.
4. Implement the feature under its actual runtime owner. Preserve storage and
   pointer identity, argument/return behavior and already completed effects.
   Keep unsupported operations as explicit boundaries.
5. Connect the feature to the live world and session services. Asset display,
   an isolated helper and an integrated gameplay feature have separate receipts.
6. Check source identities and supported behavior locally, typecheck, build and
   inspect the diff. For gameplay, compare the encounter with the installed game
   and exercise progression plus save/reload.
7. Record the revision, checks, supported cases and next dependency here. Inspect
   repository-wide Actions runs and workflow triggers before remote changes;
   publish a reviewed checkpoint through the existing Pages workflow.
8. Continue across NPC activation, combat, dialogue, quests, travel and persistent
   state until ordinary play can reach a campaign ending.

### Immediate remaining work

- Complete the remaining SharedBase void initializers, fallback/exception
  paths and enclosing CRT attach. Earlier dated entries retain the boundary
  reached at that checkpoint; consult the overview and latest checkpoint
  receipts for subsequent progress.
- Connect the supported shared runtime to live Game startup at 204678f2 and
  execute the required initializer callbacks in their original order.
- Complete the remaining property/diagnostic dependencies and activate NPCs in
  the live world, then integrate their routines and gameplay interactions.
- Establish playable quest progression and save/reload through an ending.

The current browser reconstruction is incomplete. Deployment and passing unit
checks establish the published checkpoint's supported scope; campaign completion
requires an integrated gameplay result.

## Latest process summary — 8 October 2026

### Original FILE-vector initialization and complete error-table return

The local runtime executes original `100bef05` over its own stdio count and
vector storage. A zero count selects 512 entries; signed counts below 20 select
20. The original wrapper calls the selected owned calloc lower with count*4,
preserving caller identity, NULL checks, argument cleanup and saved registers.
A failed first allocation retries with 20 entries. A second failure returns 26
through the error walker and cinit, retaining the unimplemented outer attach
cleanup at `100adb5f`. Unknown heap results, overflow and positive Sleep retry
stop at their actual source boundaries.

The successful callback publishes its real vector and fills 20 pointer slots
with aliases of the original 640-byte FILE image at `10141790`, in 32-byte steps.
The remaining vector bytes stay zero from the actual heap allocation. Original
FILE buffer addresses remain source values; this does not grant memory access
to the buffers. The first three records read the physical 56-byte descriptors
already created by SharedBase I/O startup through the actual `102f70c0` root.
Retained platform HANDLEs compare unequal to NULL/-1/-2 without inventing their
numerical Windows values. Those three sentinel cases write -2 to FILE+16.
Foreign blocks, copied HANDLEs and unowned numerical HANDLEs reject admission.

Signed JGE/JL, three-operand IMUL and SAR execute from the pinned original rows.
The fifth callback `100ce0f5` repeats the original processor probe and publishes
its result to the live memcpy flag at `102f854c`. All five error callbacks return
zero on the selected normal path; the table walker returns to cinit. Execution
then stops at the actual RTC registration CALL `100aa676 -> 100a72d0`.

Typechecking and 141 focused checks pass. All 80 generated source files and the
emitted runtime reproduce exactly. The full suite passes 2,698 tests across
259 files and the production build passes. Full CRT attachment, live Game startup,
NPC activation and a campaign playable through an ending remain unfinished.

PR 117 passed CI run 37761728106 and merged at
`0270bb5cdd54f521731a4c6de164e3e967265d37`. Pages run 37762574694 completed successfully.


### Virtual CPU ownership and normal processor-probe return

The local runtime owns a declared CPL3/IOPL0 EFLAGS image, synchronized with
its arithmetic flags and the logical thread's DF. The CPU profile and CPUID
tuples are copied and frozen before execution. They describe a selected virtual
processor. Unknown arithmetic bits remain unknown; the original ID toggle and
subtraction use retained word identities to preserve correlation through AF.

Original PUSHFD and POPFD execute in order. POPFD respects selected ID-bit
writability and user-mode protection of IF/IOPL. CPUID leaves 0 and 1 load their
four retained DWORD outputs into EAX/EBX/ECX/EDX. Missing leaves stop at their
original instruction. The ID-not-writable and no-SSE2 branches return zero
through the original processor callback without entering SIMD.

The normal SSE2 branch executes original `100ce045`, its `100aeb68` frame
prologue and `100aebad` epilogue. It retains the original 28-byte scope image,
rejects changed scope bytes before frame execution, binds the encoded scope
and FS registration to the owned stack, and checks saved-register/FS restoration.
MOVAPD copies all four retained XMM1 DWORD identities into XMM0. Initial XMM
contents remain unknown. The original result reaches `102f853c` and the table
walker advances to its fourth callback, `100bef05`, whose CALL remains pending.
The browser NPC service selects the explicit normal virtual CPU profile.

Selected illegal-instruction or absent SIMD execution policy stops before
MOVAPD effects. Original exception filter/handler evidence is captured, but
exception dispatch remains unfinished. This implementation follows the flag
and instruction contracts in [Intel's architecture manual](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html).
Full SharedBase attachment, live Game startup and campaign completion remain
unfinished. Local typechecking and 125 focused checks pass; all 80 generated
source files and the emitted runtime reproduce exactly. The full suite passes
2,682 tests across 259 files; the production build also passes.


### Existing multibyte state and processor-probe entry

The error walker now enters `100b1854` at index 66. It reads the live
`102f8588` multibyte flag installed by earlier startup, follows its original
nonzero branch and returns zero without repeating initialization. A cleared
live flag instead retains the actual `100b185f -> 100b16ba` CALL; this graph
has not connected that repeated-initialization path and does not set the flag.

At index 67, original `100b4b6b` clears `102f853c` and calls `100ce095`.
The processor probe owns its saved EBP, 24-byte reservation, two saved EBX
words and three zeroed locals. Execution stops before PUSHFD at `100ce0a8`.
Full EFLAGS/ID-bit ownership, POPFD, CPUID and the subsequent SIMD probe are
still required; no processor result is supplied in place of those operations.
Typechecking, 122 focused checks and the production build pass. All 74 generated
source files and emitted runtime reproduce exactly. The full suite passes
2,671 tests across 259 files. PR 114 passed CI run 37756577528 and merged at
`bdc3d8f4abc7f79da511e92b50f3160bbccb59de`; Pages run 37757319592 succeeded.
PR 115 passed CI run 37757739546 and merged this processor-entry checkpoint
at `d044545e75e4eee4cccdb5ffc447c4ba30c1db76`. Its Pages run is 37758516262.
Full startup, NPC activation and campaign completion remain unfinished.

### First error initializer allocation, encoding and return

Original callback `100a7265` now owns its calloc wrapper `100aef10`: saved
ESI/EDI, the original three lower-call arguments, cleanup, NULL testing and
normal return. The existing selected lower calloc translation is invoked at
actual `100aef1e -> 100c0e96`; it verifies the module heap and returns a real
128-byte zeroed allocation. This lower translation does not prove execution of
the original calloc implementation's x86 SEH frame. A retained owner set and
canonical heap-span checks bind that allocation to the initializer.

The original encode wrapper accepts the actual allocation identity, calls its
cached PTD procedure and publishes equal encoded pointers at `102f8580` and
`102f8584`. The callback clears the first DWORD and returns zero. The table
walker advances to index 66 and enters the pending second callback
`100aa490 -> 100b1854`; that callback remains unimplemented.

On allocation failure with zero retry delay, the wrapper returns NULL. The
callback encodes NULL, publishes both pointers, returns 24 and makes cinit
return 24 through its actual failure branch. Execution stops at the enclosing
attach continuation `100adb5f`, whose cleanup still needs implementation.
Unknown heap outcomes retain the lower calloc call. Positive retry stops before
the unowned Sleep import at `100aef35`. Full startup and campaign completion
remain unfinished. All 120 focused checks, typechecking and the production
build pass. The 74 generated source files and emitted runtime reproduce exactly,
including original decompiler whitespace. The full suite passes 2,669 tests
across 259 files.
PR 113 deployed successfully through Pages run 37755080084.

### Original error-table traversal and first callback entry

The initializer now enters original `100aa47d` over its retained 135-slot table.
It preserves ESI, starts EAX at zero, compares the actual table pointer with its
exclusive end, reads each slot and skips NULL entries in the original order.
It reaches callback `100a7265` at index 65, creates its original saved-ESI frame,
and enters the pending `calloc(32,4)` CALL at `100a726a -> 100aef10`. The callback
allocation, encoding and publication are not completed yet.

Live NULL entries remain observable: an all-NULL table walks all 135 slots,
returns zero, restores ESI and reaches the actual atexit CALL at
`100aa676 -> 100a72d0`, which remains unsupported. A foreign non-NULL callback
retains its indirect CALL and stops before dispatch. The PTD encoder slot read
is now restricted to its actual instruction `100ae2a7`, preventing table offset
`0x1f8` from being treated as thread data. Snapshot descriptions retain only
read-only relative offset/capacity information for shared storage pointers.
The traversal-only checkpoint passed typechecking, the build and 109 focused
checks; its full suite passed 2,666 tests across 259 files. Full CRT attachment,
Game startup and campaign completion remain
unfinished.

### Cached pointer encoder execution

The initializer now executes original `100ae27b` for each conversion pointer.
It reads the live TLS and thread-data indices, dispatches the owned TLS import,
queries the actual retained getter a second time, enters that getter and reads
the installed PTD encoder at offset `0x1f8`. Each import and indirect procedure
uses its original CALL/RET and four-byte callee cleanup. The encoder preserves
ESI and returns its result through the original stack argument cell.

The virtual encoder receives a retained object for each admitted original code
address. These objects describe original addresses; they grant no callback
execution. Repeated code addresses share identity, and their encoded opaque
objects are stored in real table pointer sidecars. Ten wrapper returns complete
the table, restore ESI/EDI and reach the error-table CALL at
`100aa664 -> 100aa47d`, which remains unimplemented. A NULL cached codec returns
the original DWORD. A NULL cached getter follows the actual fallback prefix and
stops at its module lookup `100ae2b4`; fallback resolution remains unfinished.
Copied codec capabilities and forged TLS import slots are rejected before use;
unknown TLS results retain the actual pending call. The 114 focused checks,
typechecking and production build pass, and all 72 generated source files plus
the emitted runtime reproduce exactly. The full suite passes 2,663 tests across
259 files.
PR 112 deployed successfully through Pages run 37753009470. Full startup and
campaign completion remain unfinished.

### Pointer encoder dependency evidence

Original helper `100ae20f` is now captured alongside the encoder: it reads the
OS major version, returns availability for versions newer than 5, and otherwise
scans the main image sections through a string comparison. The package retains
the original KERNEL32.DLL and EncodePointer names, cold TLS indices and TLS
getter import slot. Cold values remain separate from live loader capabilities.
All 72 generated source files and the unchanged generated runtime reproduce
byte-for-byte; 23 focused source checks, typechecking and all 2,657 tests across
259 files pass. PR 112 passed CI run 37752324399 and merged at
`4068aacec57dc591eea929333ea15583dcff2ef8`. This capture does not
complete conversion encoding. The cached thread-data procedure and fallback
lookup must still execute with their original stack and storage relationships.

### SharedBase floating-point exception clearing and hook return

The retained thread now owns a separate x87 status word with unknown initial
bits. Original FNCLEX at `100a7919` clears bits 0–7 and 15, making only those
bits known zero while preserving the remaining status bits and their knowledge.
It leaves the integer arithmetic flags unchanged. This follows
[Intel’s instruction reference](https://cdrdv2-public.intel.com/671110/325383-sdm-vol-2abcd.pdf);
the implementation does not substitute a host JavaScript floating-point status.

The original RET at `100a791b` returns the hook, the caller removes its argument,
and conversion initialization enters `100b4407`. It preserves ESI/EDI, reads the
first installed conversion address and enters the pending encode wrapper CALL
at `100b4413 -> 100ae27b`. That wrapper still needs its original TLS/cache and
procedure-resolution dependencies. Missing processor exports still stop before
FLD in the original fallback frame. Typechecking and 93 focused checks pass;
the full suite passes 2,656 tests across 259 files and the production build
passes. Full CRT attachment and campaign play remain
unfinished.

### SharedBase processor feature query and original return

The initializer now enters original `100b448b`, reads the actual KERNEL32 and
IsProcessorFeaturePresent literals, and uses retained virtual import slots.
Module lookup, procedure lookup and the indirect feature call follow their
original CALL/RET and stdcall cleanup of 4, 8 and 4 bytes. The returned BOOL
remains in EAX, the query returns to `100a7908`, and the caller stores that same
value at `102f6424`. Its zero argument takes the original branch around default
precision setup. Execution stops before FNCLEX at `100a7919`; neither its effect
nor a completed floating-point hook return is fabricated.

The browser profile declares the processor export present and precision erratum
false. These retained values are an explicit virtual process contract, not a
host CPU query or captured Windows state. Both BOOL outcomes are supported.
Feature 0 is the precision-erratum flag in
[Microsoft's API contract](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-isprocessorfeaturepresent).

A missing selection stops at the actual lookup or feature call. A NULL module
or absent export follows the original tail jump into `100b444f`, owns its saved
EBP and 24-byte reservation, and stops before the x87 FLD at `100b4455`. Copied
or foreign procedure capabilities and forged import slots cannot dispatch the
feature call. Failure prefixes are sticky. Source-name bytes and import slots
join the unchanged 39-body evidence package; all 70 source files and generated
syntax reproduce exactly.

Local focused validation passes 123 checks; the full suite passes 2,656 tests
across 259 files. Typechecking and the production build also pass. PR 110 passed CI
run 37749256837 and merged at `77ee0db88ac453a094d9d673dbc24e3cff6b3388`;
Pages run 37750600707 completed successfully. Full CRT attachment, live Game startup
at `204678f2`, NPC activation and a campaign playable to an ending remain
unfinished.

### SharedBase initializer image check and floating-point installation

The retained graph now enters original cinit `100aa632`. It reads the actual
hook slot, enters `100ae900`, and traverses original DOS/NT/PE32 validation
and section lookup at `100ae880`/`100ae8b0` over the admitted 808-byte PE header.
The check uses current section range/write flags. Its original SEH frame,
saved registers/EBP, cookie expressions and FS links share the existing stack;
normal return restores the incoming FS relationship and reports ownership 1.

The original indirect call enters the admitted floating-point hook `100a78fe`.
Its conversion installer `100a788e` writes the ten actual original code-address
DWORDs into SharedBase's conversion storage and returns. Code-address metadata
grants no browser callback authority. The next CALL remains pending at
`100a7903 -> 100b448b`, before the Pentium division-erratum query. That helper
uses `IsProcessorFeaturePresent(0)` or an x87 fallback; it is distinct from the
separate SSE processor-feature helpers. Earlier evidence labels are corrected.
The later FNCLEX, conversion pointer encoding, initializer tables and enclosing
CRT attachment have not completed. Live Game startup remains before `204678f2`.

Invalid DOS/NT/optional headers, zero sections or a writable hook section return
ownership 0 and follow the original skip branch. A live NULL hook skips the
check. Both paths retain the conversion encoding CALL `100b4413 -> 100ae27b`.
Unknown hook targets and out-of-bounds header relations preserve their pending
frames and prior effects without replay. Private owner grants reject forged calls.

Local validation passes 108 focused checks, typechecking and the production build.
The full suite passes 2,646 tests across 259 files. Repeated preparation
reproduces all 70 source files and the generated instruction syntax exactly.
PR 109's Pages run 37746463396 completed successfully; the new initializer
continuation still needs its own reviewed publication.

### SharedBase initializer tables and recovered callback evidence

The [initializer source package](../../assets/gothic3/shared-initializer-source/README.md)
captures the next boundary `100adb5a -> 100aa632`: 39 function bodies,
662 instructions and 1,927 instruction bytes, verified against the original
SharedBase DLL. Its 135-slot error table contains five callbacks; the 214-slot
void table contains seventeen. Their slot indices, NULL gaps and order are
retained. The floating-point hook is non-NULL and lies in nonwritable `.rdata`;
the dynamic TLS hook is zero in the cold loader-filled image.

The package includes floating-point conversion installation/encoding, processor
feature queries, image ownership checks, exit registration and RTC termination
evidence, with relevant cold globals and 69 CALL sites. Four void callbacks
missing from the original study were recovered directly from original PE bytes
using Capstone 5.0.7. Their reachable direct branches are complete; no inferred
C prototype or successful runtime execution is claimed. Five additional bodies
have original ASM but no standalone reconstructed C export.

Repeated preparation reproduces all 70 generated files exactly. Five focused
source checks, typechecking and the production build pass. The full local suite
passes 2,636 tests across 259 files. Runtime execution still stops before
`100aa632`; callback capture does not advance live Game startup at `204678f2`,
activate NPCs or establish a finishable campaign.

PR 109 passed CI run 37745615022 and merged at
`4aa6de44dcdcc0e993e58f2c20ea27f10bbe104e`. Its Pages run 37746463396 is
running; the previous PR 108 deployment completed successfully.

### SharedBase environment vector and initializer boundary

The latest local continuation executes the original setenvp routine `100c092a`
on the retained graph after the successful argument return. It scans the actual
SharedBase environment block, skips entries beginning with `=`, allocates a
zeroed vector, and allocates/copies every retained string in source order.
The original `strcpy_s` instructions at `100c0e29` own the copy and its return;
strlen, calloc and free retain explicit translated lower effects and their
source CALL/RET/argument cleanup. The optimized native strlen body is not
claimed as instruction traversal.

The environment-vector pointer is published at `102f644c`. On success, the
original temporary block is freed, its pointer at `102f6490` is cleared, the
vector ends with NULL, and `102f8570` becomes 1. Saved registers/EBP restore
before setenvp returns zero to `100adb54`. The caller now retains the next
initializer CALL at `100adb5a -> 100aa632`; that initializer routine has not
executed. Full SharedBase CRT attachment and live Game startup remain unfinished.

NULL input or vector-allocation failure returns -1. A later string-allocation
failure frees and clears the vector while retaining the original block and
previous string allocations, matching the original partial cleanup. HeapFree
failure stops before its unimplemented errno mapping and preserves the completed
copy prefix. These failures cannot replay the earlier operations.

Focused validation passes 93 tests, including empty/nonempty blocks, hidden
entries, duplicate names, ANSI high bytes, actual string/vector storage,
NULL termination, lifetime changes, allocator/free failures, source-row identity
and rejection of forged authority. Typechecking and the production build pass; the full suite passes 2,631 tests
across 258 files. Generated instruction syntax
reproduces exactly and now includes setenvp and strcpy_s. The original evidence
package remains 79 functions and 56 cold ranges. Argument query/fill counts are
retained at return because subsequent environment frames reuse those stack slots.

PR 108 passed CI run 37742924477 and merged at
`5cc1143c4d83e8f2807171c58930d71044b74845`; Pages run 37744468447 completed successfully.
PR 107 deployed through successful Pages run 37742375940. The live Game path
still stops before `204678f2`; native NPC activation and a campaign playable
through an ending remain unfinished.

### SharedBase argv allocation, filling and normal return

The preceding continuation owns the `100aeed0` malloc wrapper frame around
the retained translated lower malloc effects. Its two saved registers, lower
CALL/RET, argument cleanup and wrapper return now join the actual setargv frame.
The allocation belongs to SharedBase's heap and uses the query's original
pointer-vector plus string byte count. The original NULL branch preserves errno
12, returns setargv -1 and reaches the unresolved attachment cleanup at
`100adb6f`. A positive retry delay retains the original Sleep CALL at `100aeeed`
after the lower allocator has returned; Sleep itself is not implemented.

For a successful allocation, the same original parser instructions execute the
filling pass at `100c0c3d`. Vector entries retain typed pointers into that one
allocation; strings and their NUL terminators have actual byte storage. The
final vector slot is NULL. The original caller removes three argument words,
publishes count minus one at `102f6440` and the vector pointer at `102f6444`,
then restores saved registers/EBP and returns zero at `100c0c5f`.

With empty process input, argv contains the declared virtual `Gothic3.exe`
module name in a 20-byte allocation: two pointer slots and 12 string bytes.
This is the selected browser service profile, not a captured Windows process.
The successful attachment caller now retains its next CALL at
`100adb4f -> 100c092a`, before setenvp executes. Full enclosing CRT attachment,
SharedBase initializer traversal and live Game startup remain unfinished.

Focused validation passes 83 tests, including both passes' exact counts/strings,
quoted and empty arguments, all high CP1252 bytes, physical heap ownership,
NULL-vector termination, normal/failure returns, errno/LastError preservation,
retry-call retention, private-authority rejection and sticky failure prefixes.
Typechecking and the production build pass; the full suite passes 2,621 tests
across 258 files. The source package and generated syntax are
unchanged from the preceding checkpoint.

PR 107 passed CI run 37741344381 and merged at
`dd145fd8025cac46308ff48fd3d7a6b00c7bc77d`; Pages run 37742375940 is pending confirmation.
PR 106 is deployed by successful Pages run 37740590327. No live Game initializer
execution, native NPC activation or finishable campaign is established here.

### SharedBase command-line counting pass

The preceding continuation lowers every reached instruction of the original
parser `100c0a0f`, lead-byte wrapper `100d1fc7` and type helper `100d1e09` onto
one retained stack/register graph. The generated immutable syntax is checked
against every original ASM row. Source bytes and metadata grant no runtime
memory or call authority; the active SharedBase owner supplies those separately.

The query uses NULL vector/string outputs and writes the actual count locals.
Its program-name loop and later argument loop preserve the original quote,
backslash, whitespace and signed-byte behavior. Lead-byte checks read the
actual installed multibyte record. Their LocaleUpdate constructor uses the
existing translated lower effects with a real 16-byte stack alias, original
CALL/RET cleanup and restoration of the PTD own-locale flag. Full constructor
instruction traversal is still a separate dependency.

The parser returns to `100c0c01`. The caller removes its three argument words,
checks the original count/size overflow guards, computes pointer-vector plus
string bytes, and reaches malloc at `100c0c23 -> 100aeed0`. For empty process
input the virtual module fallback needs two pointer slots and 12 string bytes,
so the pending request is 20 bytes. Global argc/argv remain unpublished;
allocation, the filling pass and normal setargv return remain unfinished.
A selected PTD/global mismatch correctly retains the earlier unresolved
multibyte reference-exchange boundary instead of inventing a successful return.

Focused validation passes 79 tests, including quoted paths, empty arguments,
even/odd backslashes, doubled quotes, all high CP1252 bytes, private-authority
rejection and complete generated-row identity. Typechecking and the production build pass; the full suite passes 2,617 tests
across 258 files. Repeated
syntax generation matches exactly. To regenerate both the evidence package and
its parser syntax from the read-only decompiled study:

```powershell
python tools/gothic3/prepare_shared_crt_bootstrap.py `
  --study "<Gothic3_Decompiled_Study_2026-10-04>" `
  --output assets/gothic3/shared-crt-bootstrap `
  --command-line-runtime-output src/gothic3/native-shared-command-line-instructions.ts
```

Later calls reuse earlier stack slots, so SEH scope/cookie snapshots at return
are retained separately from current bytes.

PR 105 is deployed by successful Pages run 37739237721. PR 106 passed CI run
37739725453 and merged at `9238471c60ec90a1dbaf7d632505fdafdcc227be`;
its Pages run 37740590327 succeeded. These helpers remain separate
from live Game initializer traversal. Full SharedBase attachment, NPC activation
and gameplay through a campaign ending remain unfinished.

### SharedBase argument startup and module filename

The preceding checkpoint owns the original `__setargv` frame at `100c0ba7`,
including its nested multibyte initialization and normal child returns. The
selected CP1252 candidate is installed in the PTD and, where the original
locale masks permit it, published globally under lock 13. The source SEH
epilogue restores the incoming FS relationship before argument startup resumes.

The canonical `GetModuleFileNameA` adapter receives NULL module, the actual
261-byte image buffer at `102f6ae8`, and capacity 260. Its declared virtual
filename is `Gothic3.exe`; this is a browser service profile, not a captured
Windows filename. The original marker at buffer offset 260 stays zero, and
`102f645c` retains the actual module-buffer pointer. Nonempty command-line
input retains its process-input pointer; empty input selects the module buffer.

Execution stops at parser query `100c0bfc -> 100c0a0f`. The actual count locals
at EBP-8 and EBP-12 remain unknown, the vector and strings arguments are NULL,
and global argc/argv at `102f6440`/`102f6444` remain unpublished. Parser execution,
argument allocation/fill, the normal setargv return and its enclosing CRT
attachment still require implementation. These SharedBase components remain
separate from live Game initializer traversal at `204678f2`.

Local validation passes 66 focused tests and 2,604 tests across 258 files,
plus typechecking and the production build. The source package remains 79
functions and 56 cold image ranges. PR 104 deployed through Pages run
37737780053; PR 105 merged at `dad85bf3c9602fe4be054c8754729a5eaea49f67`.
No deployment claim is made here for the new local checkpoint. NPC activation
and a campaign playable through an ending remain unfinished.

### SharedBase enclosing case helper and wrappers

The next local continuation owns the original case frame at `100b11fd`, its
adjusted EBP, `51c`-byte reservation and saved registers. CPInfo, character types,
lower/upper maps and byte input alias the original offsets on that stack.
Classification and mapping wrapper frames own their actual locale records and
constructor ABI around the translated lower locale effects. Parent argument
cleanup follows the original deferred 68-byte and subsequent 36-byte steps.

The original table loop writes the candidate and its register effects. The case
cookie relationship is checked before saved EBP/register restoration and return.
The caller's XOR sets EAX to zero. The next boundary is the configuration cookie
frame at `100b166f`; candidate installation and full CRT/live Game integration
remain unfinished. No NPC activation or campaign completion is established.

Focused validation passes 61 tests, including every table byte, actual alias
offsets, returned calls, deferred cleanup, locale flags and source-admission
failure for changed cleanup/cookie receipts. Typechecking and production build
checks pass, as do 2,599 full-suite tests across 258 files. PR 101 deployed successfully through Pages run
37730924635 at `597a38ecee0dae61a38e8ab92eb5ee2ba30101e3`.

### SharedBase lower and upper case mapping

The next local branch completes both declared CP1252 case mappings through
the original Unicode service path. Each mapping owns its direct stat frame,
queries and fills a UTF-16 input temporary, queries and fills a mapped output
temporary, narrows into the byte output, preserves the stack markers, checks
its cookie and returns. The two 520-byte requests consume 520 and 528 bytes
under the selected virtual alignment. The caller restores locale ownership;
the candidate receives the original 256 type-bit and case-byte updates.

The original mapping-mode DWORD at `102f6950` is now captured: 76 functions
and 55 cold ranges. All 153 regenerated source files match exactly. Focused
validation passes 60 tests, including every lower/upper byte and candidate
table entry, actual shared backing, returned calls and locale flags 0/1/3.
Typechecking and the production build pass. The full suite also passes 2,598
tests across 258 files. The boundary is the enclosing
case helper's cookie epilogue at `100b1370`; its native caller frame and global
candidate installation remain unfinished. These helper results do not establish
live Game initializer execution, NPC activation or campaign completion.

PR 99 deployed through successful Pages run 37728624294. PR 100 passed CI run
37728723765 and merged at `532d63718610c1710b192c70af8585c781d29e8d`;
its Pages run 37729493625 subsequently succeeded.

### SharedBase classification normal return

The subsequent local branch completes the classification helper for the declared
virtual CP1252 service profile. Conversion fills the actual 512-byte stack alias;
classification writes 256 WORDs into the retained output. Original `__freea`
preserves the stack allocation, and the helper checks the canonical cookie via
its symbolic EBP relation before restoring the saved registers and returning.
The caller's seven argument words are removed. Temporary call authority expires
and locale ownership is restored where the caller's local flag requires it.
The next mapping scope begins and stops at `100b5112 -> 100b4d44`.

Focused validation passes 59 tests, including all 256 Unicode and type values,
returned CALL records, restored ESP, preserved header and locale flags 0/1/3.
Typechecking, the production build and the full suite of 2,597 tests across
258 files pass. Lower/upper maps remain unknown;
the multibyte candidate has not been installed. These direct-helper results are
not joined to live Game initializer traversal, so no NPC activation or campaign
completion is claimed.

### Publication of the preceding wide temporary checkpoint

PR 98 deployed successfully through Pages run 37727870217. PR 99 passed CI run
37728168251 and merged at `a95b3e89fc6003bc7c8b3da7695929b5dc2b636c`;
its deployment is not yet confirmed here.

PR 97 deployed successfully through Pages run 37726681547 at
`59cfbfe6c69ef0eed93e94197eb88c55d4a583ae`. PR 98 passed CI run 37726972996
and merged at `58a8da9672a4fb67448526f22fb31db97ec0728d`; its deployment
was still running when this continuation was reviewed.

The subsequent local implementation follows the original wide-buffer memset
on the canonical direct-helper stack: three arguments, cdecl CALL/RET, saved
EDI, 128 DWORD writes, preserved allocation header and 12-byte caller cleanup.
It stops at conversion fill `100c6f95`. Source capture now includes the later
temporary cleanup and security-cookie check, without claiming those paths run.
Validation: 58 focused tests, 2,596 full-suite tests across 258 files,
typechecking, production build, diff inspection and 153 exactly reproduced
source-package files. Live Game initializer execution, NPC activation and
campaign completion remain unfinished.

See the [current rebuilding overview](gothic3-rebuild-overview.md#current-status--8-october-2026)
for the latest confirmed deployment and remaining startup dependencies.
PR 96 is deployed at main commit `d3fbb74114f0d850b4a2de899b0865abe2d77a19`
by successful Pages run 37724835223. It publishes original SharedBase pointer
setup, 14 static critical sections, PTD allocation, default-locale initialization,
environment setup and standard I/O descriptors.

Further local work follows actual FLS/TLS thread-index allocation, independent
SharedBase calloc, PTD installation and initialization, default-locale reference
increments under lock 12, and the original thread-ID/handle writes. Its selected
`__mtinit` returns 1 with an actual thread-ID service. Further local work
traverses RTC, acquires the command line and reconstructs ANSI/wide environment
handling. The selected I/O helper returns 0. Further local argument startup
reaches multibyte configuration at `100b1718 -> 100b14a5`, after locale update and
GetACP. Full SharedBase attach still needs argument parsing and initializer traversal. Native SEH
stack installation and non-NULL PTD destruction remain unimplemented.

The live Game startup still stops before `__cinit` at `204678f2`. These components
have not been joined to that live frame. The property diagnostic remains before
its formatter at `100a7eff -> 100b5355`. No live NPC activation or finishable
campaign is established.

The dated checkpoint receipts below describe their own revisions and observations.
Their publication statements should be read as historical evidence.

Updated: 7 October 2026. The latest confirmed Gothic implementation publication
recorded here is [checkpoint 109](#109-own-cold-encoding-initialization-and-the-normal-argument-return),
merged in [PR 77](https://github.com/ael-dev3/Tervain/pull/77) at commit
`25e631eb745282d0517f2153723e29a2cf98a1aa` and published by successful
[workflow run 37686349159](https://github.com/ael-dev3/Tervain/actions/runs/37686349159).
It connects the returned I/O graph, cold encoding-table initialization and both
argument parser passes to the actual zero argument return. Its corrected local
production preview records 14,777 completed source operations and argument
count 1, stopping before `__setenvp` at `204678e7`.
The [publication receipt](#confirmed-publication-of-checkpoint-109) verifies
the deployed artifact identity; the execution observation is from the local
production preview. Full startup, production NPC activation and campaign
completion remain unfinished.

Earlier checkpoint receipts remain evidence for their recorded revisions.
The published baseline for checkpoints 95–99 was
merged in [PR 60](https://github.com/ael-dev3/Tervain/pull/60) at commit
`5f530d4176595e0df294f58039eb99f2e42d33c4` and published by successful
[workflow run 37601141422](https://github.com/ael-dev3/Tervain/actions/runs/37601141422).
They add ScriptAdmin class-name, ModuleAdmin, allocator and input dispatcher
owners; those owners are not yet connected to production NPC startup.
Checkpoint 94 remains the browser's ScriptAdmin getter integration boundary,
recorded in [PR 58](https://github.com/ael-dev3/Tervain/pull/58) at
`99d4112c77eff59c7f844785e4798ae8a3642f3e` and
[workflow run 37586423373](https://github.com/ael-dev3/Tervain/actions/runs/37586423373).
The retained public NPC-runtime exercise is checkpoint 83 at
`c52d16da73fe1c9be5d240b0111cfe1074d1e8cc`; the separate local tower review
is recorded at checkpoint 93. Checkpoints 92–93 were merged
in [PR 56](https://github.com/ael-dev3/Tervain/pull/56) at `main` commit
`dcc68c61a5f738ad9e99c464e8ca6f98f4db5dd6` and published by successful
[workflow run 37581031860](https://github.com/ael-dev3/Tervain/actions/runs/37581031860),
attempt 1.
Published checkpoint 94 models the ScriptAdmin getter's source-ordered cache
protocol behind explicit owner injection. It does not connect the original
class-name, ModuleAdmin, RTTI or ScriptAdmin call-slot owners to the browser.
Checkpoint 91 is the published NPC reconstruction in PR 55. Checkpoint 92
connects Hero movement to source-registered Navigation zones and the native
type-8 quest-entry callback, adding a destination-quest slice while leaving the
broader campaign and NPC activation unfinished. Checkpoint 93 exports the
source-placed full-detail Xardas Tower and adds its streamed triangles to browser
rendering and static collision. Local browser review confirms rendering and a
grounded Hero after the landscape-preview teleport; ordinary overland travel is
not yet verified.
The preceding historical baseline before checkpoint 72 was
`610619f43a809e14118ee8edb186fed67aa2052b`.
Checkpoints 55–71 add
browser NPC Plunder inventory in checkpoint 55, resolves NPC armor class in
checkpoint 56, materializes deterministic Weaponry stacks with unapplied
equip plans in checkpoint 57, reads tracked pose fields from selected native
motions in checkpoint 58, adds a source-checked animated Diego actor in
checkpoint 59, and adds a bounded browser-hosted fist damage profile for one
Ardea Orc record in checkpoint 60. Checkpoint 61 connects source-backed Hero
and Ardea NPC inventories to a bounded gold `Give` path. Checkpoint 62 connects
condition-7 status preservation and a narrowly supported condition-8 delivery
callback for running quest types 1/4; the Ardea pickpocket quest still has no
connected start action. Checkpoint 63 traces the native PickPocket command,
and checkpoint 64 adds TypeScript helpers for its level/perk/roll gate and
distribution-7 loot generator. Checkpoint 65 reads, saves and restores the
actor's `Dialog.PickedPocket` flag. Checkpoint 66 connects a browser PickPocket
action to the source gate, successful loot transfer and saved actor flag.
Checkpoint 67 applies the damage profile to all 15 exact starting Ardea
Raiders, persists NPC HP and hides defeated visuals across save restore.
Checkpoint 68 introduced exact-name kill-objective counters. Checkpoint 69
connects Jack's condition-5 report and condition-6 bandit-quest start to saved
browser dialogue state. Checkpoint 70 corrects the native callback evidence,
adds Jack's three original bandits and connects their bounded quest success
and return rewards. Raider zero HP now leaves the kill-versus-defeat decision
unresolved and does not dispatch kill credit. The TypeScript reconstruction has an
Ardea exploration scene, a moving Hero, three streamed regions, and
source-backed foundations for selected dialogue, quests, player progression
and browser saves. Diego now uses his original skinned body and head with
mapped Hero clips; other NPCs remain static. Bounded browser fist hits update
saved Raider and bandit HP; source-directed lethal bandit hits can advance
Jack's quest. Checkpoint 72 schedules a recovered death-state prefix for those
bandits and connects its quest event and defeat XP, stopping at the remaining
enclave callback. Native NPC
activation, AI, responses, full death handling and most campaign progression remain
unavailable.

Checkpoints 73–84 add retained source NPC readers, shared runtime admins,
heap-backed field owners, physical SceneAdmin startup components and selected
Engine and Game CRT RTTI/type-name components and ordinary DLL attach prefixes.
Checkpoint 79 preserves Navigation notifications and application/area ownership;
checkpoint 80 corrects the fresh CString text constructor and its owned byte
operations, checkpoint 81 adds the separate Game CRT ownership and startup
prefix, and checkpoint 82 reconstructs its encoded onexit table initialization
and within-capacity callback registration before Game Navigation
class-name/type integration. Checkpoint 84 corrects Game `_strlen` to follow its
aligned DWORD predicate with unknown-bit proofs and adds the separately owned
Game Navigation class-name cache, shared CString construction, Game exit-table
registration and selected initializer. Checkpoint 85 extends the byte-verified
combat source set with three Script_Game attitude helpers and their command
registrations. Checkpoint 86 connects the shared MemoryAdmin and ErrorAdmin
owner to the retained browser NPC constructor, and places its Matrix destructor
on the same reverse-order shutdown stack. PR 54 publishes this bounded runtime
admin integration and the attitude-helper evidence. Navigation reflection
still uses logical allocations because the native PropertyObjectType owner is
missing, and no live NPC activation is claimed. The
[overview](gothic3-rebuild-overview.md) records the latest confirmed
publication; the individual receipts below distinguish locally validated
components from published browser behavior. Checkpoint 87 adds a heap-backed
source NPC name; checkpoint 88 connects a lower browser session-mode adapter;
checkpoint 89 materializes source-derived Navigation areas so the selected
NPC read passes its former proxy-resolution boundary. The NPC remains neither
world-resident nor active. Checkpoint 90 follows the selected Navigation
entity proxy through the Engine cache/copy path. Checkpoint 91 adds the original
gCEntity contact slots, a source-shaped contact iterator, and the verified
Navigation property-set contact callbacks. Its focused runtime test confirms
that the NPC read reaches the ScriptAdmin getter; no manual browser exercise is
recorded.

At the checkpoint 91 review, before PR 56, the [Gothic 3 / Ardea
route](https://ael-dev3.github.io/Tervain/gothic3/) served the published
incomplete build and responded with HTTP 200. That historical published
revision was `main` commit `3b968ba51c1924a1c6b2daded2803d7782fabb39`, merged
in [PR 55](https://github.com/ael-dev3/Tervain/pull/55) by successful
[workflow run 37571447817](https://github.com/ael-dev3/Tervain/actions/runs/37571447817),
attempt 1. PR 55 published checkpoints 87–91, extending the selected NPC
construction read through Navigation contact callbacks. The read stopped at
ScriptAdmin; it did not activate NPCs or complete a quest.

The most recent captured browser-runtime exercise recorded at that checkpoint
was checkpoint 83 at commit
`c52d16da73fe1c9be5d240b0111cfe1074d1e8cc`, published by [workflow run
37551902308](https://github.com/ael-dev3/Tervain/actions/runs/37551902308),
attempt 1. No post-PR-55 exercise of the NPC inspector was recorded there.
The current publication status is summarized at the start of this document;
earlier deployment receipts are available in the repository's
[Pages workflow](https://github.com/ael-dev3/Tervain/actions/workflows/pages.yml).
The [scope record](gothic3-browser-port.md) describes the current controls,
limitations and source terms.

This guide records the hosted baseline and subsequent dated checkpoints that
preserve the evidence for each stage. Sections 10–109 cover
the later runtime work; each receipt identifies its source revision and scope.

Each checkpoint's reproduction commands describe its recorded source revision.
To reproduce an older receipt, use a checkout at that commit and its producers.
Running an older producer against today's extended shared source does not
reproduce the historical source hashes.

## Process at a glance

1. Inventory the local installation, preserve its bytes and identify the archive
   layer that supplies each resource.
2. Decode original world records, meshes, actors, textures, materials, motions,
   quests, dialogue and property sets into documented portable formats.
3. Recover one native behavior at a time from the installed binaries. Follow
   forwarding exports, imports and virtual dispatch, and compare the examined
   instructions with original program bytes.
4. Implement that behavior in TypeScript with its original state, callback
   order and object lifetimes. Record unresolved engine calls where they occur.
5. Connect those implementations to one live world: entity loading and context
   activation, the Hero's property sets, the existing script processor, clock,
   input, animation, collision, rendering and gameplay services.
6. Review coherent changes locally, preserve the source and resource hashes,
   then publish through the repository's deployment workflow when it can run.
7. Establish completion by playing the original progression through its endings,
   including quests, factions, combat, travel and saving/loading.

The current scene covers part of step 2 and the rendering side of step 5. The
local Xardas Tower addition also connects a source-verified world mesh to the
browser's static render-mesh collision path; this is not a recovered native
physics shape. A preview-teleport browser check confirmed the Hero can become
grounded on the loaded mesh; ordinary overland arrival remains unverified.
Source-backed quest state, selected Ardea dialogue, game events, ended actor
flags and bounded Hero XP/level/LP progression now connect to browser sessions
and saves. Checkpoint 92 adds a source-backed Hero zone transition that
can complete destination quests such as `Xardas_FindXardas` in the verified
callback and save/restore path. Checkpoint 93 adds a source-placed Tower mesh to
rendering and browser triangle collision. A local preview-teleport check
rendered the tower and left the Hero grounded; ordinary travel through the
world to Nordmar remains unverified. The
Ardea scene also seeds three residents from unambiguous native
`Start` routine points; it does not execute routines or activate native NPC
entities. A collision candidate can resolve and save source-bound NPC point
state, including serialized inventory-slot templates. Its Plunder runtime now
follows recovered distribution-0 draws and creates browser NPC inventory stacks
from exact source templates. The inventory and browser-owned random state are
saved and restored. This first-contact path does not reproduce native cache-in
timing or the original process-wide random sequence; it creates no physical
ItemWorld entities. The deterministic distribution-3 Weaponry recipe now
creates source-resolved NPC inventory stacks with the native quality bit and
configured minimum amount. The runtime retains an `EquipStack` plan, but it is
not applied to an actor or skeleton. The UseType 2 split-stack case is still
explicitly unresolved. Original actor activation and combat callbacks remain
unconnected. The browser also applies the audited Hero Fist damage calculation
to 15 exact starting Raider profiles and three coastal bandit profiles, and
saves their resulting HP. Each profile
uses browser contact detection and a standing target state; it does not
construct the native actor, run attack eligibility or execute native combat
callbacks or NPC responses. Its bandit death integration now schedules the
recovered state and runs the evidenced Kill prefix through the quest event and
defeat XP; enclave notification, ragdoll and loot remain unavailable.
The captured Hero PlayerMemory and Attribute/Stat data also feed an on-demand
character panel. These are bounded integrations: most dialogue, live NPC
activation, combat, schedule changes, world interactions and campaign
transitions are still missing. A successful TypeScript build does not establish
that the whole game loop works or that the completion step is possible.

In practical terms, rebuilding proceeds as a sequence of playable slices. First
choose one in-game outcome, such as a resident responding to the Hero. Trace
every required resource and native state transition, verify those inputs against
their recorded hashes, and implement only the evidenced behavior in TypeScript.
Then connect it to the same live entity, world and save state used by ordinary
play. Review the exact interaction in the browser and record what succeeded and
what remains unavailable. A converter, formula or isolated dialogue handler is
evidence for its own step; the slice counts as integrated only when the player
can trigger its outcome and continue after save/restore. Expand from that slice
to the campaign only after its links work together.

## What “rebuilding” means here

This is a new browser implementation guided by the installed game. It does not
turn Gothic 3's Windows executable into a web game, and the decompiled C-like
listings are not buildable original source. The work follows two connected
tracks: recover data such as meshes and world records, and study native code to
recreate selected behavior in TypeScript. Both tracks must meet in the running
game before an isolated reader or asset counts as a player-facing feature.

```mermaid
flowchart LR
  I[Read-only installation and study] --> D[Offline inventory and format readers]
  D --> A[Reviewed browser assets]
  I --> N[Native behavior and byte evidence]
  N --> T[Bounded TypeScript implementations]
  A --> W[Live world and actor composition]
  T --> W
  W --> V[Build and in-browser behavior review]
  V -->|gaps found| N
  V --> P[Complete progression and ending]
```

For each feature, the practical loop is: identify the winning source resource or
native operation; record its provenance and known limits; decode or implement
it without guessing at missing behavior; connect it to the existing world,
actor and frame lifecycle; then review the result and keep a reproducible
checkpoint. Unsupported engine calls remain explicit until there is evidence
and a working replacement. Converting a model proves only that model's data
path; loading a native property reader proves only that bounded code path. The
end-to-end criterion is to play through Gothic 3's progression, with working
NPC behavior, combat, dialogue, quests, world travel and save/load through its
available endings.

Section 21 records the checkpoint with 18 of the Hero's 19 property-set
factories. Section 22 adds bounded Attribute/Stat and PlayerMemory factories,
bringing the source count to 19 of 19. They remain detached from the enclosing
live entity/world pipeline; this count does not measure how much of the original
game is playable. Section 23 adds a browser-side third-person presentation;
that visual actor still does not use the recovered native entity pipeline.

## 1. Preserve and study the installed game

The installed game is the source of the selected geometry, texture pixels,
entity placements and character appearances. The original installation and the
completed local study are read-only inputs. Installed Gothic 3 executables and
DLLs are not run by the browser or the asset-preparation pipeline. Rimy3D is a
separate converter run offline during preparation.

The earlier local study inventoried and hashed the installation, extracted
38 archives containing 107,370 file records, and recorded which archive layer
is the selected static candidate for each logical resource. That broad index
does not establish every runtime zero-byte/deletion-entry behavior. The later
InfoManager study in section 10 verifies the specific compiled-info deletion
and fallback path. Those complete archive contents and native
binaries are kept outside this repository. The published derivatives cover the
rendered Ardea scene and the indexed animation, gameplay and world foundations
described below.

The preparation tool reads this study layout:

```text
<LOCAL_GOTHIC3_STUDY>/
  00_Original_Runtime/               native binaries used for offline byte evidence
  01_Decompiled_Code/                reconstructed native behavior references
  02_Unpacked_Data/
    Archives/                         physically extracted archive contents
    _metadata/effective_layers.json  logical names, selected layers and hashes
```

Archive extraction and resource decoding are different operations. Extracting
a file exposes its original resource bytes; a mesh, image or world record still
needs its own format reader. A successful archive extraction does not recover
original engine source code.

## 2. Recover behavior references from the native programs

The completed local decompilation study covers 36 runtime, script and updater
modules. It contains 224,676 native C-like functions, one exact assembly
forwarding entry and a managed IL/C# supplement. These are reconstructed
representations of compiled programs, with inferred types and control flow.
They are not the original C++ project and cannot simply be compiled into a
browser game.

The rebuilding method is to inspect a bounded native behavior, identify its
inputs and state changes, then deliberately implement its counterpart in
TypeScript. Native addresses, original file hashes and resource records provide
the evidence. A replacement needs comparison with original behavior before it
can be described as equivalent.

For example, native `eCColorSrcSampler::SetSwitch` establishes the zero-based
material switch behavior used by the texture converter. Native
`eCShaderBase::ExecuteZPass` and `SetShaderRenderStates` establish masked alpha
reference normalization. Those findings guide small implementations; the
native engine itself has not been translated.

The Ardea quest research in
[content-provenance.json](../../assets/gothic3/content-provenance.json) records
original quest predicates, dialogue commands and behavior references.
[content.ts](../../src/gothic3/content.ts) presents a reviewed summary. All six
listed quests currently have `implemented: false`: reading their source does
not implement their state machine, rewards or dialogue effects.

## 3. Decode the native resources and select an Ardea slice

```mermaid
flowchart TD
  A[Read-only installation] --> B[Extracted archives and effective layer index]
  B --> C[Native world, mesh, actor, image and material readers]
  C --> D[Portable models, textures and scene manifest]
  D --> E[TypeScript and Three.js browser runtime]
  E --> F[Explore Ardea and inspect character models]
  G[Native behavior study] --> C
  G --> H[Future reviewed gameplay implementations]
```

| Native resource | What is recovered | Implementation |
| --- | --- | --- |
| `.node`, `.lrentdat` | Entity GUIDs, world matrices, visual resources and body/head slots | [read_genome.py](../../tools/gothic3/read_genome.py) |
| `.xcmsh` | Positions, normals, triangle indices, UVs and material sections | [read_xcmsh.py](../../tools/gothic3/read_xcmsh.py) |
| `.xact` / embedded FXA actor payloads | Static NPC body/head geometry; native Hero skeleton, skin and cleaned hierarchy | [prepare_ardea.py](../../tools/gothic3/prepare_ardea.py), [read_xact_skin.py](../../tools/gothic3/read_xact_skin.py) |
| `.xmot` / embedded LMA motion payloads | Original poses, timed position/rotation/scale tracks and motion phases | [export_animated.py](../../tools/gothic3/export_animated.py) |
| `.ximg` | Native DXT1/3/5 texture pixels and mip layout | [prepare_ardea.py](../../tools/gothic3/prepare_ardea.py), using Pillow |
| `.xshmat` | Diffuse sampler names, switch modes, blend mode and mask reference | [read_xshmat.py](../../tools/gothic3/read_xshmat.py) |
| Original `.quest`, `.info`, string table and gameplay properties | Full catalogs, original operands, localization and source state | [export_gameplay.py](../../tools/gothic3/export_gameplay.py) |
| `.wrldatasc`, `.secdat` and geometry contexts | World/sector membership, source enabled flags and terrain inventory | [export_world_index.py](../../tools/gothic3/export_world_index.py) |

The tool resolves resources through the effective layer index. It verifies an
input's SHA-256 before using it and refuses ambiguous file lookup. This avoids
silently taking an older base-archive version when a patch supplies the winning
resource.

The material reader distinguishes indexed `GENOMFLE` table strings from older
inline length-prefixed strings. A zero-length inline value is valid; it must not
make the containing shader disappear. Recognized shader/sampler parsing errors
stop preparation instead of silently dropping their metadata.

Rimy3D replaces spaces and tabs in exported material names with underscores.
Material lookup applies that same recorded name transformation with a uniqueness
check, preserving the actual native resource reference. It does not use fuzzy
name matching.

### World and characters

- Static families use the recorded entities in
  `G3_World_Lowpoly_01_Levelmesh_01_Spat.node`. Full-detail family resources are
  selected when present, at their corresponding recorded family transforms.
  Each entry records both `sourceResource` and `selectedResource`.
- City and outdoor props come from the effective Ardea dynamic-object `.node`
  layers. Six original Myrtana landscape LOD cells provide the terrain.
- The two Ardea NPC `.lrentdat` layers supply original body/head slots and
  material switches. Nearby named characters and the Hero's arrival position
  come from the effective `SysDyn` layer. Duplicate GUIDs are excluded.
- Diego, Milten, Gorn, Lester, Jack and Hamlar retain their recorded positions.
  Both NPC layers are included as source exhibits; original quest-controlled
  activation and NPC routines have not been reproduced.
- The Nameless Hero is a separate model-inspection exhibit. It is not an
  invented extra NPC placed at the scene origin.

### Coordinates and mesh conversion

The native world uses centimetres and Y-up coordinates. The browser uses metres
and a reflected Z axis. With native origin `[92000, 5200, -12000]`, conversion is:

```text
browser position = [(X - 92000) / 100,
                    (Y - 5200) / 100,
                   -(Z + 12000) / 100]
```

Normals are reflected and triangle winding is reversed. Entity matrices are
reflected on both sides before their position, quaternion and scale are
decomposed. Landscape vertices already contain world coordinates, so the origin
is applied to those vertices once; it is not applied again to their placement.

The native `PC_Hero` arrival position is
`[87984.9375, 5145.56396484375, -10197.4775390625]` centimetres. The browser feet
position is `[-40.150625, -0.544360, -18.025225]` metres. The exploration camera
adds its new 1.65-metre eye height. The chosen view toward Ardea is a browser
camera decision, not a recovered native camera controller.

### Texture and material conversion

Native XIMG mip levels are stored from smallest to largest. The full-resolution
DXT level must be read at `imagePayloadEnd - fullMipBytes`. Reading from the
start of the payload mixes mip levels and corrupts spatial detail. The converter
checks the payload layout and records dimensions, mip count, byte range and
source offset in `textureSelections`.

Opaque decoded pixels become JPEG at quality 92 without resizing. Textures
with alpha become PNG. A dark source albedo is preserved; an unproven gamma
correction is not baked into the exported pixels.

Native sampler switches select contiguous `S1..Sn` variants. Repeat wraps by
texture count, Clamp stays at an endpoint, and PingPong reflects over
`count - 1`. The selected sampler, variant, available range and original mode
are recorded in `materialSelections`.

Each model retains native Normal, Masked or AlphaBlend mode and the original
`MaskReference` byte. Alpha in a DXT image does not make an opaque stone or wood
material transparent. Masked surfaces use the native byte/255 reference, with
a small browser comparison epsilon to account for Three.js's discard boundary.
For the first Ardea OBJ export, full shader graphs, terrain layer blends, normal/specular maps and native
lighting remain unimplemented. The preview currently selects one diffuse
sampler for each material and records the unsupported blends.

## 4. Build a new TypeScript runtime

The separate entry is [gothic3/index.html](../../gothic3/index.html). Its browser
code is under [src/gothic3](../../src/gothic3):

| File | Responsibility |
| --- | --- |
| `types.ts` | Portable scene, character and material data shapes |
| `assets.ts` | Model caching, OBJ/MTL loading, texture completion and native alpha modes |
| `controls.ts` | New first-person movement, independent controller position, raycast ground support, wall sliding and flight |
| `main.ts` | Scene assembly, character inspector, map, journal, camera saves and UI |
| `combat.ts`, `browser-melee.ts`, `npc-combat-runtime.ts` | Audited combat arithmetic plus the narrow browser-hosted Ardea Raider damage profile and saved NPC HP; native actor lifecycle and responses remain open |
| `content.ts` | Recovered character and quest reference summaries |
| `animation.ts`, `skinning.ts` | Hero clip playback and all native bone influences |
| `native-motion.ts` | Source quaternion packing/interpolation, pose fallback and normalization |
| `catalog.ts`, `catalog-view.ts` | Verified original quest/dialogue records and language selection |
| `quest-state.ts`, `quest-runtime.ts`, `live-dialogue.ts` | Native status transition kernel and bounded saved Ardea quest/dialogue integration; unsupported host effects remain explicit |
| `resource.ts` | Hash-checked, bounded decompression of lazy native-data chunks |
| `native-data.ts`, `scene-routine-position.ts` | Read indexed source entities, resolve unambiguous routine-point references and seed Ardea character transforms; no NPC scheduler or activation |
| `style.css` | The separate page's interface |

This code uses Three.js to display the prepared resources. It does not load
native DLLs, execute decompiled functions or import Tervain's simulation.
Ground support and movement are new approximations. Most NPC models remain
static bind-pose previews; Diego uses source skin weights and mapped Hero clips.
The Hero inspector uses original skin weights and selected motion tracks;
equipment attachments, combat and general NPC animation selection still need
corresponding native behavior. Preview lighting and brightness are browser
choices.

The generated [scene manifest](../../public/gothic3/scene.json) connects models
to placements and appearances. The
[source manifest](../../public/gothic3/source-manifest.json) records input and
output hashes, source layers, conversion details and omissions. Personal local
filesystem prefixes are omitted from the hosted records.

## 5. Reproduce, review and publish

Asset preparation requires the existing extracted study, Python 3.10+ with Pillow,
and Rimy3D. It writes the generated asset folder and an explicitly supplied
scratch folder outside the read-only study:

```powershell
python tools/gothic3/prepare_ardea.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04" --rimy "C:\path\to\Rimy3D.exe" --scratch "C:\outside-the-study\ardea-preparation"
```

See the [preparation README](../../tools/gothic3/README.md) for prerequisites,
format references and license separation. The installation/study generation
itself is an earlier local operation, not a step provided by this repository's
Ardea converter.

Use Node 24, matching the Pages workflow, to build the three browser entries with
the repository's pinned dependencies:

```powershell
npm ci
npm run typecheck
npm run build
```

`npm run dev` serves `/gothic3/` locally. Review the actual rendered scene and
models as well as the source diff. Check every generated output hash, asset
reference and source record; record unsupported behavior instead of treating
successful conversion as game equivalence. The current snapshot contains
202 world instances, 67 NPC records, 130 models and 139 textures.

Vite builds Tervain, `/gothic3/` and `/gothic3-local/` into one `dist`
artifact. Publication uses the existing Pages workflow. Before a coherent main
push, inspect repository-wide runs, attempts and workflow trigger chains; reuse
applicable results and avoid duplicate runs. The workflow retains its required
typecheck, scenario suite and build, followed by deployment. Confirm the served
Ardea route, the local-install viewer introduction and the original Tervain
version after the deployment succeeds.

The 4 October foundation checkpoint passed local typecheck, production build,
documentation link checks and generated-byte verification. All 11,843 gameplay
output receipts matched; 9,301 gzip files also matched their decoded receipts.
The largest decoded chunk was 2,749,307 bytes. Native Hero walking and paused
fist deformation rendered in the browser without console warnings, and catalog
search/language selection showed the original records. This evidence does not
include a native-game comparison run or a browser playthrough.

## 6. What still has to be rebuilt

A complete game requires implementations and original-behavior comparisons for:

1. Additional actor rigs, attachments, expression motion and native animation selection/blending.
2. Player combat, targeting, damage, hit reactions and death/revival rules.
3. NPC AI, routines, factions, hostility and original activation conditions.
4. Dialogue predicates and commands, inventory, trading, skills and quest state.
5. Remaining material cases, native vegetation, lighting, audio and world-object streaming.
6. Broad world content and save compatibility or an explicitly new save format.

Those systems are not implied by a model rendering correctly. Each future
milestone should name its native evidence, supported behavior, unsupported
cases and comparison results. Whole-game completion needs corresponding content
and behavior, rather than a larger collection of static models.

Gothic 3's assets remain third-party material with no asserted open-content
license. The offline preparation scripts retain their GPL-3.0-only license;
that license does not license the game's assets. The separate browser runtime
does not bundle those scripts. See [NOTICE](../../assets/gothic3/NOTICE.md).

## 7. Native foundations added after the first scene

### Hero skin and motion

The separate [animation manifest](../../public/gothic3/animated/manifest.json)
records 16 verified native inputs, 73 shared cleaned joints, 6,630 split vertices,
10,692 triangles and 11 original clips. Body and head retain their separate
inverse binds. The export reproduces the native helper-node cleanup, confirmed
at Engine.dll `eCWrapper_emfx2Actor::CleanUpHierachy` (`0x3002f955`) and its actor
load call sites. The raw hierarchy and every original motion key remain in
`hero-native.json`.

Some body vertices have 17 influences. The browser restores the original first
weight set, which GLTFLoader otherwise normalizes in isolation, and uses all five
body sets or two head sets in both GPU deformation and CPU bounds/raycasts.
Keeping only four weights would alter the original deformation. Independent
native-byte and static-converter checks are recorded in `animated/audit.json`.

Walking, running, idle and individual fist attack phases can be selected in the
model inspector. This is clip inspection: it does not execute combat. Native
rotation tracks are packed into signed shorts, decoded with the original
constant, interpolated by shortest-sign component lerp and normalized after
motion-layer evaluation. The browser's `native-motion.ts` reads the verified
raw keys and follows that path for one full-weight clip, rather than using
glTF's spherical interpolation. The portable GLB still has standard glTF
semantics for other viewers. Original multi-layer blending, motion effects and
repositioning remain unimplemented; JS float storage is not an x87 emulator.
Native normals/UVs and diffuse images are retained; the browser PBR response
still differs from the complete native material graph.

```powershell
python tools/gothic3/export_animated.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
python tools/gothic3/audit_animated.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
python tools/gothic3/research_native_motion.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
```

### Quest, dialogue and player state

The [gameplay manifest](../../public/gothic3/gameplay/manifest.json) covers 641
quests, 4,381 info records and 35,114 localization keys in five original languages.
Parallel command arrays retain their original positional cells and exact
operands. Compact runtime records omit duplicate raw text/byte representations;
the detailed extraction remains available locally. Browser catalog downloads
are checked against the manifest's output lengths and SHA-256 hashes.

The original Script_Game.dll startup table contains 54 info command entries.
Its lookup is case insensitive. The source `SuccessQuest` spelling is preserved
as unrecognized, rather than silently changed to `SucceedQuest`. `Description`
is handled by the separate Game.dll info layer. Reading a dialogue line does
not establish its availability or execute its actions.

The TypeScript quest kernel reproduces reviewed manager/status gates and calls
explicit host effects for rewards, arena state and the Ardea tutorial. It needs
actual initialized state and implemented host services before ordinary play can
use it. `CloseQuest` means Open → Obsolete or Running → Cancelled, not Success.
Prerequisites are unfinished while Open, Running or Lost in this native build.
ExperiencePoints is a script input, not necessarily final XP: the native quest
reward callback passes WorldEntity/Player roles, and the XP script applies
additional rules, including a multiplier on that path.

Serialized `PC_Hero` data contains pre-initialization placeholders. The native
`OnGameStartUp` callback sets health to 200, sets other attributes, initializes
inventory and starts `Xardas_FindXardas`. Those callback effects must be recovered
and executed; displaying serialized defaults as a completed new-game state
would be incorrect. The browser currently grants no quest rewards and retains
camera-only saves.

The recovered [initialized player seed](../../public/gothic3/gameplay/initial/initialized-player.json)
combines the serialized Hero with verified startup setters and 121 ordered
inventory assurances. It records 200 health, 100 mana, 100 stamina, the original
attribute values, template GUIDs and quick-slot operands. Five assurances
explicitly mark items learned. The other learned states remain unresolved where
creation notifications or template defaults still matter. The separate
[world clock record](../../public/gothic3/gameplay/initial/world-clock.json)
preserves Year 0, Day 0, noon and Factor 12, with the native read/notification
path attached. These are preparation records; the exploration controller does
not yet consume them as an active character simulation.

Enum numeric values are preserved from native files. Community enum labels are
advisory: this installed build uses older action numbering. For example, local
Game.dll initializes Action 24 as `StumbleR` at `0x20522a10`; dispatch must use
the verified mapping for this build.

### Bounded gameplay data

World entities and template properties are prepared independently from visual
models. The current index contains 230,337 entity records, including 49,586 with
selected gameplay properties, and 17,634 template headers. Decoding succeeds for
2,519 of 2,529 world sources and 6,081 of 6,082 template sources. The remaining
failures are recorded in the audit; they are not silently treated as empty data.

The ten world failures are seven version-only dynamic-layer stubs, one zero-byte
node and two unfinished dynamic layers. The template failure is an older tree
header format. Unknown property data remains in quest/info managers, inventory,
movement, items and other systems; the
[property audit](../../assets/gothic3/gameplay/runtime-property-audit.json)
records exact counts and classes. These gaps affect faithful state and save
integration even though the quest catalog can already be read.

Large property sets and their lookup indices use lazy gzip chunks. Each chunk
decodes to at most 4 MiB and carries compressed and decoded length/hash receipts.
World entity chunks contain at most 256 entities. The browser resource reader
checks the transport bytes, bounds decompression, then checks the decoded bytes
before parsing JSON. Exporting this data does not execute its native callbacks
or resolve every property type.

```powershell
python tools/gothic3/export_gameplay.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04" --raw-output "C:\outside-the-repository\gothic3-gameplay-raw"
python tools/gothic3/assemble_initial_player.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04" --raw "C:\outside-the-repository\gothic3-gameplay-raw"
python tools/gothic3/repack_gameplay.py --refresh-receipts-only
```

The detailed raw audits occupy several gigabytes outside the repository. The
initial-state assembly runs after the full export, then the last command refreshes
the final output receipts.

### Full-world indexing

The [world source manifest](../../public/gothic3/world/source-manifest.json)
records world registries → sector memberships → native world files. This is the
input to future streaming; an Ardea radius list cannot represent the full world.
The index includes 2,421 nodes, 108 dynamic world layers and 782 native landscape
Cell meshes across Myrtana, Nordmar and Varant. Source enabled flags, unresolved
references and bounds are retained explicitly. Bounds use absolute reflected
metres; a renderer must subtract its chosen floating origin once.

Indexing the resources does not render or activate them. The first index
checkpoint retained six Ardea landscape LOD cells. The terrain work below adds
conversion, exact source membership and rendering for all 782 landscape cells;
missing registries, native activation and collision/navigation remain separate.

The native defaults distinguish the `G3_Startup` menu world from gameplay world
`G3_World_01`. The gameplay registry contains 169 enabled references absent from
all extracted project layers, including old Ardea levelmesh/NPC names. Native
sector import appends `.sec`, performs an exact lookup and warns/skips missing
resources. The index retains those missing references; it does not infer
replacement sectors from similarly named files.

```powershell
python tools/gothic3/export_world_index.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
```

Completion must be evaluated against the original starting state, story gates,
quests, combat, region transitions and ending paths. A visible model, a complete
catalog, a successful build or a successful deployment alone cannot establish
that the original game is finishable.

## 8. Terrain streaming and reviewed gameplay kernels

### Convert the complete landscape-cell inventory

[export_terrain.py](../../tools/gothic3/export_terrain.py) consumes the existing
world index and verifies each selected native input against the immutable study.
It binds each Cell to its exact native GUID/entity, node, spatial context and
sector registration. It exports 303 Myrtana, 119 Nordmar and 360 Varant cells:
2,082,155 triangles, 1,931,561 vertices and 2,549 material sections.

The GLBs retain every section's indices, normals, tangent vectors, UV0–3 where
present, and the original unsigned BGRA diffuse/specular streams. Vertices are
centered in local float32 metres; the GLB node restores its absolute center.
The browser subtracts `[920,52,120]` once to share the existing Ardea display
origin. Maximum measured position rounding is 0.00001465 metres.

The separate [terrain manifest](../../public/gothic3/terrain/manifest.json)
links 65 native material graphs and 89 XIMG dependencies. The largest original
decoded mip becomes a lossless PNG, with no resizing, gamma transform or lossy
encoding. Identical pixels deduplicate to 88 PNG files. Geometry is 129,558,488
bytes and PNGs are 114,014,271 bytes. Original lower mips, lightmaps and collision
companions retain source receipts but are not converted/applied yet.

```powershell
python -B tools/gothic3/export_terrain.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04" --game "C:\path\to\Gothic 3"
python -B tools/gothic3/audit_terrain.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
```

The actual [conversion audit](../../assets/gothic3/terrain/conversion-audit.json)
compares all 782 meshes with their source streams/indices and all 89 image
dependencies with original decoded RGBA pixels. It checks source/output hashes;
it does not run the native game or establish visual equivalence.

### Compile graphs and stream resident geometry

[terrain-materials.ts](../../src/gothic3/terrain-materials.ts) compiles recovered
sampler, constant, vertex-color, combiner and blend nodes. Coordinate nodes
include Scale and native BumpOffset. A valid UV proxy follows its referenced
node; a missing-instance proxy selects its own UV stream. An outer sampler's
selector must not override a linked Scale node's original UV input.

Vertex blend weights use original alpha. With reflected geometry, the bitangent
is `cross(N,T) * (2*red-1)`, where red is original BGRA byte 2 divided by 255.
Native normal-map X/Y come from alpha/green, with reconstructed Z. BumpOffset
uses `(height-.5)*[offset,-offset]*tangentEye.xy`, without an eye-Z division or
renormalizing interpolated tangent/binormal. Native shader-source receipts and
instruction references accompany the exported graphs.

One connected sampler has an empty native image path. Nine original primitives
request UV1 while providing only UV0. Their unresolved materials are explicitly
marked in magenta and listed in Help; their geometry is retained. The renderer
does not substitute UV0 or an unrelated texture. Native global lighting,
specular lookup, lightmaps, mip chains and sampler gamma state remain fidelity
gaps; the surrounding Three.js lighting is an adjustable preview.

[terrain.ts](../../src/gothic3/terrain.ts) selects nearby enabled, registered
cells by absolute horizontal bounds. It uses two concurrent cell loads, a
48-cell resident target, distance hysteresis and a texture-memory estimate.
Geometry, textures and graphs are receipt-verified before use. Shared material
and texture leases release GPU resources when cells unload. An acquisition
rechecks cache identity after awaiting, so eviction cannot return a disposed
texture/material. Failed reads can be retried.

The six legacy Ardea terrain objects are hidden after native support cells are
ready. Collision-index refreshes preserve the camera state. Walking pauses at
unloaded terrain; static render-mesh raycasts remain a browser approximation,
not native PhysX. Landscape preview destinations read exact stored Hamlar,
Xardas and Vatras records, providing views near Ardea, Xardas's tower and Lago.
They do not execute NPC routines or quest travel. World buildings, vegetation,
caves and actors still need corresponding streaming.

For `.json.gz` served as raw gzip files, `resource.ts` verifies both compressed
and decoded receipts. If HTTP `Content-Encoding: gzip` makes Fetch transparently
decode first, it verifies the bounded decoded receipt; original wire bytes are
unavailable through Fetch on that route. The source JSON is never used without
its exact decoded hash. `native-data.ts` shares verified lazy reads with a
decoded-byte cache budget, exact source/GUID lookup and explicit ambiguity.

### Recover the real quest seed and bounded behavior

[initial-quests.json](../../public/gothic3/dialogue/initial-quests.json) contains
637 exact compiled QuestManager runtime packets and four native factory/INI
records, covering all 641 definitions. All statuses/counters/activation times
are zero before startup; the original `KapDun_Hunter_Fur` journal pair is
retained. The reader consumes every packet byte and retains source offsets,
versions and hashes. It does not apply startup's `RunQuest Xardas_FindXardas`.

[initial-state.ts](../../src/gothic3/initial-state.ts) validates and combines
those quest records with the recovered player/clock seed. Its default host
rejects gameplay effects. The browser's read-only character-state panel shows
HP/MP/SP, serialized Level/XP/LP, 121 inventory assurances, equipment references,
the original clock and pending callbacks. It does not tick time or grant items.

[dialogue.ts](../../src/gothic3/dialogue.ts) provides tri-state availability and
guarded command plans. Unknown host predicates remain unknown. Unsupported
commands/callbacks prevent script start; an accepted start marks Given before
asynchronous commands finish. The native Given exclusions are conditions
9/51/52, InfoType 0/4, Permanent and player ownership. Fresh omitted Permanent
defaults to false, while serialized InfoManager overrides remain separate.
Distance checks scale NPC-target distance by 0.25. Fresh INI defaults alone do
not establish restored Given state. Section 10 adds the separate, verified
ordinary-world-read Given seed; native save restoration remains unsupported.

[combat.ts](../../src/gothic3/combat.ts) provides bounded Hero fist/single-hand
Impact/Blade calculations, guards, death eligibility, native skill activation
and ordered effect plans. Missing contact, participant state, attitudes or
skills return unsupported. Native fists use their hit-phase marker; sword
contacts require the native touch/contact path. The module is not connected to
ordinary exploration. Its receipt matches 152 native entries, 12,465 listed
instruction records, 43,699 original PE bytes and all 138 action labels.

The native XP callback adds level/LP effects with the verified formula and a
single level increment per call. Info GiveXP passes None/player roles and gets
the fivefold source branch. These kernels require actual inventory, contacts,
AI, dialogue lifecycle and startup services before they can support gameplay.

```powershell
python -B tools/gothic3/read_initial_quests.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
python -B tools/gothic3/read_dialogue_native_evidence.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
python -B tools/gothic3/read_info_defaults_evidence.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
python -B tools/gothic3/freeze_dialogue_receipts.py
python -B tools/gothic3/research_native_combat.py --study-root "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
```

The dialogue proof matches 10,819 listed native instruction records; the fresh
info-default proof matches 2,749. These are offline byte/control-flow audits,
not native execution, exhaustive program verification or a game playthrough.

## 9. A separate viewer that reads the visitor's installation

[Claude's local-install viewer](gothic3-local.md), integrated from
[PR #21](https://github.com/ael-dev3/Tervain/pull/21), provides another way to
study Ardea at `/gothic3-local/`. The visitor selects their installed Gothic 3
folder. Original TypeScript readers decode archives, meshes, images, material
graphs, world cells and vegetation inside the tab; this route hosts no game
data and uploads none. Its development-only archive server requires a local
`G3_DATA` path and accepts loopback requests only.

This viewer has its own rendering assumptions. Tree crowns are generated
approximations, daylight is authored, and native lighting equivalence is
unverified. It loads its starting cells once and has no characters, dialogue
execution, combat or quest progression. Its author-reported parser and frame
measurements are recorded in its guide with their one-machine limits.

The `/gothic3/` reconstruction continues to use the audited preparation tools
and hosted derivatives described above. The two entries remain separate; a
working landscape renderer is only one component of rebuilding a finishable
game. The remaining runtime milestones in section 6 still require startup,
inventory, AI, contacts, dialogue, quests and saves to work together.

## 10. Rebuild initialization before enabling gameplay

This checkpoint adds source-backed inventory, InfoManager, startup and enclave
planners. The scene inspector uses the new read-only facts. A complete native
session and NPC simulation are still pending; these modules do not make the
browser game finishable.

### Select the real InfoManager provider

The latest `Projects_compiled.p01` entry for
`compiledinfos_G3_World_01.bin` is empty and has the deletion attribute
`0x8000`. Original VFS instructions show that it suppresses the same name in
lower archive layers. Choosing the most recent **nonempty** file would
therefore select an obsolete catalog.

The ordinary InfoManager read tries the compiled table where appropriate and
falls back to INIs when that lookup fails and entity patching is enabled.
The source `GetInfoDir` prefix selects exactly 4,381 current-world INI records.
The former `.pak` and `.p00` tables have 4,260 and 4,265 records respectively;
they are preserved as separate historical providers, never merged into the
current table.

All 4,381 current INIs explicitly set `InfoGiven=false`. Stored `Permanent`
is true for 197, explicitly false for 4,076 and absent for 108. The missing
properties retain the native fresh-factory false default. Stored Permanent
alone does not determine derived dialogue permanence or availability.

The selected world InfoManager is class version 4 with no runtime tail. Its
ordinary `Read` skips the older runtime-overlay branch. `ReadSaveGame` is a
different route; its Given packets must be restored separately. Permanent is
not a field of those packets.

[info-state.ts](../../src/gothic3/info-state.ts) loads independently hash-pinned
providers and guards Given lookups/updates by the info's exact archive, path
and hash. An unsupported restore invalidates those facts instead of resetting
them to convenient defaults. `loadBrowserInfoState()` uses an explicit fresh
`G3_World_01` profile with patching enabled, the deleted compiled lookup and
no `noinfos` command-line skip. This is a browser initialization choice backed
by the specified source route; it is not a capture of a running native game.
The source document records its assumptions and unapplied callbacks.

### Recreate stacks through the original inventory operations

[inventory.ts](../../src/gothic3/inventory.ts) ports bounded `CreateItems`,
`AssureItems`, `AssureItemsEx`, quickslot, Learn and skill-activation behavior.
It retains native signed/unsigned arithmetic, template GUID identity and
ordered callback notifications. Assure sums exact-quality matching stacks and
creates only a shortfall. Its selected stack is the last matching unlinked
stack, or the first linked match when no unlinked match exists.

Original vtable/import/export bytes bind stack property Enter/Exit hooks to
SharedBase methods which return true without effects. `CreateItems` assigns a
template proxy; it does not spawn an ItemWorld or execute that template's Skill
or Spell handlers. From an empty serialized stack list, the 121 original
assurances leave 116 stacks intrinsically Learned=false and explicitly set
five true. The two serialized Head/Body equipment references preserve their
original item and template GUIDs.

External inventory listeners are a separate runtime boundary. An omitted or
unknown registry rejects mutations before they start. A caller must supply a
complete ordered registry; passing an empty registry explicitly asserts that
it is complete and empty. The inspector instead reads the intrinsic projection
through [inventory-source.ts](../../src/gothic3/inventory-source.ts), which
performs no creation, listener or equipment calls. It does not assert that a
native session has no listeners.

The supported `Give` foundation selects the first **any-quality** donor stack
and transfers that stack's actual quality. Only a player donor is clamped to
that first stack's amount. It never combines donor stacks or creates a gift
when the donor has none. Ordinary unlinked transfers retain source removal,
recipient creation and quest-notification ordering. Physical unlink/equip,
mission-item special branches and localized transfer messages still need
their host implementations. Equipment plans are decisions, not completed
physical/stat effects; starting weapon equipment has not been established.

### Preserve the original new-game callback order

[startup.ts](../../src/gothic3/startup.ts) loads a hash-verified recipe and
plans the installed build's new-game mode 0 callbacks. `OnInit` invokes twelve
helper resets in native order, including the 63-row action-transition table,
entity caches, flags and distance entries. `OnGameStartUp` then performs:

1. Script entity-cache reset and Hero Chapter=1.
2. The temple-door height repair and Yepas alignment repair.
3. Larson's `Start` navigation routine.
4. Ardea alignment=1, Raid=true and Revolution=true.
5. `NotifyEnclave(Hero, Ardea_Orkboss, 2)`.
6. `RunQuest Xardas_FindXardas`.
7. Gorn's `OnExit_Gorn` ROI callback assignment.
8. Eighteen player stat setters, attribute LP=0 and `InventoryPopulate(...,0)`.

The Gorn exit callback was absent from the original C/function index. Offline
PE disassembly recovered its complete 412-byte body and direct branch
boundaries. It does nothing when `Gorn_ShowReddock` is Open. Otherwise it calls
CloseQuest, selects `GothaPrison`, moves to the selected working point and
clears ExitROIScript. That conditional is preserved as compiled. Its spatial
ROI scheduling has not been rebuilt.

The source also requires session prerequisites and later work: clock resume,
engine warmup, menu return, intro/audio restoration and ongoing AI/ROI/contact
scheduling. The recovered 757-byte `OnReturnFromMenu` body refreshes NPC
HP/SP maxima while preserving percentages; it is retained as evidence, not
claimed as an executed browser lifecycle step.

The startup host prepares every effect against a detached draft, then commits
one revision-checked state change. Plans and receipts are frozen and single
use. Missing handlers reject the entire transaction without applying a prefix.
`gameplayReady` remains false even after a bounded callback plan succeeds.

### Port Ardea raid entry without inventing active NPCs

[enclave.ts](../../src/gothic3/enclave.ts) plans the source-proven event 2,
Status 0→1 raid-entry path. Its gate compares **Other** with Other's enclave:
at startup that is Ardea_Orkboss versus Ardea, not Hero versus Ardea.
Political-attitude result 1 identifies same-side defenders, and result 4
identifies their opponents. The full eight-by-eight switch table and
chapter-dependent entries are recorded from original PE data.

Membership comes from the enclave's cached proxies. An empty cache is built
from NavigationAdmin's registered navigation property sets whose NPC enclave
ID matches. Rendered NPCs are insufficient evidence for that live registry.
Processing range is a live navigation byte, not a browser distance guess.

AIModes 6, 9 and 8 exclude defenders from the eligible count but retain them
in the total count. The signed native threshold selects liberated Status 2
only when `eligible * 5 < total`; equality at 20% and zero/zero select Status 1.
The supported branch preserves party detachment, Status assignment, ordered
FullStop/ContinueRoutine calls and distance-ordered recruitment toward ten
active members per side. Recruitment uses GroundBias=None, AniState=2 and
StartGoto(Player, walk mode 3).

Party clears require proved postconditions, because a native true return alone
does not establish a changed Party proxy. The status return/read and subsequent
member/distance facts also require host postconditions. Native float32 squared
distances are required; tied distances need the original qsort permutation.
Unknown facts produce no plan effects. Liberation, its quest/mission-item/death
callback chain, other events and actual AI/task execution remain unsupported.

### Evidence and reproduction

These audits overlap some earlier functions; their counts must not be added
as a count of unique ported engine methods.

| Boundary | Evidence in this checkpoint | Implementation boundary |
| --- | --- | --- |
| Inventory | 136 entries, 2,772 instructions and 7,666 bytes matched to original PEs | Unknown observers, physical equipment and special transfer paths remain |
| Startup | 75 functions, 7,220 listed/decoded instructions and 154 checked evidence files | Complete session, navigation, tasks and ROI remain |
| Enclave | 23 bodies, 1,883 instructions and 6,822 bytes matched to original PEs; 256-byte political switch table | Raid-entry planner requires a complete native host |
| Info state | 2,348 instructions matched to original DLLs, plus 421 matched to the separately labeled unpacked executable derivative | Fresh-world provider selection; native save restoration remains |

The derivative executable's evidence is explicitly distinguished from original
PE evidence. None of these tools executes an installed Gothic 3 binary.

```powershell
python tools/gothic3/research_info_runtime.py --study <LOCAL_GOTHIC3_STUDY> --installation <LOCAL_GOTHIC3_INSTALLATION>
python tools/gothic3/freeze_info_state.py
python tools/gothic3/research_native_inventory.py --study <LOCAL_GOTHIC3_STUDY>
python tools/gothic3/research_native_startup.py --study <LOCAL_GOTHIC3_STUDY> --capstone-path <CAPSTONE_5_0_7_PACKAGE_DIRECTORY>
python tools/gothic3/research_native_enclave.py --study <LOCAL_GOTHIC3_STUDY>
python tools/gothic3/freeze_initialization_checkpoint.py
```

See each tool's arguments and the separate `assets/gothic3/{inventory,startup,
enclave,info-state}` receipts. The original broad gameplay receipt is preserved;
these findings have their own source/output receipts.

The final checkpoint tool checks frozen bytes and catalog source identities.
It records the files present; it does not run or certify a typecheck, build,
browser inspection or native playthrough. Those validations need their own
evidence for the source being reviewed.

The candidate's source was reviewed separately from live deployment. Historical
PR checks did not execute workflow steps. A source-only checkpoint can be
reviewed without treating it as a successful Pages release. The live
site remains at its last successfully deployed revision until required CI and
deployment are available again; no checks or triggers are bypassed.

## 11. Add the clock, navigation lifecycle and task controls

Checkpoint `864422d` added executable TypeScript components for the
session runtime. Their supported operations perform actual state changes;
their remaining host boundaries still prevent a complete new-game session.

- [world-clock.ts](../../src/gothic3/world-clock.ts) reconstructs the paused
  source clock, timestamp sentinel, unsigned millisecond wrap, float32 stores,
  truncating calendar conversion and ordered time notifications. Its exact
  promoted millisecond coefficient is `0.0010000000474974513`. Callers select
  24, 53 or 64 bit nearest-even arithmetic; the live native control word was
  not captured. The browser clock inspector selects the native FPUAdmin
  default of 24 bits explicitly. Quest timestamps read the last published
  Year/Day/Hour properties without advancing time.
- [navigation-runtime.ts](../../src/gothic3/navigation-runtime.ts) preserves
  insertion-ordered navigation and ROI registries, duplicate handling,
  constructor-null caches, live vector references across property callbacks,
  enclave member-cache lifetime, processing sphere/AABB decisions and
  exits-before-entries dispatch. It does not register rendered NPCs implicitly.
  Compiled navigation scenes, sector/PVS traversal, real floor/physics queries
  and complete movement/property handlers remain required.
- [inventory-observers.ts](../../src/gothic3/inventory-observers.ts) implements
  the original list, recipe-stat and stack-stat callback writes, selection
  shifts and self-unregistration. `OnPlayerChanged` invalidates the script
  player cache and routes GUI binding to the persistent main page, then the
  active page. Active HUD composition still determines the complete inventory
  observer registry. Linked equipment retains a physical item/slot boundary.
- [script-routine.ts](../../src/gothic3/script-routine.ts) executes bounded SPU
  task/state/routine control. FullStop aborts the matching active instruction
  and does not clear the task or state automatically. Detection mode precedes
  SetTask's boolean-flag gate. Property setters retain their captured property
  set across notifications; time setters resolve Self independently. State
  replacement destroys every frame in capacity, rereads its object pointer
  before deletion, and clears each slot immediately. Original instruction
  bodies, script handlers, object deletion and property notifications remain
  explicit host responsibilities; the full SPU scheduler is still pending.

Landscape → **Inspect original world clock** runs an isolated browser instance
from the verified source seed. Run, Pause, Read next frame and Reset exercise
the clock component. The instance never resumes the game session or applies
NPC, quest, weather, music or ambient effects. Closing its panel stops it.

The new audits cover 60 clock entries/1,576 instructions/5,675 PE bytes;
117 navigation bodies/13,499 instructions/46,857 PE bytes; 90 inventory
observer functions/1,377 instructions/3,751 PE bytes; and 44 routine entries/
718 instructions/2,075 PE bytes. Functions overlap earlier checkpoints, so
these counts are not a sum of unique ported functions or a completion metric.

```powershell
python -B tools/gothic3/research_native_clock.py --study <LOCAL_GOTHIC3_STUDY>
python tools/gothic3/research_native_navigation.py --study <LOCAL_GOTHIC3_STUDY>
python tools/gothic3/research_inventory_observers.py --study <LOCAL_GOTHIC3_STUDY>
python tools/gothic3/research_native_routines.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/freeze_session_checkpoint.py
```

[session-checkpoint.json](../../assets/gothic3/session-checkpoint.json) records
the file hashes at `864422d` and the separate offline audits. Its freezer verifies
the retained initialization checkpoint at commit `a2c3ce3`, the frozen module
receipts and routine source pins. It does not execute the game, run runtime
tests or certify a build, browser review, deployment or completed playthrough.
The older initialization receipt remains historical evidence for its own
checkpoint; the updated guide and attributes have new hashes here.

The next runtime dependencies are navigation-scene compilation
(`CompileNavigationScene 200131a1` → `CompileStaticNavigationScene 20013b29`),
floor-entry logic (`GetDistToGround 20027926`), active HUD binding and real
instruction/script execution. Startup can then compose these components in
the original order. The original complete game remains the delivery target;
an isolated clock, landscape or source-backed task API does not fulfill it.

## 12. Connect stored navigation, HUD composition and instruction processing

The following checkpoint adds bounded runtime components that consume the
original source records. These are implementation APIs, with their own native
evidence and explicit host requirements. They have not yet been assembled into
a complete browser `NativeGameSession`, and are not a completed game release.

### Load the installed world's stored navigation map

The selected map comes from
`Projects_compiled.p00/G3_World_01/NavigationMap.xnav` in the extracted local
study. Its original size is 14,550,529 bytes and its SHA256 is
`1b163f4f1be7115aeef37835e798772a3437db3429a32b4d36d866437b9a41c3`.
The `GENOMFLE` wrapper contains `GE3-NAV-MAP` version 3/0. The producer reads
the stored grid, negative zones, path intersections and network/interaction
lists. Original PE `ReadLists` behavior is the runtime reference; g3dit's
readers provide separately identified layout corroboration.

[research_navigation_scene.py](../../tools/gothic3/research_navigation_scene.py)
resolves all 5,385 stored map zone/path IDs to unique original typed world
records: 2,226 zones and 3,159 paths. It verifies selected input hashes and
decodes their properties again from the original world files. Source registry
and sector metadata are retained. These records do not establish which
entities are registered, resident or activated in a live session.

[navigation-scene.ts](../../src/gothic3/navigation-scene.ts) loads the verified
query subset and definitions. An explicit host resolves original live
property-set objects. The stored associations set zone network/exclusion data
and path intersection properties in native order. Callback attempts and writes
are recorded; a partial binding cannot be silently replayed on the same scene.

`GetZone` uses the native signed-angle zone test, radius selection, height and
LinkInner priorities, internal negative zones, tapered path cylinders and
intersection margins. A renderer mesh or generic AABB is insufficient for
these decisions. This implementation models float stores with JavaScript
arithmetic; exact x87 boundary behavior has not been established. Stored-list
loading does not implement forced map recompilation, AIZone inheritance, door
binding, path search, movement or collision avoidance.

The query subset is about 2.6 MB decoded; definitions are about 7.6 MB decoded.
The optional full stored lists are about 60.8 MB decoded and are not loaded for
a zone query. The shared [resource loader](../../src/gothic3/resource.ts)
requires an explicit larger decode budget for these resources and retains
bounded streaming, exact lengths and compressed/decoded SHA256 checks.

### Construct the original inventory-facing HUD controls

[hud-runtime.ts](../../src/gothic3/hud-runtime.ts) follows the root constructor,
Main2 creation and all seventeen page slots. Initially active and previous
page indices are -1, entity slots are null and controls are unbound. Startup
player slot 0 calls the focus helper (whose entity bind belongs to slot 1),
then binds mana, health and stamina controls, QuickSlots and the compass in
that order. It then handles the active page when there is one.

All 37 constructed inventory listener controls are accounted for: 26 list
controls, seven stack-stat controls and four recipe-stat controls. Their binds
and callbacks use the existing
[inventory-observers.ts](../../src/gothic3/inventory-observers.ts) adapters.
The native stack-stat selected-index field is uninitialized at construction;
it becomes usable only when the original Bind receives a real stack index.
The separate selection helper's labels/icons and other effects still require
their own implementation.

The host must perform the specified GFC, progress, header, cash, category,
trade and tutor subcalls. An evidence address can identify the containing
native function; it is not an instruction to rerun that whole function and
duplicate the already-ported listener bind. Entity identity must preserve the
original captured pointer lifetime across callbacks. The selected live-owner
profile does not establish arbitrary entity destruction/recreation behavior.

The original destructor destroys Main2, the crosshair, seventeen page slots
and three logo controls in that order, retaining post-destructor pointer reads
before deletion. Member listener destructors do not implicitly call
`RemoveListener`. Knowing every constructed HUD listener does not prove that
all external inventory observers are accounted for. Full equipment and world
entity effects remain separate requirements. This module is a runtime
composition model; it has not recreated the complete native HUD visually.

### Implement the notification chain used by routine setters

[native-properties.ts](../../src/gothic3/native-properties.ts) implements the
audited ScriptRoutine, PlayerMemory and NPC property-set notification profiles.
Outer Notify calls the owner's `Modified`, dispatches virtual OnNotify, and
the inherited OnNotify calls `Modified` again before returning true. In the
original entity classes, `Modified` reads DWORD `+0x130`; it does not write a
dirty flag. The constructor subset starts that word at `0xffffffff` and does
not claim a complete entity create/read/world lifecycle.

NPC exit notifications for the exact property name `Enclave`, with propagation
false, update the cached enclave proxy before the inherited OnNotify chain.
PropertyID storage occupies twenty bytes, but native equality compares the
first sixteen. Assignment copies those sixteen and clears the trailing DWORD.
For a changed ID, the proxy copies it before releasing a nonnull cached
internal reference, then clears that internal pointer. A real reference-release
host is still required when an existing internal reference is present.

Routine hooks bind the exact property-set value object captured by the native
setter. Replacing `Self.properties` during a callback cannot redirect the
remaining write/exit notification to a different property set. Other
property-set classes are not assigned generic successful no-op callbacks.

### Process the existing SPU state and run WAIT

[script-instructions.ts](../../src/gothic3/script-instructions.ts) implements
`ProcessScript`, the original WAIT instruction and shared per-frame callback
counters. It operates on the same live
[script-routine.ts](../../src/gothic3/script-routine.ts) state, revision,
ordered journal and failure state used by task/state control. It does not
maintain a second copy of the actor's task or instruction pointer.

The original factory has capacity for five distinct frames, one active frame,
a null audio channel and uninitialized instruction/callback timer fields where
the constructor leaves bytes unwritten. Callers must provide a real owner,
the application and EntityAdmin processing gates, and source-registered script
bodies. The arithmetic profile explicitly selects 24, 53 or 64 bit nearest-even
precision; a live native control word was not captured.

Each processing step stores scaled frame seconds before converting to
milliseconds, advances task/state/WAIT timers, polls an active instruction,
and decides whether it remains pending by rereading the active pointer.
The callback's return value alone does not decide that branch. State and
function completion comparisons preserve the original AL-byte checks.
WAIT reads its entity/uint32-duration descriptor only when starting; polling
uses the existing timer fields. Completion or abort clears both instruction
proxies and the active pointer. Legal nested instruction starts and setters
share the active scope; reentrant `ProcessScript` is rejected by this bounded
profile.

The empty-routine fallback checks original `NPC_PS` selector `0x1e`, independent
of Navigation_PS, before invoking `ContinueRoutine`. Native frame-object
destruction, audio-channel updates and missing script bodies remain explicit
requirements. Unknown effects expose their attempted/applied prefix and block
further use of the affected instance. This protects the reconstruction from
treating unresolved native work as a successful frame.

### Reproduce and checkpoint the source work

These are the commands for the historical `2637d1e` checkout. Use that commit's
files when reproducing its receipt; the current branch extends the shared
routine API and uses the new checkpoint in section 13.

```powershell
python -B tools/gothic3/research_native_properties.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/research_native_hud.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/research_navigation_scene.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/research_spu_instructions.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/freeze_dispatch_checkpoint.py
```

[dispatch-checkpoint.json](../../assets/gothic3/dispatch-checkpoint.json) records
the source file hashes and separate offline audits. Its freezer verifies the
historical `864422d` session receipt, retained file bytes and intentional
changes to the routine API, resource loader, guide and attributes. Each new
namespace has its own evidence/output receipts. Counts overlap earlier native
functions and are not a percentage of game completion.

| Source boundary | Original PE evidence in this checkpoint |
| --- | --- |
| Property notifications | 83 entries, 989 instructions, 3,556 matched bytes |
| HUD construction/binding | 328 bodies, 6,351 instructions, 20,514 matched bytes |
| SPU processing/WAIT | 117 entries, 2,055 instructions, 6,207 matched bytes |
| Stored navigation loading/query | 86 bodies, 11,040 instructions, 37,469 matched bytes |

The freezer checks hashes and receipts. It does not perform a fresh original
PE comparison, execute native code, run tests or certify a browser review,
build, deployment or playthrough. The historical initialization and session
receipts remain evidence for their respective commits; rerunning an old
freezer against a changed runtime is not a substitute for a new checkpoint.

The local candidate passed `npm run typecheck` and `npm run build`. Those
static checks cover compilation and packaging. They do not establish runtime
equivalence or a playable integrated session. No runtime tests, new browser
review, native execution or complete playthrough were performed for this
checkpoint. The new source components still require session integration.

The next integration step is a single session host with the original entity
and property-set lifecycle. It must connect clock/frame scheduling, live
navigation registration and sector residency, startup callbacks, HUD binding
and concrete AI/script bodies in their source order. Movement, contact and
physics then support combat, spells, dialogue, quest/enclave events and saves.
Completion requires an original-game playthrough in the browser, including
quest progression and endings. Those delivery requirements remain unfinished.

## 13. Connect entity identity, player storage, script bodies and session order

The next source checkpoint implements several parts of that integration. It
does not supply a complete browser engine host or change the deployed game's
completion status. The parts use the same live entity, property value and SPU
objects. Source records and an independently rendered model do not establish
that an entity has completed its original loading and activation lifecycle.

| Runtime component | Responsibility |
| --- | --- |
| [entity-lifecycle.ts](../../src/gothic3/entity-lifecycle.ts) | Original entity identity registration/rekeying, ordered property-set operations and examined lifecycle/notification profiles |
| [player-properties.ts](../../src/gothic3/player-properties.ts) | One captured PlayerMemory_PS and shared original gCAttribute/gCStat objects, seeded before startup |
| [routine-scripts.ts](../../src/gothic3/routine-scripts.ts) | Examined original ContinueRoutine, Hero routine and state/function prefixes on the existing SPU |
| [session-runtime.ts](../../src/gothic3/session-runtime.ts) | Original session controller and concrete GameApp application frame order, with explicit engine subcalls |

### Retain physical state and complete the loading stages

Original ID registration and world residency are separate operations. An
entity constructor can register its generated ID before Node::Read replaces
it with the serialized ID. Property sets also have a specific order for
setting their owner, receiving OnPropertySetAdded and being appended to the
entity's property-set array. Reflective validity, the property-set flag byte,
entity registration and active world context must each be tracked according
to their own original fields.

Node::Read consumes the 20 serialized ID bytes but clears the live ID's trailing
cache word after copying its first 16 bytes. The raw source ID remains intact
in the provenance record. NavPath reset also preserves a valid original height
cache; its first height calculation uses the live owner's matrix storage.
Its reset uses the recovered entity-pointer NULL proxy overload: release a
cached reference, clear the pointer, then destroy all 20 ID bytes. The
PropertyID overload used by the NPC enclave setter has a different order.

The installation contains separate Ardea NPC contexts with different context
flags. Enabling a sector registry entry alone does not prove that every source
entity in that sector is resident. Template patching, class-specific callbacks,
context activation and engine cache/physics effects remain explicit loading
requirements. The new lifecycle code supplies examined operations for those
objects; it does not activate every indexed entity as a shortcut.

### Share the original player properties

The player-property producer reads the original serialized PC_Hero record,
before OnGameStartUp changes its stats. It retains 15 original attribute/stat
objects, 24 serialized PlayerMemory fields and 51 attribute/stat property values
(75 values in total). A caller can bind the
existing captured PS rather than create another player-state copy.

The 18 startup stat setters use their recovered wrappers and attribute
notification chains. Hit-point and stamina current/max setters have ordering
and clamping behavior which a plain assignment would lose. gCAttribute and
gCStat notifications are different from entity property-set notifications.
Chapter, learning points and other PlayerMemory fields use their examined
paths on the same store. The session tutorial adapter also retains that store.

Startup, HUD, equipment, routines and combat must read these same objects.
This component does not by itself complete inventory population, physical
equipment changes or all attribute-modifier enumeration.

### Execute registered script prefixes on the existing SPU

The serialized Hero has `Routine = Rtn_Player`. Its execution must dispatch
that registered script, while the examined empty-routine NPC branch uses
ContinueRoutine. The new script module retains those identities and uses the
existing scheduler, property stores, instruction state and native frame stack.
It supplies examined routine/state/function bodies and exposes unimplemented
engine effects at their original call positions.

The shared frame API now supports the original Add/SetCount behavior needed
by player function calls. Its explicit successful moving-allocation profile
copies slot values into new physical frame objects; only newly allocated slots receive constructor
defaults. The examined Script Entity wrappers are nonowning field copies; their recovered
copy and destructor behavior must be retained without inventing AddRef/Release
calls. Native allocation and unsupported wrapper branches remain explicit.
Captured arguments must still belong to the same SPU allocation when read or
written after a callback. Reentrant destruction retains the applied prefix
and blocks the next access rather than using a surviving JavaScript object.
Known script branches can advance through their recovered prefix. Missing
player input, animation, targeting, movement or other bodies cannot return a
fabricated completion value.

### Preserve session startup and the application loop

The recovered Start controller performs these steps in order:

1. Stop an existing selected player when the start mode requires it, then
   select the original player and camera entities.
2. Fetch ScriptAdmin, compile navigation with the original force flag, and
   write the session's game-running byte from `compileResult === 1`.
3. Invoke OnInit for modes 0/1 and OnGameStartUp for mode 0. The original
   controller continues this sequence even when compilation returned a
   supported result other than 1.
4. Apply the optional command-line clock hour, factor 12 and ResumeClock,
   then resume the session. The Clock_PS adapter must include its property
   notifications; the arithmetic-only clock does not complete that setter.
5. For a new game, disable the engine component and mute channel 0.
6. Set warmup, perform 20 actual GameApp OnRun calls, and await the host's
   100 ms delay after each call. Clear warmup after all iterations.
7. Close the menu/page, invoke OnReturnFromMenu, play G3_Intro.bik for mode 0,
   restore the component/audio, handle TUT_Start and restore the thread pool.

GameApp's virtual `+0x270` reads that same current session game-running byte.
The routine host adapter and SPU frame input use it. The scaled frame time is
the original stored float32 field; the adapter does not invent an additional
pause or AI switch.

Each warmup frame follows the recovered OnRun/Process order: outer panic
check, optional memory validation, frame-counter increment and inner panic
check, keyboard, mouse, module processing, application OnProcess, entity
processing, module post-processing, physics, entity removal and rendering.
The original byte comparisons and repeated receiver lookups are retained.
The named input/module/entity/physics/rendering subcalls still need concrete
browser implementations. A counter-only warmup is insufficient.

The controller records attempted/applied calls and blocks after an unknown
dependency, retaining its earlier effects. It does not roll back those effects
or restore audio/warmup flags through a cleanup path absent from the original
function. Async browser video and delays must finish before the next source
step. Their timing is a selected browser host profile, not a Win32 capture.
Successful execution of an examined controller remains `gameplayReady: false`.

### Reproduce this checkpoint

```powershell
python -B tools/gothic3/research_entity_lifecycle.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/research_player_properties.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/research_routine_scripts.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/research_session_runtime.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/freeze_lifecycle_checkpoint.py
```

[lifecycle-checkpoint.json](../../assets/gothic3/lifecycle-checkpoint.json)
records current files and deliberate changes from `2637d1e`. The earlier
dispatch/instruction receipts remain historical evidence at their recorded
commits, including the previous shared routine implementation. They are not
rewritten to claim that the extended frame API has unchanged bytes. The new
receipt also records the deliberate `native-properties.ts` addition for the
entity-pointer NULL proxy overload; its existing PropertyID setter is retained.

The offline producers verified these instruction excerpts against the original
PE bytes. Entries include forwarding exports and overlapping bodies, so these
counts are evidence sizes rather than a percentage of the game implemented.

| Evidence set | Entries | Instructions | Original instruction bytes |
| --- | ---: | ---: | ---: |
| Entity lifecycle | 270 | 5,300 | 16,632 |
| Player properties | 383 | 6,088 | 18,846 |
| Routine scripts | 1,013 | 29,182 | 102,962 |
| Session/application order | 49 | 1,058 | 3,727 |

The combined TypeScript check and production build passed locally on 5 October
2026 (`npm run build`, 235 Vite modules). The build retains the existing large
chunk warning. The new modules are source components requiring engine-host
integration; this build does not establish that their session path ran in the
browser. No tests, native execution, browser session or playthrough were run
for this checkpoint. Publishing this source branch does not deploy it.

The remaining delivery work includes complete world activation and browser
engine services, the rest of the original scripts, movement/contact/physics,
animations, equipment, combat, spells, dialogue, quest and enclave chains,
saves, deployment and an original-game playthrough through its endings.

## 14. Read live entities, share Clock_PS and schedule original Hero behavior

This checkpoint extends the lifecycle work above. It supplies examined
TypeScript controllers and original-byte evidence for four more parts of the
runtime. The current browser entry still provides exploration and inspection;
it does not yet bind these controllers into a playable original-game session.

| Component | Source implementation | Current boundary |
| --- | --- | --- |
| Base entity ReadV83 and scalar/name setters | [entity-reading.ts](../../src/gothic3/entity-reading.ts), [entity-setters.ts](../../src/gothic3/entity-setters.ts) | Reflective class factory, full property reads, dynamic/spatial wrappers and active context loading |
| Physical Clock_PS | [clock-properties.ts](../../src/gothic3/clock-properties.ts), [world-clock.ts](../../src/gothic3/world-clock.ts) | Actual module lookup and weather/music/ambient effects, full entity construction |
| Hero state bodies and native input queue | [player-state.ts](../../src/gothic3/player-state.ts), [routine-scripts.ts](../../src/gothic3/routine-scripts.ts) | Full input dispatcher, physical movement, focus search, animation and remaining states |
| Application timing and entity processing | [application-process.ts](../../src/gothic3/application-process.ts) | Resident range construction, ROI/PVS updates, physics, renderer and host scheduling |

### Read the base entity in its original order

ReadV83 consumes the node identity, flags, setters and name before reading
embedded geometry data. Each matrix, box or sphere is one original stream
read of 64, 24 or 16 bytes into the entity's existing embedded storage. Its
three box reads are **world-tree, local-node, world-node**. The later validity
updates have a different order: **local-node bit 19, world-node bit 20,
world-tree bit 21**. Named native getters establish the physical offsets;
similar-looking decompiler field names cannot establish their meaning.

The property-set loop preserves the native accessor's validity-byte check,
dynamic cast, serialized/current version comparison, repeated native-object
lookup, AddPropertySet(false), DEADC0DE sentinel and accessor destruction.
OnPostRead runs before the saved source timestamp is written to the entity's
modified word. Its uniform scaling field is then replaced using the original
world-matrix scaling helper. A completed base Read does not certify that the
enclosing dynamic/spatial load, template patch or context activation completed.

The setters retain their different child-recursion and callback behavior.
Picking/collision update the captured collision-shape property set and then
reread the physics object. Lock's recovered child path invokes picking.
SetName unregisters the previous name, assigns the new name, registers it and
reads Modified in that order. The name registry retains ordered, nonowning
entity pointers, duplicate entries and removal of the last matching pointer.
Allocation, string and finite-float assumptions are explicit supported profiles.

### Use one physical clock property set

The original World_MCP record supplies Clock_PS version 1 with Year 0, Day 0,
Hour 12, Minute 0, Second 0 and Factor 12. The adapter binds those mutable
properties to the same lower clock and exposes a calendar view of those
properties. Session startup, quest time, property setters and processing must
use that same object.

Clock setters preserve Enter, assignment and Exit notifications. A
nonpropagated Exit constructs the original time/date scratch fields, calls
bCClock.Set, then rereads Factor for Adjust with 86,400 seconds/day and
365 days/year. The derived Read hook is implemented separately from the
reflective loader that must populate the property set first.

Processing obtains the lower clock date, compares the old published Hour's
daytime, and directly publishes Year/Day/Hour/Minute/Second without setter
notifications. It computes and sends weather time, then, on a daytime change,
captures Ambient before looking up Music and calls Music before Ambient.
Captured receiver pointers and arguments survive consumer callbacks. An absent
host implementation remains unknown; a proven null native module takes the
original skip branch. The weather scalar setter can write supplied actual
admin storage, while module creation and the remaining consumer behavior still
need implementations.

### Drive Hero states through the original queue and SPU

PS_Normal_Loop consumes the module's native action queue and shared movement
flags. Its recovered signals include Jump 54, Sneak 74, weapon toggle 65,
quick slots 128–137 and use 60. A browser key mapping may choose those events
under an explicit host profile; this does not recover the installed game's
active user keyboard configuration or complete its input dispatcher. Recovered
default mappings are evidence for that selected configuration branch; custom
settings and the live browser device/event adapter still need binding.

The local study has no decompiled C body for PS_Normal_Loop. Its available
assembly range and original PE bytes supply the evidence for this body; the
checkpoint records that assembly-only entry explicitly.

The new adapter installs examined bodies on the existing routine scheduler.
It shares the Hero's property sets and original attribute/stat objects.
Ordinary movement can write the same Navigation and CharacterControl wished
movement modes. Those wishes still require the original physical movement
controller, collision and animation to move the Hero correctly.

The Jump state constructs its original 340-byte argument object and script
frame, preserving callback inheritance, captured nonowning entity wrappers and
destructor/delete order. The examined CanJump=false branch completes. The
true branch retains the original pose, action, animation-state, queue and
movement/stamina prefix before stopping at unresolved animation calls.
Focus lookup, talking, taking, fighting and other states retain their explicit
dependencies. Recovering a state prefix does not make that player action fully
playable.

### Publish frame time at the successful render tail

The concrete GameApp inherits an **empty OnProcess**. Application timing is
updated by UpdateTick at the end of a successful DoRender, after OnPostRender
and the final fogging disable. Processing earlier in the frame consumes the
previously stored frame/scaled seconds. A browser adapter that calculates a
new RAF delta inside OnProcess would change this order.

The timing implementation retains the original timer GetTime/Reset sequence,
smoothing, fixed frame time, single step, bounds, pause-override fields and
float32 stores. x87 precision and rounding are selected profiles; they are
not a captured native FPU environment. Browser scheduling must provide the
ordered timer/Sleep effects and preserve renderer early returns.

EntityAdmin starts with processing disabled, and CreateEngine later sets it
from the concrete engine setup's byte at offset 0xc6. Range updates still run
when processing is disabled. With processing enabled, the original controller
copies its ordered range array, adds references to every snapshot entity,
then runs pre/process/post for each eligible entity before releasing all
snapshot references. Dynamic property traversal rereads the application pause
state and invokes actual property-count/accessor callbacks. The clock adapter
delegates to the same physical Clock_PS, and routine processing uses the same
embedded SPU and stored application timing.

Rendered or indexed entities do not establish this range membership. A complete
session needs original context residency, cache/physics setup and the
ROI/PVS/hysteresis/exit/enter updates before this dispatch tail.

### Reproduce and retain the current evidence

Run the producers against the preserved local study on this source revision:

```powershell
python -B tools/gothic3/research_entity_reading.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/research_clock_properties.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/research_player_state.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/research_application_process.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/freeze_processing_checkpoint.py
```

[processing-checkpoint.json](../../assets/gothic3/processing-checkpoint.json)
chains from source commit `08cf0580`. It pins the four new namespaces and the
intentional shared changes to world-clock, routine-script dispatch and the
session timing comment. It also records this guide, its documentation index
link and byte-preservation attributes. Earlier receipts remain evidence at
their recorded commits; they do not claim unchanged bytes for extended shared
implementations.

The producers compare the examined instructions with original PE bytes and
preserve the source excerpts and hashes. Those evidence counts describe the
examined code, including forwarding entries and overlapping bodies. They do
not measure how much of the full game is implemented.

| Evidence set | Entries | Instructions | Original instruction bytes |
| --- | ---: | ---: | ---: |
| Entity reading/setters | 64 | 1,865 | 5,758 |
| Physical clock properties | 150 | 1,045 | 3,436 |
| Hero state/input prefixes | 152 | 11,357 | 39,010 |
| Application timing/entity processing | 133 | 3,421 | 11,912 |

The final combined TypeScript check and production build passed locally on
5 October 2026 (`npm run build`, 235 Vite modules). The existing large-chunk
warning remains. Source/excerpt hashes and local documentation links were
checked. No tests, original native execution, browser session, deployment or
playthrough were run for this checkpoint. The new controllers still require
browser-host integration.

The remaining delivery requirement is a connected browser runtime with the
original world activation and gameplay services, followed by a complete
original-game progression and save/load playthrough. This checkpoint keeps
`gameplayReady: false`.

## 15. Execute live startup and connect physical model state

The next source checkpoint continues the runtime work above. Its purpose is to
connect the original callbacks to retained objects: the same loaded property
sets, player queue, movement fields, script processor and animation skeleton.
It adds implementations of selected native paths, with the remaining engine
operations required explicitly from their hosts. The current browser entry
point still uses the exploration controller and inspection tools. These new
components are not yet bound into a playable session.

### Execute startup in original order

[startup-controller.ts](../../src/gothic3/startup-controller.ts) implements the
live call order of `OnInit` and `OnGameStartUp`. The atomic planner in section
10 remains a separate planning API. For runtime execution, each original call
acts on the current objects; a failed or unresolved call retains preceding
effects and prevents automatic replay. A host callback may have applied effects
before reporting that it cannot finish.

`OnInit` constructs its local Self/Other wrappers, then invokes the original
twelve module helpers. Its movement reset changes the seven bytes in the same
[NativePlayerControls](../../src/gothic3/player-state.ts) used by the Hero
handlers. The queue reset changes its first three bytes, then reaches the
original array destruction/free boundary. Existing records are cleared after
a confirmed release. A NULL storage pointer preserves the original metadata.
The pending signal, argument and Other at offsets `+164/+168/+16c` are retained:
the native helper does not clear them. The remaining helper bodies require
their actual module storage and allocation operations.

`OnGameStartUp` clears the two imported Entity caches when allocated, zeros the
last-frame counter and assigns None to the imported player cache. It then
captures the real player and applies Chapter 1. The dirty-hack callback copies
the Al Shedim door's matrix and lowers its Y translation by 50 native
centimetres through the original world-matrix setter. It also sets Yepas's
political alignment to 7 when his NPC wrapper is valid. The original door
warning is deliberately repeated when Yepas is missing or invalid.

The following calls retain their original sequence: Larson's `Start` routine;
Ardea's alignment, raid and revolution setters; `NotifyEnclave` event 2 with
Hero Self and Ardea_Orkboss Other; world `RunQuest Xardas_FindXardas`; Gorn's
`OnExit_Gorn`; the eighteen stat setters; zero attribute learning points; and
`InventoryPopulate`. Direct stat and inventory calls pass the captured player
and explicit global None. They do not introduce another SPU state frame.

The scalar PlayerMemory adapter delegates to the already retained
[OriginalPlayerMemory](../../src/gothic3/player-properties.ts), including its
property notification chain. It requires the captured wrapper's actual PS
pointer; a NULL pointer reaches the original warning callback without a property
write. Full stat-wrapper fallback branches,
entity lookup/AttachTo, native allocation, navigation, enclave, quest, inventory
and world-matrix effects remain required host implementations. A completed
ordered callback alone does not establish a completed game session.

### Construct real property objects before adding them to entities

[entity-reflection.ts](../../src/gothic3/entity-reflection.ts) follows the
serialized accessor, registered class factory and property-wrapper path used
by the base entity reader. The accessor, singleton, factory and wrapper each
consume their own header fields; reading one layer does not imply that the next
object exists. A source class
name selects a registered factory, whose actual template/clone operation must
create the concrete object before its reflective and native readers can run.

The bounded Clock path retains one physical
[OriginalClockProperties](../../src/gothic3/clock-properties.ts), including its
values and reference word. Reflective properties dispatch the real descriptor
reader, notify enter, resolve the captured wrapper's current native storage,
write the payload, then notify exit. Clock's derived `Read` follows and applies
its nonpropagated notification. The normal property reader consumes the stored
size field without using it to skip or bound a successfully dispatched reader.

The original Hero's nineteen property-set records and the World_MCP records
provide schemas and serialized inputs. Unsupported constructors/readers stop
at their native boundary. A detached, successfully read Clock is still not a
resident world entity; preceding property sets, entity addition, context
activation, cache/physics residency and processing registration remain separate
operations.

### Change the shared movement state through native operations

[movement-state.ts](../../src/gothic3/movement-state.ts) retains the actual
CharacterMovement byte store and its known-byte mask. Its movement mode is the
same DWORD at `+100` read by the Hero scripts. Navigation and CharacterControl
wishes continue to use their existing storage. No second movement mode or
exploration position is substituted.

The recovered `SetMovementMode` performs its dependency creation, shape,
speed, rigid-body flag/velocity and effect operations before writing the mode.
Jump sets the captured rigid body's upward velocity before publishing mode 6.
The mode-change callback and trailing resets follow in source order. Ordinary
branches are bounded by their recovered conditions; unsupported swim, fall,
contact and effect paths require their real implementations.

The callback captures the actual ScriptAdmin dispatcher before rereading the
owner. Its host must preserve the game/processing gates, embedded admin SPU
updates and installed script registration. The incoming Hero SPU cannot stand
in for that admin processor, even when the selected callback body returns 1.

Rigid-body flag assignments and pending physics commands preserve the
examined physical stores and queue ordering. Sensor and translation prefixes
require the original collision, ray/floor and actor services. These operations
do not establish full browser physics or convert a rendered mesh into a native
collision shape.

### Select the original animation descriptors and tracks

[animation-state.ts](../../src/gothic3/animation-state.ts) uses the installed
program's action, phase, pose and direction definitions. The installed action
table identifies action 54 as Jump; the Hero jump script requests `Jump_Stand`
then `Fall_Loop`. Naming and selection use the live actor prefix, animation
state, equipment UseTypes, pose and direction, followed by the native variation
and resource lookup rules.

Recovered motion tracks bind to the existing Hero skeleton through
[native-motion.ts](../../src/gothic3/native-motion.ts). Its added `sampleAt`
entry samples an explicit time without applying the inspector's modulo loop,
while retaining sparse channels, base-pose values and endpoint clamping. The
existing inspector controls keep their previous playback behavior.

Native playback descriptors, loop counts, animation layer operations,
repositioning and weighted locomotion selection remain distinct from sampling
one full-weight clip. The longitudinal/strafe axis helpers use original
filename speeds; the diagonal combiner, synchronized layers and footsteps
remain dependencies. The PlayAni instruction conductor preserves continuation
and cleanup order, while its Start and internal-loop bodies require actual
VisualAnimation/actor services. Resource identity lookup does not manufacture
ResourceAdmin cache lifetime or loaded-actor motion membership. Exporting the
Jump/Fall tracks and sampling their bones does not prove that the player's
movement and animation are connected in the browser.

At source checkpoint `4252aa9a`, the SPU could expose its instruction pointer and, inside a live scheduler
scope, its wait fields. It did not yet provide the PlayAni completed byte or
animation scratch/descriptor fields. A complete PlayAni storage binding was
therefore missing. A cloned SPU snapshot could not supply that shared storage;
the missing fields, proxy cleanup, polling and abort adapter needed to join the
existing processor before this conductor could drive gameplay.

Section 16 implements that shared storage and instruction binding. It still
requires actual loaded actor and engine services before browser gameplay.

### Reproduce this source checkpoint

The four producers read the preserved local study and compare their examined
instructions with original binary bytes:

```powershell
python -B tools/gothic3/research_startup_controller.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/research_entity_reflection.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/research_movement_state.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/research_animation_state.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/freeze_activation_checkpoint.py
```

[activation-checkpoint.json](../../assets/gothic3/activation-checkpoint.json)
chains from source commit `48c7ee73` and its processing receipt. It preserves
unchanged baseline bytes, the new source/resource receipts and the intentional
shared changes to player controls and motion sampling. Older receipts remain
historical at their recorded commits. The freezer checks local source/excerpt
hashes; it does not run the game, tests, a browser, a build or a deployment.

The offline evidence totals for this checkpoint are below. Entries can include
forwarding exports and overlapping bodies; these counts do not measure game
completion. Three movement entries are preserved only as assembly excerpts;
no decompiled C counterpart is asserted for them.

| Evidence set | Entries | Instructions | Original instruction bytes |
| --- | ---: | ---: | ---: |
| Ordered startup callbacks | 69 | 3,034 | 10,360 |
| Entity reflection and property registrars | 996 | 28,412 | 108,725 |
| Physical movement and pending physics commands | 162 | 11,210 | 39,176 |
| Animation selection and instruction conductor | 109 | 8,741 | 28,248 |

The combined TypeScript check and production build passed locally on
5 October 2026 (`npm run build`, 235 Vite modules). The existing large-chunk
warning remains. This build checks the new source types and packages the
current browser entry points; it does not connect the new controllers. No
tests, original native execution, browser review, deployment or playthrough
were run for this checkpoint.

The required next integration is still one actual loaded and active world,
with its player, camera, input, startup, script/AI scheduling, clock, collision,
animation and renderer sharing the same runtime objects. Original gameplay,
save/load and progression through the endings remain unfinished. This source
checkpoint keeps `gameplayReady: false`.

## 16. Bind animation instructions and read physical Hero properties

This checkpoint builds on `4252aa9a`. It connects the recovered PlayAni
conductor to the existing script processor and implements concrete factory/read
paths for the Hero's Navigation and CharacterMovement property sets. The
browser entry point still uses the exploration controller; these components
require the original entity, actor, resource and physics services before they
can own a playable world.

### Retain the actual SPU animation fields

[script-routine.ts](../../src/gothic3/script-routine.ts) now retains the
completion byte, VisualAnimation pointer, embedded motion descriptor, animation
name, wait-for-fade flag and phase state in the same `NativeScriptProcessingUnit`
as the scheduler. The descriptor has seven physical fields at `+134..14c`.

The original fresh constructor gives that descriptor fade-in `0.3f`, mode 0,
speed 1, unsigned loop count `0xffffffff`, weight 1, fade-out 0 and blend mode 1.
Its `Invalidate` clears the completion byte and VisualAnimation pointer, clears
the name, and resets wait elapsed. Neither body initializes `+158`, `+15c` or
`+164`; their values remain unknown until an original write occurs. The factory
adapter supplies the proven completed constructor state. It does not replay
`Invalidate` on an existing loaded processor.

[animation-spu.ts](../../src/gothic3/animation-spu.ts) exposes one persistent
field facade and one persistent embedded descriptor for each bound processor.
Every getter and setter requires the current scheduler scope for that same
processor. Snapshot copies remain diagnostic data. The descriptor passed to
`PlayMotion` is the same object whose fields subsequent original calls can
change; it is never substituted with a descriptor snapshot.

Initial PlayAni invocation, `ProcessScript` polling at `2001c76f`, and
`FullStop` abort share that conductor, physical storage and
[NativeInstructionProxyRegistry](../../src/gothic3/script-instructions.ts).
The proxy reader supports retained live internals and zero IDs. Lazy resolution
of a nonzero ID and destroyed owners still require the original EntityAdmin
and lifetime services. Failed engine callbacks retain preceding writes and
prevent automatic replay.

### Execute Start and the internal loop

[animation-instruction.ts](../../src/gothic3/animation-instruction.ts) ports
the installed `sAIPlayAniStart` and `sAIPlayAniItlLoop` bodies. Start assigns
the instruction proxy, follows the original resource fallback candidates,
updates the actual NPC CurrentAni field, stops/fades the relevant existing
layers, sets and releases resource references, writes the shared descriptor,
and reaches `PlayMotion` and motion-owner changes in source order. Optional
Other playback can change that same captured descriptor after Self playback.

The internal loop preserves the timer gate, repeated actor speed/time reads,
overlay completion branches, movement-disable calls and Begin phase handling.
Begin's state script captures the ScriptAdmin virtual slot before the next
proxy read and dereferences the slot at invocation afterward. A successful
name/catalog lookup does not supply resource-cache ownership, actor loaded
membership or an animation layer implementation.

`connectOriginalAnimationSPU` composes those actual bodies with the conductor;
it supplies the shared proxy and storage operations and requires concrete actor
services for the remaining engine calls. `originalPlayerAnimationPort`
connects that binding to the original Hero
[_AI_Jump handler](../../src/gothic3/player-state.ts). Jump now calls the
actual GetAni path for action 54/phase 12, invokes PlayAni with duration 0 and
returns AL 0 while pending. Its next stage requests action 57/phase 5 and
duration -1. It resumes through the original frame labels rather than advancing
both animations in one call. A rendered clip or elapsed browser time alone
cannot satisfy those instruction results.

### Create and read concrete Navigation and Movement objects

The shared [reflection controller](../../src/gothic3/entity-reflection.ts) now
dispatches a registered factory's actual virtual reader and version. It has
metadata-only base-root registration, separate from factory registration; an
empty inherited property table does not claim a concrete constructor exists.
Shared wrapper/default/property-reader helpers retain their iterator,
reference-count and notification order. The newly selected read profile is a
fresh initialized wrapper; a repeat read is not silently treated as a fresh
object.

[navigation-reading.ts](../../src/gothic3/navigation-reading.ts) constructs
the native Navigation object, initializes original descriptor defaults, and
reads the Hero's actual reflective records and modern native tail. Its state,
numeric fields and wished movement refer to the same retained stores used by
the navigation and Hero handlers. Source constructors and Invalidate write
only their proven bytes; unrelated bytes remain masked as unknown.
The movement wish aliases physical `+218`; the separate `+21c` field is not
used as a substitute. The native tail consumes version 37 while this class's
virtual `GetVersion` returns 1.

Default PropertyID creation still invokes the original GUID generation
boundary, even when a later serialized field replaces that default. The port
requires the actual captured GUID scratch writes and preserves the ignored
HRESULT behavior. A browser entropy adapter must declare its own profile.
OnAdded/Removed use the existing navigation lifecycle; full PostRead/GameReset
and owner/context effects remain required services.

[movement-reading.ts](../../src/gothic3/movement-reading.ts) constructs and
reads the Hero's CharacterMovement object into the same
[NativeMovementBytes](../../src/gothic3/movement-state.ts) used by its native
operations. Bit masks retain constructor OR writes without asserting that the
other bits were initialized. Whole-byte reads continue to reject unknown bits.
Embedded animation/effect resets require the actual application total-time
store and captured effect-module service. They are not supplied with a guessed
zero timestamp or a presumed missing module.
The class has 36 registered scalar descriptors; the installed Hero packet
serializes 35. `TreatWaterAsSolid` keeps its factory default when absent from
that packet. The selected modern native tail consumes version 76 without
calling the older migration/reset path. The installed class's virtual
`GetVersion` returns 77 and its property-set selector is `0x15` (21); these
values are separate from the stored packet version.

The Hero records begin with Navigation, RigidBody, CollisionShape and
CharacterMovement. A detached factory/read of the first or fourth record does
not permit the entity reader to skip the intervening unresolved factories.
All nineteen original property sets, their native tails, owner additions and
world activation still need to finish before the Hero is resident and can be
processed in the browser.

### Reproduce and integrate the checkpoint

```powershell
python -B tools/gothic3/research_animation_instruction.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/research_navigation_reading.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/research_movement_reading.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/research_animation_spu.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/freeze_actor_checkpoint.py
```

The [actor reading checkpoint](../../assets/gothic3/actor-reading-checkpoint.json)
preserves the prior activation receipt, unchanged source/resource bytes and
the current implementations' source/evidence pins. Older receipts remain
historical at their recorded commits.

The producers checked these selected instructions against the original PE
bytes. Entries can include forwarding exports and overlapping bodies; these
counts describe the examined evidence and do not measure game completion.

| Evidence set | Entries | Instructions | Original instruction bytes |
| --- | ---: | ---: | ---: |
| Shared SPU fields, proxies and Hero Jump | 45 | 1,164 | 3,670 |
| PlayAni Start and internal loop | 90 | 2,941 | 8,920 |
| Navigation factory, defaults and readers | 767 | 11,194 | 33,630 |
| CharacterMovement construction and readers | 449 | 6,346 | 21,718 |

The combined TypeScript check and production build passed locally on
5 October 2026 (`npm run build`, 235 Vite modules). The existing large-chunk
warning remains. This checks the new source types and packages the current
browser entry points; it does not connect these readers or animation services
to a playable world. No tests, original native execution, browser review,
deployment or playthrough were run for this checkpoint.

Remaining work includes the intervening Hero factories, full world loading and
activation, actual actor/layer/resource lifetimes, collision/contact processing,
camera/input, script registry and story services, save/load restoration, and
original progression through the endings. This checkpoint keeps
`gameplayReady: false`; compilation does not establish full gameplay or online
deployment.

## 17. Restore the Hero's physics records and enclosing entity read

This checkpoint follows the actual first four Hero records in source order:
Navigation, RigidBody, CollisionShape and CharacterMovement. It adds the two
intervening factories and a controller for the enclosing installed
`gCEntity.Read` sequence. All nineteen property sets, their owner callbacks,
template patching, children and active world membership still have to finish.

### Keep the complete original record and its separate hierarchy

[hero-record.json](../../assets/gothic3/entity-loading/hero-record.json) retains
the actual 8,485-byte `PC_Hero` record, original indexed strings and the nineteen
packet boundaries. It comes from the winning `Projects_compiled.p00` entry:

```text
G3_World_01/
  SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}/
    SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}.lrentdat

PC_Hero source index: 371
Record: [1183912, 1192397), end exclusive
SHA256: 8b0478a57152023598a3d93550151d623d58fc6d49d90b3ea505a2202efa5e8b
Versions: game64 / dynamic83 / entity83 / node1
World translation, centimeters: 87984.9375, 5145.56396484375, -10197.4775390625
```

The original archive header declares 26,927 entity records. The existing
gameplay metadata retains 24,811 after property-set filtering; those counts measure
different stages of preparation. The new producer checks the original count
directly at file offset 148 and pins each selected source record against its
original bytes.

`RootEntity` index 370 is the Hero's parent. `Head_Player` index 372 and
`Body_Player` index 373 are separate children, each with Item, Interaction and
VisualAnimation property sets. Their original nearby records are retained too.
The parent links `[370,371]`, `[371,372]`, `[371,373]` are stored separately in
the archive metadata. Reading the Hero record does not populate its child array
or attach the original layer context. The graph loader must perform those
operations through the existing native lifecycle.

### Preserve real physics object identity

| Original object | Hero packet index | Virtual version | Native tail version | Property-set selector |
| --- | ---: | ---: | ---: | ---: |
| `eCRigidBody_PS` | 1 | 65 | 65 | 13 |
| `eCCollisionShape_PS` | 2 | 63 | 63 | 14 |
| Two nested `eCCollisionShape` objects | inside packet 2 | 74 | 74 | not entity property sets |

[rigidbody-reading.ts](../../src/gothic3/rigidbody-reading.ts) constructs and
reads the original rigid-body object and inherited `PhysicsEnabled` field.
Thirteen leaf descriptors plus that inherited descriptor account for the
fourteen serialized properties. The native body flags and StartVelocity alias
the same physical storage used by
[NativeOriginalRigidBody](../../src/gothic3/movement-state.ts). A second copied
velocity or flags object would leave later movement reads stale.

The native tail has its own version-gated flag, vector and pose reads; it does
not silently call a generic base reader or reset the object afterward.
OnAdded's non-template branch requires the actual owner transform and original
temporary quaternion lifetime. Original scene buffers and any live PhysX actor
remain required services for their corresponding operations.

[collision-reading.ts](../../src/gothic3/collision-reading.ts) reads the five
CollisionShape_PS descriptors, then constructs and reads the two actual nested
shape accessors. Each shape has fifteen reflective properties and its own
version-74 native payload. Fresh construction initializes the shape arrays;
Read uses its original AddShapeInternal path and destroys the temporary
accessors in order. Decoded dimensions alone do not supply live collision registration or
the original contact processing service.

The same CollisionShape_PS object also supplies the existing movement and
entity-setter interfaces. Picking/collision notifications write its actual
IgnoredByTraceRay/DisableCollision bytes. Local notification Exit also requires
the original temporary CString comparisons and destruction; a direct JavaScript
name comparison cannot skip those calls. ClearTouchingShapes clears its original
byte and releases the separate proprietary-shape array in source order; it does
not erase the loaded ordinary shapes. Final-reference destruction still needs
the corresponding concrete lifetime service.

The shared [reflection controller](../../src/gothic3/entity-reflection.ts) now
retains both entity property sets and actual non-property-set reflected objects.
A nested shape has its own native identity, value storage, reference word and
nullable physical wrapper slot. Its persistent factory/wrapper capability is
separate from that slot. A factory must explicitly identify its non-property-set
category; only that retained source-backed object can produce a known failed
cast to `eCEntityPropertySet`. An unfamiliar object keeps its cast unresolved.
The shape's reflected parent is NULL at the original `bCObjectRefBase` end
sentinel; its C++ inheritance still supplies the native reference methods.

The inherited `IsProcessable` virtual for Navigation, RigidBody and
CollisionShape clears native AL and returns false. The Navigation factory now
uses that examined result. Actual world processing is governed by the original
membership and processable property sets; these three factories do not certify
that membership.

### Execute the enclosing read without omitting its patch tail

[entity-loading.ts](../../src/gothic3/entity-loading.ts) composes the existing
[entity reader](../../src/gothic3/entity-reading.ts),
[native setters](../../src/gothic3/entity-setters.ts), reflection controller and
[property lifecycle](../../src/gothic3/entity-lifecycle.ts) over the same live
entity. Its selected installed path is:

```text
gCEntity.Read: consume64
  eCDynamicEntity.Read: consume83
    read creator-present flag
    if present: read creator GUID16 and serialized cacheDWORD; clear live cache
    OR embedded dynamic word+1bc with1
    eCEntity.Read: consume83, dispatch ReadV83
      read Node identity and header using real setters
      read/add all19 original property sets and their DEADC0DE sentinels
      execute inherited Dynamic.OnPostRead property traversal
      restore original timestamp; derive scaling from original world matrix
    if creator present: query actual IsEntityPatchingEnabled
    if native AL is exactly1: PatchWithTemplate(current creator,true)
    AND embedded dynamic word+1bc withfffd
    return1, preserved by the Game wrapper's epilogue
```

The creator is the embedded `bCPropertyID` at entity `+1a8`, not a reference-owning
entity proxy. Its reader transfers the GUID, consumes the serialized cache word
and zeros the live cache. The patch flag is an actual engine setting. It cannot
be inferred from the Hero packet. Template lookup and patch observers remain
explicit services even though Dynamic.Read ignores PatchWithTemplate's bool
return.

The selected Game vtable inherits `eCDynamicEntity.OnPostRead`; its actual slot
and import are pinned by the producer. The controller uses the existing ordered
property traversal and each class's real callback. World scaling still requires
the original GetPureScaling math profile: the examined code spills each sum of
squared basis components to float32 before its CRT square root. A generic scene
decomposition or an assumed scale of 1 does not supply that operation.

This reader accepts an already constructed original entity. Construction
evidence identifies the actual dynamic-layer callback, which allocates the
`gCEntity`, invokes Create and registers its generated ID before Node.Read
replaces it. The constructor requires original GUID generation, a frustum
timestamp and the live SceneAdmin construction counter. Those services are
still separate integration work. Source evidence also preserves the original
invalid-box sentinels and sphere layout: sphere radius is `-F32_MAX` with zero
center components, rather than four zero fields.

A missing factory or service preserves the stream cursor, retained allocations
and preceding writes, then blocks automatic replay. It cannot skip a packet,
choose a disabled patch setting or report world residence. Completing this
read alone still does not perform child attachment, cache-in, physics/PVS
registration or processing-range activation.

### Reproduce this source checkpoint

```powershell
python -B tools/gothic3/research_entity_loading.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/research_rigidbody_reading.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/research_collision_reading.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/freeze_physics_checkpoint.py
```

The [physics reading checkpoint](../../assets/gothic3/physics-reading-checkpoint.json)
chains the actor checkpoint at `a81549c8`, verifies unchanged baseline files and
records intentional shared-source updates. Older receipt hashes stay historical.
The inherited PhysicsEnabled registrar absent from the exported C catalog is
identified explicitly as original PE assembly evidence; it is not presented as
a decompiled C function.

These producers inspect source and original program bytes offline. They do not
execute the installed DLLs. The selected evidence includes forwarding exports
and overlapping bodies; these counts describe examined entries, not game
completion.

| Evidence set | Entries | Instructions | Original instruction bytes |
| --- | ---: | ---: | ---: |
| Enclosing entity read, factory context and complete Hero record | 79 | 1,340 | 4,548 |
| RigidBody construction and reading, including one ASM-only registrar | 559 | 6,050 | 18,676 |
| CollisionShape_PS and nested original shape objects | 2,297 | 36,704 | 114,000 |

The combined TypeScript check and production build passed locally on
5 October 2026 (`npm run build`, 235 Vite modules). The existing large-chunk
warning remains. This checks source types and packages the current browser
entry points. The new original readers still require connection to the live
application and their remaining concrete services. No tests, native execution,
browser review, deployment or playthrough were run for this checkpoint.

This work keeps `gameplayReady: false`; the full playable browser game and its
deployment remain unfinished.

## 18. Construct the original entity and restore Control/Sensor

The next source checkpoint adds the actual custom entity factory and the next
two Hero property factories. These are prerequisites for loading the original
Hero as a live engine object. The current browser entry still uses its existing
exploration controller; it does not yet execute this construction/read pipeline.

### Follow the constructor before reading serialized state

[entity-construction.ts](../../src/gothic3/entity-construction.ts) retains one
entity, owner, embedded arrays and dynamic creator store through this sequence:

```text
successful new(0x1c0,0x170)
  RefBase constructor: wrapper NULL, reference word1
  Node: empty child storage; PropertyID constructor; CreateRandom; parent NULL
  Entity: embedded no-store math constructors; empty name/property storage
    frustum defaults; actual timestamp service
    Invalidate: property bits/pointer/flag masks; current shared identity matrices
      invalid box/sphere sentinels; name clear; remaining scalar defaults
  Dynamic: creator ID; ordered word/flag masks; context NULL
    clear creator; increment captured live SceneAdmin construction counter
  Game final vtable
  virtual Create: validity high bit, frustum owner, property comparator
  fresh SceneAdmin getter for NULL check
  if non-NULL: second fresh getter; RegisterEntity with generated constructor ID
```

The allocator's second argument is recorded without inferring its meaning.
The original NULL allocation path subsequently dereferences NULL; this
implementation has an explicit successful-allocation profile. A missing
constructor service stops with the preceding writes retained. Its diagnostic
copies expose only initialized fields and masks; a partially constructed
entity or owner capability is not returned to the world loader.

Node's temporary GUID has sixteen initially unknown bytes. Its constructor
initializes only the validity byte. Generate calls the external CoCreateGuid
service, ignores HRESULT, sets validity, and CreateRandom copies the actual
GUID bytes while clearing the cached DWORD. The browser service uses browser
UUIDs with native GUID field byte order. It is a replacement platform service,
without a claim to reproduce the installed Windows generation algorithm.

The timer uses the already documented selected monotonic uint32 millisecond
profile. The original QueryPerformanceCounter quantization and origin were not
captured. SceneAdmin's live construction counter increments with uint32 wrap;
it is never reset or replaced by a captured counter value. Its constructor
getter and the factory's two conditional getters remain distinct calls.

The source timestamp at entity `+130` has one physical backing:
`entity.propertyOwner.modifiedWord`. Existing ReadV83 and notification callbacks
use that same store. Frustum timestamp `+15c` remains separate. Original
read-only float constants are checked against their PE bytes and section
permissions. The identity matrix is a mutable lazy module cache and has a real
shared implementation, rather than an assumed constant matrix.

### Preserve Control's owner effects and Sensor's shared movement data

| Original property set | Hero packet | Selector | GetVersion | Packet bytes including sentinel |
| --- | ---: | ---: | ---: | ---: |
| `gCCharacterControl_PS` | 4 | 22 | 2 | 223 |
| `gCCharacterSensor_PS` | 5 | 23 | 2 | 101 |

[control-reading.ts](../../src/gothic3/control-reading.ts) reads the five
reflective descriptors and original derived tail. Its wished movement and
pressed-event facades use its actual physical fields. Current enum defaults
and the shared Matrix.GetIdentity guard/cache belong to one retained module
state. A cold original image and a supplied live module state are distinct
profiles. Lazy initialization records its guard and sixteen DWORD writes before
the original CRT destructor registration attempt; its ignored native return is
preserved. The registered destructor's original body is a literal RET absent
from the exported C catalog, so the receipt records it as assembly evidence.

Control's virtual SetEntity first performs inherited owner assignment and then,
for a non-NULL incoming owner, calls that same entity's DisableProcessing(false).
The property lifecycle now dispatches this real override during add/remove.
The new connector maps the actual entity to its retained data and invokes the
existing entity setter. The constructor's matrix connector also reads Control's
same module cache through live indexed getters at each copy step.

Movement contact queries using selector 22 now have CharacterControl names.
PlayerMemory is selector 60. The literal contact query remains 22; its name
must identify the actual queried class for later integration.

[sensor-reading.ts](../../src/gothic3/sensor-reading.ts) has no reflective
fields. Its version-2 tail consumes three raw vectors, four bool bytes and one
raw 28-byte goal-position/quaternion block in source order. The movement pointer
is not serialized. Constructor and Invalidate defaults preserve known masks and
Quaternion.Clear's original XYZ=0/W=1. The movement facade shares the same
physical vectors, quaternion, flags and nonowning movement capability used by
the actual property set. Full ProcessPlayerMovements remains a required body
service, including its real collision/control/navigation/application calls.

Inherited added/removed/post-read callbacks and processable results are taken
from their examined bodies. Source-empty inherited callbacks do not establish
physics or world services. Lifecycle guards now stop immediately after an
unsupported callback reentry, retaining the attempted prefix before any later
OnAdded/reference/append/flag operations.

### Reproduce and integrate the checkpoint

```powershell
python -B tools/gothic3/research_entity_construction.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/research_control_reading.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/research_sensor_reading.py --study <LOCAL_GOTHIC3_STUDY>
python -B tools/gothic3/freeze_construction_checkpoint.py
```

The [construction reading checkpoint](../../assets/gothic3/construction-reading-checkpoint.json)
chains the physics source at `cce28354`, verifies retained baseline files and
pins the intentional lifecycle/contact API changes. Older receipts keep their
original source hashes and reproduction revisions.

| Evidence set | Entries | Instructions | Original instruction bytes |
| --- | ---: | ---: | ---: |
| Custom entity construction and factory | 67 | 584 | 2,180 |
| CharacterControl, including one ASM-only destructor | 196 | 2,963 | 9,442 |
| CharacterSensor construction and reading | 243 | 3,879 | 11,997 |

The final combined TypeScript check and production build passed locally on
5 October 2026 (`npm run build`, 235 Vite modules). The existing large-chunk
warning remains. This checks source types and packages current browser entry
points; the new pipeline is not yet invoked by the browser. No tests, native
execution, browser review, deployment or playthrough were run for this
checkpoint.

The first six Hero factories now have separate source implementations. They
still need one connected application with the remaining thirteen factories,
their callbacks and full template/graph/context services. Subsequent work must
connect construction and all nineteen property reads to world cache, physics,
PVS and processing activation, then original input, scripts, story, combat,
inventory, animation and save/load restoration. Browser progression through the
original endings and successful online deployment remain unproven.

This checkpoint keeps `gameplayReady: false`; it does not establish a playable
or fully deployed game.

## 19. Restore the Hero's NPC, inventory and script state

The next three property sets in the same original Hero record are NPC,
Inventory and ScriptRoutine. Their factories and readers extend the source
work in section 18. Their required services must execute the actual recovered
bodies before these objects can participate in the browser game's world.

| Property set | Hero packet | Relative record bytes, including sentinel | GetVersion | Type selector |
| --- | ---: | --- | ---: | ---: |
| `gCNPC_PS` | 6 | `[2615,3266)` — 651 bytes | 78 | 30 |
| `gCInventory_PS` | 7 | `[3266,3677)` — 411 bytes | 9 | 31 |
| `gCScriptRoutine_PS` | 8 | `[3677,3922)` — 245 bytes | 1 | 45 |

These offsets refer to the original 8,485-byte `PC_Hero` record documented in
section 17. They do not describe an already initialized player, a saved game
or world residency.

### NPC defaults, read and Enclave proxy

[npc-reading.ts](../../src/gothic3/npc-reading.ts) constructs the concrete NPC
allocation and its 43 reflective fields. The same physical values back its
`NativeLivePropertySet` and `OriginalEntityPropertySet` notifications. The
notification owner follows the current live entity pointer. The Enclave
property ID at native `+50` and its embedded proxy at `+1c4` are distinct
storage; the callback updates that same proxy.

The Enclave descriptor default calls `bCPropertyID.CreateRandom`. It requires
the actual source-equivalent GUID service at that call site. The later
serialized read can replace that generated default. Current enum globals and
uninitialized pose fields retain masks; a missing initialized bit must not be
read as a fabricated zero.

The derived NPC reader always consumes its native `u16`, then writes
`ManaUsed+158=0`. Its post-read callback clears the nonserialized DWORD `+1a4`,
updates the existing Enclave proxy from the current Enclave ID and calls the
inherited post-read body. `IsProcessable` is true. Actual pose tracking requires
the original animation services; these defaults and reads do not provide
those services.

### Stored inventory precedes startup inventory

[inventory-reading.ts](../../src/gothic3/inventory-reading.ts) restores the
original inventory record over its actual physical arrays, proxies and nested
slot objects. The original Hero record contains **zero serialized item
stacks** and **19 equipment-slot records**; two slots hold the Head and Body
records. This is the source before the later startup item assurances. The
earlier initialized-player projection containing 121 stacks remains evidence
of that separate stage.

The live inventory state must retain its nested slot and template proxy
identities across subsequent equipment, transfer, observer and startup
operations. Connecting it to native inventory methods requires those methods
to mutate this same store and execute their real callbacks. Copying it into a
second inventory would lose the required relationship between serialized
state and later gameplay effects.

### ScriptRoutine owns one embedded processor

[routine-reading.ts](../../src/gothic3/routine-reading.ts) restores the 500-byte
`gCScriptRoutine_PS` allocation. Its constructor builds four CString slots,
five enum containers and one embedded `gCScriptProcessingUnit` at `+64`, then
clears the debug byte at `+1f0`. The embedded constructor remains an actual
required capability. It must return the processor belonging to this
allocation and retain that processor through the callbacks.

The reflective fields share one `NativeRoutineProperties` store with script
setters and notification bindings. The original Hero has `Routine=Rtn_Player`,
empty CurrentTask/LastTask/CurrentState strings, six zero numeric properties
and enum values `AniState=2`, `Action=24`, `AmbientAction=0`, `AIMode=0` and
`HitDirection=0`. The native derived reader consumes only its two-byte version
and returns 1; it does not read an inherited base tail.

Post-read then executes `GameReset`: clear the debug byte, notify and clear
StatePosition, StateTime, CommandTime and CurrentBreakBlock, call the embedded
SPU's reset, copy the current task CString and call task setters, construct
the empty task callback, copy the current state CString and call state
setters, and construct the empty local callback. These calls reread the live
fields at their original positions. By-value CString arguments retain their
actual ownership and callee destruction boundaries. Missing services stop at
the call site with the already applied prefix retained.

`IsProcessable` is true. Pre-process supplies the current owner to that same
embedded SPU. Process reads the first original timestamp, calls inherited
processing, supplies the current owner, executes the real SPU process body,
reads the second timestamp and adds the wrapping elapsed ticks through the
current ScriptAdmin. Those dependencies are required before original routines
can run in the world.

### String ownership and evidence

The new readers distinguish NULL CString storage from a nonNULL allocated
empty string. NPC and Routine require the actual indexed CString assignment
service over their mutable slots. Copy, reference-count and free operations
must follow the recovered ownership branches. A table lookup yielding
JavaScript text alone does not prove that sequence.

Inventory supports a narrower branch here: all five original Hero TreasureSet
strings are empty and their destination slots are physically NULL. The
recovered assignment and `SetText` bodies leave those destinations NULL for
either a NULL or an allocated-empty source, without allocation, reference-count
or free calls. Nonempty inventory strings stop at the unresolved ownership
branch. Numeric heap pointer bits stay unknown while actual capability
identities remain live.

The producers compare selected original instructions with immutable local
PEs, verify the focused Hero bytes and retain source vtables, descriptor
metadata and source excerpts. Current implementation receipts pin the code,
helpers and namespace output. Reproduce this source evidence from the same
local study:

```powershell
python -B tools/gothic3/research_npc_reading.py --study $study
python -B tools/gothic3/research_inventory_reading.py --study $study
python -B tools/gothic3/research_routine_reading.py --study $study
python -B tools/gothic3/freeze_character_checkpoint.py
```

The [character reading checkpoint](../../assets/gothic3/character-reading-checkpoint.json)
chains the unchanged construction source at `eb97f57b`, preserves historical
receipts and pins these current readers and their dependencies. Its source
audit and file hashes remain distinct from build, browser and game-progression
evidence.

| Evidence set | Entries | Instructions | Original instruction bytes |
| --- | ---: | ---: | ---: |
| NPC construction, reading and callbacks | 542 | 9,800 | 32,083 |
| Inventory and nested Slot construction and reading | 254 | 4,511 | 13,867 |
| ScriptRoutine construction, reading and callbacks | 386 | 7,857 | 25,072 |

The final combined TypeScript check and production build passed locally on
5 October 2026 (`npm run build`, 235 Vite modules). The existing large-chunk
warning remains. This checks source types and packages the current browser
entry points; these new readers are not yet invoked by that application. No
tests, native execution, browser review, deployment or playthrough were run for
this checkpoint.

These three factories bring the first nine Hero property sets into the source
reconstruction. The other ten, their real services and the full enclosing
entity/world pipeline remain necessary. The actual CString/GUID services,
embedded SPU, equipment mutation, templates and scene graph must be connected
before world cache, physics, PVS, processing, original inputs and story can
become live. Original save/load, progression through the endings and successful
online deployment remain unproven. This checkpoint keeps `gameplayReady: false`.

## 20. Restore interaction, damage, focus, dialogue and party state

Six more Hero property sets now have bounded construction and serialized-read
implementations. These continue the original record from section 19 and also
cover Dialog and Party later in that record. They require the original host
services at the recorded call sites before they can run in the browser world.

| Property set | Hero packet | Relative bytes including sentinel | Version | Type selector | Reflected fields |
| --- | ---: | --- | ---: | ---: | ---: |
| `gCInteraction_PS` | 9 | `[3922,4158)` — 236 bytes | 84 | 49 | 14 |
| `gCDamage_PS` | 10 | `[4158,4263)` — 105 bytes | 76 | 51 | 5 |
| `gCDamageReceiver_PS` | 11 | `[4263,4423)` — 160 bytes | 33 | 52 | 9 |
| `gCFocus_PS` | 12 | `[4423,5563)` — 1,140 bytes | 44 | 59 | 80 |
| `gCDialog_PS` | 14 | `[7180,7320)` — 140 bytes | 1 | 68 | 9 |
| `gCParty_PS` | 16 | `[7575,7653)` — 78 bytes | 1 | 77 | 3 |

Each row describes a source packet, not an activated entity or a working
gameplay system. These readers are not yet invoked by the browser application.

### Interaction includes real proxy and CString ownership

[interaction-reading.ts](../../src/gothic3/interaction-reading.ts) preserves
the separate inherited entity owner and the reflected Owner/User/AnchorPoint
proxies. The same 224-byte allocation also owns a Spell template proxy and an
additional nonreflected property-set proxy. Defaults, reads and callbacks
retain those physical slots and capability identities.

The original FocusNameBone default is `Head_Head_End`. Its literal assignment
and subsequent indexed archive read require the actual CString ownership
service, including allocation, references and release. Returning JavaScript
text alone does not implement that service. NULL and allocated-empty strings
remain distinct. Current masked enum globals are required at the original
constructor and default boundaries.

Interaction is not processable. Its added/removed callbacks still require
actual NavigationAdmin registration, subject to the original template-owner
branch. Processing-range entry adds it to InteractionAdmin before the script
gate; exit runs the script and destroys a fallback name before removal.
The application-mode check is strict byte value 1, and ScriptAdmin may be
NULL. Real registry, application and script services remain dependencies.

### Damage records precede combat implementation

[damage-reading.ts](../../src/gothic3/damage-reading.ts) supplies both concrete
factories. Their reflective views, base objects, enum containers and receiver's
LastInflictor proxy retain one store for each allocation. The original native
read consumes its two-byte version and returns 1 for each class. Both classes
are not processable; their examined process and lifecycle callbacks are empty.

Damage PostInitialize sets DamageAmount to 10, DamageType to 2 through its
actual enum temporary, ManaMultiplier to 1, ManaUsed to 0 and HitMultiplier to
1. Receiver PostInitialize sets HitPoints and HitPointsMax to 1. Serialized
fields then replace the reflective defaults in their original order. The
receiver's entity proxy follows 16-byte GUID equality, cache-DWORD clearing
and the original reference-release order. Constructing these records does
not yet execute attacks, animation events, hit detection or combat scripts.

### Focus defaults and search belong to the same allocation

[focus-reading.ts](../../src/gothic3/focus-reading.ts) restores 80 reflected
fields in the 408-byte Focus allocation. Its 70 floats, six booleans, three
enum containers and CurrentEntity proxy share that physical storage. The
vector constructors leave uninitialized bits unknown. Descriptor defaults,
Invalidate and PostInitialize then apply their recorded stores in source
order. Reused eight-byte enum temporaries retain their base and typed vtable
writes, scalar copies and destruction boundaries.

CurrentEntity's descriptor default resolves the member without clearing it.
Focus Enter uses the inherited second owner.Modified read. Focus overrides
OnNotifyExit with literal return 1, so Exit performs only the outer owner
read. Treating every property set's notification chain as identical would
change that behavior.

Invalidate frees a captured nonNULL candidate array before clearing its
pointer, count and capacity. A NULL pointer leaves count and capacity alone.
Focus is processable. Process calls the actual FindFocusEntity search only when
DrawFocusName is strict byte value 1. PostProcess clears the same look-direction
vector before the inherited empty callback. Candidate allocation/free and the live scene,
picking and interaction search must be supplied by their real services.

### Dialog and Party preserve embedded identities and list state

[dialog-party-reading.ts](../../src/gothic3/dialog-party-reading.ts) restores
the 88-byte Dialog and 72-byte Party allocations, including their embedded
entity proxies and masked TradeCategory/PartyMemberType defaults. Dialog
PostInitialize clears TalkedToBy and assigns NULL to the existing TalkingTo
proxy through the original temporary and assignment order. Party's
PartyLeaderEntity descriptor default resolves its member without a preset.

Party's native tail consumes its version, a list prefix byte and a uint32
count. The original Hero count is zero. Nonempty-list allocation and element
lifetimes remain explicit dependencies; the current empty record does not
prove that branch. Cached proxy resolution, QueryEntityProxyInternal,
GetEntity, nonNULL internal references and terminal destruction also require
their actual services. Dialog is processable but its examined processing
callbacks are empty; Party is not processable.

### Reproduce and review this checkpoint

The four offline producers verify the immutable Game/Engine/SharedBase inputs,
selected instruction bytes, vtables, descriptor metadata and focused Hero
packets. Evidence includes supporting native bodies whose full behavior may
remain unimplemented. Counts measure the examined evidence, not completed
gameplay features. Current receipts pin each implementation, producer,
imported Python helper and owned output.

This checkpoint selects assembly globally by each original catalog function's
inclusive body ranges, including discontiguous ranges. Every range must have
complete instruction-byte coverage and match the original PE. Adjacent
functions are excluded. The earlier collector used the next assembly ENTRY
header as its boundary; historical receipts retain that recorded method and
their original counts. The new [capture helper](../../tools/gothic3/bounded_native_capture.py)
and checkpoint audit enforce the tighter boundaries for these four evidence
sets.

Reproduce them at this recorded source revision:

```powershell
python -B tools/gothic3/research_interaction_reading.py --study $study
python -B tools/gothic3/research_damage_reading.py --study $study
python -B tools/gothic3/research_focus_reading.py --study $study
python -B tools/gothic3/research_dialog_party_reading.py --study $study
python -B tools/gothic3/freeze_hero_properties_checkpoint.py
```

The [Hero properties checkpoint](../../assets/gothic3/hero-properties-checkpoint.json)
chains the unchanged character-reading source at `fd804884`, retains the
historical receipts and pins the current code, evidence and guide.

| Evidence set | Entries | Instructions | Original instruction bytes |
| --- | ---: | ---: | ---: |
| Interaction construction, read and callbacks | 299 | 4,103 | 12,698 |
| Damage and DamageReceiver construction and reading | 441 | 5,612 | 17,316 |
| Focus construction, defaults, reading and process boundaries | 544 | 10,804 | 38,245 |
| Dialog and Party construction, proxies and list reading | 1,044 | 17,592 | 52,250 |

The final combined TypeScript check and production build passed locally on
5 October 2026 (`npm run build`, 235 Vite modules). The existing large-chunk
warning remains. This validates source types and packages the current browser
entries; it does not exercise these detached readers or establish gameplay
completion. No tests, native execution, browser review, deployment or
playthrough were run for this checkpoint.

Fifteen of the Hero's 19 property sets now have bounded source factories.
PlayerMemory, Illuminated, Effect and VisualAnimation still need concrete
factories and native reads. Existing PlayerMemory behavior must use the same
live player storage when its factory is connected. All 19 must then enter the
original enclosing entity reader and template/child/context pipeline, with
the actual world cache, physics, PVS and processing activation. Input, combat,
inventory, dialogue, routines, quests, original saving/loading and progression
through the endings remain integration and completion work. This checkpoint
keeps `gameplayReady: false`; the full game is unfinished and this newer source
has not been deployed.

## 21. Restore lighting, effects and the physical animation factory

This source checkpoint adds the Hero's Illuminated, Effect and VisualAnimation
factories to the same reflection controller. Each retains its own original
property set and physical storage. Detached construction and reading do not
attach these objects to the original enclosing entity or activate a world.
The current application has not enabled these readers as live gameplay.

### Keep lighting state and owner callbacks together

[Illuminated](../../src/gothic3/illuminated-reading.ts) is type 74, version 8,
with an original 188-byte allocation. Its nine property names include the
original spellings `ReciveShadows`, `ReciveTreeShadows` and
`ReciveStaticShadows`. The winning Hero record uses those same names.

Construction preserves two embedded enum containers and seven Vector4
constructors, then the original light, shadow, occlusion and update stores.
Current mutable enum values are captured from an actual host or remain masked
unknown; cold PE zero-fill does not establish their live values. PostInitialize
sets its seven booleans in order without adding an inherited call.

The current native read consumes its version, static-light count and one
112-byte bulk directly into the same shader-light block. Its exported byte and
mask views refer to that block. It then copies the two static shadow booleans
from the current normal shadow fields. Earlier conversion branches stop where
their original services are needed.

Added binds the same PS to the actual owner's embedded FrustumItem. Removed
performs CacheOut before rereading the owner and clearing that slot. A local
Exit notification reaches the actual illumination administrator before the
inherited notification; propagated reads skip that local branch. Fresh NULL
light/shadow/query paths are concrete. NonNULL light membership, shadow
reference lifetimes, occlusion and render services remain explicit dependencies.
Public pointer reads validate the physical masks against their retained
capabilities, including the wrapper and owner pointers.

### Preserve effect allocation and immediate processing order

[Effect](../../src/gothic3/effect-reading.ts) is type 96, version 1, with an
original 64-byte allocation. Its four fields share that store with the owned
CString, current effect handle and runtime-effect hash-map header.

The native constructor requests 43 buckets. The examined reserve operation
grows capacity to 51 and requires the actual `Realloc(NULL, 204)` allocation,
zeros its 204 bytes, stores capacity, then stores bucket count and zeros the
43 active heads again. JavaScript object identity does not supply a numerical
heap address; its pointer bits remain masked while the real allocation
capability is retained. The native reader consumes its version and returns 1.

Processing tests `Static == 0`; entering the processing range tests
`Static == 1`. The Hero's empty effect name follows the original skip path.
For a nonempty name, creation requires the actual effect module/system and
shared identity matrix, copies the current offset into the stack matrix, and
passes the captured name, owner, NULL argument, matrix and true to the system.
The current handle is stored before the failure warning and name clearing.
Stopping preserves the captured/current receiver order and clears the handle
after the service returns. Probability is not applied as an invented random
gate in this immediate creation path. Terminal lifetimes and active world
effect services remain unfinished integration work.

### Retain the animation factory and its embedded cloth object

[VisualAnimation](../../src/gothic3/visual-animation-reading.ts) restores the
original version 64 record and its 31 descriptors. Its animation factory is
embedded in the same allocation; it is not the inspector's rendered actor.
The cloth descriptor reads into the same SpringAndDamperEffector wrapper
constructed at native offset `+0x80`.

The [reflection controller](../../src/gothic3/entity-reflection.ts) now retains
embedded wrapper placement by parent identity and native offset, rejects a
second constructor for the same slot, and preserves the original masked flag
word with bit 2 set. It records an embedded constructor, without asserting a
separate heap allocation. Attach, descriptor defaults, native reading and
reference operations use this same wrapper. Terminal destructor and memory
administrator calls remain actual service boundaries.

The native animation reader retains the original LoD, motion and attachment
ownership and call order. Reading an actor filename does not load an actor
through the inspector or establish native cache residency. Archive lookup,
resource ownership, current scene callbacks and the actual processing services
must be connected before this property set can drive a live player. Its
embedded motion records must supply the same resource objects to the existing
animation/SPU consumers.

This bounded reader covers the installed Hero's Visual version 64, Factory
version 5 and LoD version 4, with canonical 0/1 bool bytes and successful
allocations supplied by actual services. The LoD's 44-byte allocation keeps
the allocator's returned storage and identity. Cleanup preserves captured
record backing across callbacks; an unsupported replacement stops before
continuing through a different object. Earlier conversion and populated
resource branches retain their explicit service boundaries.

The original Hero packet is 740 bytes including its sentinel. Its 99-byte
native tail contains two factory parts, seven motion records, zero attachments,
the 24-byte box and the base property set's version/enabled state. The embedded
cloth table has 13 fields: nine SpringAndDamper fields followed by four inherited
Effector fields, then native versions 62, 39 and 1. Those packet facts do not
establish that actor resources have been loaded or animation is running.

The three mutable enum globals lie in the original PE section's virtual tail,
outside its file-backed data. The producer pins their actual section header and
address ranges. Their current values still come from the live source-module
capability; cold virtual zero-fill does not supply those values.

### Prepare PlayerMemory without replacing its live attributes

At the preceding checkpoint, the separate [PlayerMemory loading evidence](../../assets/gothic3/player-memory-loading/README.md)
was explicitly marked `factoryImplemented: false`. Its
[loading contract](../../assets/gothic3/player-memory-loading/loading-contract.json)
records the remaining constructor, map and nested-object work.

The original allocator at `Game:20327f10` requests 184 bytes with tag `0xc4`
and calls the no-argument constructor export `20036cdc`, whose actual body is
`2031e9c0`. The copy overload `2000cce3` reaches `2031e440`; it is not a fresh
constructor. PE initializer pointers prove the order of 25 registered fields.
The stored Hero contains 24, so `IsConsumingItem` must retain its native
default when the table is read.

The original 1,617-byte packet contains a version 5 native read of 1,125 bytes
and 15 nested attributes. The producer checks that packet and 197 focused
record byte checks and their string references against the immutable winning
world. This proves source layout, not execution of the missing reader.

That checkpoint had not yet created the default attributes, destroyed them
before loading stored values, preserved node/CString/reference lifetimes,
handled missing or broken entries in original order, or performed the later
PostRead resizing. Section 22 records the concrete reader that now implements
those selected paths while retaining the same map and
`OriginalNativeAttribute` objects for startup, HUD and combat.

### Reproduce and integrate this checkpoint

The three runtime producers and the evidence-only PlayerMemory producer use
the complete inclusive body-range capture method described in section 20.
They check original PE bytes, descriptor/vtable metadata and focused original
resource bytes offline. Supporting captured functions are not a count of
implemented gameplay. Each receipt pins current producer/helper/output bytes;
runtime receipts additionally pin the implementation and shared dependencies.

Fresh offline audits compared the captured instructions and complete inclusive
body ranges with all three original PE files, verified excerpt/current receipt
hashes, and checked every published mirror. The Visual audit also checked its
three virtual enum-global ranges and twelve PostInitialize constants directly
against the original section header/data.

| Evidence scope | Captured native bodies | Instructions | Original PE bytes |
| --- | ---: | ---: | ---: |
| Illuminated construction, reading and callbacks | 396 | 4,809 | 14,686 |
| Effect construction, reading and processing boundaries | 298 | 3,356 | 10,186 |
| VisualAnimation, embedded cloth, factory and resource ownership | 2,881 | 58,274 | 184,229 |
| PlayerMemory loading research, factory still absent | 1,376 | 19,081 | 55,562 |

The final combined TypeScript check and production build passed locally on
5 October 2026 (`npm run build`, 235 Vite modules). The existing large-chunk
warning remains. The build packages the current browser entries; it does not
execute these detached factories or establish original gameplay. No tests,
native execution, browser review, deployment or playthrough were run for this
checkpoint.

```powershell
python -B tools/gothic3/research_illuminated_reading.py --study $study
python -B tools/gothic3/research_effect_reading.py --study $study
python -B tools/gothic3/research_visual_animation_reading.py --study $study
python -B tools/gothic3/research_player_memory_loading.py --study $study
python -B tools/gothic3/freeze_visual_properties_checkpoint.py
```

The [visual properties checkpoint](../../assets/gothic3/visual-properties-checkpoint.json)
extends the frozen source at `42c7149a`, retains its historical receipts and
records the intentional shared reflection/guide changes. PlayerMemory evidence
does not count as a nineteenth concrete factory. All 19 still have to enter
the original enclosing entity, template, child, layer and context pipeline
with real cache, physics, PVS and processing activation. Original input,
combat, inventory, dialogue, routines, quests, saving/loading and progression
through the endings remain completion work. This source keeps
`gameplayReady: false` and has not been deployed.

## 22. Implement all Hero property-set factories

This checkpoint adds the selected native `gCAttribute`, `gCStat` and
`gCPlayerMemory_PS` paths. The new readers use the same reflected wrapper and
physical native storage that is retained by their consumers. They are
source-bounded implementations; they are not yet registered in a complete
browser entity-loading composition or connected to the live scene.

### Keep Attribute and Stat native identity

`gCAttribute` allocates 24 native bytes and `gCStat` allocates 32; both use
tag `0xc4` and a 16-byte wrapper with tag `0x190`. Stat owns `BaseMaximum` and
`MaximumModifier` and inherits `Tag`, `Modifier` and `Value`. The Attribute
metadata base resolves to NULL at the native `bCObjectRefBase` sentinel;
Stat's real metadata base is the registered Attribute root. The Stat CRT
initializer is absent from the decompiler's function and assembly catalogs, so
the producer records only its verified 75 original PE bytes rather than
inventing a decompiled body.

Construction preserves the original defaults and registration order.
Attributes start with empty Tag, Modifier 0 and Value 100; Stat first sets
BaseMaximum 100 and MaximumModifier 0. Descriptor reads resolve their receiver
again after each notification callback. Serialized descriptor reads use the
registered property name and literal `true`, which makes the original Exit
callback skip Cap. Gameplay setters use `BaseValue`, literal `false` and the
original Cap path. The same `OriginalNativeAttribute` instance backs its
wrapper, physical values, native references and PlayerMemory entry.

### Read PlayerMemory into the same consumer storage

The fresh PlayerMemory native object is 184 bytes with tag `0xc4`; its clone is
the real wrapper table at `20697d2c`. The wrapper's `GetVersion` returns 6,
while the current serialized native read begins with version 5. The reader
preserves that distinction. It does not substitute the separate copy
constructor for fresh construction.

The implementation builds the 25 registered descriptors and preserves the
15 default attributes in original order. It follows the real 43-bucket map
constructor, capacity growth to 51, 204-byte allocation, node insertion order,
CString byte hash and reference ownership. `DestroyAttributes` releases stored
attributes before replacing entries, then uses the same physical map and
`OriginalNativeAttribute` objects as startup, HUD and combat consumers. The
PlayerMemory scalar fields and array headers are backed by the native storage;
the later OnPostRead step reserves the four nine-element arrays and retains
existing values.

The Hero packet is 1,617 bytes including its sentinel, with a 1,125-byte native
read and 15 nested attributes. The producer independently checks the original
world bytes and string indices, all 25 registrations, 24 serialized fields and
197 nested byte ranges. PlayerMemory defaults still require real GUID, mutable
enum, heap, CString, localization and logging services. Unsupported legacy
V3/V4 attribute readers and foreign non-PlayerMemory RTTI cases retain an
explicit failure boundary; failed allocation and repeated wrapper reads are
not claimed as supported.

### Reproduce the current source checkpoint

The Attribute receipt covers 639 native bodies, 9,461 instruction records and
27,882 bytes, plus the separate 75-byte Stat initializer proof. The PlayerMemory
receipt covers 724 bodies, 11,542 instruction records and 34,733 bytes. These
counts describe captured source evidence, not feature or gameplay counts. Both
receipts pin the current runtime, producers, imported helpers and every owned
asset/public mirror. The pre-existing PlayerMemory loading-evidence receipt
remains evidence-only and is not rewritten.

```powershell
$study = 'C:\path\to\Gothic3_Decompiled_Study_2026-10-04'
python -B tools/gothic3/research_attribute_reading.py --study $study --capture-only
python -B tools/gothic3/research_player_memory_reading.py --study $study --capture-only
python -B tools/gothic3/research_attribute_reading.py --study $study
python -B tools/gothic3/research_player_memory_reading.py --study $study
python -B tools/gothic3/freeze_player_attributes_checkpoint.py
npm run build
```

The local TypeScript check and production build pass; Vite transforms 235
modules, and the existing large-chunk warning remains. These factory modules
are typechecked but are not imported by the current browser entry, so this
build does not execute them or demonstrate live gameplay. The factories are
still disconnected from entity/template/child/layer/context loading, world
cache, physics, PVS, input, combat, inventory, dialogue, quests, save/load and
the endings. No tests, native execution, browser playthrough or deployment
were performed for this checkpoint; `gameplayReady` remains `false`.

## 23. Present the moving Hero in third person

The local Ardea scene now loads the recovered skinned Hero rig and native
motion data as a world actor. The view toggle follows the controller's
position behind the actor; first-person camera coordinates and the logical
movement position are separate, so changing the rendered camera does not move
the controller. The Hero root follows that position and heading. Browser
displacement chooses one recovered idle, walk or run clip. The ready page
loaded 202 scene objects and 67 characters, with the Hero view enabled.

This makes the moving player model visible while traversing the current scene,
but does not yet bind it to the reconstructed native entity, PlayerMemory,
movement, animation-state or collision pipelines. Input, raycast support and
clip selection remain browser implementations. The Hero view is not a native
third-person controller; NPCs, dialogue effects, combat, quests, save/load and
the rest of the game progression remain unimplemented for ordinary play.

The production TypeScript build passed after this change (235 Vite modules;
the existing large bundle warning remains). The local browser reached its
ready state. No tests, complete gameplay session, native execution, deployment
or playthrough were performed. The view is still a partial step toward a
playable game and `gameplayReady` remains `false`.

## 24. Load the captured Hero attributes in the browser

The [Hero property runtime](../../src/gothic3/hero-property-runtime.ts)
provides browser-owned byte allocations, known-byte masks, CString storage,
localization entries, GUID generation and bounded logging. It composes the
existing reflection, Attribute/Stat and PlayerMemory readers on one retained
controller, then reads `PC_Hero` property-set index 13 from the hash-checked
serialized record. The browser Character panel requests this read on demand
and displays the same PlayerMemory consumer's Chapter, XP, learning points and
15 stored attributes. The 1,617-byte packet is consumed through its enclosing
`DEADC0DE` sentinel; the final cursor must match the record end.

This checkpoint exposed and fixed two integration details: initialize the
PlayerMemory native reference count before the reflection controller retains
the object, and let the packet caller validate its enclosing sentinel. A
direct execution of the built TypeScript module returned Chapter 0, XP 0,
zero learning points and 15 attributes at value/maximum 100, with no unresolved
controller operation. This validates the captured record and selected browser
services only. New-game startup, ordinary play updates, combat, XP awards,
save/load and world/entity residency still do not update or own this state.

The production TypeScript check and build pass after this integration (258
Vite modules; the pre-existing large-bundle warning remains). No test suite,
native executable, review of the new browser panel, full browser playthrough,
deployment or complete-game progression was run; `gameplayReady` remains
`false`.

## 25. Seed a live quest journal and run the first startup quest

The [quest runtime](../../src/gothic3/quest-runtime.ts) now combines the
hash-checked fresh-world quest seed with the effective native quest definitions.
It validates all 641 source states and counter arrays, then constructs the
existing `NativeQuests` transition kernel for the browser session. On entering
Ardea it applies the one explicitly audited `OnGameStartUp` operation:
`RunQuest("Xardas_FindXardas")`. The original initial packet marks that quest
Open at Year 0, Day 0, 12:00; the native transition makes it Running and records
that source clock time. The session then uses the original World_MCP clock seed,
factor 12 and the selected 24-bit FPU profile. The footer displays the current
world clock, and the Journal reads live quest status, counters and source
provenance rather than presenting the catalog as progress.

This is one connected quest transition, not a complete `OnGameStartUp` or
session start. The source receipt explicitly leaves the other startup callbacks
and entity mutations unapplied. NPC identities/routines, eligible dialogue,
delivery updates, quest rewards, Hero progression and save/load are still not
connected. Unsupported nonempty quest effects stop at the host boundary; this
runtime does not award invented XP or political changes. Exploration remains
available if the quest/clock resources fail to load, with that limitation shown
to the player.

The production TypeScript build passed after this change (259 Vite modules; the
existing large bundle warning remains). A one-off Vite SSR runtime invocation
loaded and hash-checked the browser resources, seeded 641 states, produced
`Xardas_FindXardas` Running at 0/0/12, and advanced one clock frame. The local
browser loaded the scene and its 202 scene objects, but the new session start
and journal interaction were not manually reviewed. No automated test suite,
full browser playthrough, original executable comparison or deployment was run.
`gameplayReady` remains `false`.

## 26. Save and restore the source-backed browser session

The browser's version-2 local save contains the explorer position and view,
selected landscape, all 641 quest states, the world-clock date and the ordered
PlayerKnows game-event list. Game events start from the actual retained Hero
PlayerMemory packet. Their Set operation adds only a missing exact string;
Clear removes the first exact match, following the source-instruction sequence.
Restore checks that the quest seed, effective quest definitions, clock seed
and Hero PlayerMemory have the same SHA-256 receipts as the current prepared
data. It validates saved quest IDs and state values before seeding the manager,
and restores the clock through set/adjust/process/resume. A legacy version-1
save still restores its exploration position; it starts a fresh source-backed
quest session because that format contains no quest, clock or event state.
These browser saves are not compatible with Gothic 3's native save files and
do not serialize the full Hero PlayerMemory, inventory, NPC routines or world
entity activation.

Saving remains a partial session feature. A malformed or source-incompatible
quest session is not silently replaced by new-game state; exploration remains
available and the error is shown. This keeps the mismatch visible while
preserving the saved record. A later dialogue addition stores the sorted true
InfoManager Given IDs with the exact provider identity, restoring them only
against that source; older v2 saves without this optional field still migrate.

The TypeScript check, 91 test files / 927 tests and production build pass; Vite
transformed 263 modules and retains the existing large-bundle warning. A
one-off Vite SSR exercise loaded the captured Hero PlayerMemory, verified the
fresh-world quest state, planned and executed Diego's source record
`BPANKRATZ31454`, set `Diego_WarIsLost`, marked the Info Given, saved it and
restored both the event and Given state. The browser loaded the scene and the
new-world journal, but the dialogue panel itself was not manually exercised.
This SSR exercise verified command and save-state wiring under its supplied
facts; it predates the browser's selected SysDyn owner-distance lookup. It did
not establish that the response passed every current source availability gate
in the live Ardea world.
No complete gameplay playthrough, original executable comparison or deployment
was run. This does not establish full gameplay save/load, and `gameplayReady`
remains `false`.

## 27. Run a bounded source-backed Ardea conversation

The previous checkpoint exposed original dialogue as a read-only catalog. This
one connects a limited subset to the live Hero quest session through
[`live-dialogue.ts`](../../src/gothic3/live-dialogue.ts). Pressing E on a nearby
person now opens a separate interaction panel. The catalog verifies the exact
54-name `Script_Game.dll` command table before it treats a command absent from
that table as the native unknown-command advance path.

Before presenting a response, the TypeScript planner checks its source Info
record, parent/availability predicates, accepted-start guards, every command
capability and the completion lifecycle. Facts come only from the active Ardea
scene, the source-seeded quest manager, Hero `PlayerKnows` events and the
selected InfoManager provider. Unloaded entities and unsupported actor,
inventory, faction or callback state return `unknown`; they are shown as
unavailable with a reason. The later checkpoint in section 28 extends this
bounded lifecycle to source condition types 3 and 19 when no delivery callback
is required.

The host displays each source `Say` line and waits for Continue before advancing
the original command sequence. It applies `SetGameEvent`/`ClearGameEvent` only
to `PC_Hero`; bounded quest commands are delegated to the existing quest kernel
only when its reward or arena side effects are supported. On an accepted start,
the source Info's `Given` flag is marked under the native permanence rules.
Browser saves retain those flags alongside the PlayerKnows list and verify the
InfoManager provider when restoring them. Section 28 also adds positive
`TalkedToPlayer` actor IDs and validates the source people receipt.

Diego's `BPANKRATZ31454` record is the first source-backed case: its four
commands include source lines and `SetGameEvent("Diego_WarIsLost")`. A test host
using the real source catalog and live plan/execution functions confirmed the
event and Given flag, then saved and restored both under the harness's supplied
facts. This did not establish all source availability gates; the selected
SysDyn position lookup used for owner-distance predicates was added in section
28. TypeScript, repository tests and production build pass. The local browser
successfully entered Ardea and loaded the new-world session, but this particular
UI panel had not yet been manually exercised. Original voice, camera direction,
NPC routines, most Info conditions, delivery callbacks, inventory, rewards and
broad quest progression remain unsupported. This is an initial live dialogue
slice, not a playable campaign; `gameplayReady` remains `false`.

## 28. Retain ended dialogue state and quest journal pairs

The bounded conversation path now reads the seven selected Ardea actors'
`gCNPC_PS` and `gCDialog_PS` source properties from the captured initial-people
record. It verifies the actor ID/name pairing, preserves the original
`TalkedToPlayer` seed, and exposes the flag only for the matching actor. Unknown
death and wound state still does not inherit a default.

When an Info script is accepted, the browser host begins an InfoManager session
for its NPC. Closing or replacing the panel ends that session. The reviewed
`Game.dll::gCInfoManager_PS::EndInfoManager` behavior marks each participating
non-player dialog actor as talked-to; the browser stores those positive actor
IDs alongside the exact Ardea-people source receipt and restores them only
against that source. A save without this optional field remains readable as a
pre-flag v2 save.

The dialogue facts resolver now queries only names needed by the active owner's
source records from the hash-checked index chunks of the SysDyn file named in
the Ardea scene manifest. It keeps duplicate name matches ambiguous and uses
the native coordinate origin and target property sets for the original
distance multiplier. A missing entity in a successfully read source index
produces the native missing-target distance; a source or hash failure remains
unknown.

`Game.dll::gCInfo_PS::OnEndInfo` iterates source Say commands and appends their
speaker/text localization pairs to the associated quest for several condition
types. The browser currently enables only the no-delivery condition 3 and 19
paths for this completion callback; condition 19's quest must resolve, and this
case does not apply a quest-status transition. Other callback paths stay
disabled. The quest state retains both the pair and its text key for the journal.

The focused actor/log and SysDyn-index tests, TypeScript check, all 93 test
files / 933 tests, and the production build pass. The build transformed 264
modules and retains the existing large-bundle warning. A one-off Vite SSR
round trip loaded the real gameplay manifest and all 641 quests, ended Diego's
source-backed InfoManager, and restored his true `TalkedToPlayer` flag from a
browser save. Browser automation could not open the active Ardea tab because
CDP `Emulation.setFocusEmulationEnabled` timed out, so this specific panel and
its spatial predicates have not been manually exercised. No complete gameplay
playthrough or deployment was run; `gameplayReady` remains `false`.

## 29. Apply bounded native GiveXP awards

This checkpoint is retained as the earlier below-threshold implementation;
section 30 records the subsequent threshold-crossing progression work.

The live dialogue host and quest reward service now connect the source
`Script_Game.dll::GiveXP` path to the retained Hero PlayerMemory. The captured
handler at `0x100628c0` multiplies the requested amount by five for its
world-script call form (`Self=None`, `Other=PC_Hero`), adds it to XP, and checks
the next native level threshold. The TypeScript planner reuses the existing
native XP threshold and overflow kernel. A verified initialization-seed reader
ties the browser session to the current Hero XP, attribute-learning points,
serialized NPC level and `Perk_Learn` stack.

If an award stays below the next level threshold, the host writes the new XP
through the same retained `OriginalPlayerMemory` object and its source property
notifications, then shows the localized `GO_XP` message. Multiple XP commands
in one dialogue are simulated in order before the script can start, so their
combined award cannot cross the threshold after a partial conversation. Quest
rewards are enabled only when their sole effect is one such award. Browser saves
retain XP with the initialized-player source receipt; restore validates that it
can be derived from supported five-times awards and writes it through the same
native PlayerMemory setter. Previous session saves without this optional field
still restore from the original XP seed.

Level-up awards remain locked. The initial `Perk_Learn` learned state is
unresolved, the Hero's live `gCNPC_PS` level is not connected, and the original
level-up effect/message services are not in the browser world. For example,
`Xardas_FindXardas` grants a requested 250 XP (1,250 through this call form),
which crosses the initial threshold; the quest correctly remains Running until
those dependencies are implemented. This bounded reward path is not a
complete progression system.

TypeScript, all 94 test files / 937 tests, and the production build pass; Vite
transformed 265 modules. The existing large Tervain chunk warning remains. A
one-off Vite SSR round trip loaded the hash-checked Hero and quest sources,
applied `GiveXP 50` as 250 XP, saved/restored it through the native setter,
rejected a subsequent level-crossing award, and held the Xardas reward without
changing XP. The local tab was identified, but browser UI inspection timed out
twice in CDP at `Emulation.setFocusEmulationEnabled`; this does not verify the
dialogue panel presentation or reachability. These checks verify the selected
property/reward path, not a full browser playthrough; `gameplayReady` remains
`false`.

## 30. Carry GiveXP through a level-up

The GiveXP bridge now handles a single native level-up threshold crossing.
For the world-script call form (`Self=None`, `Other=PC_Hero`), the captured
`Script_Game.dll::GiveXP` handler multiplies the requested amount by five,
updates PlayerMemory XP and, on crossing the next threshold, increments
`gCNPC_PS.Level` once and adds 10 LP. The initial Hero inventory snapshot
records `Perk_Learn` as `Learned=false`, `ActivationCount=0`, so no extra
learning point is added. The browser writes XP and LP through the retained
PlayerMemory objects and Level through a source-traced scalar setter on an NPC
property set created with the verified new-game constructor. The dialogue
displays localized `GO_LevelUp` text.

The serialized candidate contains an accessor frame around the NPC property
packet, so the complete packet must enter through `controller.readAccessor`;
calling the wrapper's property reader directly starts at the wrong byte. The
NPC reader's missing or mismatched property path is `Game:20312d30`, which
registers `bTPropertyType<gCNPC_PS,bCObsoleteClass>` under a critical section.
Its reader stub at `Game:20016be4` jumps to `Game:202fd000`. In the pinned
`Game.dll`, that 192-byte body is byte-for-byte identical to the already
audited PlayerMemory obsolete-class reader at `Game:2031fe50` (SHA-256
`ac7a65d11aea9f4e1ff69afde164a9e793328cf767554d673f8d901c6bb43744`). It
consumes a `u16` version, `u32` payload length and opaque bytes. The old Level
payload is retained exactly; it is not misread as the current unsigned-long
Level value. This closes the serialized Hero NPC read path but does not attach
the NPC property set to the live Hero entity.

The original `eff_event_levelup_01` visual effect, native message services and
general inventory skill activation are not connected. Saves retain the
requested award sequence and validate restored XP, Level and LP by replaying
the native progression planner against the verified initialization seed. A
legacy save without award history is accepted only if it remains
below-threshold.

The focused progression and GiveXP suites pass (6 tests). The round-trip check
awards requested 250 XP, verifies native 1,250 XP / Level 1 / 10 LP, then
saves and restores those values into a fresh retained Hero session. This is a
source-backed progression slice, not a complete level system or gameplay
playthrough. A dedicated assertion confirms that the serialized NPC property
set owns Level's opaque payload and remains attached to its registered wrapper.
After the accessor-frame and obsolete-reader evidence update, `npm run typecheck`
and `npm run build` both pass; the build transforms 267 modules and retains
Tervain's existing large-chunk warning. The mirrored NPC-reading outputs and
their implementation receipts also match their current file hashes.
The dialogue UI still needs manual review; live entity activation, combat and
campaign progression remain open. `gameplayReady` remains `false`.

## 31. Apply quest transitions at dialogue end

The dialogue host now connects the bounded no-delivery `OnEndInfo` conditions
6, 11 and 21 to the quest state already retained by the browser session.
Condition 6 runs an Open quest, condition 11 closes a Running quest, and
condition 21 sets a Lost quest back to Running. The implementation uses the
existing source-validated quest transition kernel, so Running captures the
source-seeded clock and quest changes flow to the journal and save listeners.
Conditions 6 and 11 also retain their source Say localization pairs; conditions
3 and 19 keep the previously connected log path, and condition 21 does not
append a pair under the captured semantics.

Preflight requires the condition's expected quest status, a resolved native
quest definition, a no-delivery record, and no script command that also
changes the callback quest. Arena quest notifications remain locked because
their native status observers are not connected. Conditions with other
party, teaching or mob callbacks remain unavailable. This covers a few more
native quest transitions but does not activate residents, implement general
dialogue conditions, or form a campaign loop. The recorded semantics identify
the state changes and log conditions; the fine-grained native order between
those operations is not established here.

Validation for this checkpoint: the five focused `OnEndInfo` transition cases
pass, TypeScript checking passes, all 96 test files / 944 tests pass, and the
production build transforms 267 modules. The local production preview loads
the Ardea scene with 202 scene objects and 67 source characters. Browser
review verified scene startup and the initial source quest, but did not
complete an Ardea conversation. The browser dialogue panel, full actor
activation, combat and campaign remain unverified; `gameplayReady` remains
`false`.

## 32. Persist the Hero's source-backed hit points

The retained Hero PlayerMemory now exposes its current HP and maximum to the
play HUD and browser session save. `NativeQuestRuntime.setHeroHitPoints` uses
the registered `SetHitPoints` path, including the native signed32 operand
check, lower-bound-to-zero behavior and upper clamp to the current maximum.
Session restore applies `SetHitPointsMax` before `SetHitPoints`, preserving the
same physical PlayerMemory attribute object and its notification/cap behavior.
Older browser saves without `heroVitals` still restore from the captured Hero
seed.

The reviewed Script_Game `SetHitPoints` implementation is at `0x10045b20`
([captured source listing](../../assets/gothic3/combat/sources/Script_Game/10045b20.c.txt));
the PlayerMemory setter writes the retained HP attribute through its registered
setter. The focused progression suite checks over-max and negative clamping,
invalid signed32 input, and HP save/restore. `npm run typecheck`, the focused
suite (2 tests), and `npm run build` pass. The local production preview loaded
the scene with 202 objects and 67 characters; entering Ardea displayed
`HP 100 / 100` with `Xardas_FindXardas` running. This verifies HUD wiring only.
Enemy damage, healing items, death/recovery, and world-entity activation remain
disconnected, so this is not yet a playable combat loop.

## 33. Apply Ardea dialogue trade flags

Jack's `BPANKRATZ31459` and Hamlar's `FILLER939` source records issue
`SetTradeEnabled` for the current NPC. The dialogue host now preflights that the
target has the captured `gCDialog_PS`, writes its `TradeEnabled` value into the
same Ardea actor state used by condition 17, and re-renders response choices
after the script completes. Browser saves retain the complete set of actors
whose trade flag is enabled; older saves without that field keep their
source-seeded values.

The original Dialog property flag can now unlock a future trade-eligible
response. This does not implement price calculation, inventory transfer, or a
trade screen, and the actors still are not full runtime world entities. Local
source validation found seven Ardea actor records with Dialog property sets;
each has one decoded boolean `TalkedToPlayer` and `TradeEnabled` field.

## 34. Read source-seeded inventory in dialogue predicates

The runtime now validates all 121 starting stack rows against both the
initialized Hero source record and the standalone, hash-checked inventory
receipt. It retains their original template names, GUIDs, amounts, qualities
quickslots and Learned flags. `CondItems` checks for `PC_Hero` read this verified
snapshot: a present template returns its exact starting amount, an absent stack
is unavailable, and another entity's inventory remains unresolved. Browser
saves record the inventory evidence hash and reload the unchanged source
snapshot.

The Inventory panel (I) displays all 121 entries in original assurance order
and marks the five rows whose source Learned flag is set. This is still a
read-only startup snapshot, not the live inventory system.
Item use, transfer, loot, equipment, mutations and inventory persistence remain
unimplemented. The browser dialogue does not mark a character's serialized
inventory as a live actor inventory.

Validation: TypeScript checking passed; all 96 test files / 946 tests passed;
the production build transformed 267 modules; documentation links and
`git diff --check` are clean. In the local production preview the Ardea scene
loaded with 202 objects and 67 characters, the I panel displayed 121 stack
rows with five source Learned flags set, including `It_Gold × 123`, and
Milten's unavailable Fire Mage Cup response was no longer reported as blocked
on unknown inventory state. This verifies the source snapshot and UI path only,
not item mutation or full gameplay.

## 35. Preserve party and teaching enable flags from dialogue

The verified Ardea `gCDialog_PS` source records contain the original
`PartyEnabled` and `TeachEnabled` booleans alongside `TradeEnabled`. The
dialogue command planner now maps `SetPartyEnabled` and `SetTeachEnabled` to
those exact fields. Browser saves retain positive actor IDs for both flags,
validate them against the captured Ardea actor identities, and restore omitted
fields from the source seed for older saves. The existing native Dialog/Party
reader confirms the corresponding original fields and setter methods.

This adds the source flag writes only. It does not activate followers, build a
trade page, implement trainer choices, spend learning points or teach perks.
The wider party, teaching and world-entity systems remain incomplete, and
`gameplayReady` remains `false`.

Validation: command-planning and actor-state/save tests pass; all 97 test files
and 949 tests pass; `npm run typecheck` and the production build pass. The build
transforms 267 modules and retains the existing large Tervain chunk warning.
These checks cover source command mapping and retained flags, not in-game party
or training interactions.

## 36. Apply source-backed political and attribute quest rewards

The original `gCQuest_PS::SetStatus` reward order now reaches the retained Hero
PlayerMemory for the PoliticalFame array increment, attribute base-value
increment and following GiveXP script. The fame update writes the same
nine-entry `bTValArray<long>` backing used by the serialized Hero record and
does not invent a property notification. Quest-success preflight rejects
unresolved fields or unsupported effects before any reward is applied.

Ardea_Pocket now applies its THF base reward and XP; Anog_ReportInog applies
PoliticalFame alignment 3 and XP. Browser saves retain those fame entries and
the distinct attributes used by source quest rewards, then restore them through
the retained PlayerMemory data and setters. Enclave fame, arena status and the
Ardea_Revolution tutorial popup remain unsupported and continue to block those
particular quest successes. Actor activation, item delivery, combat and
complete campaign progression remain open; `gameplayReady` remains `false`.

Validation: `npm run typecheck` and the focused reward progression case pass.
The test completes both source quests and checks the skill/fame/XP results and
save/restore. Full-suite and build validation for the combined worktree is
recorded in checkpoint 37.

## 37. Expose unmet source-dialogue conditions

The Ardea dialogue panel now separates source responses that are ready, blocked
by an evaluated unmet predicate, or blocked by a native service that is not yet
connected. The unmet-condition disclosure shows the response text, source Info
ID and first evaluated reason. `CondOwnerNearEntity` failures include the
measured adjusted distance and the source threshold of 500; predicates remain
unchanged, and showing a reason does not make a response executable.

Before source routine placement was connected, a local browser review entered a new world, loaded the source-seeded
`Xardas_FindXardas` journal, and opened Diego's original conversation. His
`BPANKRATZ31454` "What happened here?" response failed its current native
owner-to-`Ardea_4Friends` proximity predicate: 1073.9 adjusted units against
the 500 limit. The earlier SSR exercise in sections 26–27 tested command and
save-state wiring under harness facts; it did not test this live spatial gate.
The bundled native condition semantics specify a 0.25 multiplier only when
the target has `gCNPC_PS`; other targets use 1, and the adjusted value must be
at most 500. In the same hash-checked Ardea SysDyn source, Diego is at
`(88540.336, 5157.565, -10058.180)` cm and `Ardea_4Friends` is at
`(88129.695, 5113.936, -11049.464)` cm. The anchor has `gCAnchor_PS`, not
`gCNPC_PS`; their 1073.86 cm separation therefore agrees with the browser's
1073.9 / 500 result. This cross-check rules out a unit-conversion mismatch in
this case. At the time of this capture, Diego's source routine point had not yet
been connected to scene placement; section 38 records that follow-up. The
predicate remains unchanged.
The other Ardea responses show their own unmet quest, event or proximity
predicates, while FILLER175's condition-8 delivery and FILLER930's source-parser
anomaly remain unresolved. This identifies the next player-facing integration
gate: verify the dialogue condition after applying the source placement; do not
bypass it with the browser's player-to-NPC interaction radius.

The same browser session confirmed the Ardea scene loads with 202 placed
objects and 67 source characters, Hero HP at 100 / 100, and the original
source-seeded world clock. These observations verify scene startup and the
dialogue-gate display only, not a completed conversation, native NPC
simulation, combat, campaign progression or game completion.

Validation on that checkpoint's worktree: `npm run typecheck` passed; all 98
test files and 950 tests passed; `npm run build` transformed 267 modules. The
production build reported the existing large Tervain chunk warning.
`git diff --check` was clean. These checks plus the local browser review above
verified the source-gate display; they did not establish NPC routine behavior
or full game progression.

## 38. Seed Ardea residents at their native Start points

The previous checkpoint showed Diego standing at his stored SysDyn transform,
about 10.74 m from `Ardea_4Friends`; the source dialogue predicate's 5 m limit
was correctly blocking `BPANKRATZ31454`. The source actor already contains a
`gCNavigation_PS` record with `Routine = Start` and `WorkingPoints`,
`RelaxingPoints` and `SleepingPoints`, plus the actor's current point fields.
Resolve the Start index in each array, require the stored `WorkingPoint`,
`RelaxingPoint` and `SleepingPoint` values to match that row by native PropertyID
equality, and only seed a position when all three day-part assignments agree.
If they differ, leave the person at the existing scene placement until the
native scheduler is implemented.

The target reference is resolved inside that actor's exact SysDyn source file.
Native PropertyID comparison uses the first 16 bytes; the browser scans the
hash-checked entity-index chunks, requires exactly one matching entity, then
loads its full world matrix. `native-data.ts` provides the bounded source-index
lookup, and `scene-routine-position.ts` validates the actor arrays, source
identity, target uniqueness and scene bounds before converting native
centimetres/reflected Z to the scene's metres and yaw. It does not edit the
dialogue condition or infer a time-of-day choice.

For Diego, the shared Start point resolves to `Stand`
(`bce7457eadf75f45b70381866846a48600000000`) at
`[88306.328, 5115.416, -11121.124]` cm. `Ardea_4Friends` is at
`[88129.695, 5113.936, -11049.464]` cm, a separation of about 1.91 m; this is
inside the original 5 m gate. Milten and Gorn have their own in-scene shared
Start points. The runtime places three residents from these source assignments;
points that are ambiguous, malformed or outside loaded scene bounds are skipped.

The local preview reported `3 source routine positions`, then entered Ardea with
the source-seeded `Xardas_FindXardas` journal. Focused tests cover routine
agreement, disagreement, coordinate conversion, ID equality/ambiguity,
source-index descriptor identity/lookup and the source proximity math: Diego's
Start transform measures about 191 / 500 adjusted units from the anchor, while
his old stored scene transform measured about 1074 / 500. Cached variants of
the same PropertyID are compared by their first 16 bytes, matching native
identity and avoiding false schedule disagreement. This confirms startup
integration and the expected source geometry. A post-placement browser dialogue
attempt has not yet confirmed that Diego's response is now enabled. Pathfinding,
schedule changes, movement, native entity construction/context/cache-in,
processing-range activation and combat remain unimplemented; this checkpoint
only seeds initial scene transforms.

Validation on the current combined worktree: `npm run typecheck` passes; all
102 test files and 965 tests pass; `npm run build` transforms 270 modules. The
production build still reports the large Tervain chunk warning. `git diff
--check` and relative-link checks for the rebuilding overview, process and
scope documents pass.

## 39. Evaluate native Hello dialogue from Dialog state

Condition type 2 (Hello) reads only the owner actor's `gCDialog_PS` presence
and `TalkedToPlayer` value in the implemented branch. The previous live facts
adapter asked for the broader actor service, which also includes unresolved
death and wound state, so every Hello record stayed unknown despite its two
required Dialog fields being captured. Availability now reads the narrower
source-backed actor Dialog record and preserves the original rule: the owner
must have a Dialog property set and must not already be marked talked-to.

The `OnEndInfo` evidence records no quest transition or Say-log append for
condition 2. The quest host therefore accepts it as a no-effect completion;
it does not require a quest name or change quest state. The existing
InfoManager session still owns `TalkedToPlayer`: it marks the NPC when the
dialog session ends, and browser saves retain that positive source actor ID.
Conditions needing alive/unhurt checks, delivery, crime, faction, party or
other unported actor state remain unknown.

This makes source Hello records executable when their commands also pass the
existing command and lifecycle gates. It does not claim the original voice,
camera, NPC activation or conversation selection order. The Diego response
after native routine placement remains unverified in the browser.

Validation for this change: `npm run typecheck` passed and `npm run build`
transformed 270 modules. The build retains Tervain's existing large-bundle
warning. The test suite was not run for this change; browser interaction after
native routine placement remains unverified.

## 40. Revalidate the combined gameplay branch and scene startup

On 6 October 2026, the combined local branch passed `npm test` (102 files,
965 tests) and `npm run build` (270 modules). The production build still reports
the existing large Tervain chunk warning. These checks establish code and
catalog consistency for this worktree; they do not establish a full Gothic 3
playthrough.

A fresh local browser tab at `http://127.0.0.1:5174/gothic3/` loaded the Ardea
scene with 202 objects, 67 source characters and 3 source routine positions.
Entering the scene loaded `Xardas_FindXardas` as Running, Hero HP as 100 / 100,
and the source-seeded world clock. The Hero could be switched to third-person
view. This confirms scene startup and these UI bindings only.

The browser exercise did not verify Diego's response after routine placement.
The available browser input sent isolated key presses and could not sustain
movement long enough to approach a resident; no dialogue availability result
is claimed from this attempt. Routine scheduling, NPC activation, combat,
inventory mutation and campaign progression remain incomplete.

## 41. Correct the native NPC health and XP floor species set

Combat research found that the existing TypeScript kernel used its broader
ambient-creature list for two narrower native calculations. The byte-audited
`Script_Game:100187b0` switch accepts species 24–28, 30–32, 35–37 and 42–46;
species 47 falls through. `RefreshHitPoints` uses that result to give the listed
species one maximum hit point, while the default NPC XP callback uses it for
the lower XP floor. The kernel now has a distinct predicate for this exact
native set, so species 47 receives ordinary level-scaled NPC health and the
ordinary 50-point XP floor. The general ambient-creature classification stays
separate.

The new focused regression test reads the hash-checked Ardea world record for
`Orc_GameStartRaider_Warrior_01`. Its captured `gCNPC_PS` values are Level 10,
LevelMax 30 and species 5; its serialized DamageReceiver packet starts at
1 HP / 1 maximum HP. For normal difficulty, the audited processing-range
`RefreshHitPoints` calculation derives 600 maximum HP and 300 maximum stamina
for this actor. The test also confirms species 47 is excluded from the reduced
HP and XP floors. This validates source-data lookup and bounded arithmetic;
the browser scene still does not execute the native processing-range callback
or run an active encounter.

Validation on 6 October 2026: the focused test passes (2 tests), `npm run
typecheck` passes, and `npm run build` transforms 270 modules. The build
retains the existing large Tervain chunk warning. Full suite, native execution,
browser combat and campaign progression were not verified in this checkpoint.

## 42. Dispatch resolved melee effects through a single-use host

The melee planner now has an executor that dispatches each resolved effect to
an explicit host callback in source order. It stops on an unknown result or a
callback error, reports the attempted effect and already-applied prefix, and
blocks replay through that executor because the host may have applied writes
before failing. Rejected plans call no host methods. This makes the execution
boundary and partial-failure behavior explicit for future live integrations.

The host remains an interface, not a connection to the browser actors. Contact
detection, a live source-backed victim, NPC proxy writes, perception, task
activation, impact effects and entity damage callbacks are still not wired to
ordinary play. The executor therefore does not make a fight playable. Its
focused regression cases verify callback order, rejected-plan behavior, partial
prefix reporting and replay blocking.

Validation on 6 October 2026: `npm run typecheck` passes; the focused combat
effect test passes (3 tests); the full suite passes (104 files, 970 tests); and
`npm run build` transforms 270 modules. The build retains the existing large
Tervain chunk warning. These checks establish the dispatcher contract, not
live combat or Gothic 3 equivalence.

## 43. Play recovered Hero fist attack phases from browser input

The Hero can now start the original fist Attack or PowerAttack sequence from
the world controls: left-click or C selects Attack, and right-click or V
selects PowerAttack. The sequence requires one source clip for each Raise, Hit
and Recover phase and advances with their recovered durations. The hit-window
event uses the audited float32 `MaxTime` times native `0.6000000238418579`
threshold, and is emitted once per swing. Another swing cannot replace the
active sequence before recovery finishes.

This completes the animation/input edge of the melee path only. The hit-window
event is not connected to collision, target eligibility, `planNativeHeroMelee`
or the effect executor. It does not reduce NPC or Hero health, make an NPC
react, award defeat XP or persist combat. The animated Hero is visible only in
the existing third-person view; first-person arms are still absent.

Validation on 6 October 2026: `npm run typecheck` passed; all 105 test files
and 973 tests passed; and `npm run build` transformed 271 modules. The existing
large Tervain chunk warning remains. The local route opened at
`http://127.0.0.1:5175/gothic3/`, but this checkpoint did not verify the swing
visually or verify a hit against a target. The next combat gate is to connect
the emitted hit window to source-backed target eligibility and a live mutable
actor, then complete one fight including reaction, defeat reward and save/load.

## 44. Port the NPC processing-range health refresh

The isolated TypeScript function `initializeNativeNpcOnProcessingRange` now
models the captured `OnEnterProcessingRange` point refresh. It derives the
NPC's level-scaled HP and stamina maxima, then returns both current values set
to those maxima. This is the final state of the source callback's two-step
refresh: clamp/preserve current while setting each maximum, then refill current
HP and stamina to those maxima. It rejects point packets outside the signed32-bit
input domain and keeps the source record immutable. The evidence chain is
`Script_Game:100cec10` through `10045c90`, `10045b20`, `10046960` and
`100467f0`.

This is a pure lifecycle transition, not a live actor. The browser still does
not activate scene NPCs or connect this result to their mutable properties,
collision, attacks or saves. The next step remains a live encounter that joins
the actual source actor, native contact acceptance, ordered damage effects,
NPC reaction, defeat reward and persisted state.

Local `npm run typecheck` and `npm run build` are the checks for this
checkpoint. Unit tests and browser encounter behavior were not run.

## 45. Sample Hero hand contact at the recovered hit window

The browser now samples `Hero_Right_Hand_Hand_1` when the recovered Attack or
PowerAttack sequence emits its hit-window event. It compares that animated
world-space point with the loaded character meshes' world-space bounds and
reports the closest candidate within a 0.12 m tolerance. This connects the
native-timed Hero animation to a real geometry query against the scene's
original character models. The tolerance and AABB collision are TypeScript
runtime choices; they are not claimed as the installed engine's exact
collision primitive.

This candidate is not native contact acceptance. Current Ardea NPCs are still
static, and a contact does not alter HP, attacker fields, AI task, pose,
perception, XP or browser saves. The next step is to resolve candidate identity
to the same live source actor, run the planner with established eligibility,
and execute damage and reaction effects through that actor's retained state.

Validation on 6 October 2026: `npm run typecheck` passes; the full suite passes
(106 files, 977 tests); and `npm run build` transforms 272 modules with the
existing large Tervain chunk warning. The local browser at port 5176 loaded 202
scene objects, 67 characters and three source routine placements, then entered
Ardea and rendered the Hero's attack pose after a canvas click. The contact
query is unit-tested for range, inactive/hidden targets, stable ties and invalid
tolerance, but contact with an NPC was not manually confirmed. No damage,
reaction, defeat reward or combat save was verified.

## 46. Resolve contact candidates to source-backed NPC state

The new `BrowserArdeaNpcCombatRuntime` takes a rendered Ardea person identity
and resolves its provenance path and entity index against the hash-checked
native world index. It requires one matching GUID/name/index row and unique
`gCNPC_PS`, `gCScriptRoutine_PS`, `gCNavigation_PS` and
`gCDamageReceiver_PS` property sets, then retains selected source state such as
level, species, routine action and current attacker. When the Hero's hand
overlaps a rendered actor's bounds at the recovered hit window, the browser
creates a mutable state record and applies the audited processing-range refresh
to its HP and stamina. The Ardea session save now stores those point values
alongside the native path and source hash; restore re-resolves the source and
rejects mismatched identity or values above the freshly derived maxima.

This is an identity and state bridge, not native entity activation. Current
contact still uses the browser's rendered AABB candidate and fixed tolerance;
the original engine has not accepted a collision. The bridge does not attach
properties to an engine entity, run NPC perception or tasks, animate or move a
victim, apply damage, award defeat experience or update quest counters. Its HP
is initialized on the first browser contact as an implementation step; native
processing-range timing and radius are not reproduced. Therefore no fight is
playable yet.

Validation on 6 October 2026: `npm run typecheck` passes; the focused runtime
and processing-range tests pass (5 tests across 2 files); the full suite passes
(108 files, 984 tests); and `git diff --check` passes. The Vite build transformed
274 modules and completed successfully, with the existing warning for chunks
larger than 1,200 kB. Browser contact, damage, NPC response, defeat, campaign
progression and original-game equivalence remain unverified.

## 47. Resolve the original unarmed melee carrier by source path

`loadNativeFistCarrier` resolves `Fist` only in the exact
`Items/Items/Action_Items_Fist.tple` file, then reads its `gCDamage_PS` and
`gCItem_PS` values through the hash-checked template resources. A name-only
lookup is ambiguous in the installed data: another `Fist` is under `_deleted/`
and has a different damage type. Selecting by the original file path yields the
carrier with DamageType `Impact1` (1), DamageAmount 10, DamageHitMultiplier 1,
quality bits 0, and no spell or projectile property. The loader requires one
matching non-helper template and rejects malformed owners or unsupported
property values.

This establishes the source carrier definition only. It does not prove that the
Hero's current hands use it, does not resolve NPC generated inventory or armor,
and does not connect the carrier to the hand-contact callback. Ardea's static
NPC combat state now also retains the five original inventory `TreasureSet`
names. For the Ardea Orc Raider, these identify `TS_Plunder_Orc_Warrior` and
`TS_Weaponry_Orc_Halberd`; they do not enumerate generated stacks. The generated
inventory, equipped weapon, perks and body armor still require the original
cache-in/inventory path. Damage, NPC reactions, defeat credit and a playable
encounter remain unavailable.

Validation on 6 October 2026: `npm run typecheck` passes; the focused carrier
tests pass (3 tests), including the deleted-name ambiguity case; and
`git diff --check` passes. No full browser encounter was verified.

## 48. Retain NPC treasure-set inputs for inventory activation

The Ardea source combat bridge now also resolves all five `gCInventory_PS`
`TreasureSet1` through `TreasureSet5` strings from the same uniquely identified,
hash-checked actor record. They are retained as source configuration on the
browser NPC state. For `Orc_GameStartRaider_Warrior_01`, the record names
`TS_Plunder_Orc_Warrior` and `TS_Weaponry_Orc_Halberd`; the other three slots
are empty. Saves continue to persist mutable points and re-derive these static
values from the source hash on restore.

These strings do not contain the generated stacks or establish which weapon,
armor or perks are active after cache-in. The next combat integration requires
the original treasure-set generation and NPC inventory/equipment lifecycle to
populate the same actor state before the melee planner can accept it. NPC
damage, reaction and defeat remain unavailable.

Validation on 6 October 2026: the full suite passes (109 files, 987 tests),
`npm run build` succeeds with 274 modules and the existing large Tervain chunk
warning, and `git diff --check` passes. No browser encounter was verified.

## 49. Resolve deterministic NPC weaponry recipes from original templates

The NPC combat bridge now follows its five source `TreasureSet` names into the
native template index, attaches each selected template's source path and SHA-256,
and reads the original `gCTreasureSet_PS` distribution plus the contained
`gCInventoryStack` template references. `templateByNameWithSource` and
`templateByGuidWithSource` keep name/GUID resolution tied to one unique source
file. The item templates are then read through the existing hash-checked
gameplay resource catalog.

The deterministic Weaponry path is supported from `Script_Game:100ced90`:
distribution value 3 walks the configured inventory stacks, reads each item's
UseType, ensures its amount/quality, and equips a split stack. The TypeScript
reader records the configured amount and quality, applies the native `0x100`
quality bit except for UseTypes 4 and 7, and derives the source inventory
equipment slots. It also builds a weapon damage carrier when the source item
has one unique `gCDamage_PS`. Other treasure distributions remain
source-identified but ungenerated; in particular, this does not recreate the
random Plunder choices.

For `Orc_GameStartRaider_Warrior_01`, the Plunder source is
`Treasure/NPC/Plunder_NPC_TS_Plunder_Orc_Warrior.tple` (SHA-256
`ee1ca5684ffa3685e8ae1c8083341412d62c2c4e664daba29855f961c86f11e2`),
distribution 0 with 2–4 transfer stacks. Its generated result stays
unimplemented. The Weaponry source is
`Treasure/NPC/Weaponry_NPC_TS_Weaponry_Orc_Halberd.tple` (SHA-256
`5d5fc11780e788241bd99233bbca96d59c17ddd502ffcaa5276dfa1a9f9f4cf8`). It
resolves one `It_Axe_OrcSword_01` stack (GUID
`a4f100d0f5b6a347b3acfaa532a6976500000000`), UseType 52, quality 256 after
the native bit operation, and a source `gCDamage_PS` profile of Edge damage
125 with multiplier 1. The native equip plan selects primary slot 6.

These facts now travel with the browser NPC's source-bound combat record, and
the first-contact notice can display the source weapon definition. They do not
mean the original entity was constructed or cached in, or that its inventory or
rendered hand has been changed. The current contact remains an AABB candidate;
damage, NPC reaction, defeat, XP and combat save state are still not connected.

Validation on 6 October 2026: `npm run typecheck` passes, the focused
`npc-combat-runtime.test.ts` suite passes (3 tests), and `npm run build`
transforms 276 modules successfully. The production build retains the existing
large Tervain chunk warning. `git diff --check` is clean. No browser encounter,
full-suite run or remote deployment was performed.

## 50. Apply the source-defined health-potion effect

The inventory panel now exposes a Drink action for the Hero's source-seeded
`It_Potion_Health` stack. Before changing state, it resolves the exact original
template by name within its recorded template path, checks the GUID and
SHA-256, then verifies `UseType=16`, an empty `ScriptUseFunc`, and one `HP`
`ModAttrib` with operation 2 and value 50. The retained Hero PlayerMemory then
dispatches the same `gCPlayerMemory_PS::ApplyMod` operation to its HP Stat, so
the original `AddPercentageToVal` arithmetic and maximum cap run against the
live browser property object. The browser save records the used stack count;
dialogue item predicates and the inventory panel read the reduced amount.

This closes the item effect and player-stat edge for one potion. It does not
recreate the native `PS_QuickUse` task, sip animation, full ordered inventory
observer registry, or generic item-use branches. The count is a browser-owned
overlay on the verified initial stack, and the ordinary combat path still
cannot injure an NPC or Hero. Thus potion state can be exercised through the
runtime with a damaged Hero, but the full fight-and-heal loop is not yet
playable.

Validation on 6 October 2026: `npm run typecheck` passes; the focused Hero
progression file passes all 3 tests, including a 37-to-87 HP use and
save/restore of the remaining nine potions; the full suite passes (109 files,
988 tests); `npm run build` succeeds after transforming 276 modules; and
`git diff --check` is clean. The existing large Tervain bundle warning
remains. No browser potion interaction or native `PS_QuickUse` execution was
verified.

## 51. Load dialog state for the visible Ardea actors

The scene manifest contains 67 rendered Ardea people, while the original
dialog-state seed covered only seven. New-game and restore now resolve every
visible person through the exact archive and path in its scene source reference,
then require one native entity-index row whose file index, entity index, name
and GUID all match. The corresponding hash-checked entity record supplies the
serialized `gCNPC_PS` and `gCDialog_PS` properties. The initial seven records
are merged by GUID; repeated names remain separate actors.

The session receipt stores the actor IDs and names together with the hashes of
the three source files. Restores reject a changed scene-actor source identity.
Older saves without that receipt still load: their saved enable flags apply to
the original seven, while newly included actors keep the defaults read from
their source. Dialogue resolves the current owner by its scene identity even
when another resident has the same display name; other duplicate-name
references remain unresolved instead of selecting an arbitrary person.

This expands serialized NPC/Dialog facts for dialogue predicates and commands.
It does not construct or activate native entities, run NPC routines or AI,
enable combat, or add dialogue records. Those lifecycle and campaign links
remain separate work.

Validation on 6 October 2026: `npm run typecheck` passes; the focused
`actor-dialogue-state.test.ts` suite passes all 10 tests, including exact source
identity checks, duplicate display names and legacy-save flag defaults. The
browser scene reports 67 characters ready and three source routine positions;
entering Ardea loads the source quest journal with `Xardas_FindXardas` running,
and browser diagnostics show no warnings or errors. The full suite passes (109
files, 992 tests); `npm run build` passes after transforming 276 modules. The
existing 5.27 MB Tervain bundle still exceeds the configured 1.2 MB chunk
warning threshold; the Gothic 3 route bundle is 830 KB. `git diff --check` is
clean. No remote deployment was performed.

## 52. Resolve serialized NPC equipment-slot templates

On first contact with a rendered Ardea person, the NPC combat bridge now reads
the serialized `gCInventory_PS` slot tail from that person's exact,
hash-checked entity record. It accepts the slot list only when its decoded count,
indices and ordering agree, and every nonempty entry contains a decoded
`gCInventorySlot` with present 20-byte `Template` and `Item` identities. Each
template identity is then resolved through a unique native template-index row
and a hash-checked template payload whose GUID must match. The record retains
the slot index, template name/path/hash and separate item-instance GUID.

For `Orc_GameStartRaider_Warrior_01`, slot 16 resolves to `Orc_Head_S12` at
`NPC/__Master_Orcs/OrcBodyParts_Orc_Head_S12.tple` (SHA-256
`d8973d2d3f4e8b19d73041be8443064abafd205a408387c973b7796d03fb502c`), and slot
17 resolves to `Orc_Body_Warrior_Outlaw` at
`NPC/__Master_Orcs/OrcBodyParts_Orc_Body_Warrior_Outlaw.tple` (SHA-256
`0c8cc6735162e4a816cecbe39828e40d29314a11b13acde7c5d23f2de37ef522`). These
are serialized slot references for head/body templates. They do not prove that
treasure generation ran, that the items are attached to an active actor, or that
either entry is a weapon or armor item. Their separate item-instance GUIDs are
`79220ebbac147840a428aa71eb33512800000000` and
`1ce894592b52a042b9975d84611a4c8800000000`, respectively.

The first-contact notice now displays resolved slot names alongside the
previously resolved deterministic weapon definition, while preserving the
warning that contact is a browser bounds candidate and hit effects are not
connected. Malformed or ambiguous slot data remains unresolved instead of
silently selecting a template. This advances source inspection for cache-in;
NPC construction, item creation, attachment, accepted collision and damage
remain outstanding.

Validation on 6 October 2026: `npm run typecheck` passes and the focused
`npc-combat-runtime.test.ts` suite passes 3 tests, including the Raider's
slot indices, template source hashes and separate item GUIDs. Subsequent
worktree-wide revalidation also passes `npm run typecheck`, `npm test` (109
files, 992 tests) and `npm run build` (276 modules). The build retains the
existing 1,200 kB warning for Tervain's 5.27 MB bundle; the Gothic route bundle
is 833 kB. A local browser session at `http://127.0.0.1:5177/gothic3/` loaded
the 202-object Ardea scene with 67 characters and three source routine
positions; entering it showed `Xardas_FindXardas`, Hero HP and the source clock.
A fist input reported a miss, and talking at the spawn did not open dialogue.
This confirms route entry only; no NPC contact, post-placement Diego response,
combat effect or full playthrough was verified. No remote deployment was
performed.

## 53. Verify Diego's Start-point dialogue in the browser

The local browser loaded the Ardea scene with 202 scene objects, 67 characters
and three source routine positions. After following Diego's resolved native
`Start` point, the Hero reached the `E · talk to Diego` prompt at approximately
`(-36.9, 0.8, -9.2)` metres. The source dialogue panel offered two responses.
`Hear Diego's news` completed as `BPANKRATZ31453`; `What happened here?`
completed as `BPANKRATZ31454`, showing the Hero's question and Diego's source
responses about the orc victory and enslavement of humans.

The browser save action reported that position, world clock and quest journal
were saved. After reloading the route and entering the restored session, the
Hero returned to the same position with the Diego talk prompt. Opening his
panel reported that no source dialogue was currently ready, consistent with
the completed records no longer being offered. This is direct evidence for one
post-placement source-dialogue path and browser save/restore; it does not prove
all source Given flags, the whole Ardea dialogue set, native routine/AI
execution, the `Find Xardas!` ending, or full-game completion.

The interaction still uses the browser presentation actor and the selected
source Start transform. Dialogue voice and camera behavior, resident movement,
native entity context/cache-in/processing, combat, inventory generation and
campaign progression remain separate unfinished systems.

Validation on 6 October 2026: local browser review confirmed all 67 characters
and three routine positions, the two completed Diego records, save and reload,
and no ready repeat response after restore. `git diff --check` passes. This
checkpoint changes documentation only; it does not claim a new build or test
run.

## 54. Trace distribution-0 Plunder draws and retain browser results

The local decompilation study identifies
`gCTreasureSet_PS::GeneratePlunderInventory` at `Game.dll:0x2000c626`; that
entry forwards to the body at `0x204123c0`. The implementation first requires
an attached treasure-set entity, its `gCInventory_PS`, and at least one
configured stack. For distribution 0, it chooses an inclusive transfer count
from the configured minimum and maximum (sorting the bounds when needed; equal
values below one produce one transfer). Each transfer selects a configured
stack with replacement. For configured amounts above one, its output amount is
drawn inclusively from `floor(amount / 2)` through the configured amount. It
then calls destination `gCInventory_PS::CreateItems` with the selected template,
quality argument 0, the drawn amount and final flag 1.

The function calls the local `Game.dll` `_rand` implementation at `0x20464af7`.
Its verified transition is `state = state * 0x343fd + 0x269ec3` modulo 2^32,
returning `(state >>> 16) & 0x7fff`. The loader menu's `FUN_20175290` seeds this
shared stream from `bCTimer::GetTimeStamp`; unrelated game systems also consume
the global stream. The reproducible inventory-research tool now records the
`0x20003558` once-only dispatcher, the `0x2000c626` forwarding entry and its
full `0x204123c0` target body, the `_rand` implementation and the loading-time
seed function. Against the read-only local `Game.dll`
(`b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f`,
8,228,864 bytes), all recorded instruction bytes match: 393 instructions / 1,104
bytes for the target body, 9 / 34 for `_rand`, and 72 / 215 for the seed
function. The two named forwarding entries each match their five-byte `E9`
instruction and retain their resolved target addresses in the receipt.

The evidence is reproducible with
`python -B tools/gothic3/research_native_inventory.py --study <completed-study-directory>`.
The emitted receipt is
[`native-inventory-evidence.json`](../../public/gothic3/inventory/native-inventory-evidence.json);
source excerpts are retained under
[`assets/gothic3/inventory/sources/Game/`](../../assets/gothic3/inventory/sources/Game/).

`loadNativeTreasureSet()` now resolves every Plunder candidate through its
unique GUID-indexed item template and retains both template source hashes.
`generateNativePlunder()` mirrors the verified count, replacement-selection and
amount draws. The Ardea Orc Raider's `TS_Plunder_Orc_Warrior` contains three
configured choices: 50 `It_Gold`, one `It_Booze`, and one
`It_Plant_Health_03`; its configured transfer count is 2–4. The browser uses a
separately seeded MSVCRT-compatible 15-bit stream and saves both its current
state and each source-bound `CreateItems` argument record. Restore checks those
records against the resolved source set and candidate templates instead of
drawing them again.

This is a browser-side generation plan created during first-contact NPC
resolution. Its random seed and call sequence are not the installed game's
timestamp-seeded global sequence. The records are not instantiated inventory
items; they are not attached to an actor, and the browser has not reproduced the
native once-only `GeneratedPlunder` cache-in flag or callback timing. The next
step is to construct and activate the NPC, execute the real destination
inventory path, and join that inventory with Weaponry/equipment cache-in before
attempting one end-to-end fight.

Validation on 6 October 2026: read-only comparison matched the original PE bytes
for the dispatcher and Plunder body/alias, `_rand` and seed function. The
inventory evidence audit records 143 selected entries, 3,306 instructions and
9,188 matched instruction bytes. `npm run build` passes; no test suite or
browser fight was run. The working branch remains unpublished.

## 55. Create browser NPC inventory from Plunder

The source-bound Plunder draws from checkpoint 54 now flow into the existing
TypeScript `NativeInventory` stack kernel. The Ardea NPC runtime resolves each
generated template by its full 20-byte GUID, confirms the exact template name,
archive path and SHA-256, and reads the source UseType, item category and item
flags needed by the inventory definition. It invokes `createItems` for every
saved draw with quality 0 and stack type 0. Repeated draws for the same item
merge according to the existing CreateItems path. The byte-audited overload
`Game:0x2001563b` forwards to `0x201ae430`, which calls `0x201d0210`; that
helper passes the default stack type 0 to the original stack creator. Plunder's
extra final argument is not consumed by that GUID overload.

The NPC combat state now owns this inventory. Browser saves retain its stack
snapshot alongside the draw records. Restore resolves the templates again and
rehydrates the intrinsic stack values without rerolling; the source GUID and
name must match, and an unresolved observer side effect rejects restoration.
The TypeScript context supplies an empty observer list because no NPC inventory
UI listener has been connected to this actor in the browser. That is a browser
host fact only; it does not prove the complete original runtime listener
registry. The existing UI still does not expose NPC loot or mutate the Hero's
starting inventory.

This makes Plunder observable as browser NPC inventory state but does not
complete the native cache-in path. Creation still happens on first browser
contact, the browser's seed and random call sequence differ from the installed
process, and generated stacks do not spawn physical ItemWorld entities. The NPC
is not yet constructed and activated through the native entity/context/PVS
lifecycle; Weaponry/equipment attachment, AI, incoming attacks, damage, defeat
credit and loot transfer remain separate work.

Validation on 6 October 2026: `npm run typecheck` passes; the focused NPC
runtime suite passes all three tests, including source-resolved stack amounts
and inventory save/restore. The full suite passes 110 files and 994 tests.
`npm run build` passes and packages 276 modules. Vite reports the existing
Tervain chunk at 5,265.79 kB, above the 1,200 kB warning threshold. `git diff
--check` passes. The browser policy blocked local-route navigation, so no
browser encounter or full playthrough was verified. No deployment was run; the
branch remains unpublished.

## 56. Resolve NPC armor class without misusing routine state

The attack planner's target-protection path follows `Script_Game:1003c980`.
Its audited body looks up inventory slot17, obtains that slot's template item,
calls `PSItem::IsRobe`, and then queries `Perk_LightArmor` or
`Perk_HeavyArmor`. The byte receipt records 165 instructions / 541 bytes
matching the installed `Script_Game.dll`. The source excerpt is
[`1003c980.c.txt`](../../assets/gothic3/combat/sources/Script_Game/1003c980.c.txt);
the evidence record is in
[`native-source-evidence.json`](../../assets/gothic3/combat/native-source-evidence.json).

The NPC bridge now resolves its serialized slot17 template by GUID and
source-hash, loads that template, and reads the exact `gCItem_PS.Robe` boolean.
For `Orc_GameStartRaider_Warrior_01`, slot17 is
`Orc_Body_Warrior_Outlaw` and the captured value is `false`. Other slots keep
`robe: null`; a missing/undecoded body template remains an explicit unknown.
This identifies the armor-class fact needed by the native protection branch
without inferring it from an item's name or UseType.

The source actor also carries `Action`, `AniState` and `StatePosition` on
`gCScriptRoutine_PS`. Those serialized schedule fields are now named
`routineAction`, `routineAniState` and `routineStatePosition` in the browser
state. They do not supply the current combat animation action used by the
melee planner; that state still requires the live NPC animation/task runtime.

This checkpoint adds combat inputs only. It does not apply damage, activate an
NPC, execute AI or task callbacks, or make an encounter playable. Validation
on 6 October 2026: `npm run typecheck` passes and
`npm test -- --reporter=dot tests/gothic3-dialogue/npc-combat-runtime.test.ts`
passes all three tests, including the source-verified slot17 robe value and
source slot identity. The branch remains unpublished.

## 57. Materialize deterministic Weaponry in the browser NPC inventory

The audited `Script_Game:100ced90` callback registered as `EquipWeaponry`
handles distribution 3. It reads each configured weapon stack's amount,
quality, UseType and template; ORs `0x100` into quality except for UseTypes 4
and 7; ensures the configured minimum amount in the NPC inventory; then calls
`EquipStack` (or explicit hand-slot attachment for UseType 2). All 502 bytes of
the callback body match the installed `Script_Game.dll` receipt in
[`native-source-evidence.json`](../../assets/gothic3/combat/native-source-evidence.json).

The browser NPC inventory now runs the resolved Weaponry recipe through
`NativeInventory.assureItems` after the recorded Plunder draws. This preserves
the native ensure-at-least behavior for each configured stack and the Weaponry
quality bit. The Raider's `It_Axe_OrcSword_01` is present in browser inventory
at quality 256 and amount 1, with its exact template GUID, path and SHA-256.
The runtime also records the corresponding `NativeInventory.planEquipStack`
result: the axe would link to primary slot 6. That plan has `applied: false`;
it does not attach the weapon to the rendered NPC, update its hand, apply stats
or create a physical ItemWorld item. UseType 2 is recorded as requiring the
native split into primary/offhand slots 6 and 5; that split has not been
implemented.

Browser save schema v2 persists this inventory and rejects stacks outside the
source-derived Plunder and Weaponry bounds. Version-1 browser NPC saves are
migrated by reconstructing deterministic Weaponry from their retained Plunder
draws instead of interpreting a Plunder-only snapshot as an equipped actor.
Version-2 restore permits an expected stack to be partially or fully consumed,
while refusing invented templates, amounts above their generated source
amount, linked slots and physical-item identities. Generation still occurs on
browser first contact; the native processing-range callback order and equip
effect host are not reproduced.

Validation on 6 October 2026: `npm run typecheck` passes and the focused NPC
runtime suite passes all three tests, including Raider Weaponry stack creation,
the unapplied primary-slot plan, save/restore, version-1 migration and rejection
of an invented stack. The full suite passes all 110 files and 994 tests.
`npm run build` succeeds with 276 modules; Vite reports the existing Tervain
bundle at 5,265.79 kB, above its 1,200 kB warning limit. `git diff --check`
passes. No browser encounter was verified or deployed for this checkpoint; the
branch remains unpublished.

## 58. Decode the live motion's tracked pose fields

`gCNPC_PS::TrackCurrentPose` (`Game:202f90c0`) reads the active visual motion
filename, play time, maximum time and actor transition-direction flag. It maps
the first pose from the fourth underscore and the alternate from eight more
underscores, then selects their order and float32 blend weight from normalized
play time and the actor flag. `trackNativePoseFromMotion()` ports that bounded
filename/time mapping. `NativeMotionPlayer.playTime` and `AnimatedActor.trackedPose()`
expose the fields for a selected animated actor when the caller has the actual
transition flag.

The implementation does not select NPC animations or create a live NPC
animation host. The browser manifest still animates only the Hero; Ardea NPCs
are static bind-pose models. The new pose result is not wired into `combat.ts`
or used to permit damage. Combat still needs the target's live animation/action,
equipment, eligibility and effect hosts.

Validation on 6 October 2026: `npm run typecheck` passes and the focused pose
tests cover Hero idle and fist-hit motion names, time-based pose ordering, and
unknown transition/malformed filename inputs. The branch remains unpublished.

## 59. Convert and connect Diego's source-skinned actor

The actor identity comes from Ardea person GUID
`1e51df278c13ed4f9d578491bbd3c4cd00000000`. The exact body is
`_compiledAnimation.p00 :: G3_Hero_Body_RebBanditMed.xact`
(`0b145b0bb6c9b01793a034c78e9d773be417ab0fe268ac5e3204f417e282aa3c`); the
head is `_compiledAnimation.pak :: G3_Head_Hero_Diego_Animated_01.xact`
(`27bc51d9632594d1563312859bf77a8761600b71a99e2aa760eb1df2f5b8c153`). The
exporter requires those local extracted files and checks their hashes and sizes
against the scene's source manifest before decoding them. It does not modify or
load the installed game. The reproducible command is:

```powershell
python tools/gothic3/export_diego_animated.py `
  --body-xact "<extracted G3_Hero_Body_RebBanditMed.xact>" `
  --head-xact "<extracted G3_Head_Hero_Diego_Animated_01.xact>"
```

The converter retains Diego's original skin weights, triangles, UVs and
source-selected textures/material metadata. The cleaned body and head rigs have
58 common named nodes; their maximum bind-position difference is
`4.39e-7` metres and their maximum quaternion component difference is
`1.19e-7`. The combined actor has 95 joints and 17,670 triangles. Its maximum
weighted rest-pose error is `5.19e-7` metres. The exporter carries all skin
influences across two joint/weight sets and the separate first-weight backup
used by the Three.js skinning path.

Motion data comes from `animated/hero-native.json`, whose source bytes and
independent audit are already checked for the Hero asset. The converter maps
the 11 audited idle, locomotion and fist-attack clips onto bones whose names
exist in both the Diego actor and the audited Hero rig, retaining the original
tracks on those retargeted bones. The clips contain 15,531 source keyframes;
15,218 are mapped onto Diego's compatible rig. The motion files also contain
helper and unrelated actor entries; those are retained as unmatched metadata
and excluded from the runtime clips. In particular, a same-named `Diego`
motion entry is not treated as a Hero skeleton joint. The converter records
source and mapped keyframe counts with source-checked output receipts in
[`manifest.json`](../../public/gothic3/animated/manifest.json):
[`diego.glb`](../../public/gothic3/animated/diego.glb) and
[`diego-native.json`](../../public/gothic3/animated/diego-native.json). The
receipt is marked `source-checked-conversion`; Diego is not listed as an
independently audited actor. The motion curves are Hero motions mapped onto a
compatible skeleton, not recovered Diego-specific animation selection.

The browser resolves the animated asset by Diego's person GUID, replaces his
static scene model with the skinned actor, and loops an idle clip during play.
The model inspector can also rotate and zoom the animated actor and select its
11 clips. Other NPCs remain bind-pose models. This does not execute Diego's
schedule, select his native motions, provide facial animation or attachments,
activate NPC AI, or connect combat damage.

Validation on 6 October 2026: the exporter completed from the exact source
files; `npm run typecheck` passes and `npm run build` succeeds with 277 modules.
Vite retains its existing Tervain chunk-size warning (`5,265.79 kB` above the
`1,200 kB` warning threshold). The local browser preview was then opened and
Diego's skinned actor was inspected in the model panel: the source-person model
loaded, displayed its idle motion, and exposed the mapped clips for inspection.
The browser console had no warnings or errors. This verifies the local preview
path, not native schedule-driven animation, combat, or a complete in-game
encounter. No deployment was run; the branch remains unpublished.

## 60. Apply a bounded browser Hero fist hit

The existing hit-window now carries the recovered attack or power-attack style
into a browser combat adapter. It resolves the installed `Fist` item by its
source GUID, path and SHA-256, loads the retained `PC_Hero` PlayerMemory, and
passes the live Strength, current Hero level and source-seeded `Perk_OrcSlayer`
state into `calculateNativeHeroMelee()`.

The target gate accepts only `Orc_GameStartRaider_Warrior_01` at its recorded
Ardea GUID, source path and file hash. It also checks the source Level 10 /
LevelMax 30 / Species 5 / Type 0 profile, zero status effects, absent current
attacker, empty serialized inventory stack list, and the slot17 `Robe=false`
template value. The source-resolved browser Plunder and Weaponry stack
templates must have no `gCItem_PS.Skill` reference; this gives the bounded
damage calculation a known inactive `Perk_HeavyArmor` value.

Only the resulting browser HP value changes. The rendered Raider is a static
bind-pose actor with an explicit browser standing profile and no attached
Weaponry; browser fist contact still uses the Hero hand bone against rendered
bounds. This does not implement the native NPC entity/context lifecycle,
`AssessHit` eligibility, live animation selection, AI/task callbacks, incoming
attacks, reactions, death/defeat, XP, quest credit or loot. The NPC runtime
already saves and restores its bounded HP value, so the change flows through
that browser save record.

Validation on 6 October 2026: `npm run typecheck` passes, and `npm run build`
completes with 279 modules. Vite reports the existing Tervain chunk warning
(`5,265.79 kB` above the `1,200 kB` threshold). No test suite, browser
encounter, save/reload interaction or deployment was run for this checkpoint.
The code update remains unpublished. A successful build does not establish
source-game combat equivalence or full campaign playability.

## 61. Connect the source-backed Ardea gold Give path

The live dialogue host now handles positive Script_Game `Give` operations when
the donor and recipient are PC_Hero and the active Ardea dialogue owner, and
the item is the source-pinned `It_Gold` template. The template identity is
checked by GUID, source path and SHA-256, UseType, category and MissionItem
value. The host resolves both mutable inventories before planning a record.
NPC inventory initialization uses the existing Ardea source actor bridge;
Hero new-game inventory replays the 121 original `AssureItemsEx` startup calls
from the validated player seed.

Execution follows the recovered Script_Game opcode-13 flow: assure at least the
requested amount at quality 0, use the returned stack index, clamp only for a
player donor, then transfer into the recipient before reducing the donor.
Before enabling a transfer, the browser scans all 641 loaded quest definitions
for type 0/11 delivery records whose destination is either participant and
whose target entity is exactly `It_Gold`. A possible match keeps the response
unavailable because `gCQuest_PS::OnReceiveItem` can change delivery counters
and trigger quest success. Other item templates and participant combinations
remain gated. After success the browser shows a simple gold transfer receipt;
native localized Given/Taken messages are still host work.

The Hero save now includes a mutable inventory snapshot. NPC combat saves
already retained initialized actor inventories; transferred source template
records are kept in those snapshots so both ends survive reload. Saves created
before the Hero snapshot existed rebuild the 121-stack source inventory and
restore their separately recorded consumed-potion counts. The source observer
registry is still supplied as an explicit empty browser registry; this does
not reproduce native external listeners, physical ItemWorld objects, equipment
attachment, or the full inventory GUI.

Validation on 6 October 2026: `npm run typecheck` passes, all 997 tests across
111 files pass, and `npm run build` succeeds with 279 modules. Vite reports the
existing 5,265.79 kB application chunk above its 1,200 kB warning threshold.
The inventory evidence producer was rerun against the local completed study
exports and original PE inputs; it records 143 selected entries, 3,306
instructions and 9,188 matched instruction bytes. No deployment or browser
Give interaction was run for this checkpoint. The connected slice is
unpublished and does not establish a complete campaign.

## 62. Connect the bounded Info delivery callback

Historical checkpoint: section 70 corrects the omitted common-tail Say logging,
and section 71 separates delivery preflight from the end callback. The earlier
description of a no-op refers only to quest status preservation.

The native dialogue receipt now includes `gCQuest_PS::CheckDeliveryEntitiesStatus`
at `Game.dll:0x20025bc6`, in addition to the already audited
`gCInfo_PS::AreConditionsFulfilled`, `OnDelivery` and `OnEndInfo` bodies. Its
updated audit has 52 methods, 10,871 instruction records and zero instruction
byte mismatches against the installed PE files. The receipt is
[`native-evidence.json`](../../assets/gothic3/dialogue/native-evidence.json);
the producer is
[`read_dialogue_native_evidence.py`](../../tools/gothic3/read_dialogue_native_evidence.py).
Decompiler listings remain reconstructed references, not original source code.

`AreConditionsFulfilled` requires condition type 8's quest to be Running. For
that condition, `OnDelivery` supports quest numeric types 1 and 4: it compares
the current Info NPC name with delivery targets, increments the first exact
match by one, and calls `CheckDeliveryEntitiesStatus`. When all target counters
meet their amounts, the quest becomes Success. The browser now models that
counter update and completion for those two types, checks the Info's native
`Npc` identity against the active Ardea owner, and preflights any success
rewards before accepting the dialogue. Condition type 7 also runs through its
source no-op `OnEndInfo` branch, allowing its supported commands to finish when
its quest is already Running. Type 9 and other condition-8 quest types remain
unsupported.

This does not start `Ardea_Pocket`. Its captured fresh-world state is Open, its
Jack dialogue requires the quest to be Running, and its native pickpocket
handler is not connected. The handler's decompiled body does not directly call
`RunQuest`; its `Dialog.PickedPocket` property write may still have surrounding
engine effects that have not been traced. The counter callback therefore
remains unreachable through a fresh-game route. Recover the action, property
notifications, quest-start linkage, target inventory and callbacks before
Jack's full reporting sequence can count as playable.

Validation on 6 October 2026: `npm run typecheck` passes and `npm run build`
succeeds with 279 modules in 25.66 seconds. It retains the
existing 5,265.79 kB Tervain chunk warning above the 1,200 kB threshold.
`git diff --check` passes. No tests, browser interaction, save/reload dialogue
sequence or deployment was run for this checkpoint. The code remains
unpublished and does not establish full campaign completion.

## 63. Trace the native PickPocket command without assuming quest startup

The byte-audited Script_Game receipt now includes `PickPocket` at
`0x1004db60`, `GeneratePickpocketInventory` at `0x1004d8f0`, and the failure
response at `0x10041af0`. Its total is recorded in
[`native-evidence.json`](../../assets/gothic3/dialogue/native-evidence.json).
The decompiler listing and function-table mappings are local study references;
the receipt compares selected instruction bytes with the pinned installed
Script_Game.dll.

The decompiled PickPocket path reads the target's `LevelMax` and
`PlayerMemory.Theft`. For target levels 30–44 it requires `Perk_PickPocket_2`;
from level 45 upward it requires `Perk_PickPocket_3`. Its standard player path
compares `GetRandomNumber(100)` with `Theft / 2 - targetLevel + 85`, capping the
target level at 50. Success processes TreasureSet1 through TreasureSet5, sets
the target's `Dialog.PickedPocket` property, and increments the enclave's crime
count when the target belongs to one. The helper only generates an item for
treasure distribution 7; the failure path asks the NPC to attack or flee
according to native state and ends the Info manager.

Neither the audited PickPocket body nor its loot helper directly calls
`RunQuest`. The property setter notifies engine listeners, so the absence of a
direct call does not prove there is no indirect quest-start path. Jack's Info
data includes condition-7 event response and condition-8 delivery records,
both of which require a Running quest, while the captured fresh-world quest is
Open. The extracted Info catalog has explicit `Pickpocket` commands for
PC_Hero and Ali, but none for Jack. The handler may still be called by
interaction logic outside Info records; that caller remains untraced. The
browser still exposes no pickpocket action; the property-listener chain, live
random-call order, item transfer and quest transition need separate
source-backed work before this becomes a playable Ardea route. Checkpoint 64
added bounded TypeScript helpers for the perk/level/roll gate and distribution-7
loot. The browser action was connected later in checkpoint 66; the native
InfoManager command lifecycle, failure response, crime effect and quest-start
listener are still unresolved.

Validation on 6 October 2026: the evidence producer completed against the
installed PE inputs with 59 methods, 11,721 instructions and zero instruction
byte mismatches. No browser action or quest behavior changed in this
checkpoint. No deployment was run; the changes remain unpublished.

## 64. Port the bounded PickPocket gate and loot generator

`src/gothic3/pickpocket.ts` implements the evidenced level/perk check and
success comparison as a pure TypeScript plan. It requires PickPocket II for
target levels 30–44 and PickPocket III from level 45 onward, caps the threshold
difficulty at level 50, and compares the injected 0–99 roll inclusively with
`trunc(Theft / 2) - difficulty + 85`. Unknown perk state stays unsupported.
The plan does not draw random numbers or change a player or NPC.

`native-treasure-sets.ts` now resolves distribution-7 stack amount, quality and
item-template identity from hash-checked source records. Its loot helper
selects a configured candidate and calculates its amount using the audited
`GetRandomNumber` behavior: bounds below two return zero without consuming a
draw; a generated zero amount becomes one. The source quality is preserved.
This extends data recovery and a bounded behavior kernel, not the live theft
flow.

The PickPocket tests cover level/perk boundaries, the inclusive roll, the
level-50 cap, distribution-7 candidate/amount/quality handling, small-bound
random behavior and invalid input. Validation on 6 October 2026:
`npm run typecheck` passes and
`npx vitest run tests/gothic3-dialogue/native-pickpocket.test.ts` passes six
tests. No PickPocket action, actor response, inventory transfer, enclave crime,
property-notification or quest-start chain is connected at this checkpoint.
The helpers do not make Jack's `Ardea_Pocket` dialogue reachable. No deployment was run; the
changes remain unpublished and do not establish campaign completion.

## 65. Persist the source-backed PickedPocket actor flag

The visible-Ardea actor reader already decodes `gCDialog_PS.PickedPocket`.
`NativeArdeaActorDialogState` now seeds that flag alongside the other serialized
dialog state and can retain a bounded browser value for an exact actor ID. The
quest-session save records positive PickedPocket IDs, validates them against
the loaded source actors on restore, and preserves source defaults when an
older save does not cover a newly added actor.

This is persistence for the native property value, not its complete engine
effect. The `SetPickedPocket` setter notifies property listeners; the browser
state store does not dispatch that listener chain. At this checkpoint no player
action calls this setter, and no inventory transfer, failure response, enclave
crime increment or quest-start notification has been connected.
`Ardea_Pocket` remains unreachable through this state-only change.

Validation on 6 October 2026: `npm run typecheck` passes and the focused
actor-dialogue and Hero save/restore suites pass 15 tests across two files.
`npm run build` succeeds with 322 modules. The Gothic route bundle is
896.47 kB; the existing Tervain bundle is 5,628.27 kB and triggers Vite's
1,200 kB warning. `git diff --check` passes. No deployment was run; the change
remains unpublished and does not establish a playable PickPocket route or
campaign completion.

## 66. Connect source-backed PickPocket loot to Hero inventory

The Ardea character panel now offers a browser PickPocket action for actors
with source dialog state. The action reads the Hero's current `PlayerMemory`
Theft value and the target's source `LevelMax`, applies the source level/perk
gate before drawing randomness, and uses the saved browser random stream for
the bounded outcome roll. Unknown high-level perk state blocks the attempt
before a roll. On success, the selected distribution-7 treasure candidates
are resolved against their source templates and appended to the Hero's mutable
inventory. Their exact stack identity, quality and amount survive save and
restore. The target's `Dialog.PickedPocket` flag is also persisted by exact
actor identity.

This is an interactive browser adapter around the audited gate and loot data;
it does not reproduce the native InfoManager command lifecycle or its process-
global random sequence. Failure/caught responses and the enclave crime effect
are absent. Although setting `Dialog.PickedPocket` is saved, its property
listeners are not dispatched, and the native quest-start caller remains
untraced. Therefore `Ardea_Pocket` stays Open and Jack's condition-7/8 report
sequence remains unreachable in a fresh game. This feature advances one
source-backed interaction; it does not make the Ardea campaign route or Gothic
3 complete.

Validation on 6 October 2026: `npm run typecheck` and `git diff --check` pass.
`npx vitest run tests/gothic3-dialogue` passes 81 tests across 21 files.
`npm run build` succeeds with 323 modules; the Gothic bundle is 905.22 kB and
the existing Tervain bundle is 5,628.27 kB, which triggers Vite's 1,200 kB
chunk warning. No deployment was run; the changes remain unpublished.

## 67. Persist defeat for the starting Ardea Raiders

`browser-melee.ts` now allows the audited Hero fist calculation for exactly
the 15 placed `Orc_GameStartRaider_Warrior_01..05` and
`Orc_GameStartRaider_Scout_01..10` identities. The Raider GUID/name mapping is
pinned to the Ardea NPC `.lrentdat` path and SHA-256. Its target profile
requires the source species, type and level fields, an empty serialized
inventory, no status effects or attacker, a resolved non-robe armor template,
and source-resolved treasure sets. The Hero's combat profile comes from the
hash-checked initialized `PC_Hero` source seed; this avoids treating missing
fields in the sparse live NPC reader as zero. Other people and altered source
records remain unsupported.

Resolved hits update the browser NPC combat state. At zero HP the Raider's
rendered object is hidden, and save restore hides it again from persisted HP.
The Raider remains a saved zero-HP actor; the browser does not run its native
death animation or callback. The implementation does not add NPC activation,
enemy AI or attacks, native hit eligibility, death events, XP, kill credit,
loot or quest effects. It is a persistent damage/visibility slice, not a native
combat encounter loop.

Validation on 6 October 2026: `npm run typecheck` passes, and
`npx vitest run tests/gothic3-dialogue/browser-melee.test.ts` passes. The test
checks all 15 placed Raiders receive a resolved hit, then defeats one and
verifies zero HP survives NPC combat save/restore. The full
`npx vitest run tests/gothic3-dialogue` suite passes 82 tests across 22 files;
`npm run build` succeeds with 323 modules. The Gothic bundle is 907.98 kB and
the existing Tervain bundle is 5,628.27 kB, triggering Vite's 1,200 kB chunk
warning. `git diff --check` passes. No deployment was run; the work remains
local and unpublished.

## 68. Dispatch bounded NPC kill-objective counters

Historical checkpoint: section 70 supersedes this counter-only interpretation,
its signed bounds and its assumption that Raider zero HP establishes a kill.

The source-verified `gCQuest_PS::OnNPCKilled` behavior handles Open, Running
and Lost quests, ignores `PC_Hero`, and increments counters for exact NPC-name
matches. `NativeQuests.recordNpcKilled` now ports that counter update for
numeric-type-2 kill objectives. It validates all matching amounts and
signed-32-bit counters before applying changes, then publishes the changed
quest states through the existing listener/save path. It leaves unrelated
quest types and terminal statuses alone and retains exact case-sensitive names.

When the bounded Hero fist hit reduces one of the 15 source-pinned starting
Raiders to zero HP, the browser passes that source actor name to the callback.
The updated quest counters are serialized in the existing quest-session save.
This is a direct browser dispatch from the lethal hit; the native event source
and cache, Kill/Defeat task acceptance, quest auto-completion behavior, defeat
XP, full quest rewards and NPC AI remain unimplemented. In particular, this
does not make `Ardea_Revolution` complete: its source objective is an Ardea
enclave target, not a matching Raider-name kill objective.

Validation on 6 October 2026: `npm run typecheck` passes, and
`npx vitest run tests/gothic3-dialogue/npc-kill-quests.test.ts
tests/gothic3-dialogue/browser-melee.test.ts` passes five tests across two
files. The tests cover the real source `Jack_KillBandits` target and saved
counter restore, Open/Running/Lost states, exact-name matching, Hero exclusion,
unresolved targets and overflow; the browser combat test checks all 15 Raider
hit profiles and zero-HP save/restore. `npm test` passes 1,705 tests across
168 files on the current `main` base. `npm run build` succeeds with 324 modules.
The Gothic bundle is 909.55 kB and the Tervain bundle is 5,638.85 kB, triggering
Vite's 1,200 kB chunk warning. Typecheck and `git diff --check` pass. No
deployment was run; the work remains local and unpublished.

## 69. Start Jack's source-backed bandit quest

Historical checkpoint: section 70 adds quest success and the return callback,
and corrects the condition-5 Say-log behavior described here.

Jack's Ardea Info chain first sets `Jack_NiceTower`, then the condition-5
`BPANKRATZ31461` report records `Jack_BanditsThrere` without changing the Open
quest. The following condition-6 `BPANKRATZ31462` entry runs
`Jack_KillBandits`. The live dialogue lifecycle now accepts that condition-5
no-op callback, and the existing condition-6 callback stores the quest start
time. The report event and Running quest state survive the browser save.

This connects the quest's start to the existing lethal-hit counter path, but
does not claim the whole quest works: Kill/Defeat task acceptance, automatic
quest success, defeat XP and the condition-10 return-reward lifecycle are still
unconnected.

Validation on 6 October 2026: `npm test` passes 1,707 tests across 168 files,
including the source Info IDs, event gates, condition-5 state preservation,
condition-6 transition, and save/restore. `npm run build` succeeds with 324
modules; the Gothic bundle is 909.91 kB, and the existing Tervain bundle is
5,638.85 kB with the 1,200 kB chunk warning. The build includes TypeScript
checking, and `git diff --check` passes. No deployment was run; the work
remains local and unpublished.

## 70. Connect Jack's bandits and correct native quest callbacks

The next slice follows `Jack_KillBandits` from its source Info records through
its exact target actors and completion rewards. The preparation script now
includes `Ardea_OutNovice_01`, `Ardea_OutNovice_02` and `Ardea_OutNovice_03`
from the patch-winning source:

```text
Projects_compiled.p00 ::
G3_World_01/SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}/
SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}.lrentdat
SHA-256: 28f7273b3d54415b84445651a3dfa962c1ff158e9183deba81ba47e4d5d57938
Entities: 22138, 22141, 22144
```

The actors retain their recorded world transforms, body/head slots and material
switches. Four new converted model variants and one diffuse image extend the
scene to 70 people, 134 models and 140 textures. The 409 output receipts resolve
to the prepared bytes; existing model and texture bytes remain unchanged.
The scene contains 202 world instances and 652,328 triangles across unique
model assets, with a 132,962,888-byte model/texture payload.

The native behavior study also corrected two earlier interpretations:

- `Game.dll::OnNPCKilled` at body `0x203384f0` handles quest types 2/3/4.
  It increments every exact-name matching counter, then invokes the delivery
  completion checker. Counters wrap through all 32 bits; completion compares
  counters and amounts as unsigned values. Open/Running completion can request
  Success and its rewards. Lost quests retain Lost because the status setter
  rejects that transition.
- `Game.dll::OnEndInfo` at body `0x204383b0` appends common-tail Say pairs for
  conditions 3/4/5/6/7/8/10/11/19. Conditions 5/7/8/10 preserve status but still
  log. The browser supports the evidenced cases whose predicates and commands
  are connected; condition 4's overtime predicate remains unavailable.

[`quest-state.ts`](../../src/gothic3/quest-state.ts) now projects kill counters
and pending completion effects before mutation. The browser preflights those
effects, applies supported rewards once and persists the final quest state.
This is a browser aggregate operation; native observer interleaving across
multiple quest callbacks is not reproduced. The evidence producer and updated
[`dialogue/native-evidence.json`](../../assets/gothic3/dialogue/native-evidence.json)
audit 61 methods and 12,128 instructions with no native byte mismatches.

The bandits' serialized Outlaw alignment resolves their directed attitude
against the humanoid Hero to 4 in `Script_Game::GetOutlawAttitude` at
`0x10018070`. That permits the bounded damage profile to resolve a lethal
disposition. Raider disposition remains unknown; their zero-HP visuals still
hide, but the browser does not send a kill callback for them. This preserves
the distinction needed by the quest instead of deriving a native kill from HP
alone. The combat evidence now audits 154 entries, 12,584 instructions and
44,088 matching bytes.

Three source-directed bandit callbacks can complete `Jack_KillBandits` and
award its requested XP 100 through the audited GiveXP multiplier, yielding
500 Hero XP. The Success state unlocks Jack's original condition-10
`BPANKRATZ31463` return Info, whose connected commands transfer 50 gold and
request XP 50, yielding another 250 XP. These are quest and dialogue rewards;
native defeat XP has not been connected. The previously supported condition-5
report and condition-6 start share the same quest, actor flags and save state.

Local browser review on 6 October 2026 loaded the 70-person scene and inspected
all three bandits with their exact source body/head pairs. The models have
11,280, 14,294 and 11,232 triangles respectively; the first model's rotation
control was observed running. This verifies asset presentation and startup. It does not
establish a browser playthrough of all three kills and the return conversation.
Native NPC activation, routine/task acceptance, AI, incoming attacks, death
animation, defeat XP, loot and the campaign remain unfinished.

## 71. Preserve browser action and save consistency

Connecting quest callbacks exposed boundaries that also need to survive ordinary
browser use. [`live-dialogue.ts`](../../src/gothic3/live-dialogue.ts) now checks
the delivery phase before delivery and the end phase at `OnEndInfo`. A completed
condition-8 delivery must not be projected a second time at dialogue finish;
otherwise its newly successful quest rejects the callback and loses its Say log.
Focused regressions cover completed delivery with one reward, incomplete
delivery without a projected next reward, and mismatched callback identity.

The source-backed Jack return scenario also exposed an inventory participant
identity mismatch. Dialogue represents the Hero as `PC_Hero`, while native
inventory transfers require his 20-byte entity GUID. The host resolves that
GUID from the retained, hash-checked Hero source profile before transfer; the
dialogue's symbolic participant remains available for its own predicates.
This is exercised by the real 50-gold reward, including the donor's native
`AssureItems` behavior when his initial stack contains less than the reward.
Hero seed templates and NPC templates also retain different source receipt
shapes. The inventory now compares their native GUID, exact path and SHA-256,
archive identity when both receipts declare it, and intrinsic item properties.
Equivalent receipts can merge the same gold or PickPocket item; conflicting
identity or properties remain rejected.

[`browser-pickpocket.ts`](../../src/gothic3/browser-pickpocket.ts) owns a shared
per-actor in-flight guard across interaction panels. Reopening a panel while
source assets load cannot initiate a duplicate theft. The health-potion action
now consumes from the current mutable inventory, with a post-load amount check,
so newly received potions are usable. Older consumed-item overlays migrate once;
new saves preserve the actual remaining stacks. Consumption is limited to the
audited browser-owned, unlinked stacks with no equipped/physical items or
unconnected inventory observers.

The interaction selector also excludes hidden and zero-HP actors and checks
that state again before opening a conversation. The model inspector remains a
source exhibit and can inspect those models separately from world interaction.

Adding the three bandits changes the scene's saved actor identity. Restore now
accepts the canonical previous 67-actor receipt only when every existing actor
and source file hash matches the current 70-actor source roster. Exactly the
three pinned bandits may be added; altered names, removed actors, unexpected
additions, changed hashes or injected new-actor flags are rejected. Existing
actors retain their saved dialogue flags and game state, and the new bandits
receive their serialized source defaults. Saves with the current receipt restore
all scene actor flags; receipt-less legacy saves retain the earlier migration.

The source-backed automated Jack scenario executes the original
`BPANKRATZ31460 → 31461 → 31462` dialogue chain through the browser host, then
the three target callbacks and `BPANKRATZ31463`. It verifies 500 quest XP, the
50-gold/250-XP return reward, all 12 quest Say pairs, Given-state replay
rejection and restoration of both inventories, quest state and Hero progress.
Additional cases exercise a real PickPocket candidate merging into an existing
Hero stack and reject GUID/path/hash/archive/property conflicts. This is an
automated host scenario; the complete encounter has not been played manually
in the browser.

Final combined validation on 6 October 2026, after integration with `main`
`59854ed6`: `npm run typecheck` passes; `npm test` passes 1,760 tests across
176 files; `npm run build` succeeds with 336 modules. The Gothic bundle is
919.55 kB and the existing Tervain bundle is 5,701.33 kB, retaining the 1,200 kB
chunk warning. All 206 checked relative documentation links resolve, and
`git diff --check` passes. Local browser review also confirms a saved journal
and world clock restore, with Hero HP 100/100. Publication uses the existing
Pages workflow; these local checks do not establish original-game equivalence
or a completed campaign.

## 72. Schedule the bandit death state and preserve its applied prefix

This checkpoint replaces the hit handler's immediate kill-objective update
with the recovered state path for Jack's three exact source bandits. A fatal
hit updates live attacker fields and HP, performs `FullStop`, and calls the
Script `PSRoutine::SetTask` wrapper with `ZS_RagDollDead`. Scheduling emits no
quest event. A later application frame runs the original script-processor
dispatch and the registered death-state body. The frame position advances
before the one-time operations, independently of the routine property's
state-position and time fields.

The new [`npc-death-lifecycle.ts`](../../src/gothic3/npc-death-lifecycle.ts)
ports ordered Kill/Defeat and death-state operations behind explicit host
boundaries. [`browser-npc-death.ts`](../../src/gothic3/browser-npc-death.ts)
connects only the selected empty-hand humanoid bandit profile. Its retained
live properties are separate from immutable source records. Empty effect,
interaction, hand-item, party and combat branches require their actual source
and live state; missing rendered weapons or a global actor scan cannot prove
those branches. Nonempty branches remain unavailable.

The source bandits contain native VisualAnimation, collision-shape and
rigid-body classes. This bounded browser host has not attached those native
services to its static Three.js owners. ResetAll therefore selects explicit
absent attached VisualAnimation/control/DCC/collision and null physical-object
branches; it does not assert those source classes are absent. The owned
movement set still receives alignment and ground-target writes, including the
float32 null-ground offset calculated from the source StepHeight 65.

Before Kill, the humanoid state attempts the original `DEAD` speech category.
[`prepare_svm_data.py`](../../tools/gothic3/prepare_svm_data.py) reads the
effective `Strings.p00/SVMAdmin.dat`: 28,188 bytes, SHA-256
`018295b8a7ae06e45dcb8ce9816b1fe65f672aeecbc93de5308a3af3aa884943`.
It retains 54 voices, 15 categories and 581 label/text pairs, plus the 31
trailing bytes separately from the 648 declared indexed strings. The checked
local `ge3.ini` selects English audio. Prepared arrays represent successfully
read native manager contents; native hash-bucket allocation and shutdown
lifetime are not implemented.

[`native-speech-output.ts`](../../src/gothic3/native-speech-output.ts) owns
the actual browser storage for the native 20-byte channel and 16-byte sound
wrappers. Their constructor writes and retained SPU identities execute before
the explicitly absent native AudioModule branch returns false. Playback does
not occur. The void Script wrappers ignore that result, and the admitted
SaySVM category returns true. Absence of native VisualAnimation does not skip
this speech prefix. The wrapper allocations and shared speech timestamp are
saved with the scheduled actor.

Kill's connected prefix runs cleanup, writes AIMode 9, dispatches the quest
event, then reads the Hero's current progression for defeat credit and XP.
It awards 50 defeat XP per bandit and sets `DefeatedByPlayer`. On the third
kill, the quest's 500 XP reward therefore precedes the final 50 defeat XP.
The prefix then stops explicitly at the unconnected `NotifyEnclave` callback.
Destination reset, plunder cleanup, ragdoll and the complete death lifecycle
are not represented as successful no-ops. Raiders still have an unresolved
kill-versus-knockout disposition and receive no kill credit at zero HP.

NPC save schema v3 retains source-separated live fields, pending SPU/frame
state, speech objects, shared loader globals and the selected browser playing
time. A scheduled save can reattach its not-yet-executed state. A blocked prefix
restores inertly, retaining its applied quest/XP changes without replay. Legacy
v1/v2 zero-HP actors and current unscheduled zero-HP actors have distinct inert
markers. The browser's outer save key remains `gothic3:ardea:game:v2`.
Hero XP history also retains an ordered scalar-prefix receipt if execution
stops between XP, Level and learning-point writes. Restore validates that exact
prefix against the recovered progression plan and applies only recorded
writes; it does not invent the remainder of a level-up. Complete awards retain
the existing numeric replay representation. This covers observer or browser
presentation failures during an award as well as the later enclave boundary.

The source receipt
[`npc-death-native-evidence.json`](../../assets/gothic3/combat/npc-death-native-evidence.json)
audits 108 method entries with 8,235 body-instruction references against the
installed PE bytes, with zero byte mismatches. Aliases repeat some bodies;
the receipt identifies 7,638 unique physical instructions. Its SHA-256 is
`b6001504b3f50d62a88888fd418d2309d1e49c79c7276b5eee55147541bff001`. The
separate [bandit source receipt](../../assets/gothic3/combat/bandit-death-source-evidence.json)
audits full source class boundaries, exact empty Party member tails, movement
fields and the two serialized collision shapes for each selected bandit. The
separate [Script SetTask receipt](../../assets/gothic3/routines/script-set-task-evidence.json)
records its forwarding entry, 72 instructions, 214 body bytes and freeze-name
gates. Reproduction uses the read-only local study:

```powershell
python tools/gothic3/read_npc_death_native_evidence.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
python tools/gothic3/prepare_bandit_death_source.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
python tools/gothic3/prepare_svm_data.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04" --ini "C:\Program Files (x86)\Steam\steamapps\common\Gothic 3\Ini\ge3.ini"
```

Automated browser-host scenarios use actual source bandits and fist hits to
exercise later-frame scheduling, quest-before-defeat-XP ordering, retained
speech allocation, pending restore and blocked-prefix restore. They establish
these bounded operations, not a manual full encounter or campaign playthrough.
Native NPC activation, AI, incoming attacks, knockout behavior, enclave and
corpse services, most quests and the endings remain incomplete.

Combined validation on 6 October 2026: `npm run typecheck` passes;
`npm test` passes 1,854 tests across 182 files; `npm run build` succeeds with
346 modules. The Gothic bundle is 1,129.03 kB; the existing Tervain bundle is
5,701.33 kB and retains its 1,200 kB chunk warning. All 218 checked relative
documentation links resolve, and `git diff --check` passes. Production browser
review verifies startup, source bandit model selection/rotation/wheel zoom and
restoration of position, clock and journal, with HP 100/100 and no captured
console warnings or errors. The complete three-kill encounter remains an
automated browser-host scenario rather than a manual browser playthrough.

## 73. Construct retained NPC owners and reach the first property factory

This checkpoint begins replacing detached source-seeded NPC facades with
retained entity storage. It does not bypass native prerequisites to make a
death callback appear complete. The browser loads the exact three bandit
records, allocates each through the existing source-backed entity factory,
and follows the original Dynamic/Entity/Node read sequence on that same owner.
The constructor first obtains a platform GUID; Node.Read then unregisters it,
reads the original identity, clears its cache DWORD and registers the same
object under the source identity. Source IDs are not constructor GUIDs, and
rendered groups are not registry entries.

[`prepare_npc_entity_source.py`](../../tools/gothic3/prepare_npc_entity_source.py)
keeps three complete 6,544-byte records, all 48 property packets in source
order, 6,069 indexed strings, and the original SysDyn context's 26,927
identities and 26,926 parent edges. The original 80,176,690-byte source has
SHA-256 `28f7273b3d54415b84445651a3dfa962c1ff158e9183deba81ba47e4d5d57938`.
The browser package is 1,176,387 compressed bytes and 5,492,461 decoded bytes;
both receipts are recorded. Available wire bytes and all decoded bytes are
verified before admission; HTTP gzip decoding can hide the compressed bytes
from Fetch, in which case the exact decoded receipt is checked. Context
metadata establishes source relationships, including the unique parentless
index-zero record. It does not
attach a graph or supply the other entities' complete contents.

The new [`browser-npc-entity.ts`](../../src/gothic3/browser-npc-entity.ts)
retains constructor/reflection allocations, original read traces and registry
state. Fresh SceneAdmin counter and table seeds have their own byte-checked
constructor evidence. GUID and monotonic timer services use explicit browser platform
adapters. Matrix.GetIdentity uses the shared control module's actual lazy
cache. The [platform service](../../src/gothic3/browser-npc-entity-services.ts)
retains the original Matrix shutdown callback and its module before reporting
registration success. Explicit disposal invokes callbacks in reverse order
once. The source callback is a literal `RET`, so cache and guard remain intact.
This adapter does not reconstruct native CRT encoding, allocation, locks or
process termination, and does not promise page-unload delivery.

Navigation is property packet zero, before NPC and Routine. Its concrete
factory constructs, creates and initializes the Navigation property defaults.
The default creator then calls the native ErrorAdmin singleton. The browser
does not own that singleton's initialization, MemoryAdmin allocations,
MessageAdmin callback registration and nonempty shutdown callback, so the
read stops at byte cursor 338 of 6,544. Returning a guessed nonpanic flag would
skip those required effects.

The serialized Navigation packet has not been read and neither SetEntity nor
OnAdded has run. Each partial Navigation wrapper retains reference count 2;
the entity's property array and NavigationAdmin lists remain empty. Each bandit
has an independent guarded read, and a retained partial preparation is not
replayed. NPC and Routine cannot be attached ahead of Navigation.

After ErrorAdmin is connected, later prerequisites still include the original
application-mode getter: the native path checks the shared application
initialized flag, obtains the first registered `gCSession` module through
ModuleAdmin/RTTI and reads its game-running byte. A menu flag cannot replace
it. Setting the initialized flag false while supplying a nonnull original
SceneAdmin would combine incompatible startup states.

Source template admission now has a separate `templateByPropertyId` helper.
It uses the first 16 bytes of a native 20-byte PropertyID, preserving duplicate
headers as ambiguous; it never manufactures or registers a live template.
The original entity-read adapter also binds the setter receiver correctly,
so serialized flags and recursive alpha changes reach the retained storage.

The [native evidence](../../assets/gothic3/npc-entity/native-evidence.json)
revalidates 44 methods from existing receipts and adds 14 method bodies plus
the one-instruction Matrix callback: 1,679 instruction references, zero PE
byte mismatches. The source manifest and receipt record all input hashes and
packet boundaries. Reproduction uses the read-only local study:

```powershell
python tools/gothic3/prepare_npc_entity_source.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
```

The existing browser combat/death bridge remains a separate bounded runtime.
These owners do not yet provide attached NPC/Routine properties, graph context,
cache residency, processing-range registration, physics, AI or native death
resolution. Their partial source read is not serialized as a completed actor
or substituted for the existing NPC save state. The next gate is owning the
actual ErrorAdmin singleton and its initialization and shutdown services,
then the application/module/session service and source-ordered property
factories, callbacks, PostRead and activation path before routing gameplay
through these owners.

The Models inspector exposes these facts under the collapsed **Original entity
study · developer details** section when one of Jack's coastal bandits is
selected. It reports the real source ID, read cursor, attached property count,
Navigation ownership, graph context and current boundary. Loading this study
does not gate exploration, browser combat, quests or saving. The visible model
and existing browser combat/death state still have separate owners.

Focused validation passes 22 cases for actual source owner reads,
partial-state retention, GUID remapping, Navigation default initialization,
template PropertyID equality, setter receiver binding and shutdown storage.
Combined local validation on 6 October 2026: `npm run typecheck` passes;
`npm test` passes 1,876 tests across 186 files; `npm run build` succeeds with
361 modules. The entity study and platform services use separate dynamic
chunks; the Gothic entry is 1,148.99 kB (258.69 kB gzip). The existing Tervain
bundle remains 5,701.33 kB and retains its 1,200 kB chunk warning. All 231
checked relative documentation file links resolve, and `git diff --check`
passes. Production-preview browser review confirms all three registered source
owners at the exact 338-byte boundary, zero attached property sets and null
graph context. It also checks wide/narrow Inspector scrolling, model rotation,
wheel zoom, exploration and save/reload. The applied constructor/read prefix
is separate from saved browser combat state. No captured browser warnings or
errors are reported. These are bounded observations; native NPC activation
and a full original encounter remain incomplete. This checkpoint was merged as
`0a439f819cfe51b20180765df8c58d278df4fa6b` and published by successful main-branch
[run 37520227542](https://github.com/ael-dev3/Tervain/actions/runs/37520227542).
The public route was checked serving `gothic3-siaPiAJn.js`; the separate local
browser exercises above establish its observed component behavior.

## 74. Own the shared runtime admin chain before connecting it to NPCs

The next component reconstructs the dependency at checkpoint 73's first
property-creator cleanup. The original ErrorAdmin does more than read two
flags: its first GetInstance sets a static guard, initializes a critical
section, runs Create and registers a nonempty shutdown callback. Create begins
with Destroy, which requests MessageAdmin even when all ErrorAdmin holder
pointers are NULL. MessageAdmin initializes its own heap-backed callback
array, asks ErrorAdmin again, and starts the Spy and Spie diagnostic admins.
The recursive ErrorAdmin call returns the same in-progress pointer; this call
does not read its panic flags. Treating the chain as a constant `false` skips
those effects.

This checkpoint adds separate source-owned modules:

| Module | Retained state and supported behavior |
| --- | --- |
| [`native-memory-admin.ts`](../../src/gothic3/native-memory-admin.ts) | Shared singleton flags; heap critical section; admitted small-pool bitmaps, descriptors and counters; medium block splitting/coalescing; allocation, reallocation and free through actual retained region views. |
| [`native-message-admin.ts`](../../src/gothic3/native-message-admin.ts) | Message/Spy/Spie cold guards and fields; actual callback holder/backing; source registration, growth and removal; disabled diagnostic callback prefixes; nonempty shutdown bodies. |
| [`native-error-admin.ts`](../../src/gothic3/native-error-admin.ts) | The 44-byte ErrorAdmin and guard; actual CRT holders and 12,500-byte history allocation; exact byte-equals-1 panic checks; four ASCII formatter paths; the 50-entry, 250-byte history ring; callback removal and shutdown. |
| [`native-runtime-platform.ts`](../../src/gothic3/native-runtime-platform.ts) | Explicit bounded CRT/VirtualAlloc storage, known-byte masks, pointer capabilities, selected region ordering, critical-section lifetimes, scoped diagnostic registries and retained reverse-order shutdown callbacks. |

`createNativeRuntimeAdminOwner()` creates one shared MemoryAdmin, MessageAdmin
and ErrorAdmin with those platform services. Both Error-first and Message-first
cold startup are exercised. Internal pointer-only recursion uses the actual
same owner. An external panic read during partial construction remains
unknown. A blocked initialization retains its guard and applied prefix and
does not replay it on a subsequent service call.

ErrorAdmin history uses the actual MemoryAdmin allocation, not a second JS
string queue. The three CRT holders retain their byte storage, masks and free
state. Error messages format into an owned temporary CRT buffer, copy at most
249 bytes to the original 250-byte scratch area, and push into the physical
ring. A full ring pops its oldest entry into the other original scratch area
before pushing. Native NUL termination and signed 32-bit line formatting are
preserved for the selected ASCII profile. Other C-string encodings remain
unowned. The scratch addresses, formatter literals and source methods are
admitted from the original bytes.

MessageAdmin's holder is a tagged 12-byte native allocation. Its first callback
growth requests 108 bytes and uses the admitted 112-byte pool. Callback
function addresses and priorities are written into the actual array records;
the browser retains userdata capabilities without inventing x86 pointer
values. Spy registers its callback even when its scoped window query returns
NULL. Spie does not register its callback when the scoped `zSpie.txt` query
returns NULL. The disabled callback prefixes return their source values;
active CString/window/socket logging remains explicitly unported. The helper
for invoking an actual registered callback is not the full native
MessageAdmin.OnMessage dispatch routine.

The selected platform is an owned execution profile. Virtual regions start
with known zero bytes; CRT buffers start with unknown content masks until
source writes establish values. Critical-section storage becomes opaque after
initialization, while the platform retains its actual section capability,
entry depth and lifetime. Diagnostic queries use scoped window and file
registries. These services do not reconstruct or report the installed game's
Win32 allocation addresses, native critical-section internals, process-wide
threading or actual host diagnostic state.

Shutdown registrations retain their real module owner and implemented
callback before returning zero. Explicit disposal drains them in reverse
order once. Error-first startup registers Memory, Spy, Spie, Message and Error
callbacks, so disposal destroys Error's history/holders and removes its
callback before destroying Message's array. The source Memory callback clears
its owned NULL CString prefix and resets the source singleton bytes; it does
not free all heap regions. Dump-enabled or non-NULL CString shutdown branches
remain unsupported. A blocked shutdown retains the executed prefix and does
not replay it. Native CRT callback encoding, locks, process termination and
page-unload delivery are outside this selected platform.

### Preserve a compatible allocation history

These standalone admins are **not connected to the browser NPC reader yet**.
The audit found that allocations before the ErrorAdmin request use the same
original SharedBase heap:

| Earlier source operation | Request and consequence |
| --- | --- |
| Entity factory | 448-byte tagged allocation before `gCEntity` construction. |
| Navigation reflection wrapper | 16-byte tagged allocation before wrapper construction. |
| Navigation native object | 688-byte tagged allocation, dispatched to the 768-byte pool. |
| Selected SceneAdmin registered map constructor | Grow request 43 plus native growth slack 8 gives 51 DWORDs, so Realloc requests 204 bytes and dispatches to the 224-byte pool; 43 active buckets are initialized. |
| New registered PropertyID | A 28-byte tagged map node is allocated. Node.Read unregisters/frees the constructor ID node and registers another node for the serialized source ID. |
| Source name registration | The new name path allocates temporary and resident 36-byte pointer arrays and a tagged 20-byte name-map entry, then frees the temporary array. The name map has separate 204-byte bucket backing; native CString assignment and hashing need their own owners. |

The existing retained entity factory and scene table preserve logical source
state under selected successful-allocation hosts. They do not route all those
preceding allocations and writes through the new MemoryAdmin. Attaching an
independent cold allocator only when ErrorAdmin is reached would combine
incompatible source startup states. The next gate is to make actual entity,
wrapper, native property and selected scene-map backing share this heap and
retain the original allocation/free order. The full SceneAdmin constructor
and module getter need their own wider ownership audit; supplying the selected
registered table does not establish that complete singleton startup.

The browser therefore still stops at cursor 338 of 6,544 with zero attached
property sets and null graph context. This checkpoint does not claim an NPC
activation, additional gameplay, a completed death path or campaign progress.
After allocation ownership, the application/module/session getter and later
property readers, callbacks and activation still remain separate gates.

### Reproduce the source admission

The [producer](../../tools/gothic3/prepare_runtime_admin_source.py) reads the
original SharedBase, Game and Engine DLLs and their saved study without
executing native code:

```powershell
python tools/gothic3/prepare_runtime_admin_source.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
```

The [manifest](../../assets/gothic3/runtime-admin/manifest.json),
[runtime rules](../../assets/gothic3/runtime-admin/runtime-rules.json) and
[native evidence](../../assets/gothic3/runtime-admin/native-evidence.json)
pin original input SHA-256
`5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214`.
Bounded C/assembly excerpts, literal strings, cold storage ranges, heap
dispatch entries and geometry operands are retained with output hashes. The
ErrorAdmin callback is assembly-only in this study; its shutdown also lacks a
C/catalog entry but has exact saved assembly. Admission of a method's bytes
does not imply every branch is implemented. Earlier checkpoint receipts are
unchanged.

The final source admission contains 105 SharedBase method entries: 4,031
instruction records and 3,990 unique physical instructions, with zero PE byte
mismatches. The separate
[prior-startup inventory](../../assets/gothic3/runtime-admin/prior-startup-allocations.json)
checks 21 Game/Engine methods and 888 instructions, also with zero mismatches.
It records the name/ID table allocation calls and unowned CString/map
prerequisites; it does not claim to execute the complete SceneAdmin startup.
The producer was reproduced byte-identically across 225 output files, and 223
referenced source excerpts were rehashed.

| Output | Bytes | SHA-256 |
| --- | ---: | --- |
| Runtime rules | 287,330 | `64f3cabc691a51639fc3d5b320e986bf8372ab50a61a6faa21bb9c58b70375a6` |
| Native evidence | 769,607 | `ad427ca4d4437862d1bb60043612c4ff766d9258ae54576009a90bf1faebde9b` |
| Prior startup inventory | 140,798 | `18e0ed94d3b09a2c73b346c5a4ac29bd99b139317ec43d4777be829bbc8d2ebe` |

Focused validation passes 45 cases across the four new test files. It covers
both singleton bootstrap orders, same-owner recursion, actual pool storage
and masks, all eight admitted small buckets, medium allocation quirks,
callback growth/removal, exact formatter/ring behavior, disabled diagnostics,
retained partial states and reverse shutdown. Failed teardown latches the
Error service as blocked after its applied frees. Its actual registered
shutdown can remove its callback from a later-blocked Message startup without
exposing that partial Message singleton as ready to other callers.

Combined local validation on 6 October 2026: `npm run typecheck` passes;
`npm test` passes 1,921 tests across 190 files in 146.27 seconds;
`npm run build` succeeds with 362 modules in 53.39 seconds. The Gothic entry
remains `gothic3-siaPiAJn.js`, 1,148.99 kB (258.69 kB gzip); these standalone
modules have no application entry import. The existing Tervain entry remains
5,701.33 kB and retains its 1,200 kB chunk warning. Documentation file links
and the staged diff are checked. The new source excerpt directory follows the
repository's byte-preserving Git attributes so its receipt hashes survive
checkout. No additional gameplay or native encounter is claimed from these
isolated admin checks.

## 75. Alias selected NPC fields to the shared heap

Date: 6 October 2026. Scope: isolated allocation and field ownership. The
browser NPC reader still uses its earlier selected allocation profile and
stops at cursor 338 of 6,544. This checkpoint does not attach a property set,
activate an NPC, or add a playable campaign step.

The [NPC heap producer](../../tools/gothic3/prepare_npc_heap_source.py) adds a
new package while preserving the runtime admin receipts from checkpoint 74.
Its [manifest](../../assets/gothic3/npc-heap/manifest.json),
[rules](../../assets/gothic3/npc-heap/runtime-rules.json) and
[evidence](../../assets/gothic3/npc-heap/native-evidence.json) pin 38 fresh
SharedBase methods, 945 unique instructions and zero PE byte mismatches. It
also references 18 previously audited Engine map/name methods. Regeneration
reproduced all 73 output files byte-for-byte without executing native code.

| Output | Bytes | SHA-256 |
| --- | ---: | --- |
| NPC heap rules | 57,822 | `f9fa050a26ec7ec8f476b74ab5ddacbe8fb89fbf55b1397040d2e3c27509e877` |
| NPC heap evidence | 159,948 | `145d1e38e160aee4737f95e2eca3fb8152282993b180049860cea2f6659a3ee6` |

### Physical owners implemented

| Component | Owned behavior and boundary |
| --- | --- |
| [MemoryAdmin extension](../../src/gothic3/native-memory-admin.ts) | A fresh owner can admit the exact source package for the 20/40-byte buckets. Cold ranges, pointer-area storage and all ten admitted buckets use the same heap and critical section. Copies or repeated extension identities are rejected before bootstrap. The base eight-bucket profile remains available. |
| [Heap field views](../../src/gothic3/native-heap-views.ts) | Scalar, bit-mask, PropertyID, float-array and DWORD-array views read/write actual retained bytes and masks. Allocation and region aliases share one canonical pointer slot. Non-NULL browser capabilities keep opaque numerical pointer bits; NULL has known DWORD0. Supported field/iterator accesses check current backing lifetime. |
| [Entity fields](../../src/gothic3/native-entity-heap.ts) and [factory](../../src/gothic3/entity-construction.ts) | An optional isolated host routes tagged-new(448,0x170) through MemoryAdmin before any constructor store. Vtables, IDs, flags, reference count, owner DWORD130, matrices, boxes, spheres, frustum fields and pointer slots alias the same object. Narrow byte/WORD stores preserve adjacent bytes. Empty child/property arrays cannot grow until their physical container operations are owned. SceneAdmin, identity matrix, GUID, timer and imported comparator capabilities remain explicit external hosts. |
| [Selected registered table](../../src/gothic3/native-scene-heap.ts) | A selected 16-byte embedded/static holder owns actual Realloc(204) backing, 43 buckets and capacity 51. Tagged-new(28,0x199) nodes hold physical IDs/entity/next slots. Lookup traverses bucket chains using the source hash and equality of the first 16 bytes. Node.Read unregisters/frees the old node before reading the new ID. The supplied initialized scene section is required; this subservice does not bootstrap the complete SceneAdmin singleton or its other tables. |
| [CString owner](../../src/gothic3/native-heap-cstring.ts) | Source ASCII bytes allocate length+9 through audited Malloc. The selected 18-byte names request 27 bytes and use the 28-byte pool. Holder length, ushort reference count, character bytes and NUL remain physical. Assignment shares a same-heap holder; mutation, Clear, Release, destructor, free and hash preserve their separate source branches. The byte bridge does not own the native indexed-string table or name-map registration. |
| [Reflection](../../src/gothic3/entity-reflection.ts) and [Navigation fields](../../src/gothic3/navigation-reading.ts) | An optional heap host allocates the actual 16-byte wrapper and retains its base constructor/native-NULL/concrete-vtable prefix. Native 688-byte field bindings are implemented as a separately exercised lower-level route. Reference count, base flags, owner/wrapper slots, vectors, caches and embedded proxies share actual backing. Nonempty CString and non-NULL array content remain explicit dependencies. |

The allocator's known zero-filled VirtualAlloc bytes remain known. Applying
the source masked constructor stores does not turn those facts into unknown
bytes just to match the earlier logical profile's masks. Reused or opaque
storage retains its actual masks instead. Tests mutate backing bytes and
confirm that field consumers see the changes through the same object.

### Earlier Navigation type-registry gate

Following the actual owned wrapper call order revealed a prerequisite before
the native 688-byte request. `Clone20292300` calls the lazy
`PropertyObjectType.GetInstance2028cbd0` after constructing its 16-byte wrapper.
That getter constructs type/factory objects, uses CString and a global
PropertyObjectSingleton registration, and registers a nonempty shutdown.
Registering a JavaScript reflection metadata root does not perform this native
startup. The isolated owned route therefore stops after its real wrapper
prefix when that service is absent; it does not allocate the native property
set or ask ErrorAdmin on that path. Lower-level Navigation field tests do not
claim to traverse this getter.

The selected table and CString owners are further building blocks. Connecting
the browser requires the full SceneAdmin/module startup, source string-table
and name-map lifetimes, reflection/type registry, and preceding allocation/free
history to be compatible. Later application/session, property readers,
notifications, graph membership, processing and activation remain separate
gates. The browser's existing ErrorAdmin boundary describes its earlier
logical profile; the newly isolated shared-heap route has its own earlier
type-registry boundary. Neither establishes an original live encounter.

### Validation

Independent source review checked constructor offsets, store widths/order,
pointer aliasing, allocation masks, physical lookup and retained partial
failures. Review fixes include canonical allocation/region pointer slots,
per-read iterator lifetime checks, latched table reentry, and owned Navigation
container gates. The five new focused files cover the heap fields, entity
factory, allocator/CString extension, scene table and Navigation wrapper.
Final local validation passes `npm run typecheck` and all 1,969 tests in 195
files (142.36 seconds), including 48 new focused cases. The production build
succeeds with 364 modules in 38.83 seconds. Its local Gothic entry is
`gothic3-BKEJVbVp.js`, 1,157.24 kB (261.29 kB gzip); the retained NPC entity
chunk is 79.98 kB and its services chunk is 77.64 kB. The separate Tervain entry
remains 5,701.33 kB with its existing 1,200 kB chunk warning.

Local browser regression loads 202 scene objects and 70 character models,
enters Ardea with Hero HP 100, and inspects Ardea_OutNovice_01 (11,280 triangles,
two meshes). Its source study still reports zero attached property sets, no
graph context and the same cursor 338 ErrorAdmin boundary. No captured browser
warnings/errors were observed. All 73 staged package blobs match disk bytes;
106 referenced source excerpts and 256 documentation file links were checked.
The source directory uses byte-preserving Git attributes. Build, tests and
the browser regression establish this isolated checkpoint's implementation
and compatibility; they do not establish complete native startup or a game
that can be played through its endings.

## 76. Separate physical SceneAdmin construction from singleton lookup

Date: 6 October 2026. Scope: source-ordered SceneAdmin startup components on
the same physical heap. These components remain isolated from the browser NPC
reader. Native application initialization, reflection registration, module
attachment and NPC activation are still required before an original encounter.

The [Scene startup producer](../../tools/gothic3/prepare_scene_startup_source.py)
adds a [manifest](../../assets/gothic3/scene-startup/manifest.json),
[rules](../../assets/gothic3/scene-startup/runtime-rules.json),
[evidence](../../assets/gothic3/scene-startup/native-evidence.json) and bounded
source excerpts. It preserves the earlier runtime-admin and NPC-heap packages.
The selected SceneAdmin allocations now admit source pools 24 and 384 through
`nativeSceneStartupHeapExtension`; combining it with the NPC extension admits
twelve pools on one MemoryAdmin, with one canonical cold global image and
pointer-area prefix. Caller-created copies of either extension remain invalid.

### Construction and lookup have different responsibilities

[`NativeSceneAdminConstruction`](../../src/gothic3/native-scene-admin.ts)
models the selected reflected creator's request of 348 bytes/tag `0xc4` in the
384-byte pool. The base constructors and SceneAdmin vtable stores precede five
map constructors, at offsets `+14`, `+24`, `+34`, `+44` and `+54`. Each map owns
a separate real 204-byte allocation in the 224-byte pool, with capacity 51 and
43 logical buckets. The registered map's holder aliases the SceneAdmin's
actual `+14` bytes and reuses the physical PropertyID table operations.

The subsequent EntityAdmin constructor owns its base, empty array headers and
source Create fields. Default sphere/vector constructors write nothing; they
preserve the allocator's existing bytes and masks. Its next call sets spin
count 4000 on section `30af23d0`. This requires an actual initialized platform
section. A cold zero-filled PE range cannot provide it. If absent, all five
map allocations and preceding EntityAdmin stores remain applied, and a later
call does not replay that prefix.

With explicitly owned services, construction continues through the source
global CString clear, box invalidation and ModuleAdmin vtable `+74`
registration. The global CString must alias its original physical slot;
passing a JavaScript string does not supply that lifetime. Constructor tests
provide selected external services to exercise the later prefix. They do not
establish the full application/module startup that supplies those services.

[`NativeSceneAdminLookup`](../../src/gothic3/native-scene-startup.ts) implements
`GetInstance30009a2a -> 3007bf20` separately. It requires application byte
`30ad989c` to equal exactly 1; other values return NULL before changing the
lookup guard. On its first initialized lookup it sets the guard, gets the
class name, gets ModuleAdmin, finds a registered component and calls the RTTI
dynamic cast. It caches the result, including NULL. It never constructs a
SceneAdmin in response to a missing module. The application byte is initially
the verified cold zero, not an assumed running-game state.

### Class-name and CRT ownership

`NativeSceneClassName` retains the two original guard bits, copied CString
pointer slot, dynamic initializer and physical class-name CString. The source
calls CRT `type_info::name` with the literal RTTI descriptor `30aa3050`; the
copied class-name slot is a different field. The result then passes through
SharedBase `UnMangle`, which selects the bytes after the first space, and
constructs the `eCSceneAdmin` CString. Its 12 character bytes request 21 bytes
from MemoryAdmin and use the 24-byte pool. Its source destructor is admitted
to the platform shutdown queue.

`NativeSceneTypeInfoName` owns the selected CRT wrapper's cache, trailing-space
trim, lock 14, eight-byte list node, output copy, list links, scratch free and
unlock. These CRT allocations remain distinct from SharedBase heap storage.
The native `___unDName` helper is still an explicit prerequisite; the default
route stops before inventing its output. Isolated tests supply an owned CRT
buffer as an external helper result. They verify the wrapper and class-name
handoff, not the complete native demangler or CRT list teardown.

The saved decompilation incorrectly treats some CRT frees as nonreturning and
omits the lock-release tail. The producer checks recovered missing instruction
bytes directly against the original PE and retains those recovery records.
The TypeScript call order follows the verified instructions, including unlock,
rather than the incomplete C reconstruction.

The selected registered map constructor also does not acquire its global
section. Section ownership is checked at the first mutation that acquires it;
construction and unlocked lookup do not fabricate a section or inspect an
unused supplied callback. This corrects the earlier table host's premature
construction gate while retaining its actual mutation requirement.

### Source receipts and remaining integration

The package audits 61 fresh methods and 2,041 unique instructions, reuses 22
earlier source methods, and records ten recovered PE instructions, with zero
byte mismatches. Its outputs can be regenerated without executing native code:

```powershell
python -B tools/gothic3/prepare_scene_startup_source.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
```

| Output | Bytes | SHA-256 |
| --- | ---: | --- |
| Scene startup rules | 114,090 | `a226e0cf9479c4789a6966b7d9b6ef182858e24d0ebf1e97de6dba9340592670` |
| Scene startup evidence | 342,561 | `aff45da8753c8f112f29702510c19bed02710f7106b1650e013ef5e7f3efcc2b` |

The next integration requires the native demangler/CRT services, initialized
EntityAdmin and registered-table sections, actual ModuleAdmin construction,
input and module arrays, reflection/type registry and application initialization.
The Navigation type getter and native indexed-string/name-map operations remain
separate dependencies. The browser's current source-record read still stops
at its earlier cursor 338 boundary, with no attached property sets or native
processing graph. These new physical owners do not yet advance that reader
or prove a campaign that can be played through its endings.

### Validation

Independent review compared constructor, table, CRT wrapper, class-name and
shutdown behavior with the pinned PE receipts. Fixes preserve first-use section
gating, native initializer read order, physical global CString ownership and
mask aliasing, and immediate stops after unsupported reentry. Tests cover NULL
and unknown allocation/callback outcomes, applied partial prefixes, cache-NULL
semantics, source store widths, freed backing and class-name shutdown lifetime.

Local validation passes `npm run typecheck` and 2,019 tests across 198 files
in 157.39 seconds, including 50 added cases. The final production build
succeeds with 364 modules in 29.82 seconds. Its Gothic entry and retained NPC
chunks remain the same files as checkpoint 75: `gothic3-BKEJVbVp.js`,
`browser-npc-entity-B8mWaH7u.js` and
`browser-npc-entity-services-DdqR1NNb.js`. The new SceneAdmin modules have no
application entry import. The existing Tervain entry and chunk warning remain.

Regeneration leaves all 113 package files byte-identical (112 generated files
plus the package README). All 153 referenced source excerpts were rehashed;
the earlier source packages remain unchanged. Documentation file links and
the staged diff are checked. These results establish the admitted component
behavior and build compatibility, not native NPC activation or campaign
completion.

### Combined integration validation

On 6 October 2026, the local `codex/gothic3-reviewed-integration` branch
at merge `d1182e43ad29b4cb238505f0b83ffb4afcaf97e1` combines the frozen Scene
checkpoint `9ad68431` with the reviewed [Tervain loading changes](loading-performance.md)
at `b96a5cba`. Its ancestry retains the original PR42 and PR43 heads. Gothic
source and assets match the frozen Scene checkpoint; Tervain loading code
matches the reviewed loading branch.

Combined local validation passes `npm run typecheck`, all 2,085 tests across
206 files in 143.72 seconds, and `npm run build` with 370 modules in 53.14
seconds. The isolated checkpoint 76 receipt above remains the record of its
earlier component validation. The later PR42 commit `916aa661` only clarifies
the distinction between animation-frame callbacks and raster paints in its
measurement notes; including it does not change the validated runtime.

The combined production preview loads 202 scene objects and 70 characters,
enters Ardea at HP 100, and inspects `Ardea_OutNovice_01` (11,280 triangles,
two meshes). Wireframe and automatic rotation controls work. The retained
source reader still stops at 338 / 6,544 bytes, with zero of 16 property sets
attached and no graph context. No warnings or errors were captured on this
Gothic route. The startup owners remain isolated; this browser check does not
establish native NPC activation. The integration was subsequently merged as
`main` commit `0681c98d0f9bbc078f0ac8e15421a98ed7a8c799` in
[PR 44](https://github.com/ael-dev3/Tervain/pull/44). The successful
[Pages run 37529314472](https://github.com/ael-dev3/Tervain/actions/runs/37529314472),
attempt 1, publishes that exact commit. A fresh public browser check confirms
`gothic3-CAj9xpg6.js`, 202 scene objects, 70 characters, Hero HP 100, the Hero
and bandit model counts, and the unchanged source-reader boundary. No Gothic
warnings or errors were captured.

The original Tervain route opens its menu before world construction. New Game
advances through the counted loading phases to a playable High-quality view
with HP 100 and six coins; pause, settings inspection and resume also work.
No runtime errors were captured. A Three.js shader precision warning was
recorded during preparation. This concurrent browser smoke check is not a
performance benchmark; the matched measurements and the loading branch's
browser validation are described in its separate
[loading report](loading-performance.md).

## 77. Own the Engine CRT heap, locks and selected class-name decoder

Checkpoint 76 deliberately stopped at the original CRT demangler dependency.
This component follows that dependency through its source heap, lock table,
scratch arena and name graph. It remains separate from the live NPC reader.
It supplies neither native NPC activation nor further campaign progression.

### Source and physical ownership

The [CRT source package](../../assets/gothic3/crt-undname/README.md) pins the
original Engine.dll and 82 method receipts, including two recovered SEH entries.
Its 3,686 unique instructions match the original PE bytes; eight omitted
post-free instructions and fifteen SEH instructions are recovered from that
image. The 166 files reproduce byte-identically, and 162 source references
are checked. The producer executes no game code and captures no live state.

```powershell
python -B tools/gothic3/prepare_crt_undname_source.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
```

| Output | Bytes | SHA-256 |
| --- | ---: | --- |
| CRT rules | 165,908 | `d593c216c3cef9a2855be2dd3daa03170b36217b13d8065a320c7e5af495ef61` |
| CRT evidence | 602,256 | `285a7ec06bfdbf9dcf1ad929fff03184da75ce2cb57e45998bb972655fc55b69` |

[`NativeEngineCrtOwner`](../../src/gothic3/native-engine-crt-locks.ts) owns the
actual heap-handle slot, heap selection, 20-byte OS fields, allocation policy,
36-record lock table, fourteen static 24-byte sections, type-info list,
TLS indexes and encoded section-initializer cache. HeapCreate publishes its
retained handle before heap selection. Cold OS fields remain zero; a browser
cannot infer that the original CRT startup initialized them. The NT heap path
requires admitted platform and Windows-major fields; other heap modes retain
their unsupported boundary.

Section initialization follows the original decode/TLS/module/procedure
lookup, encode/cache and invocation order. The selected Win32 platform owns
canonical retained heap and section capabilities. Its explicit service
registry can exercise the original missing pointer-export identity branches
or an owned pointer codec. The default production platform has no inferred
TLS/module facts. An unavailable service stops at that call with the preceding
pointer stores retained. OS initialization, TLS errno construction, non-cold
TLS dispatch, the lower-major process PE scan, new handlers and fatal runtime
services remain prerequisites. Fixture OS and registry values are selected
inputs, not observations of the original running game.

Static locks initialize with spin 4000. Demangler lock 5 is dynamically
allocated under creation lock 10; type-info cache mutation uses lock 14.
Raw malloc and `__malloc_crt` remain distinct: the demangler and type-info
node/name allocations use the original raw malloc callback, while lock
creation uses the retry wrapper. Termination deletes/frees dynamic sections
and clears their pointers before deleting the static sections. Native
source store widths, failed allocation prefixes and callback order are retained.

### Selected RTTI grammar and lifetime

[`NativeCrtUndName`](../../src/gothic3/native-crt-undname.ts) shares the same
60-byte demangler globals across wrappers of one CRT owner. It locks 5,
installs the source allocator/free callbacks, clears the arena links, and
constructs two physical Replicators in a 120-byte local frame. Its ordinary
unqualified class branch consumes qualification `A`, class code `V` and the
identifier bytes from the retained input pointer. Identifier validation,
reference-table recording and concatenation use the source
[`DName`/arena operations](../../src/gothic3/native-crt-dname.ts).
Templates, scoped names, other type/function grammar and truncated scope
concatenation stop explicitly at their unowned branches.

The original SceneAdmin descriptor supplies offset 9 and flags `0x2800`.
The normal graph consumes 152 scratch bytes in one 4,104-byte heap backing
and writes `class eCSceneAdmin` into an independent 24-byte output allocation.
This text is derived from the supplied identifier bytes; it is not a fixed
label callback. The helper collapses repeated ASCII spaces, frees the scratch
arena, unlocks 5 and expires its local Replicator frame. Globals retain their
original dangling pointers, whose expired backing rejects later access.
An unsupported call retains its suspended prefix and held-lock facts;
shared recursive entry also stops before further source operations.

The SceneAdmin type-info adapter passes the retained descriptor directly,
uses the same CRT owner's eight-byte list, then applies the existing lock-14
cache sequence: eight-byte list node, nineteen-byte cached name, physical
links, temporary output free and unlock. Each CRT owner has one canonical
SceneAdmin descriptor/cache. These services are component implementations;
they are not yet imported by the browser NPC activation path.

### Validation and next dependency

Focused checks cover physical allocation/aliasing, source graph sizes,
multiple identifiers, shared globals, cache/list identity, unknown services,
failure cleanup, expired scratch/local-frame access and recursive entry.
The earlier SceneAdmin startup tests now receive retained input capabilities.
Independent source review checked the helper graph, CRT resolver/cache,
physical aliases, partial failure prefixes and expired local-frame lifetime.
Local validation passes `npm run typecheck` and all 2,154 tests across 209
files in 129.90 seconds, including 69 new cases. The production build succeeds
with 370 modules in 45.34 seconds. The Gothic entry and NPC chunks remain
`gothic3-CAj9xpg6.js`, `browser-npc-entity-Dw-uaFUt.js` and
`browser-npc-entity-services-iHoiZamx.js`: the new CRT owners have no browser
application entry import. The existing large Tervain chunk warning remains.
All 233 relative file links in the two rebuilding documents resolve, and
`git diff --check` passes. These results establish component behavior and build
compatibility; they do not establish activated NPCs or further quest progress.

This checkpoint was merged in [PR 46](https://github.com/ael-dev3/Tervain/pull/46)
as `main` commit `57c60dcddb215d4c66589acdc586831f2a0b8584` and published by
successful [run 37532478269](https://github.com/ael-dev3/Tervain/actions/runs/37532478269),
attempt one. A fresh public browser check loaded 202 objects and seventy
characters, entered Ardea at HP 100, inspected the 10,692-triangle Hero and
11,280-triangle coastal bandit, and confirmed the unchanged source-reader
boundary. The served Gothic entry remained `gothic3-CAj9xpg6.js`; no captured
warnings or errors occurred during that check.

The live source reader remains at 338 / 6,544 bytes with zero of sixteen
property sets attached and no native processing graph. Connecting these
components requires owned CRT OS/TLS startup, the remaining ErrorAdmin path,
EntityAdmin, module/application initialization, reflection/type registration,
Navigation getters and indexed-string/name-map operations. Campaign completion
still requires the full gameplay integration and playthrough described above.

## 78. Rebuild the ordinary Engine DLL attach prefix

Checkpoint 77's isolated fixtures supplied OS fields and a TLS registry before
CRT heap/lock use. This checkpoint implements the ordinary source prefix that
produces those dependencies through retained platform calls. It does not
connect a ready DLL or an active NPC to the browser scene.

### Follow the source startup order

[`native-crt-bootstrap.ts`](../../src/gothic3/native-crt-bootstrap.ts) follows
Engine entry `3067744b`, security-cookie initialization `3068e9a5`, the selected
DLL startup dispatcher `30677355` and process attach `3067717c`:

1. For process attach, initialize the physical cookie from owned FILETIME,
   process/thread IDs, ticks and performance-counter output. Preserve the
   source's default-cookie and high-word branches. QueryPerformanceCounter's
   Boolean return is ignored; an output that remains unknown still prevents
   the subsequent physical reads. Store the complement after the cookie.
2. Obtain the process heap and allocate the actual 148-byte OSVERSIONINFOA
   record with HeapAlloc flags zero. Store its size and call GetVersionExA.
   Read its platform, major, minor and build fields, call HeapFree and publish
   the five canonical CRT OS DWORDs in the original store order.
3. Call the existing physical heap initializer with argument one. The selected
   NT profile reaches heap selector one. Other source branches retain their
   writes and stop at their remaining dependency.
4. Run the thread startup owner and walk the original 64-slot pre-C-init table.
   The captured table is all NULL; each slot is read from its retained bytes.
5. Stop at the next actual source call, GetCommandLineA through IAT `30afc69c`
   at `30677251`. The attachment count remains zero because its increment
   occurs only after the later I/O, argument, environment and C initialization.

Known-null allocation and known-false version-query branches return zero in
source order. Unknown calls retain the executed prefix and do not replay
allocations or writes. The cookie's actual 16-byte local frame expires on normal
return; unknown counter output leaves that frame suspended and accessible only
according to its owned masks. A cold process detach returns zero before cookie,
OS or Engine DllMain work. Other dispatcher paths and native exception/unwind
mechanics are outside this selected ordinary trace. The canonical bootstrap
owner admits one entry frame and binds cached results to its actual module,
reason and reserved arguments; a different invocation requires another owned
frame rather than reusing that result.

### Produce thread and encoded-pointer storage

[`native-crt-thread-startup.ts`](../../src/gothic3/native-crt-thread-startup.ts)
uses actual TLS/FLS procedure capabilities and indices returned by allocation
calls. It publishes the unencoded getter in the first TLS slot before calling
the pointer-initialization callback, then encodes the procedure globals and
initializes the physical critical sections. The second index receives the
actual zeroed thread-data allocation before its initializer runs.

The original request is `calloc(1, 0x214)`: **532 bytes**. It uses HeapAlloc
flags eight; a malloc followed by a fabricated zero record would not reproduce
that operation. The initializer aliases retained MBC and locale objects,
increments the MBC counter before taking lock twelve, and updates locale
references while holding that lock. The errno accessor
uses the thread record's actual `+8` field, preserves Win32 last error and
retains the source fallback errno value twelve when no PTD is available.

The root callback implements `initPointers3067d37b`. Its encoded NULL is the
actual EncodePointer result. Source helpers write the canonical new-handler,
section-initializer, invalid-parameter, report, exception and signal slots.
The terminate and exit stores encode retained source-procedure capabilities;
their invocation remains an explicit boundary. The existing section-initializer
view at `30af7c50` is shared by both startup and lock initialization. Cold
numerical zero is not substituted for encoded NULL.

The selected platform profile declares the OS and lower API capabilities it
owns. Without those services, production constructors leave source globals
cold and return an unknown result at the first required call. These profiles
are component inputs, not observations of a running Windows Gothic process.

### Reproduce and validate

The separate source package is generated from the owner's saved local study:

```powershell
python -B tools/gothic3/prepare_crt_bootstrap_source.py --study '<LOCAL_DESKTOP_STUDY>'
npm run typecheck
npm test -- tests/gothic3-dialogue/crt-bootstrap.test.ts
npm test -- tests/gothic3-dialogue/native-crt-thread-startup.test.ts
npm test
npm run build
```

[`prepare_crt_bootstrap_source.py`](../../tools/gothic3/prepare_crt_bootstrap_source.py)
checks original instruction bytes and captures cold storage, output layouts,
pointer bindings, callbacks and omitted post-free continuations. The
[`source package`](../../assets/gothic3/crt-bootstrap/README.md) separates new
receipts from reused CRT evidence. Regeneration executes no game code and does
not alter the older packages.

The frozen package contains 52 method receipts: 31 newly audited catalog
methods, eighteen reused methods (seventeen unchanged and one attach body
extended with its omitted continuation), and three uncataloged compiler thunks.
All 1,665 unique instructions match the original Engine PE. Forty-nine recovered
post-free instructions comprise forty-one new recoveries and eight reused ones.
All 105 generated files reproduced identically; 101 excerpt references matched
their recorded SHA-256. All 166 files in the preceding CRT package remained
unchanged. The producer executes no native code.

| Frozen output | Bytes | SHA-256 |
| --- | ---: | --- |
| Bootstrap rules | 134,847 | `a57679bc2772b4be46bb0c7e960be3c17b5c1fe3a41e4c31d40d8a4a243050ef` |
| Bootstrap evidence | 329,223 | `95795ca42bce2bd0d658b63e62571a716167d92c3931f0e4bbdce7014cc46f21` |

The combined checkout includes the reviewed [grass contribution](https://github.com/ael-dev3/Tervain/pull/45)
and its local fix commit `6ee7185b19949264d8aee677c738521476b096fa`.
Pointer stamps persist until consumed and all configured flower LODs retain a
bloom row; the [grass record](grass-0.0.13.md#integration-fixes) describes those
changes. Independent reviews checked startup source order, canonical aliases,
partial cleanup, held locks, index rereads and the grass fixes.

Combined local validation passes typecheck and all **2,231 tests across 215
files** in 123.64 seconds. The production build succeeds with 373 modules in
30.26 seconds. The Gothic entry remains `gothic3-CAj9xpg6.js` (1,156.02 kB),
with unchanged NPC entity and services chunks. These startup components have
no browser application-entry import. The separate Tervain build contains the
grass changes; the existing large-chunk warning remains. All 260 relative
links checked across the rebuilding guides, tool guide and grass record resolve,
and the combined diff passes whitespace checks.

Local browser review exercised the title meadow at High, Low and Medium with
pointer brushing, then loaded a new High game and checked movement and a
pause/resume round trip. Health remained 100 and coin count six; the captured
browser console contained no warnings or errors. This was a functional review,
without a new performance benchmark.

This startup prefix still requires command-line, environment, I/O and full C
initialization before Engine DllMain and native application/module startup.
ErrorAdmin, EntityAdmin, reflection/type registration, Navigation and indexed
names remain part of the downstream NPC activation work. The live reader still
stops at 338 of 6,544 bytes, with zero of sixteen property sets attached and no
native processing graph. Passing component checks does not establish campaign
completion.

## 79. Preserve Navigation attachment notifications and live area ownership

Navigation attachment calls its property notifications with `propagated=false`.
Reflective packet reading uses `true`. The false branch can register collision
circles, send area contacts and invoke `OnEnterArea` or `OnLeaveArea`; using the
payload reader's true branch would silently omit those effects. The browser
entity callback now forwards the source flag, and
[`navigation-reading.ts`](../../src/gothic3/navigation-reading.ts) places the
custom override between the two separate owner `Modified` reads.

### Preserve the source callback sequence

[`navigation-notifications.ts`](../../src/gothic3/navigation-notifications.ts)
implements the false override with explicit lower services. Enter compares
the three point names before its inherited callback. Exit constructs a
temporary CString, compares CurrentZone, resolves current and last proxy
entities, and compares their pointer identity. Equal pointers, including both
NULL, skip area transitions. Different pointers cause a fresh last lookup and
leave sequence before a fresh current lookup and enter sequence. The later
Routine and point comparisons precede CString destruction and the inherited
owner read.

Each area sequence retains its temporary proxy, tests NavZone before NavPath,
and captures the actual property-set pointer. Leave deregisters even a NULL
cached DCC. Enter queries owner PS6 only when the cache is NULL, stores the
actual result before registration, and registers only a non-NULL pointer.
Contacts retain the receiver's vtable slot before iterator construction and
read that slot's current function after argument callbacks. Script dispatch
similarly preserves the captured vtable, reads OTHER before SELF and calls
the source area script with argument zero.

CString comparisons branch on any nonzero AL; property-set and notification
flag checks compare AL exactly with one. Unknown calls preserve temporary
strings, proxies, pointer stores and registration already performed. Cleanup
does not run beyond the first missing source call, and failed prefixes cannot
be replayed as success. Matched Routine and point branches still require their
actual lower lookup/setter services.

### Own the application cache and area query boundary

[`browser-npc-navigation-owner.ts`](../../src/gothic3/browser-npc-navigation-owner.ts)
owns a declared browser module bridge and retained source session-cache
storage. The Engine initialized byte must equal one. Cache guard bit zero is
set before module resolution, NULL results remain cached, and the application
getter calls the session getter twice before reading the current session's
mode byte. The browser mode allocation owns that field only; it does not
represent the surrounding original Session construction or Start callbacks.

The area owner reuses the verified source query geometry and existing NavPath
binding algorithms. Loading a definition creates no game entity. Admission
requires an actual live entity, attached valid property set, the same retained
area value store and a caller capability proving its full construction/read
and lifetime. Resolution asks the caller's complete property-proxy lookup;
an admitted record or local registry miss cannot substitute for SceneAdmin.
Area deregistration removes its Navigation membership while leaving entity
and property-set ownership to their actual lifecycle services.

The selected browser reader still stops at **338 of 6,544 bytes**, with zero
of sixteen property sets attached. These owners do not supply the missing
ErrorAdmin, reflection type, area constructors or contact/script services.
Production does not manufacture a nonpanic result, initialized application,
running session or active NPC from these component receipts.

### Reproduce and check the component

```powershell
python -B tools/gothic3/prepare_browser_navigation_owner_source.py --study '<LOCAL_DESKTOP_STUDY>'
npm run typecheck
npm test -- tests/gothic3-dialogue/browser-npc-navigation-owner.test.ts
npm test -- tests/gothic3-dialogue/navigation-notifications.test.ts
npm test
npm run build
```

The [source package](../../assets/gothic3/browser-navigation-owner/README.md)
contains 31 selected methods and 1,403 fully covered instructions from the
original Game, Engine and SharedBase PEs. Two regenerations produce identical
contents across 66 package files, and all 69 manifest file references match
their sizes and SHA-256 values. Older packages remain unchanged. The producer
records trailing-whitespace removal and LF normalization for its C excerpts,
while retaining each original reconstructed source-file hash. It executes no
native code and captures no running native state.

| Frozen output | SHA-256 |
| --- | --- |
| Navigation owner rules | `8084042afe1b2843f165ef8a953255d93ebcd655be1e2260309c313d12d4bf05` |
| Navigation owner evidence | `fcaa941feeebaa9b07cb288b0ee61d6720bfb442380be0d4c4e6cf7d81705c4d` |

The two new focused files pass **35 tests**: nineteen cover application cache,
area admission/query/lifetime and partial registration; sixteen cover false
notification order, pointer equality, DCC stores, retained vtable slots and
temporary lifetimes, including destruction during callbacks. Their explicit
isolated fixtures do not establish that the corresponding production services
are available.

Final local validation passes typecheck, all **2,266 tests across 217 files**
in 131.18 seconds, and a production build of 375 modules in 28.94 seconds.
The Gothic entry is `gothic3-C3iMc5TP.js`; its NPC reader chunk is
`browser-npc-entity-BF2Tojqt.js`. The existing large-chunk warning remains.
All 256 relative file links across both rebuilding guides, the tool guide and
the new source package resolve.

The final production preview loaded 202 scene objects and 70 characters,
entered Ardea with HP 100, and inspected the Hero and `Ardea_OutNovice_01`.
The latter retained its 11,280-triangle, two-mesh model and the same original
reader boundary, with no Navigation owner, attached sets or processing graph.
The captured browser console contained no warnings or errors.

The next physical integration must construct the real Navigation type and
descriptor table on the same heap as the entity, wrapper and ErrorAdmin. The
Game initializer sequence constructs its cached class name, static root and
fifteen descriptors in that order. Native descriptor registration performs
allocation and logging after append. The existing SceneAdmin class-name
adapter also needs its CString text constructor corrected before reuse:
source nonempty construction allocates and copies without a prior NULL-slot
store. Copying its current default-constructor/SetText path into Navigation
would preserve that discrepancy.

### Publication

Checkpoint 79 reached `main` commit
`b408a48a68c222c20f64766ccf63f7e3c2007b0d` through
[PR 48](https://github.com/ael-dev3/Tervain/pull/48). The reviewed head
`a0df657e003ff0df253001e1b01bdcce91ad539e` and merged main share tree
`cf09e73d8434fefac37d525e18faedef5bf2a735`. The PR check
[37540566047](https://github.com/ael-dev3/Tervain/actions/runs/37540566047)
passed on attempt one. Successful
[Pages run 37541106669](https://github.com/ael-dev3/Tervain/actions/runs/37541106669),
also attempt one, finished at 22:34:55 UTC on 6 October 2026. It passed all
2,266 tests across 217 files and built 375 modules before deploying.
The public Gothic route served `gothic3-C3iMc5TP.js`, loaded 202 scene objects
and 70 character models, entered Ardea and inspected the Hero and
`Ardea_OutNovice_01` without captured warnings or errors. The bandit's selected
reader still stopped at 338/6,544 bytes with 0/16 property sets attached.
The updated rebuilding overview was also inspected on GitHub `main`.
These observations do not establish a completed Gothic campaign.

## 80. Reproduce fresh CString text construction and owned byte operations

The next Navigation integration needs the original Game class name, reflected
type and descriptor table on the shared heap. Before reusing the SceneAdmin
class-name adapter, this checkpoint corrects its CString construction path.
The native text constructor is different from default construction followed
by `SetText`: a nonempty input allocates without reading or clearing the old
destination slot first. That distinction affects callbacks, failed allocations
and the physical heap history.

### Preserve fresh constructor order

[`native-heap-cstring.ts`](../../src/gothic3/native-heap-cstring.ts) now retains
a pending text-construction owner without accessing its destination slot.
`constructText()` follows SharedBase entry `10003ba7`, body `100135f0`:

1. NULL input writes a NULL destination. Otherwise, scan the original source
   pointer byte by byte to determine its NUL-terminated length.
2. Empty input writes NULL without allocating. Nonempty input calls the
   original `Alloc` body `10013240` with the measured length.
3. Retain the actual MemoryAdmin result for `length + 9` bytes. Write the
   holder's length DWORD, reference WORD of one, receiver pointer to holder
   byte eight and final NUL in their original order. Header bytes six and
   seven retain their previous values and masks.
4. Reload the receiver's current pointer, then copy exactly the measured
   number of bytes from the retained original source. The copy excludes the
   NUL already written by `Alloc`.

The source may change or end its lifetime during allocation callbacks. The
copy therefore rereads its actual bytes after allocation; it does not copy a
pre-allocation text snapshot. Each real load/store checks its lifetime at the
point of access. A failed construction retains its allocation, destination
bytes, pointer masks and completed writes, then blocks replay. Pending or
failed owners cannot be assigned as completed CString sources. Diagnostics
distinguish an unreadable destination pointer from a known NULL pointer.

The existing default constructor, reference-counted assignment, destruction
and retained stale-slot diagnostics keep their separate source behavior.

### Obtain pointer geometry from actual allocation owners

[`native-pointer-geometry.ts`](../../src/gothic3/native-pointer-geometry.ts)
defines retained byte pointers and their allocation geometry.
[`native-runtime-platform.ts`](../../src/gothic3/native-runtime-platform.ts)
supplies geometry only for actual successful owned Win32 HeapAlloc or
VirtualAlloc records and aliases of their original storage. Replacing the
byte or mask arrays while retaining an outer identity invalidates that proof.
Generic CRT allocation results and arbitrary JavaScript buffers do not acquire
native address facts through their labels.

The platform models the documented PE32 HeapAlloc alignment of eight bytes
and VirtualAlloc page/allocation alignment. These are selected browser
platform contracts, not captured addresses from a running Windows game.
The supporting primary contracts are
[HeapAlloc](https://learn.microsoft.com/en-us/windows/win32/api/heapapi/nf-heapapi-heapalloc)
and [VirtualAlloc](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-virtualalloc).
Pool offsets locate the actual returned holder within that allocation.
Two pointers into the same allocation establish overlap and copy direction;
contained spans in distinct owned allocations establish disjointness.
Allocation sequence does not invent unsigned native pointer ordering.
Geometry resolution checks provenance without advancing a native memory
access or rejecting a lifetime before the source's actual load/store.

### Reproduce the selected search and scalar copy

[`native-byte-string.ts`](../../src/gothic3/native-byte-string.ts) implements
the exact space search used by class-name `UnMangle`: `strstr` sees the original
one-character space literal and enters the audited `strchr` tail at
`100a7306`. Its byte alignment peel, DWORD zero/match checks, candidate DWORD
reread and byte-order checks are preserved. Whole DWORD reads can include
bytes after the string's NUL; those bytes must have actual capacity and known
masks. Padding is not inferred from a string terminator.

The `memcpy` helper preserves ascending forward or descending backward byte
and DWORD units, retaining each source value and mask before its destination
store. Unknown source bits remain unknown after copying. A later failed load
or store keeps the completed prefix. Forward copies of at least 256 bytes
stop before alignment peels at the original live CPU-global dependency
`102f854c`; its cold-image zero is not a live value. The backward overlap
branch bypasses that dispatch and follows the scalar path for all uint32
sizes. The separate vector routine remains unowned.

[`native-scene-startup.ts`](../../src/gothic3/native-scene-startup.ts) now
passes the actual selected substring pointer into fresh text construction.
It retains the owner before invoking the constructor and registers shutdown
only after success. Its focused fixtures supply actual isolated heap-backed
CRT results; they do not establish complete Engine or Game CRT startup.

### Reproduce and validate

```powershell
python -B tools/gothic3/prepare_cstring_text_construction_source.py --study '<LOCAL_DESKTOP_STUDY>'
npm run typecheck
npm test -- tests/gothic3-dialogue/cstring-text-construction.test.ts tests/gothic3-dialogue/native-byte-string.test.ts tests/gothic3-dialogue/native-pointer-geometry.test.ts tests/gothic3-dialogue/scene-startup.test.ts tests/gothic3-dialogue/scene-startup-memory.test.ts
npm test
npm run build
```

The additive [source package](../../assets/gothic3/cstring-text-construction/README.md)
captures six selected methods and 490 instructions, all checked against the
original SharedBase PE. Its derived 87-instruction `strchr` tail is a subset
of the parent receipt. Six reachable memcpy jump-table ranges and 30 targets
are checked separately. Two final regenerations produce identical contents
across 25 package files; all 28 manifest references, including the producer
and its local dependencies, match their sizes and hashes. C excerpts record
trailing-whitespace removal and LF normalization while retaining each original
complete source-chunk hash. Older packages remain unchanged. Preparation runs
no native game code and captures no live process globals.

| Frozen output | SHA-256 |
| --- | --- |
| CString text rules | `1ac1e1e3a824b9db0df0086d0c7bdb7e10102b1993dd526b66fa91f4c5c6d396` |
| CString text evidence | `5bfa3426b990028ba43108810231633c0dc69665807129df673f7ed74d35a453` |
| Source manifest | `7c873e582293b759012b2cfbf03581f8eedb0fb0c428f1214ee9730c263024f3` |

The focused five-file run passes **72 tests**. Cases cover poisoned fresh
slots, source mutation or free during Malloc, unknown/NULL lower results,
partial DWORD copies, reentry, pending-source assignment, original storage
provenance, high-bit search bytes, candidate rereads and the forward CPU gate
versus backward scalar path. The final full run passes **2,312 tests across
220 files** in 123.86 seconds.

Typecheck and the production build also pass: 375 modules in 30.65 seconds.
The Gothic entry remains `gothic3-C3iMc5TP.js`, with NPC reader
`browser-npc-entity-BF2Tojqt.js` and services
`browser-npc-entity-services-Cw75FwNg.js`. These unchanged production chunks
reflect that the new physical constructor components are not yet connected
to the live reader. The existing large-chunk warning remains. All 264 relative
file links across both rebuilding guides, the tool guide and new package
README resolve; the reviewed diff has no whitespace errors.

The final production preview loaded 202 scene objects, 70 character models
and three source routine positions, entered Ardea with Hero HP 100, and
inspected the Hero (10,692 triangles, three meshes) and `Ardea_OutNovice_01`
(11,280 triangles, two meshes). The bandit's developer details retained the
same read boundary, no Navigation owner or membership, and no processing
graph. The captured browser console contained no warnings or errors.

The remaining integration must construct the actual Game Navigation class-name
owner, reflected type and fifteen descriptors, preserving initializer order,
physical allocations and registration logging on the same heap as the entity,
wrapper and ErrorAdmin. These CString components do not supply those owners,
the complete module/application startup or NPC processing services. The live
browser NPC reader remains at 338/6,544 bytes and 0/16 attached property sets;
full NPC activation, AI and campaign completion remain unavailable.

### Confirmed publication of checkpoint 80

[PR 49](https://github.com/ael-dev3/Tervain/pull/49) merged this constructor
checkpoint as `60c38ff6c2f1516015fc29ffe9c4d66c3295be94`, with tree
`ac970f997afef1f306d23741e0c7f8c210626b40`. Its reviewed PR head and merge
commit have the same tree. PR check
[37543201308](https://github.com/ael-dev3/Tervain/actions/runs/37543201308)
and main publication
[37543656027](https://github.com/ael-dev3/Tervain/actions/runs/37543656027)
both pass on attempt 1; each checks 2,312 tests across 220 files.
Pages deployment completes on 6 October 2026 at 23:01:25 UTC.

The first public scene load reports one material HTTP 503 and 201 objects.
One browser reload then loads 202 objects and 70 characters, enters Ardea,
inspects the Hero and coastal bandit, and captures no warnings or errors.
No Actions rerun or code change is used to recover that request.
The live NPC boundary remains unchanged.

## 81. Preserve canonical Game CRT ownership before Navigation type construction

Date: 7 October 2026. This checkpoint supplies the selected Game.dll runtime
prerequisites for constructing the original Navigation class name and type.
It remains a component milestone: the live NPC reader and its property
attachment boundary are unchanged.

### Preserve a separate module owner

The installed Engine.dll and Game.dll contain similar CRT algorithms but own
different heaps, locks, pointer globals, locale objects and thread records.
Using an Engine instance under a Game label would share the wrong physical
state. [`native-engine-crt-locks.ts`](../../src/gothic3/native-engine-crt-locks.ts)
now implements the admitted common operations under `NativeModuleCrtOwner`.
The existing public Engine facade preserves its original source profile and
trace addresses. [`native-game-crt.ts`](../../src/gothic3/native-game-crt.ts)
provides one canonical Game owner per actual platform; conflicting host service
callbacks are rejected.

[`native-game-crt-profile.ts`](../../src/gothic3/native-game-crt-profile.ts)
pins the actual Game method bodies and original module storage. Profiles are
immutable and selected internally. Game image views retain their original byte
ranges and masks; overlapping admitted ranges share their actual backing.
The MBC reference counter is an alias of the MBC object, and pointer
initialization uses the same section-initializer slot as the lock owner.
Cold image bytes do not establish a created heap, initialized critical section
or successful DLL attach.

The owner implements the selected mode-1 HeapAlloc/HeapFree, calloc, pointer
encoding and physical lock paths. The existing small-block, old-OS and
unimplemented error-handler branches retain their source boundaries. Returned
allocation identities and lower platform results must be owned; an unknown
result cannot be converted into success or NULL. Engine and Game can use the
same platform registry while retaining separate module heaps, allocations,
TLS/FLS indices, locale counters and cleanup state.

### Follow the original Game startup prefix

[`native-crt-bootstrap.ts`](../../src/gothic3/native-crt-bootstrap.ts) and
[`native-crt-thread-startup.ts`](../../src/gothic3/native-crt-thread-startup.ts)
select the matching module receipt. The separate
[`startup admission`](../../src/gothic3/native-game-crt-startup-source.ts)
pins complete Game bodies and actual instruction addresses; it does not infer
them by subtracting an Engine address offset.

Game entry `20467ab3` calls security-cookie initialization `20476a99` and DLL
startup `204679bd`. The selected process-attach path at `204677e4` retains:

1. Actual entropy output, cookie and complement writes, and the retained stack
   frame when an output or callback is unavailable.
2. The original 148-byte OSVERSIONINFOA allocation, writer, source read order,
   second process-heap query and free result before publishing OS globals.
3. Game heap initialization, actual TLS/FLS procedure resolution, unencoded
   getter publication, encoded pointer slots and physical locks.
4. The zeroed 532-byte PTD allocation, publication before initialization,
   physical MBC/locale reference counts and actual thread ID.
5. The original 64-slot RTC initializer scan, then the unresolved
   `GetCommandLineA` call at `204678b9` through IAT `207d7ca0`.

That boundary keeps the completed effects and blocks replay. The original
attach count remains zero. The Game DllMain thunk `2000f7cc`, body `20459430`,
environment, I/O, argv/envp and later C/C++ initialization remain prerequisites.
Stored terminate and exit procedure capabilities carry their actual Game
source identities; their invocation remains unowned. The platform retains
the selected Game FLS destructor `20468043` separately from Engine's `3067e143`.
The TLS fallback uses the shared lower Win32 TlsAlloc endpoint without claiming
an Engine source address for Game.

### Distinguish the three initializer tables

The early Game RTC table `[206e84d8,206e85d8)` is independently verified as 256
zero bytes in the original PE. This does not initialize the later CRT exit or
C++ object state.

| Original Game table | Source evidence | Remaining dependency |
| --- | --- | --- |
| RTC table | 64 slots, all NULL | The selected prefix completes this scan. |
| C table `[20655514,20655730)` | 135 slots, five non-NULL callbacks | The first callback initializes the physical encoded onexit array. None of these callbacks runs in this prefix. |
| C++ table `[2056c000,20655410)` | 238,852 slots, 2,468 non-NULL callbacks | Navigation initializer `204b1840` is slot 136 and the 72nd non-NULL callback; 71 preceding callbacks remain dependencies. |

The complete ordered later tables are separately pinned source files rather
than unused raw strings in the browser runtime. The Game onexit array still
needs actual Game allocations, encoded begin/end pointers and reverse cleanup;
the platform's JavaScript shutdown callback list does not supply that state.

### Reproduce this component checkpoint

```powershell
python -B tools/gothic3/prepare_game_crt_source.py --study '<LOCAL_DESKTOP_STUDY>'
npm run typecheck
npm test -- tests/gothic3-dialogue/game-crt-startup.test.ts tests/gothic3-dialogue/game-crt-owner.test.ts tests/gothic3-dialogue/crt-bootstrap.test.ts tests/gothic3-dialogue/native-crt-thread-startup.test.ts tests/gothic3-dialogue/native-engine-crt-locks.test.ts
npm test
npm run build
```

The additive [Game CRT source package](../../assets/gothic3/game-crt/README.md)
records 138 methods and 5,166 byte-checked instructions, including 28 explicitly
recovered original PE instructions. It retains the actual Game DLL, original
PE entrypoint, CSV/C mappings, original complete C chunk hashes, normalized
excerpts, imports, literals, physical storage and complete initializer order.
Two final generations reproduce all 273 package files identically. All 276
manifest references include the generated outputs, producer and imported local
dependencies. Independent review verifies the method extents, PE bytes, tables,
storage and normalized source excerpts. Earlier packages stay frozen.
Preparation runs no native game code and captures no live process state.

| Frozen output | SHA-256 |
| --- | --- |
| Game CRT rules | `e146c66c5349b0c3f65ceda9ed1df3e423d2ed3e2d606193e7d2350f977e237b` |
| Game CRT evidence | `eadb76458ca86f4faa0536162989c2a5c742d7cec309d6e294593b9dc696c250` |
| Source manifest | `7e44c8fb45b7fabf3e4deb31a62a8261adf61d9a52375bb7bc033a277d7456ec` |

The focused five-file run passes **106 tests**. Cases cover module separation,
canonical source pointer identities, immutable admission, physical aliases,
cookie/OS output masks, encoded procedures, Game FLS cleanup, NULL/FALSE lower
results, callback reentry and retained allocation/counter/lock prefixes. Each
module retains its own source TLS allocator wrapper (`3067df49` for Engine,
`20467e49` for Game) and one free-PTD procedure capability across its helpers.
Only that module's retained wrapper can take its source allocator path; the
wrapper ignores the destructor argument and delegates actual lower TlsAlloc.

The full local run passes **2,348 tests across 222 files** in 128.51 seconds.
Typecheck and the production build pass: 375 modules in 35.03 seconds. The
existing large-chunk warning remains. The Gothic entry is still
`gothic3-C3iMc5TP.js`, with NPC reader `browser-npc-entity-BF2Tojqt.js` and
services `browser-npc-entity-services-Cw75FwNg.js`. These unchanged production
chunks reflect that the Game CRT components are not yet connected to the live
reader. All 275 relative file links across both rebuilding guides, the tool
guide and new package README resolve; the reviewed diff is whitespace-clean.

The production preview loads 202 scene objects, 70 character models and three
source routine positions, enters Ardea with Hero HP 100 and the first Xardas
quest running, then inspects the Hero and `Ardea_OutNovice_01`. The inspector
reports 10,692 triangles/three meshes for the Hero and 11,280 triangles/two
meshes for the bandit. Expanded developer details retain no Navigation owner,
no NavigationAdmin membership and no processing graph. The captured console
contains no warnings or errors.

The next integration must supply the actual Game RTTI demangler and cached
class-name owner, physical onexit state, SharedBase type/factory registration
and fifteen Navigation descriptors on the same MemoryAdmin as the NPC entity,
wrapper and ErrorAdmin. This prefix supplies none of those completed owners.
The live reader remains at 338/6,544 bytes and 0/16 attached property sets;
full NPC activation, AI and campaign completion remain unavailable.

## 82. Rebuild the Game CRT onexit table within its original capacity

Date: 7 October 2026. This component continues checkpoint 81's separate Game
CRT owner. It follows the source-backed cold initializer and the registration
prefix through the table's initial capacity; it does not execute registered
callbacks or implement CRT shutdown traversal.

### Follow the selected Game functions

[`native-game-crt-profile.ts`](../../src/gothic3/native-game-crt-profile.ts)
now pins the Game methods for the onexit cold initializer (`20463763`),
`__onexit` (`20463792`), its table append (`204636aa`), the lock-8 and unlock-8
helpers (`20466415` and `2046641e`), cleanup thunk (`204637c8`), `__msize`
(`204684cd`) and `__realloc_crt` (`20468416`). Its import admission includes
the original Game `HeapSize` IAT slot `207d7bac`.

The cold initializer is an ASM-only source entry (`20463763`); the model uses
its verified instruction sequence and preserves that source gap instead of
inventing a decompiler listing. All method receipts below are checked against
the frozen `game-crt` rules before a Game owner can be created.

| Function | Entry | Pinned instruction SHA-256 |
| --- | --- | --- |
| Cold onexit initializer | `20463763` | `4d870c8f2cada371c595d208b6c80eabc6e271a4b9c3a46f9cb96a7c58c3baa2` |
| `__onexit` | `20463792` | `ba75dc6aa1fdda6487dfefe03480ffc39ee0c914682069d4d651b1edfc50e5d5` |
| `_atexit` | `204637ce` | `09942fe4905f48be972c0e6824f517bcc0cde802100baff5d8a61369ddad30b6` |
| Table append | `204636aa` | `9453717792cfdcbdf7b4d672df5eb89cf286e2528e89ecc86c464502e24d2ea9` |
| Lock 8 | `20466415` | `bc4b460b14e2f6f2d3d110be920239eda737759cb6373edb0411856b4c988d3e` |
| Unlock 8 | `2046641e` | `604fe4c0bc3711292d62e32f3649ddb85f226ddca357cb4aad2b17756c1a1a08` |
| Cleanup thunk | `204637c8` | `b7ae05a03705ad46b63487031e4f8a1386ba4d6198d175c304042b1103a8fdb7` |
| `__msize` | `204684cd` | `50faaccc0f8c787aa6ad46efefbca57bdab8a6241aea6debaf893b52bee2399e` |
| `__realloc_crt` wrapper | `20468416` | `aeb19f5e258e2a4d26d926e59d64e841d059901d844eec6d301cadbe78636f81` |

[`native-game-crt-exit-table.ts`](../../src/gothic3/native-game-crt-exit-table.ts)
shares one facade per canonical `NativeGameCrtOwner`. Its cold initializer
calls the Game `calloc(32, 4)` path, encodes the returned pointer and writes the
actual `crtExitBegin` and `crtExitEnd` globals in source order. On successful
allocation it clears the first DWORD and returns zero. On allocation failure
it still writes both encoded NULL globals before returning 24. It does not
invent a once guard: another initializer call allocates and publishes another
table, retaining the old allocation as the source would.

Each `onexit` registration enters the physical Game lock 8, decodes the two
globals, checks their retained allocation geometry, and calls the newly
admitted Game `__msize` path. Mode 1 reaches the actual lower `HeapSize` call;
the platform reports capacity only for the exact live base pointer owned by
the selected Game heap. The 128-byte calloc allocation holds 32 four-byte
entries. Every accepted registration stores an encoded callback at the
physical end pointer, advances the encoded end global, and leaves lock 8. A
NULL callback is stored as encoded NULL; the modeled `atexit(NULL)` then
returns -1 after the original registration effects.

The 33rd registration computes a 256-byte growth request and reaches the
unowned `_realloc` callee `20477d87` inside the pinned CRT wrapper. The runtime
therefore preserves the 32 existing cells, the old begin/end globals and the
held lock, then blocks replay. It does not substitute host allocation or
pretend the table moved. `__msize(NULL)` similarly retains errno 22 before its
unowned invalid-parameter-handler boundary; Game small-block mode retains
lock 4 at its unowned lookup. Full callback traversal and reverse-order
termination remain separate unimplemented source paths.

### Reproduce this component checkpoint

```powershell
npm run typecheck
npx vitest run tests/gothic3-dialogue/game-crt-exit-table.test.ts tests/gothic3-dialogue/game-crt-owner.test.ts
npm test
npm run build
```

The focused tests verify canonical facade identity, cold allocation and global
store order, repeated initialization, allocation failure, unavailable pointer
encoding, NULL-table `__msize`, exact heap capacity, 32 physical encoded cells,
the 33rd-entry realloc boundary, and held-lock state. The callback values are
source-admitted Game method capabilities used only as data. The table snapshot
explicitly records `traversalOwned: false`.

Local verification passes typecheck and the focused two-file run (**28 tests**).
The full suite passes **2,361 tests across 223 files**. The production build
transforms 375 modules and passes with the existing large-chunk warning. Its
Gothic and NPC chunks remain unchanged because this CRT component has not been
connected to the browser NPC reader. `git diff --check` and the modified
documents' relative file links also pass.

This does not run the Game C initializer table or clear the earlier startup
boundary at `GetCommandLineA` (`204678b9`). The first C initializer is now
represented in isolation, but the preceding startup calls and subsequent
initializers are not connected. Navigation type registration still needs its
actual Game RTTI demangler and cached class-name owner, SharedBase factory and
type registration, and fifteen Navigation descriptors on the same MemoryAdmin
as the live NPC entity, wrapper and ErrorAdmin. The browser NPC reader remains
unchanged; this component does not activate characters or advance campaign
completion.

## 83. Demangle the Game Navigation RTTI name through Game-owned CRT state

Date: 7 October 2026. This checkpoint adds the ordinary, unqualified class
RTTI path for the Game CRT and applies it to the original
`gCNavigation_PS` `type_info` descriptor. The Engine demangler and SceneAdmin
type-name service keep their existing Engine owners and storage.

### Keep each module's demangler graph separate

[`native-crt-dname.ts`](../../src/gothic3/native-crt-dname.ts) now selects an
independently admitted graph profile. The Game profile requires the canonical
`NativeGameCrtOwner`, the Game `demanglerGlobals` image view at `207d14e4`, the
Game malloc/free callbacks and the Game image bytes for its DName node
vtables and literals. Its source gate pins the methods used by
`___unDName`, `UnDecorator`, DName nodes, HeapManager and Replicator, plus the
type-name string routines. It checks each label's Game module, entry, body and
instruction hash before using that graph. The constants are pinned separately
in `nativeGameImagePins`; this does not relabel Engine addresses or borrow the
Engine heap, lock table or demangler globals.

[`native-crt-undname.ts`](../../src/gothic3/native-crt-undname.ts) runs the
selected ordinary class grammar against that profile. For the Game input
`?AVgCNavigation_PS@@` and flags `0x2800`, it returns `class gCNavigation_PS`.
Its source-supported scratch arena uses Game heap allocations and Game lock 5;
the retained DName graph reads the Game node vtables from the Game image. Other
RTTI grammar still stops at an explicit boundary.

### Preserve Game `type_info::_Name_base` ordering

`NativeGameTypeInfoName` aliases the 30-byte descriptor at `20796ce4` and the
eight-byte Game CRT type-info list at `207d0a18`. The uncached call passes
`descriptor + 9` to `___unDName` with flags `0x2800`. The pinned Game `_strlen`
result drives the original trailing-space trim. It then takes Game lock 14,
rechecks the cache, allocates the eight-byte list node and result string,
publishes the cache pointer, copies the successful `strcpy_s` result including
NUL and links the node into the physical list before freeing the temporary
demangled result and unlocking. An already-cached pointer is returned without
scanning its contents, matching the original fast path. The descriptor, list,
allocator, locks and demangler are required to belong to the same canonical
Game CRT owner.

The focused suite is
[`game-crt-typeinfo-name.test.ts`](../../tests/gothic3-dialogue/game-crt-typeinfo-name.test.ts).
It exercises Game demangling, the physical type-info cache/list link, the
no-scan cached path, Game/Engine storage separation, and the pre-existing
Engine demangler and DName cases. Reproduce it with:

```powershell
npm run typecheck
npx vitest run tests/gothic3-dialogue/game-crt-typeinfo-name.test.ts tests/gothic3-dialogue/crt-undname.test.ts tests/gothic3-dialogue/crt-dname.test.ts
npm test
npm run build
```

Local verification passes typecheck, the focused three-file suite (**44
tests**), and the full suite (**2,364 tests across 224 files**). The production
build transforms 375 modules and succeeds with the existing large-chunk
warning. The Gothic 3 bundle remains `gothic3-C3iMc5TP.js`, confirming this
native component did not change the browser runtime bundle. `git diff --check`
also passes.

This constructs a Game RTTI name only for the pinned Navigation descriptor.
It does not yet run the Game C initializer table, construct the SharedBase
class-name CString, register Navigation's reflected factory/type, create the
fifteen Navigation descriptors, or connect them to live NPC activation. The
browser world, NPC reader and hosted gameplay behavior are unchanged by this
CRT checkpoint.

## 84. Construct the Game Navigation class name through SharedBase

Date: 7 October 2026. This code checkpoint continues from the pinned Game
`type_info::Name` result and implements the original `gCNavigation_PS` class
name object at `207b4964`. It does not construct or register the reflected
Navigation property type.

### Follow Game `_strlen` while preserving unknown padding

[`NativeGameTypeInfoName`](../../src/gothic3/native-crt-undname.ts) now uses the
Game `_strlen` instructions at `2046dbd0`: pointer geometry establishes the
alignment residue, unaligned DWORD loads peel to a boundary, and the aligned
loop evaluates the original `0x7efefeff` / `0x81010100` zero-byte predicate.
Candidate DWORDs are reread and checked in source byte order. When a loaded
word contains masked bytes, the implementation enumerates a bounded set of
possible completions and proceeds only when every completion selects the same
branch. The Navigation scratch result reaches its NUL at byte 21 even though
the final DWORD also contains unknown allocation padding. Ambiguous masks stop
at that exact load; padding is not treated as zero.

### Preserve the Game/SharedBase ownership boundary

[`NativeGameNavigationClassName`](../../src/gothic3/native-game-navigation-class-name.ts)
aliases the Game image cache at `207b4964`, previous initializer result at
`207b4ea8`, and selected C++ callback slot at `2056c220`. It checks the exact
Game class-name, initializer and destructor method receipts, plus the imports
for SharedBase `UnMangle` and `bCString::~bCString`. It preserves the original
guard order: copy the prior pointer after guard bit 1, then set guard bit 2
before asking Game `type_info::Name` for `class gCNavigation_PS`.

The Game name is passed to the existing SharedBase first-space search. A fresh
text-construction `NativeHeapCString` copies `gCNavigation_PS` into the shared
24-byte allocation pool under the caller's existing `NativeMemoryAdmin`; Game
CRT and SharedBase allocations stay separate but use the same selected lower
platform. After successful construction, the Game `_atexit` entry registers
the exact `20003904` callback capability. Its forwarding thunk targets
`205496d0`, which delegates the cleanup to the pinned SharedBase CString
destructor IAT. The Game exit-table component retains callback data and still
does not traverse or invoke callbacks; the class owner exposes the destructor
body only when given its registered callback capability.

The selected ASM-only initializer at `204b1840` publishes the actual class
object pointer at `207b4ea8`. Its slot is the 72nd non-null C++ initializer,
with 71 earlier callbacks still unresolved, so this checkpoint does not claim
whole-program startup. The Game property-type singleton, its factory and
registry imports, Navigation's fifteen property descriptors, NPC activation
and browser integration remain later work.

Reproduce the focused component checks with:

```powershell
npm run typecheck
npx vitest run tests/gothic3-dialogue/game-crt-typeinfo-name.test.ts tests/gothic3-dialogue/game-crt-exit-table.test.ts tests/gothic3-dialogue/game-navigation-class-name.test.ts
```

Local verification passes TypeScript typechecking, all **2,368 tests across
225 files**, the production build, and `git diff --check`. The build transforms
375 modules and retains the existing large-chunk warning; the Gothic bundle
remains `gothic3-C3iMc5TP.js`. The focused class-name cases verify the retained
mask state for the final Game `_strlen` DWORD, the 24-byte SharedBase CString,
physical Game callback registration, initializer publication and the cold
exit-table boundary.

This is a native-behavior component checkpoint, not a playable browser change.
The existing Ardea route and NPC reader remain unchanged.

## 85. Extend the byte-verified combat source set with attitude helpers

Date: 7 October 2026. This source-only checkpoint adds three Script_Game
attitude helpers—political, enclave and general—and their three script command
registrations to the native combat evidence set. The selected functions are
`100183e0`, `100188c0`, `10019050`, `10109e50`, `1010a010` and `1010a080`.
The exact installed `Script_Game.dll` hash remains pinned. Regenerating the
receipt reports 160 function entries, 13,335 instruction records and 46,765
instruction bytes, with every selected instruction byte matching the offline
binary study.

The added source is evidence for investigating faction-dependent combat
results. It does not by itself establish the live enclave status or prove
whether the starting Ardea Orcs are killed or knocked unconscious. Their
attacker, defender and session state still have to be connected before a
disposition can be implemented. The browser combat handler remains unchanged.

This checkpoint runs the existing native evidence producer against the exact
offline module set. The local TypeScript build also passes. It does not execute
the native code or establish behavior in ordinary play.

## 86. Connect the shared runtime admins to retained NPC construction

Date: 7 October 2026. This local integration step shares the existing native
runtime owner with the retained browser NPC constructor and reflection path.
It builds on the earlier separately studied MemoryAdmin, MessageAdmin and
ErrorAdmin rather than adding browser-specific success stubs.

`BrowserNpcEntityRuntime` now gives its 448-byte `gCEntity` constructor the
same `NativeMemoryAdmin` instance that backs the service owner's ErrorAdmin.
Its initial tagged allocation therefore has retained physical heap backing.
The constructor receives the source-verified opaque identity of the imported
`g_ArraySortDefaultCompare` target; the comparator body is not invoked by this
pointer store. Navigation reflection creator checks now call the owner's
`ErrorAdmin.IsInPanicState`. The Matrix destructor registration is admitted by
the runtime platform using its exact `SharedBase:100e2910` RET receipt, so
MemoryAdmin, Matrix, MessageAdmin and ErrorAdmin share one reverse-order
shutdown stack.

This does not complete the NativeReflection heap path. The Navigation
PropertyObjectType singleton is still unowned, so its wrapper and 688-byte
native storage are not connected to that heap. Registered SceneAdmin map
backing, remaining reflected factories, property attachment, world context,
processing registration and NPC activation also remain open. The browser
preview loaded the Ardea scene, but the NPC inspector was not reviewed after
this hookup; no changed read boundary or new gameplay behavior is claimed.

Local verification: `npm run typecheck`, `npm run build` and `git diff --check`
pass. The build retains the repository's existing large-chunk warning. The
automated test suite was not run for this local step. This checkpoint is not
evidence of campaign progress. PR 54 subsequently published this bounded
runtime-admin integration; the successful workflow confirms build and
deployment, not NPC activation or campaign completion.

## 87. Construct the source-backed NPC name in the shared heap

Date: 7 October 2026. This integration extends checkpoint 86's real shared
`NativeMemoryAdmin` from the selected 448-byte `gCEntity` allocation into its
name field at offset `0x138`. It uses the native CString owner already modeled
by `NativeHeapCString`, so the field is an owned heap-backed value rather than
a JavaScript-only string.

### Follow the original source string through assignment

The runtime rules pin the NPC records and string table by SHA-256. For the
three selected Ardea bandits—`Ardea_OutNovice_01`, `_02` and `_03`—the reader
also checks original string indices 1096–1098 and their 18 ASCII bytes. The
entity constructor first initializes its CString view over the physical entity
allocation and performs the source clear operation. When the serialized name
is assigned, the bridge allocates a temporary CString from those exact source
bytes, assigns it to the entity-owned CString through the same MemoryAdmin,
then destroys the temporary. A name outside those three admitted records is
rejected; the bridge does not synthesize source bytes from arbitrary text.

`NativeOriginalEntityFactory` passes the same MemoryAdmin used for the entity
allocation into `NativeEntityHeapFields`. The focused integration case creates
the actual `BrowserNpcEntityServices` owner, prepares a hash-verified selected
record, checks the stored heap-backed name, and verifies that the shared
ErrorAdmin is not in panic. The read advances beyond 338 bytes and now stops at
`gCGameApp virtual270`, which requires the initialized application and owned
ModuleAdmin/session cache. The result is still not world-resident.

Reproduce the focused case with:

```powershell
npm test -- tests/gothic3-dialogue/browser-npc-entity.test.ts
```

At checkpoint 87 the focused run passed **8 tests** and stopped at
`gCGameApp virtual270`, which required the initialized application and owned
ModuleAdmin/session cache. Checkpoint 88 advances this same integration test to
the next boundary, `Compiled navigation query requires actual owned area proxy
resolution`.

## 88. Supply the selected browser session mode

Date: 7 October 2026. This checkpoint wires the existing
`BrowserNavigationApplicationOwner` into the retained NPC service and starts
its selected lower session-mode bridge only after the player enters the world.
It advances the native NPC read to the actual Navigation area-proxy lookup;
it does not recreate the Windows application, ModuleAdmin, or native Session.

### Preserve the session boundary

`BrowserNpcEntityServiceOwner` now owns a `BrowserNavigationApplicationOwner`
and exposes `startBrowserSessionMode()`. The explicit start allocates its
browser session-mode record, sets its running byte, registers that record, and
then marks the selected Engine initialized byte. The NPC lifecycle's
`applicationMode270EqualsOne` callback uses this owner, so it follows the
verified cached-session guard and reads the source mode field. These writes
belong to the selected browser adapter; they do not assert that native
`gCGameApp` or `gCSession` startup ran.

The page previously prepared the NPC study during scene boot, before the user
entered the world. `main.ts` now begins that study after `enterWorld()` starts
the browser-owned game session. This preserves the source sequence needed by
the reader and keeps the study out of the pre-game menu. The visual character
and browser combat state remain independent of the reconstructed native entity.

The focused test creates the service owner, starts the browser session-mode
bridge, and prepares the real hash-verified NPC record. It passes the
application-mode check and stops at `Compiled navigation query requires actual
owned area proxy resolution`. No constructed/attached Navigation area proxy is
available to answer the query, so the NPC is still not world-resident.

Reproduce the focused case with:

```powershell
npm test -- tests/gothic3-dialogue/browser-npc-entity.test.ts
npm run typecheck
npm run build
```

The focused suite passes **8 tests**, typechecking passes, and the production
build succeeds with the repository's existing large-chunk warning. This does
not complete native startup, construct Navigation zones/paths, attach remaining
NPC properties, register processing, activate a character, or advance
gameplay. No post-PR-54 browser exercise is recorded for this adapter.

## 89. Materialize Navigation areas for the NPC query

Date: 7 October 2026. This local browser integration supplies the Navigation
area lookup that checkpoint 88 was missing. The source catalog contains 5,385
map-referenced area definitions: 2,226 zones and 3,159 paths, grouped across
67 registered source files—66 static `.node` files and one dynamic
`.lrentdat` layer.

### Build live query owners from verified source records

`BrowserNavigationAreaSourceRuntime` checks the decoded catalog, its source
receipts, unique IDs, property-set classes and compiled proxy references. It
groups area definitions by their source file, then creates a browser-owned
entity, its selected `gCNavZone_PS` or `gCNavPath_PS`, and matrix storage for
each area. Static `.node` entities use the `eCEntity` base; the dynamic layer
uses `gCEntity`. Each supported area is admitted to the browser Navigation
owner and registered through its zone or path lifecycle callbacks.

Binding the stored query properties resolves the full set of 67 source groups
and registers 5,385 live browser area owners. This is deliberately a lower
loader: it does not invoke Gothic 3's reflected property factories, perform
the full serialized entity read, or attach other property sets that may be
present on the source entity. It therefore provides data for the compiled map
query without claiming the original entity-construction pipeline.

The retained NPC test now resolves its Navigation proxies and advances beyond
the earlier proxy-resolution stop. The read remains unsupported later in its
sequence, and the NPC has no world context, remains unattached to a live game
world and is not active. The visible Ardea character and its browser combat
state continue to use separate objects. No post-PR-54 browser exercise of the
inspector is recorded.

Reproduce the focused integration with:

```powershell
npm run typecheck
npm test -- tests/gothic3-dialogue/browser-npc-entity.test.ts
```

The focused suite passes **9 tests**. This checkpoint does not complete native
Navigation reflection, full entity reads, property attachment, world context,
processing registration, NPC activation or campaign progress.

## 90. Resolve source-backed Navigation entity proxies during NPC read

Date: 7 October 2026. This checkpoint follows the bandit's selected
`CurrentZoneEntityProxy` through the verified Navigation source catalog and
the next original Engine proxy operations. It also replaces the earlier
callback-name placeholder with the selected Game.dll C-string globals and
notification rules. The read advances to the NPC contact-vtable call; it
still does not finish property attachment or make the NPC world-resident.

### Preserve IDs, proxy references and call order

The serialized proxy ID
`7e3d269f0004064d9bcbd4c4c62de6aa00000000` resolves to source entity
`world-0048:20`, `Nav_NavZone 1 Edge`, whose exact property set is
`gCNavZone_PS`. `BrowserNavigationAreaSourceRuntime.resolveEntity` returns the
registered source owner only after its source group has loaded and the
property-set owner/ID checks pass. An ID outside this Navigation catalog
remains unknown; this loader does not claim to own the rest of the world.

The notification bridge now follows Engine `eCEntityProxy::GetEntity`: it
reads a retained internal owner first, tests the 16-byte ID, resolves that ID,
and caches the resulting owner. It constructs the temporary proxy, runs
`eCEntityProxy::CopyFrom` with AddReference-before-release order, and destroys
that temporary through the selected proxy destructor. The evidence producer
pins the Engine vtable at `3087bff4`, its `+0x14` slot, and the target
`30008adf` → `304c4290`. It also retains Game helper `201327e0`, which lazily
loads contact mask `0x800000` from the cold `207b8588` global and reads that
bit from the current entity flags.
The corresponding actor `GetPropertySet(6)` branch calls the audited empty
`OnReadContent` virtual, checks the current type bit and returns NULL while that
bit is clear; its later type-bit-present search/sort branch is not claimed by
this checkpoint.

The five selected Game Navigation callback-name globals are constructed from
their original C++ initializer-table entries and original module literals.
Their CStrings use the shared MemoryAdmin and the audited 24-byte and 32-byte
small-allocation pools. The production profile still does not run all Game
CRT initializers, reconstruct all original SceneAdmin behavior, or invoke
native code.

### Current boundary and verification

The focused Ardea NPC read consumes 700 source bytes. It now reaches
`Navigation actor captured contact vtable slot`; the actual contact
notification and iterator services are unresolved. The source area loader
remains a lower browser owner for Navigation data, not the original reflected
entity loader. The NPC stays outside a live game world and inactive, and
browser combat uses separate presentation/gameplay objects.

The local evidence producer reports 43 selected methods and 1,515 instruction
records, all matching the pinned original PE bytes. Typechecking passes and the
focused NPC plus Navigation-notification suites pass (25 tests). The production
build succeeds with the repository's existing large-chunk warning. No browser
exercise was run for this checkpoint.

Reproduce the local checks with:

```powershell
npm run typecheck
npm test -- tests/gothic3-dialogue/browser-npc-entity.test.ts
```

This checkpoint remains unpublished and does not establish NPC activation,
combat progression, save/reload behavior, or campaign completion.

## 91. Reconstruct the selected Navigation contact callbacks

Date: 7 October 2026. This local step follows the bandit's Navigation
notification past the actor contact virtual call by tracing the original Game
vtable slots into Engine's dynamic-entity handlers, then implementing their
selected callback path in TypeScript. It preserves the existing 700-byte read
prefix and leaves unrelated property-set, collision-shape and ScriptAdmin
calls explicit.

### Recover the dispatch and iterator from original bytes

The original Game `gCEntity` vtable at `0x2066813c` has `OnTouch` at `+0x174`
and `OnUntouch` at `+0x17c`. Each slot points to a Game import thunk, whose IAT
symbol names the corresponding Engine `eCDynamicEntity` method. The producer
records the table bytes, both thunk bodies and the Engine import names. The
Engine forwarding entries resolve to `OnTouch` body `0x304be5c0` and `OnUntouch`
body `0x304be760`; both preserve property-set order and reset the contact
iterator between callbacks.

`eCContactIterator` occupies `0x44` bytes. Its constructor sets the contact
pointer, type, flags and trailing word, default-constructs its three vectors,
clears the vector at `+0x24`, and constructs/clears its CString at `+0x3c`.
The two earlier vectors remain unknown in the browser byte view because their
original `bCVector` default constructor writes nothing. Reset clears byte
`+0x32`; in this selected case its contact pointer is null, so it does not
need the unconnected `MemoryAdmin::DeleteObject` branch. Destruction follows
the original order; the CString owner is destroyed and the three verified
vector destructors are no-ops.

The exact original vtables for `gCNavigation_PS`, `gCNavZone_PS` and
`gCNavPath_PS` show `OnTouch`/`OnUntouch` slots at `+0xcc`/`+0xd4`. Their
selected Game thunks forward to the empty Engine base callbacks. The browser
currently dispatches only an attached `gCNavigation_PS` on the selected
`gCEntity` actor. The zone/path callbacks are recorded, but area-side contact
virtuals remain unsupported. Other property-set classes stop explicitly. A
set `eCCollisionShape_PS` type bit also remains unsupported because its contact
callback path is outside this step.

### Local implementation and review limit

`BrowserNavigationContactIterator` retains the physical field bytes and the
same MemoryAdmin-backed CString owner. The contact slot is captured before
iterator construction, then invoked using that captured phase. Its source
profile admits only iterator types 5, 8 and 10. The current actor-side path
can handle a clear type-14 bit and the supported Navigation callback classes;
unknown property classes and non-null iterator-list deletion remain explicit.

The selected Navigation name `CurrentZoneEntityProxy` is 22 bytes, so its
source CString allocation requests 31 bytes (`length + 9`). The NPC heap
extension therefore adds the original 32-byte bucket to the same MemoryAdmin
owner. Its verified cold pointer-area range now contains 11 entries; when
composed with the SceneAdmin extension, the selected shared range contains 13.
The pool producer verifies the range against the original zero-filled PE
bytes. This preserves the source allocator's boundary for the first unsupported
fourteenth region instead of inventing capacity in TypeScript.

The offline producers report **57 Navigation methods / 1,726 instruction
records**, **45 NPC heap methods / 1,229 records**, and **61 SceneAdmin methods /
2,041 records**, all matching pinned original PE bytes. Typechecking passes.
The focused NPC read and Navigation notification suites pass (**25 tests across
two files**) and confirm the next boundary: `Navigation area ScriptAdmin getter`.
The complete local suite also passes (**2,370 tests across 225 files**). The
production build succeeds with the existing large-chunk warning. This
checkpoint was published in PR 55; no manual browser exercise was run for it.
The getter first checks
`eCApplication::IsInitialised`; on the initialized path it lazily resolves the
`gCScriptAdmin` property-object type, looks up the module through ModuleAdmin,
and RTTI-casts the cached component. The browser route has not constructed
those original application, property-type or module owners, so this step leaves
that call unresolved. Publication does not establish NPC activation, combat
progression, save/reload behavior, or campaign completion.

Reproduce the source receipt and local typecheck with:

```powershell
python tools/gothic3/prepare_browser_navigation_owner_source.py --study "<LOCAL_GOTHIC3_STUDY>"
python tools/gothic3/prepare_npc_heap_source.py --study "<LOCAL_GOTHIC3_STUDY>"
python tools/gothic3/prepare_scene_startup_source.py --study "<LOCAL_GOTHIC3_STUDY>"
npm run typecheck
npm test -- tests/gothic3-dialogue/browser-npc-entity.test.ts tests/gothic3-dialogue/navigation-notifications.test.ts
npm test -- tests/gothic3-dialogue/native-npc-heap.test.ts tests/gothic3-dialogue/native-entity-heap.test.ts tests/gothic3-dialogue/scene-startup-memory.test.ts
npm run build
```

## 92. Connect Hero movement to native destination quests

Date: 7 October 2026. This local checkpoint joins three previously separate
pieces: the browser Hero position, the 5,385 source-registered Navigation area
owners, and the native type-8 quest-entry callback. It makes destination
quest entry respond to Hero movement while preserving the boundary between
the native behavior being modeled and the browser movement/dispatch policy.
Physical travel to Xardas Tower remains blocked by a gap in the streamed
terrain and the unconnected tower geometry/collision.

### Resolve a moved Hero to an exact source zone

The explorer stores a camera-eye position in browser-relative metres. Before a
Navigation query, `native-world-coordinates.ts` adds the legacy Ardea scene
origin, subtracts the Hero eye height to find the feet, converts metres to
centimetres, reflects Z, and rounds each coordinate to native float32. The
zone-only query uses the stored Gothic Navigation map. Its selected PropertyID
must resolve to the same live, registered `gCNavZone_PS` source record before
the runtime uses that record's exact destination name.

The browser samples movement every 250 ms and dispatches only when the
registered zone ID changes. The initial zone observation establishes a
baseline; inspector, modal and free-flight states do not dispatch. This is a
browser bridge into the recovered callback, not a port of Gothic's native
movement, collision or Navigation event dispatcher.

### Reproduce the native type-8 transition

The recovered `Script_Game.dll` OnEnterArea handler dispatches
`PSQuestManager::OnEnter`. The manager visits its quests, and
`gCQuest_PS::OnEnter` filters type 8, compares the destination and first
delivery entity by exact name, increments counter 0 with unsigned 32-bit wrap,
and runs the shared delivery-status checker. The original handler does not
guard on quest status. `NativeQuests.enterArea` preserves those conditions and
the existing reward/status transition path. The quest-runtime integration
test dispatches exact source name `Xardas_Tower` to complete
`Xardas_FindXardas`, apply its reward and retain the counter through
save/restore; a separate map test resolves the zone center to that exact name.

### Current boundary and local review

The source lookup and callback are covered by the exact `Xardas_Tower` map
center and quest save/restore checks. Typechecking and the three focused files
(30 tests) pass; the full suite passes **2,376 tests across 226 files**, and
the production build succeeds with the existing large-chunk warning. A local
browser exercise started Ardea and moved the Hero about 0.6 m. A separate
attempt to land at Xardas Tower fell through the terrain gap, so the callback
has not been completed by ordinary travel in the browser. Its quest completion
is verified by the integration test. The browser console reported no errors.
PR 56 publishes this callback and the checkpoint 93 Tower mesh. This checkpoint
does not construct the original movement/physics stack, load the full world
outside the registered Navigation data, activate NPCs, or complete the broader
campaign. Ordinary overland arrival and quest completion in the browser remain
unverified.

Run the focused checks with:

```powershell
npm run typecheck
npx vitest run tests/gothic3-dialogue/npc-kill-quests.test.ts tests/gothic3-dialogue/native-world-coordinates.test.ts tests/gothic3-dialogue/browser-npc-entity.test.ts
npm run build
```

## 93. Export and stream a source-placed Xardas Tower

Date: 7 October 2026. This checkpoint carries one distant static landmark
through the evidence-to-browser path used by the Ardea scene: verify the winning
world and mesh resources, convert their geometry and diffuse images, preserve
the native placement in a manifest, then load and collide with the streamed
result. Browser review rendered the tower and left the Hero grounded after a
landscape-preview teleport. This checkpoint was published in PR 56 by workflow
run 37581031860. Ordinary overland travel to Nordmar has not yet been manually
verified.

### Verify the placement and mesh family

The exporter reads the Ardea world indexes and requires exact source hashes for
the world node, its referenced low-poly mesh, and the matching full-detail
family mesh. It also checks the entity GUID, record index, visual resource name,
and identity transform. The placement comes from entity 2691 in
`G3_World_Lowpoly_01_Levelmesh_01_Spat.node`; the source node's matrix places it
at native coordinates `(95749.75, 23412.244140625, 137449.9375)` centimetres.
The node references `G3_Nordmar_Xardas_Tower_01_LOWPOLY.xcmsh`; the export uses
its exact family counterpart
`G3_Nordmar_Landscape_Locations_01/G3_Nordmar_Xardas_Tower_01.xcmsh`. That
selected mesh contains 7,695 triangles across six material sections.

### Convert and stream the asset

`tools/gothic3/export_xardas_tower.py` uses the existing `.node`, `.xcmsh`,
`.xshmat` and `.ximg` readers. It decodes each selected XIMG diffuse image to
RGBA PNG and embeds the images with the geometry in a GLB. The manifest records
all source hashes, native placement, converted counts and limits. The converter
uses the first diffuse sampler in each material; it does not evaluate native
shader graphs, normal/specular effects, illumination, lightmaps or vertex stream
73. This reproduces the selected source geometry and pixels, not the complete
native appearance.

The reproducible command accepts extracted files from the local installation;
the committed world indexes reject bytes that do not match the recorded source:

```powershell
python -B tools/gothic3/export_xardas_tower.py `
  --node "<extracted G3_World_Lowpoly_01_Levelmesh_01_Spat.node>" `
  --low-mesh "<extracted G3_Nordmar_Xardas_Tower_01_LOWPOLY.xcmsh>" `
  --mesh "<extracted G3_Nordmar_Xardas_Tower_01.xcmsh>" `
  --material-root "<extracted effective compiled-material files>" `
  --image-root "<extracted effective compiled-image files>"
```

The converter writes the GLB and
[`landmarks/manifest.json`](../../public/gothic3/world/landmarks/manifest.json)
under `public/gothic3/world/landmarks/`. In the browser,
[`world-landmarks.ts`](../../src/gothic3/world-landmarks.ts) verifies each
asset receipt, streams the landmark within 500 metres, applies the source
transform, and exposes its meshes to the explorer's collision refresh. This is
render-mesh triangle collision, not an extracted or reconstructed PhysX shape.
The GLB contains 13,709 vertices and 7,695 triangles in a 7,610,012-byte file.

### Current review boundary

`npm run typecheck` and `npm run build` pass; the build retains the existing
large-chunk warning. The asset exporter completed and produced the manifest and
GLB, both served successfully by the restarted local Vite server. The browser
rendered the tower, and pressing `F` to leave preview flight placed the Hero in
the `GROUNDED` state at 211.8 metres. No ordinary overland travel or quest
completion at the tower was exercised. The published checkpoint includes the
checkpoint 92 quest callback and its save/restore coverage. The Tower preview
does not establish ordinary overland travel or quest completion by physical
arrival.

## 94. Model the source ScriptAdmin getter without inventing a module owner

Date: 7 October 2026. This local checkpoint follows the selected retained NPC
read through the next recovered Navigation callback boundary. It turns the
audited Game.dll getter into a small TypeScript owner and keeps unavailable
class-name, ModuleAdmin, RTTI and `CallScript` owners explicit. This moves the
implementation boundary; it does not activate the NPC or make the browser's
area callback executable.

### Follow the getter's native order

The admitted Game.dll entry `2001afbe` forwards to body `200a4bb0`. That body
first checks `eCApplication::IsInitialised`. A false result returns NULL before
touching the lazy guard. Otherwise, the getter sets bit 0 of `207b602c` before
asking `bTPropertyObjectType<gCScriptAdmin,eCEngineComponentBase>` for its class
name, looking the component up through `eCModuleAdmin::GetInstance` and
`FindModule`, RTTI-casting from `eCEngineComponentBase` to `gCScriptAdmin`, and
storing the result at `207b6028`. The retained source receipt pins the getter
entry/body to the installed Game.dll hash; its 86-byte body and decompiled
listing are retained in
[`movement-state/native-evidence.json`](../../assets/gothic3/movement-state/native-evidence.json)
and [`sources/Game/200a4bb0.c.txt`](../../assets/gothic3/movement-state/sources/Game/200a4bb0.c.txt).

`native-game-script-admin-lookup.ts` preserves the initialization check,
guard-first ordering, NULL cache behavior on reentry, first-match module lookup
and cast/store sequence over caller-supplied live memory views. The browser
Navigation owner accepts this getter only through an explicit injection point.
It remains unconnected by `createBrowserNpcEntityServices`: that runtime still
does not own the original type-name CString, ModuleAdmin singleton and module
registry, or ScriptAdmin instance. An isolated fake host in tests confirms the
protocol but does not fill any of those runtime prerequisites. The original
`CallScript` body also requires the GameApp, SceneAdmin/entity processing state
and script processing unit; it is not implemented here.

### Review boundary

The six focused lookup cases cover the uninitialized branch, exact call order,
cache reuse, guarded reentry, missing-module result and retained unknown-owner
boundary. The NPC integration test confirms the existing browser path still
stops at the unconnected ScriptAdmin getter and that its later area-script
vtable slot remains a separate missing owner. This checkpoint establishes a
source-shaped TypeScript model only: no native execution, actual ModuleAdmin
registration, resident NPC, visible area script, quest progression or browser
exercise is claimed.

Reproduce the local review with:

```powershell
npm run typecheck
npm test -- tests/gothic3-dialogue/native-game-script-admin-lookup.test.ts tests/gothic3-dialogue/browser-npc-entity.test.ts
npm test
npm run build
```


## 95. Resolve the source ScriptAdmin class name for the lazy getter

Date: 7 October 2026. This local checkpoint adds the ScriptAdmin type and
class-name path using the installed Game.dll receipts. It does not construct
or register a ScriptAdmin and is not connected to the browser NPC services.

The Game CRT package now captures the 30-byte `gCScriptAdmin` RTTI descriptor
at `207966e0`, the class-name object at `207b47a0`, its prior initializer
result at `207b4f3c`, and the getter cache/guard at `207b6028`. It pins
`bTPropertyObjectType<gCScriptAdmin,eCEngineComponentBase>::vfunction1` entry
`20021346` forwarding to body `20060670`, and the registered destructor thunk
`20013971` forwarding to `205491a0`. The selected 140 methods contain 5,190
instructions, all checked against the installed Game.dll. The producer runs no
native code.

`NativeGameTypeInfoName` now handles both the existing Navigation descriptor
and the ScriptAdmin descriptor. `NativeGameScriptAdminClassName` follows the
two guard bits, copies the prior initializer result, requests the Game CRT type
name, constructs the SharedBase CString and retains the exact Game exit
callback. `NativeGameScriptAdminLookup.forCrt` binds its cache and guard to the
captured Game image globals.

The focused test resolves `gCScriptAdmin`, passes that CString through the
getter and verifies a NULL cache result when its injected test registry has no
matching module. It does not prove the real ModuleAdmin is empty or that the
original application would omit ScriptAdmin registration. The live browser NPC
read remains unconnected at this boundary: Game CRT startup, Engine ModuleAdmin
construction and registration, the ScriptAdmin instance and the RTTI cast are
still missing. `CallScript`, resident NPC activation and campaign progression
are unchanged.

Reproduce this checkpoint with:

```powershell
python tools/gothic3/prepare_game_crt_source.py --study 'C:/Users/heyas/OneDrive/Рабочий стол/Gothic3_Decompiled_Study_2026-10-04'
npm run typecheck
npm test -- tests/gothic3-dialogue/game-navigation-class-name.test.ts
```

## 96. Trace the Engine ModuleAdmin path and locate the remaining creator edge

Date: 7 October 2026. This research checkpoint follows the getter into its
actual Engine owner and records the remaining ScriptAdmin construction edge.
It adds no browser integration and does not claim a ScriptAdmin instance.

The existing `scene-startup` source package captures Engine
`eCModuleAdmin::GetInstance` entry `3002e9ec` / body `30088e90`,
`FindModule` entry `3001d11a` / body `30088af0`, `RegisterModule` entry
`300164ff` / body `30088f60`, and the module-array grow routine at `30088240`.
These 61 selected Engine and SharedBase methods were checked against the
original PE. The getter uses static Engine object storage `30ad9e78` (84 bytes)
and guard `30ad9ecc`; the module pointer array, count and capacity are at
object offsets `+0x34`, `+0x38` and `+0x3c`.

`30088e90` sets the guard before it initializes the `eCInputDispatcher` base,
publishes ModuleAdmin vtable `3081cdd4`, clears the three registry fields,
calls the base `Create` routine and registers shutdown callback `30797fc0`.
`FindModule` walks the registered pointers from the first slot, obtains each
class name and returns the first equal name. `RegisterModule` deduplicates
against the existing array, grows and appends when needed, then forwards the
component to `eCInputDispatcher::RegisterModule`.

The local Game decompilation records `gCScriptAdmin` constructor entry
`200098bd` forwarding to body `2034f330`. The constructor calls
`eCModuleAdmin::GetInstance` and then the ModuleAdmin virtual at `+0x74` to
register itself. `gCScriptAdmin::GetRootObject` entry `20033f14` (body
`2034ca00`) resolves the root property object by the name `gCScriptAdmin`
through `bCPropertyObjectSingleton`; that establishes the root-template lookup,
but not who asks the factory to instantiate the component.

`bTPropertyObject<gCScriptAdmin,eCEngineComponentBase>` copy entry `20012a76`
forwards to body `20356630`. When the copied component slot is empty, that body
calls smart-pointer initializer entry `200151b3` (body `20356440`). The
initializer allocates `0x208` bytes with tag `0xc4` and calls the ScriptAdmin
constructor. The property-object creator entry `200108a7` (body `203568f0`)
uses creator body `20356730`, which initializes the smart pointer and registers
the property object with `bCPropertyObjectFactory`. These Game constructor,
root-lookup and property-object bodies are study pseudocode at this checkpoint;
they have not yet been added to the byte-audited Game source package.

The unresolved edge is which application object invokes that copy or creator
path, and where it falls in startup relative to the cached `gCScriptAdmin`
getter. The getter does not construct the component; if it sees no
registration, its original lookup returns `NULL`. The focused checkpoint 95
test uses an empty registry fixture only, and no production NPC service
supplies the Engine ModuleAdmin, ScriptAdmin construction or RTTI cast owners
yet. The next source task is to recover the caller and its source order before
wiring the lookup.

[`prepare_crt_bootstrap_source.py`](../../tools/gothic3/prepare_crt_bootstrap_source.py)
checks original instruction bytes and captures cold storage, output layouts,
pointer bindings, callbacks and omitted post-free continuations. The
[`source package`](../../assets/gothic3/crt-bootstrap/README.md) separates new
receipts from reused CRT evidence. Regeneration executes no game code and does
not alter the older packages.

The frozen package contains 52 method receipts: 31 newly audited catalog
methods, eighteen reused methods (seventeen unchanged and one attach body
extended with its omitted continuation), and three uncataloged compiler thunks.
All 1,665 unique instructions match the original Engine PE. Forty-nine recovered
post-free instructions comprise forty-one new recoveries and eight reused ones.
All 105 generated files reproduced identically; 101 excerpt references matched
their recorded SHA-256. All 166 files in the preceding CRT package remained
unchanged. The producer executes no native code.

| Frozen output | Bytes | SHA-256 |
| --- | ---: | --- |
| Bootstrap rules | 134,847 | `a57679bc2772b4be46bb0c7e960be3c17b5c1fe3a41e4c31d40d8a4a243050ef` |
| Bootstrap evidence | 329,223 | `95795ca42bce2bd0d658b63e62571a716167d92c3931f0e4bbdce7014cc46f21` |

The combined checkout includes the reviewed [grass contribution](https://github.com/ael-dev3/Tervain/pull/45)
and its local fix commit `6ee7185b19949264d8aee677c738521476b096fa`.
Pointer stamps persist until consumed and all configured flower LODs retain a
bloom row; the [grass record](grass-0.0.13.md#integration-fixes) describes those
changes. Independent reviews checked startup source order, canonical aliases,
partial cleanup, held locks, index rereads and the grass fixes.

Combined local validation passes typecheck and all **2,231 tests across 215
files** in 123.64 seconds. The production build succeeds with 373 modules in
30.26 seconds. The Gothic entry remains `gothic3-CAj9xpg6.js` (1,156.02 kB),
with unchanged NPC entity and services chunks. These startup components have
no browser application-entry import. The separate Tervain build contains the
grass changes; the existing large-chunk warning remains. All 260 relative
links checked across the rebuilding guides, tool guide and grass record resolve,
and the combined diff passes whitespace checks.

Local browser review exercised the title meadow at High, Low and Medium with
pointer brushing, then loaded a new High game and checked movement and a
pause/resume round trip. Health remained 100 and coin count six; the captured
browser console contained no warnings or errors. This was a functional review,
without a new performance benchmark.

This startup prefix still requires command-line, environment, I/O and full C
initialization before Engine DllMain and native application/module startup.
ErrorAdmin, EntityAdmin, reflection/type registration, Navigation and indexed
names remain part of the downstream NPC activation work. The live reader still
stops at 338 of 6,544 bytes, with zero of sixteen property sets attached and no
native processing graph. Passing component checks does not establish campaign
completion.

## 97. Model the Engine ModuleAdmin object and registry

Date: 7 October 2026. This local checkpoint adds the first TypeScript owner for
Engine's static `eCModuleAdmin` object. It follows the verified singleton,
lookup, registration, array-growth and shutdown receipts; it does not yet wire
the ModuleAdmin into browser NPC construction.

### Keep the image object and registry order

The source receipt pins the 84-byte Engine object at `30ad9e78`, its guard at
`30ad9ecc`, the ModuleAdmin vtable at `3081cdd4`, and registry fields at offsets
`+0x34` (array), `+0x38` (count) and `+0x3c` (capacity). The owner sets the guard
before the injected eCInputDispatcher constructor, then applies the ModuleAdmin
vtable and zero registry fields, calls `Create`, and registers shutdown thunk
`30797fc0` in that order.

`native-engine-module-admin.ts` implements forward first-match class lookup,
backward duplicate detection, the `max(8, capacity >> 3)` growth increment,
MemoryAdmin reallocation, and append-before-input-dispatcher-registration. It
keeps opaque component pointer capabilities when an injected allocator moves
the backing. A failure in a lower owner retains the source's applied prefix.
The dispatcher constructor, input registration, RTTI class-name comparison
and dispatcher teardown remain required host capabilities; the owner does not
replace them with empty registries or successful no-ops.

### Record the allocator boundary

In the initial checkpoint 97 review, nine pointer slots requested 36 bytes
through the audited 40-byte bucket, while the tenth module's 72-byte request
was not covered. Checkpoint 98 adds the verified 80-byte pool and extends the
real MemoryAdmin path through that reallocation. A separate injected moving-
allocator case checks opaque module-pointer rebinding.

`NativeRuntimePlatform` admits the ModuleAdmin shutdown callback only when the
Engine thunk, destructor, dispatcher Destroy and dispatcher destructor match
their captured byte receipts. Actual application startup must still establish
and verify the memory-owner registration order before enabling teardown. The
browser NPC service also remains unconnected to this ModuleAdmin and still
does not construct or register `gCScriptAdmin`; the application edge that
creates the ScriptAdmin wrapper and its RTTI cast remain open.

### Review boundary

The focused tests cover singleton order, exact Engine image fields,
first-match lookup, duplicate suppression, ten registrations through the real
72-byte request, append-prefix behavior when input registration is unowned,
and pointer capability rebinding under a moving test allocator. They execute
no native code and do not demonstrate a live Engine component registry, NPC
activation, area script, quest progression or a hosted playable campaign.

Reproduce this local review with:

```powershell
npm run typecheck
npm test -- tests/gothic3-dialogue/native-engine-module-admin.test.ts
```

## 98. Extend the audited heap through the ModuleAdmin growth point

Date: 7 October 2026. Scope: add the exact SharedBase small-pool class needed
for Engine ModuleAdmin's tenth registry entry. This advances a local runtime
owner and its allocator evidence; it does not connect the owner to browser NPC
startup.

The ModuleAdmin pointer list first requests 36 bytes for nine slots. Growing it
for entry ten asks `bCMemoryAdmin::Realloc` for 72 bytes. SharedBase dispatches
requests 65–80 to its 80-byte pool. The updated evidence pins the dispatch body
`100484b0`, 80-byte callbacks and bitmap initializer, pool globals and
descriptor slot, stride 80, capacity `0xff99`, region size `0x500000`, bitmap
offset `0x4fdfe0`, and the exact callback table. The producer records separated
contiguous instruction ranges around source gaps and checks each selected byte
against the original `SharedBase.dll` before emitting receipts.

Regenerating the base allocator receipt changes its SHA-256. The NPC heap and
SceneAdmin startup extensions are regenerated against that base identity, and
the TypeScript owners reject stale extension packages. The base now has nine
buckets; the NPC and SceneAdmin combinations admit twelve and eleven buckets
respectively, and the SceneAdmin extension now pins the first 14 pointer-area
records needed by the combined profile. The following record remains outside
the selected source prefix and is tested as an explicit stop. Source generation
executes no native code.

| Source package | Output | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| [Runtime admin](../../assets/gothic3/runtime-admin/manifest.json) | Runtime rules | 295,911 | `4c95912d7c7087af7a4c6c1c1d9f31d1b69e23da9456e5022c7d64f8756be016` |
| Runtime admin | Native evidence | 808,906 | `22490217c2eeeccc91849e9610b1f6c9be9ea3ff8a897946242dd5d87f3c38ca` |
| [NPC heap](../../assets/gothic3/npc-heap/manifest.json) | Rules | 66,979 | `cfc2631ff21780f66e15c33f68968756f62761c8ff178e397496d854f8593d2b` |
| NPC heap | Evidence | 201,114 | `f0f55eb9f3eb228af66cc1efa087496fb06b082dfa1e03542612badac676a10c` |
| [Scene startup](../../assets/gothic3/scene-startup/manifest.json) | Rules | 114,218 | `b15a38b8a95f92cea93ad3fc2063b255bd18ed7bd6cd682b0c6f782adb8e55ab` |
| Scene startup | Evidence | 342,689 | `abb548b6d15d3f8e0430e29c16a531e6298b752a981c1c2472338f00f3dc2fe8` |

The real ModuleAdmin test registers ten distinct components. It verifies that
the 72-byte growth reaches the 80-byte pool, stores a capacity of 18 slots and
still finds the first and last component after growth. The dispatcher,
class-name, RTTI and application startup owners remain injected dependencies;
this registry is not yet used by `createBrowserNpcEntityServices`.

Reproduce the source packages and focused review with:

```powershell
python -B tools/gothic3/prepare_runtime_admin_source.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
python -B tools/gothic3/prepare_npc_heap_source.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
python -B tools/gothic3/prepare_scene_startup_source.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
npm run typecheck
npm test -- tests/gothic3-dialogue/native-engine-module-admin.test.ts tests/gothic3-dialogue/scene-startup-memory.test.ts
```

### Validation

The source producer reports 112 SharedBase methods, 4,300 instruction records
and 4,259 unique instructions with zero PE byte mismatches. Local typechecking
passes; all 2,392 tests in 228 files pass. The production build succeeds with
393 transformed modules. Its Gothic entry is 1,180.47 kB; the existing Tervain
and world chunks remain above the 1,200 kB warning threshold. This allocator
checkpoint changes no browser route, and it has not been manually exercised in
the browser.

`npm run dev` serves `/gothic3/` locally. Review the actual rendered scene and
models as well as the source diff. Check every generated output hash, asset
reference and source record; record unsupported behavior instead of treating
successful conversion as game equivalence. The current snapshot contains
202 world instances, 67 NPC records, 130 models and 139 textures.

Vite builds Tervain, `/gothic3/` and `/gothic3-local/` into one `dist`
artifact. Publication uses the existing Pages workflow. Before a coherent main
push, inspect repository-wide runs, attempts and workflow trigger chains; reuse
applicable results and avoid duplicate runs. The workflow retains its required
typecheck, scenario suite and build, followed by deployment. Confirm the served
Ardea route, the local-install viewer introduction and the original Tervain
version after the deployment succeeds.

The 4 October foundation checkpoint passed local typecheck, production build,
documentation link checks and generated-byte verification. All 11,843 gameplay
output receipts matched; 9,301 gzip files also matched their decoded receipts.
The largest decoded chunk was 2,749,307 bytes. Native Hero walking and paused
fist deformation rendered in the browser without console warnings, and catalog
search/language selection showed the original records. This evidence does not
include a native-game comparison run or a browser playthrough.

## 99. Own the Engine input dispatcher and compose ModuleAdmin registration

Date: 7 October 2026. This checkpoint corrects the reviewed
ModuleAdmin getter, lookup and destructor boundaries, then implements the
original input-dispatcher base over that same retained static object. It adds
no claim of native NPC activation or a complete campaign.

### Preserve the actual base object and callbacks

[`native-engine-input-dispatcher.ts`](../../src/gothic3/native-engine-input-dispatcher.ts)
owns the first 52 bytes of the ModuleAdmin object. Construction follows
ObjectBase, ObjectRefBase and InputReceiver stores before initializing the
priority arrays at offsets `+0x10` and `+0x1c`, session `+0x28`, action mapper
`+0x2c` and flag `+0x30`. ObjectRefBase Create sets the original validity bit.
Registration reads the component's input-enabled byte at `+0x0c` and admits
exactly value 1, checks both lists for duplicate pointers, then dispatches the
actual priority method at virtual `+0x60`. Original inherited priority 0 is
selected only through the pinned vtable mapping; other overrides require
owned callbacks. Priorities 0 and 1 append to their corresponding arrays.

Array growth uses the original required-count, growth increment, Realloc,
pointer store, memset and capacity order. Pointer capabilities are rebound
after a moved allocation without inventing x86 addresses. Nonzero high-bit
counts and unowned backing remain explicit boundaries. NULL setters support
ordinary teardown. Non-NULL session/mapper setters preserve their original
application/device and release/assign/add-reference order, while requiring
actual application, buffer and reference owners.

Destroy frees priority 1 before priority 0, invokes the object's pinned
session and mapper slots, clears validity through the original IsValid path,
and retains the repeated cleanup reads in the destructor. ModuleAdmin itself
now allows guard-set getter reentry, reads lookup slots lazily, reloads the
matched slot, restores its destructor vtable and performs both post-Destroy
registry cleanup checks.

[`native-engine-module-owner.ts`](../../src/gothic3/native-engine-module-owner.ts)
composes the concrete dispatcher operations with ModuleAdmin and supplies a
SceneAdmin constructor registration bridge through the pinned virtual `+0x74`.
It requires the same MemoryAdmin and actual component fields. Class-name
comparison, reflected creation, original application startup and ScriptAdmin
creation are still separate owners; this compositor is not instantiated by
the production NPC services yet.

### Capture and admit the lower source

The scene-startup producer adds 24 method receipts, seven original vtable
slices with 175 pointer words, ten import/export mappings and the cold
Application pointer at `30ad9898`. The TypeScript owner pins complete table
bytes and consumed import identities. The new audit covers 85 bodies, 2,226
unique instructions and 22 reused receipts, with zero original-PE byte
mismatches. No native program was executed.

| Generated receipt | SHA-256 |
| --- | --- |
| `assets/gothic3/scene-startup/runtime-rules.json` | `426db5775f7da2f47feffde1360368ac3e681add63aeeb750dc370c15b7514a3` |
| `assets/gothic3/scene-startup/native-evidence.json` | `f4c4ba2c49709f57b548b57e571f700f6a30fa6d91bde2401219ceb0f10f3cdd` |

### Local review and remaining integration

Independent source review identified and corrected constructor store ordering,
receipt admission and nonzero high-bit list handling. `npm run typecheck`
passes. `npm run build` succeeds with 393 modules in 39.65 seconds and the
existing large-chunk warning; its Gothic entry is `gothic3-D6Kc6l9E.js`,
1,180.47 kB (268.48 kB gzip). The build was made from the uncommitted runtime
changes on parent `99d4112c`, before incorporating the documentation-only
PR 59 merge. No new tests were added or run for this checkpoint, and the new
compositor has no recorded browser execution.

The next source trace identifies the creation edge in the Game DLL C++
initializer table: `205faf54` initializes the root ScriptAdmin wrapper,
`205faf58` establishes its PropertyID, and `205faf5c` constructs an accessor
creator. The accessor calls the SharedBase singleton/factory clone path,
which reaches the Game property-object creator and the ScriptAdmin constructor
that registers through ModuleAdmin. This occurs before application
initialization. Some initializer bodies are absent from the reconstructed
function catalog and must be captured from original PE bytes explicitly.

The startup clone uses the root wrapper as its source, so it skips the
property-object CopyFrom branch. Its non-root smart-pointer initialization is
the path that allocates the 520-byte ScriptAdmin instance, invokes its
constructor, then Create and the reference/link helper. Wrapper initialization
continues through factory registration, descriptor initialization and
PostInitializeProperties. Each of these operations needs an owned source port
before this chain can activate NPCs.

The current Game CRT attach implementation stops at GetCommandLineA and does
not execute the C++ initializer table. The table trace establishes the original
startup order; it does not demonstrate completed browser startup or native
execution.

The remaining route is to capture and connect those initializer and
accessor/factory owners, its class-name/RTTI and script-call owners, full
entity property attachment, world membership and processing.
Then NPC behavior must participate in ordinary gameplay, quests and saves.
The full browser campaign remains unfinished.

## 100. Own selected ScriptAdmin static initializer bodies

Date: 7 October 2026. This checkpoint captures the actual Game C++ initializer
slots, reproduces selected callback bodies in TypeScript, and extends the
allocator source profile they reach. It is a startup component checkpoint;
production NPC activation and the full browser campaign remain unfinished.

### Establish the original table order

The Game CRT C++ table contains 238,852 slots and 2,468 non-NULL entries. The
three selected slots are:

| Table slot | Original target | Non-NULL ordinal | Purpose |
| --- | --- | ---: | --- |
| `205faf54` | `2051dc90` | 1,673 | Construct the root ScriptAdmin wrapper |
| `205faf58` | `2051dcf0` | 1,674 | Construct its GUID-derived PropertyID |
| `205faf5c` | `2051dd50` | 1,675 | Construct the accessor creator |

The updated [Game CRT package](../../assets/gothic3/game-crt/README.md) captures
the three initializers and four cleanup entries. Four bodies absent from the
catalog/assembly are explicitly recovered from original PE instructions;
existing ASM-only bodies retain that provenance. The package now contains
147 bodies, 5,246 instruction records and 58 PE-recovered instructions.
The ordinary CRT process-attach owner still stops at GetCommandLineA. These
three selected bodies are not invoked as a substitute for the 1,672 preceding
callbacks or full C++ table traversal.

### Preserve canonical storage and callback state

[`native-game-script-admin-startup.ts`](../../src/gothic3/native-game-script-admin-startup.ts)
owns views over the same Game static storage: the 16-byte root wrapper,
20-byte PropertyID and four-byte accessor share the 40-byte range at
`207cbf04`. The property type starts at `207cbe78`, its factory starts at
`207cbe90`, and the guard is at `207cbeb4`. Constructor/destructor evidence
accesses 24 factory bytes. The 36-byte factory-to-guard span includes 12
unclassified bytes and does not establish the factory's native size.

The root initializer preserves the property-base constructor's first mask
store, bit-packed reference count, vtable stores, repeated NULL stores,
property-type lookup and root-wrapper initialization call. Type initialization
sets its guard before calling the lower constructor. Guard-set getter reentry
returns the same static view, including during incomplete construction.
The factory constructor and template registration are explicit lower owners.

The PropertyID initializer allocates a 24-byte uninitialized stack frame.
It constructs the CString from the exact original GUID literal, calls the
GUID text constructor, clears PropertyID DWORDs in the original order, and
copies GUID payload DWORDs sequentially when valid and non-null. Invalid GUIDs
do not require payload reads. The GUID text constructor performs no prior
validity clear. The original null-GUID payload remains an actual lower storage
dependency, preserving preceding native writes. GUID destruction is a RET;
CString destruction preserves its stale physical slot. The frame expires only
after the source cleanup and registration sequence completes.

Accessor construction clears its pointer before querying the singleton,
adds a reference to the returned object through its current vtable, reloads
the current accessor pointer, releases it when present, assigns the result,
then reloads the returned object's vtable for the final release. Mutations
made by that final callback remain intact. The constructor's PropertyID
argument is unused. Cleanup preserves the ErrorAdmin panic branch, repeated
NULL stores and source teardown ordering. Failed cleanup calls retain their
applied prefix and cannot be replayed. Known `_atexit` failure is ignored by
the native initializer; only successful registration retains a cleanup
capability. CRT exit-table traversal remains separate.

The [focused source package](../../assets/gothic3/script-admin-startup/README.md)
contains 98 bodies, 2,552 instructions and 7,146 instruction bytes, together
with 67 import bindings and 44 vtable words. The native ScriptAdmin table is
labeled a prefix. `ClearDLLList` and the Engine base `Invalidate` import are
recorded separately. No DLL or Windows/OLE function was executed.

### Admit the reached allocator classes

| Generated runtime rules | SHA-256 |
| --- | --- |
| Game CRT | `9a3bbb750ec71a1edb13502a26a71ef44a8dcde366f8fd8899553cc85bf4ab86` |
| ScriptAdmin startup | `09f033f6499a396994f666535b9990aa55fca197f93a056b5c538232849432e9` |
| RuntimeAdmin | `4f1399da573a7b77eaa218191ab8af05ffb58301d3789ce8774e22f080846a2e` |
| NPC heap | `4ea50707070b0c8b03c3564fee0c479cadecbce8c6b2f9889e411c138e6165c1` |
| Scene startup | `e2718f3e7fc40272eabd47b29ea0e6e1e4eb83a46437443795f6c990042825f8` |

| Pool stride | Original request interval | First region bytes | Capacity | Bitmap offset / bytes |
| ---: | --- | --- | --- | --- |
| 128 | 113–128 | `0x800000` | `0xffbf` | `0x7fdf90` / `0x1ff8` |
| 640 | 513–640 | `0x280000` | `0xfff` | `0x27fd90` / `0x200` |
| 1,536 | 1,281–1,536 | `0x60000` | `0xff` | `0x5fa10` / `0x20` |

The 520-byte ScriptAdmin request reaches pool 640. Its 120-byte processing
array reaches pool 128. The property singleton's conditional cold map growth
requests 1,468 bytes and reaches pool 1,536. Earlier callbacks may already have
initialized that singleton; this trace does not assume its cold state at
ordinal 1,673. Pool 1,536 uses eight explicit DWORD bitmap stores, each checked
against the original PE. All three final bitmap masks are `0x7fffffff`.

The base allocator admits 12 classes; the NPC and combined Scene profiles
admit 15 and 17. Their selected pointer-area prefixes cover 192, 240 and 272
bytes without inferring a native maximum. Failure fallbacks to pools 160 and
1,792 remain unsupported. The dependent NPC/Scene receipts and TypeScript
pins are regenerated against the updated base identity.

### Reproduce and review

```powershell
python -B tools/gothic3/prepare_game_crt_source.py --study '<LOCAL_DESKTOP_STUDY>'
python -B tools/gothic3/prepare_script_admin_startup_source.py --study '<LOCAL_DESKTOP_STUDY>'
python -B tools/gothic3/prepare_runtime_admin_source.py --study '<LOCAL_DESKTOP_STUDY>'
python -B tools/gothic3/prepare_npc_heap_source.py --study '<LOCAL_DESKTOP_STUDY>'
python -B tools/gothic3/prepare_scene_startup_source.py --study '<LOCAL_DESKTOP_STUDY>'
npm run typecheck
npm run build
```

Independent source review verified all 7,798 instruction rows in the two
startup packages against the original PEs, both complete initializer tables,
229 reconstructed C excerpts, import chains and vtable words. Allocator
generation verified 135 base methods and 5,181 instruction records with zero
PE mismatches. Its three packages reproduced all 508 generated files
byte-for-byte. Typechecking and production build passed; the build transformed
393 modules and retained the existing large-chunk warning. No new test cases
were added and no tests were run locally for this checkpoint. Existing
allocator scenario data is adjusted to the extended scope. No browser
execution of the new owner is recorded.

Actual mapped-literal pointer geometry, GUID conversion through
MultiByteToWideChar/IIDFromString, type/factory/singleton construction,
wrapper/native/descriptor initialization and teardown remain lower
dependencies. The 38-character GUID CString also requests a 47-byte holder,
which reaches the original, currently unaudited 48-byte pool. The selected
initializer owner is not instantiated by the
production NPC services. Connecting those owners, completing CRT startup,
and progressing through ordinary gameplay and saves remain required before
this work can establish a finishable game.

## 101. Own GUID text construction and canonical literal storage

Date: 7 October 2026. This checkpoint reconstructs the actual GUID text body
needed by the selected ScriptAdmin PropertyID initializer. It replaces the
whole-routine `guidSetText` service with a
[source-owned implementation](../../src/gothic3/native-guid-text.ts), composed
by [ScriptAdmin startup](../../src/gothic3/native-game-script-admin-startup.ts).
Full CRT traversal and live NPC startup remain unfinished.

### Preserve the native caller and storage

SharedBase entry `10008175` reaches `10012790`: 57 instructions and 142 bytes,
SHA-256 `08a0405a66687fafb6e5696ab41a3bf12a56ed6059aade4787798e25375bf34e`.
The implementation compares the current CString with the original `{}`
literal, queries the UTF16 length, doubles the raw count with DWORD wrapping,
and calls the original MemoryAdmin GetInstance/Malloc path. It reloads the
CString pointer after allocation, calls conversion again, ignores that call's
known return value, and passes the actual wide buffer and aliased 16-byte GUID
prefix to IIDFromString. Only HRESULT exactly zero sets the validity byte.
GetInstance/Free follows that store; the final result reloads the validity
byte after Free callbacks.

The `{}` branch writes only validity byte `+16` to zero and returns one.
No path adds a prior payload clear, padding write, conversion-success guard or
unconditional cleanup. Unknown lower operations retain their applied prefix
and stop replay. Parent startup interruption is propagated into the CString
constructor and GUID operations after lower calls.

The [CString owner](../../src/gothic3/native-heap-cstring.ts) now owns exact
Compare `100137c0`, Equals `10013b70` and const GetText `100134e0`, including
the source's unusual NULL/empty outcomes and byte-load order. Non-NULL GetText
returns the retained character pointer without reading holder contents or
checking a terminated holder's lifetime before the later actual access.
GUID payload equality follows `10012290` with DWORD comparisons and the
original byte fallback; partially unknown bits remain explicit unless their
known differing bits establish the reached comparison branch.

The [runtime platform](../../src/gothic3/native-runtime-platform.ts) registers
Game `2069c090` using the existing canonical Game CRT image view. The private
owner registry and retained backing, buffers, masks and DataView prove that
this is the same 39-byte range. No copied literal, heap allocation or invented
x86 pointer is introduced. The Shared literals at `100e5e10` and `100e5e3c`
are retained once per selected platform. CRT Free accepts only its actual
CRT blocks; module image ranges remain mapped until platform disposal.

### Admit the remaining holder pool and call linkage

The 38-character literal needs a 47-byte CString holder. The new original
pool48 capture includes eight bodies, 297 instructions and 936 instruction
bytes, covering dispatch, allocation, initialization, free, reallocation,
inline free, shutdown and statistics. Requests 41–48 reach this pool; its
VirtualAlloc failure continuation reaches the still unowned 56-byte pool.
The base/NPC/combined Scene profiles now admit 13/16/18 classes and selected
pointer-area prefixes of 208/256/288 bytes. These prefixes establish neither
a native maximum nor completion of earlier startup allocations.

The focused package retains 98 bodies, 2,552 instruction rows and 7,146 bytes.
Three reused allocator bodies add 101 reviewed rows and 365 bytes separately.
Four GUID CALL sites and seven forwarding JMP hops establish the actual
GetInstance, Malloc and Free linkage, including the intermediate aliases that
the original GUID caller uses. Dependency receipts pin the reused packages.

### Supply explicit external writers

[`selectAsciiGuidTextPlatform()`](../../src/gothic3/native-guid-platform.ts)
selects a bounded browser provider for CodePage 0, flags 0, NUL-terminated
ASCII conversion and canonical braced GUID text. Query includes the NUL;
fill rereads the current source and writes UTF16 words to the supplied actual
allocation. IID parsing writes the 16-byte output prefix in the required
field order. Unsupported encodings, forms and unowned failure behavior stop
with their retained prefix. The provider is separate from the source caller
and executes no native Windows/OLE functions. Its external contracts are
documented by Microsoft for
[MultiByteToWideChar](https://learn.microsoft.com/en-us/windows/win32/api/stringapiset/nf-stringapiset-multibytetowidechar),
[IIDFromString](https://learn.microsoft.com/en-us/windows/win32/api/combaseapi/nf-combaseapi-iidfromstring)
and [GUID fields](https://learn.microsoft.com/en-us/windows/win32/api/guiddef/ns-guiddef-guid).

### Reproduce and review

```powershell
python -B tools/gothic3/prepare_runtime_admin_source.py --study '<LOCAL_DESKTOP_STUDY>'
python -B tools/gothic3/prepare_npc_heap_source.py --study '<LOCAL_DESKTOP_STUDY>'
python -B tools/gothic3/prepare_scene_startup_source.py --study '<LOCAL_DESKTOP_STUDY>'
python -B tools/gothic3/prepare_game_crt_source.py --study '<LOCAL_DESKTOP_STUDY>'
python -B tools/gothic3/prepare_script_admin_startup_source.py --study '<LOCAL_DESKTOP_STUDY>'
npm run typecheck
npm run build
```

Independent reviews compared the GUID, CString, PropertyID and allocator
instructions, forwarding chains, import slices and captured listings with
original PE bytes. The focused package's 2,653 selected plus reused instruction
rows, 201 excerpts, seven allocator JMPs and four caller sites had zero
mismatches. Separate review checked canonical image aliases and the selected
external provider. Typechecking and production build passed; the build
transformed 401 modules and retained the existing large-chunk warning. Existing
allocator scenario data was extended; no test cases were added or tests run
locally. No browser execution of the new startup owner is recorded.

The initial PR workflow exposed two existing combined-profile scenarios that
still selected 17 pools and the former pointer-area limit. Their existing
request lists now include the 47-byte holder, their count is 18, and the next
region exceeds the 288-byte prefix at entry 19. This is a scenario-data and
count correction; it adds no test cases or changes to the runtime.

After successful selected conversion, the original path clears PropertyID and
reaches its next prerequisite: the actual mutable Shared NullPayload at
`101ab150`. Original initializer `100e1470` copies four DWORDs from `100ebb28`
to this range. That initializer, its canonical shared storage and preceding
writes remain unowned; cold zero-fill cannot prove its current value. Until
that dependency is supplied, payload copying, CString destruction, exit
registration and temporary stack expiration are unreached in this path.
Property factories, native ScriptAdmin construction, full startup, live NPC
activation and the finishable campaign remain required.

### Publication receipt

[PR 65](https://github.com/ael-dev3/Tervain/pull/65) merged reviewed head
`d3e61c9da4bb8a633de9d5dcfac3db6ef6184850` into main commit
`f9d8b609afebb8f1e4781d3f1665f6f38d4b50e9`. Corrected PR run
[37611036192](https://github.com/ael-dev3/Tervain/actions/runs/37611036192)
and main publication run
[37611795592](https://github.com/ael-dev3/Tervain/actions/runs/37611795592)
passed 2,392 existing tests across 228 files and built 401 modules. Pages
deployment `6908335449` succeeded. HTTP review returned 200 for the root,
`/gothic3/` and `/gothic3-local/`; the served Gothic entry is
`gothic3-CnpZfxX6.js`, matching the publication build. These receipts establish
the published checkpoint, while the runtime and campaign limits above remain.

## 102. Own the canonical Shared GUID null initializer

**Source and implementation checkpoint, 7 October 2026.** The next reached
ScriptAdmin property-ID dependency is SharedBase's actual mutable 16-byte GUID
payload at `101ab150`. This checkpoint supplies its original initializer and
ties it to the browser NPC platform's retained module storage. Full CRT
traversal, native component creation and a finishable campaign remain required.

### Capture the original body and complete physical tables

[`prepare_shared_guid_null_source.py`](../../tools/gothic3/prepare_shared_guid_null_source.py)
reads the original SharedBase image with SHA-256
`5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214`.
The [source package](../../assets/gothic3/shared-guid-null/README.md) captures
three original bodies with 74 instructions and 223 bytes. Only initializer
`100e1470` is implemented here: nine original ASM instructions, 45 bytes,
with body hash `fe95f9b100333ef62ca804d288a0db74d3c72240b197fa4b92481e1be29d1e03`.
It has original assembly and symbol evidence, but no catalog function or
reconstructed C body; those source gaps remain explicit.

`__cinit100aa632` and `__initterm_e100aa47d` supply contextual table evidence.
Both full original tables are retained: 214 C++ slots in 856 bytes and 135 C
slots in 540 bytes. The selected callback is physical C++ index 132 at
`100e5210`, nonzero ordinal four with three preceding callbacks. Its slot is a
view at byte offset 528 in the complete table. Capturing the tables proves no
callback execution. The original C declaration for `__initterm_e` says `void`,
while assembly returns a callback result in EAX and the caller tests it; the
unchanged C excerpt records this discrepancy.

Three existing IsNull/raw-equality/destructor receipts add 79 instruction rows
and 193 bytes as separate pinned dependencies, with no duplicated bodies or
excerpts. Exact SetGuid-to-IsNull and IsNull-to-equality callsites remain
linked to the focused ScriptAdmin source. The producer also records all eight
PE sections, permissions, cold/file-backed provenance and 19 bounded absolute
operand references; this reference search proves no whole-memory writer closure.

### Retain one image authority and execute the real store order

[`NativeSharedModuleImage`](../../src/gothic3/native-shared-module-image.ts)
owns canonical fragments per actual constructed
[`NativeRuntimePlatform`](../../src/gothic3/native-runtime-platform.ts).
Private registries retain backing, bytes, masks, buffers, DataView identities,
offsets and spans. The source `100ebb28`, mutable payload `101ab150`, full
tables and both existing Shared CString literals are acquired through this
authority. CString-first and registry-first acquisition return the same
retained views. Cold receipts initialize storage once; later acquisitions
preserve current bytes and unknown masks.

Contained address ranges resolve to retained subviews. A wider range spanning
separately allocated fragments returns an explicit boundary; it cannot become
one contiguous TypedArray by copying mutable storage. MemoryAdmin's other
selected cold ranges are not consolidated by this checkpoint.

[`NativeSharedGuidNull`](../../src/gothic3/native-shared-guid-null.ts)
checks the current physical slot target and preserves the native instruction
order: three source DWORD loads, the first destination store, the fourth
source load, then the remaining three cached stores and RET. A failed later
read retains any earlier store. Private selected-execution state prevents
reentry or replay after an interrupted prefix; it writes no native guard.
The getter becomes available only after actual selected execution reaches RET
and returns the same live 16-byte view, preserving subsequent bytes and masks.
The separate 20-byte `GetNullGuid` object cannot supply this service.

Every acquired fragment is registered as module-image storage before
publication. CRT free rejects it. Platform lifetime uses an ECMAScript private
phase, so resetting exposed byte/backing fields cannot resurrect terminal
storage. Module backings expire only after successful callback drain. This
browser disposal profile establishes no original Shared CRT termination.
The selected initializer registers no destructor or exit callback.

### Compose the selected callbacks on the browser NPC platform

[`createBrowserScriptAdminStartup`](../../src/gothic3/browser-script-admin-startup.ts)
is retained by
[`createBrowserNpcEntityServices`](../../src/gothic3/browser-npc-entity-services.ts).
It explicitly schedules the selected Shared callback before a fresh Game
property-ID initializer. The Game image's private canonical owner and the
MemoryAdmin construction registry prove the same actual platform. The heap's
execution platform is immutable. A retained blocked Game graph cannot receive
a replacement lower service and replay its applied prefix.

The host uses the selected ASCII/UTF16 GUID writer from checkpoint 101 and
gets the actual Shared payload through the canonical owner proof on each call.
The returned graph retains the Game initializer's actual `propertyIdResult`,
including a later lower failure. It does not fabricate successful exit
registration, root/factory/accessor construction, ModuleAdmin registration or
ScriptAdmin call slots. The NPCs remain inactive until those paths and their
world/entity lifetimes are connected. This composition is connected in code;
no new browser observation is recorded for it in this checkpoint.

### Reproduce and review

From the repository root, with the original read-only study and current focused
ScriptAdmin package:

```powershell
python -B tools/gothic3/prepare_shared_guid_null_source.py --study $gothicStudy --repo . --output assets/gothic3/shared-guid-null
npm run typecheck
npm run build
```

The generated package contains 11 files and a self-excluded manifest of 22
unique artifact/producer/dependency records. Independent reviews cover exact
source admission, table aliases, instruction order, same-platform callback
composition, current mutable payloads, retained interruptions and terminal
lifetime. Direct PE/source review found zero byte mismatches; all 11 generated
files reproduced byte for byte, and all 22 manifest records matched their
files. Whole-tree TypeScript and the production build passed with 425 modules;
the existing large-chunk warning remains. Documentation review passed 359
relative links and 40 Markdown anchors. Local tests were not run and no new
test cases were added. Source
capture, typechecking and a production build do not establish full startup,
production NPC activation or campaign completion.

### Confirmed publication of checkpoint 102

[PR 67](https://github.com/ael-dev3/Tervain/pull/67) merged reviewed head
`1f38f1095bf523d7b7b694acd9b3020bd97bbce4` into main commit
`be062db145c40c337ed23187e3283ea62f9f5d0f`. PR run
[37615533798](https://github.com/ael-dev3/Tervain/actions/runs/37615533798)
and main publication run
[37616248532](https://github.com/ael-dev3/Tervain/actions/runs/37616248532)
passed 2,409 existing tests across 230 files and built 425 modules. Pages
deployment `6909117853` succeeded for that main commit. HTTP review returned
200 for the root, `/gothic3/` and `/gothic3-local/`, with served entry names
matching the publication log. The Gothic entry is `gothic3-B6jm-gJe.js`; the
new NPC service chunk is `browser-npc-entity-services-DJ0ep5AN.js` and contains
the selected GUID initializer and property-ID composition. This is publication
evidence, not a new browser execution or performance observation.

## 103. Connect the browser Game CRT attach prerequisites

**Source integration checkpoint, 7 October 2026.** The previous selected
property-ID schedule supplied Shared's real GUID payload but left Game's heap,
thread and lock prerequisites cold. This checkpoint creates the browser NPC
platform with an explicit CRT provider and enters the existing original Game
attach body before the later property-ID callback. It retains the first reached
incomplete attach boundary. Native module activation and a finishable campaign
remain required.

### Declare the browser compatibility environment before construction

[`createBrowserGameCrtPlatform`](../../src/gothic3/browser-game-crt-platform.ts)
declares the virtual x86 Win32 ABI
`browser-game-crt-virtual-win32-nt6.1-v1`: platform 2, version 6.1, build 7601,
KERNEL32 availability, owned pointer encoding, FLS and spin-count exports,
a process heap and initially empty TLS storage. The factory allocates one
stable logical thread ID per platform. These are declared compatibility
inputs; no host OS version or native Windows thread ID is observed.

[`NativeRuntimePlatform`](../../src/gothic3/native-runtime-platform.ts) performs
the actual retained heap, TLS/FLS, pointer and physical-section operations.
It copies scalar/version configuration and initial TLS entries, retaining
the exact supplied endpoint functions. Configuration and capability registries
are private; caller mutation of an input Map or version object cannot replace
them. The published TLS procedure object and its binding retain their original
identities. A default platform still has no CRT service provider.

The provider's private factory registry proves the actual platform/profile
identity. A static constructor and private-phase lifetime check rejects fresh
startup during draining, blocked shutdown or disposal. Shared image views
retain their existing lifetime during legitimate callback drain. This provider
does not supply command line, full security-cookie entropy or missing native
startup bodies.

### Retain the actual Game attach graph and source order

[`createBrowserGameCrtStartup`](../../src/gothic3/browser-game-crt-startup.ts)
installs a constructing record before lower calls and retains the final Game
host once. Its errno closure resolves the same bootstrap thread/PTD owner;
it does not allocate a substitute errno DWORD. The same factory-created platform
continues to own MemoryAdmin, Shared storage, Game storage and lower CRT
capabilities. A preexisting conflicting Game host or interrupted graph cannot
receive replacement callbacks and replay.

The original [Game CRT package](../../assets/gothic3/game-crt/README.md)
already admits this prefix. `crtAttach204677e4` contains 151 original
instructions and 473 bytes, with body hash
`9469f04e5cd533e1cf5aaa85553339f7e4eb4eb7f38ec894a6b4d8dd0493be27`.
The [bootstrap owner](../../src/gothic3/native-crt-bootstrap.ts) preserves:

1. Actual process-heap allocation of the 148-byte version record, its size
   store, the supplied version writer, reached field reads and original free.
2. Game OS-field stores after the free, in their original instruction order.
3. `heapInit204769c5`, including actual `HeapCreate(0,4096,0)`, heap publication
   and selection from the produced OS fields.
4. `mtInit204681d9`: actual FLS/TLS queries and indices, pointer initialization,
   encoded procedure publication, all 14 static locks in the original 36-record
   traversal, the 532-byte PTD allocation/publication, locale references and
   logical thread-ID store.
5. `preCInit204737dd`, checking all 64 current physical cells; a reached
   non-NULL unowned callback remains a boundary.
6. The next unowned `GetCommandLineA` call at `204678b9`, IAT `207d7ca0`.

Heap-only initialization leaves static creation lock 10 cold. Initializing
locks before the owned pointer initialization can fail when cold scalar zero
is decoded as an encoded capability. The source ordering above supplies these
prerequisites through their actual owners. Known NULL/false/zero results retain
the source failure and cleanup paths.

`NativeCrtBootstrap.processAttachForCrt` proves the actual retained constructor,
CRT identity and private scheduling state, then invokes the real private body.
Public instance replacements or a descriptive progress record cannot authorize
that execution. Bootstrap phases, interruption state and dependency identities
are private/retained. Game bootstrap and thread physical views resolve through
the original private canonical image authority, preserving current bytes,
masks and aliases instead of accepting replaced public view accessors.

The thread's retained own dependencies are nonwritable and nonconfigurable,
and sealing prevents added method shadows. Its existing `freePtdCallback` hook
remains writable: native cleanup must reread the current TLS getter index after
the callback returns. The first PR check found that freezing the whole thread
blocked this legitimate hook (2,408 tests passed, one failed); this checkpoint
replaces that freeze without changing the tests or the private attach dispatch.

The attach progress record describes actual returned calls, reached reads and
stores, known lower results and partial version-buffer bytes/masks. It adds no
native loads and supplies no continuation permission. If the command-line
boundary is reached, the attach result remains unknown, the applied prefix
is retained and the attach count has not been incremented. Separately entering
this attach body does not execute the DLL-entry security cookie or complete
module startup.

### Gate the production property-ID callback on its prerequisites

[`createBrowserNpcEntityServices`](../../src/gothic3/browser-npc-entity-services.ts)
now constructs the declared platform before its runtime admins.
[`createBrowserScriptAdminStartup`](../../src/gothic3/browser-script-admin-startup.ts)
retains Shared's successful selected GUID initializer, enters the Game attach
graph and records whether the later property-ID initializer was entered.
An incomplete attach returns an explicit prerequisite boundary with
`propertyIdInvocation: 'not-entered'` and `game: null`; it cannot be described
as a failed property-ID body that never ran. Reacquisition checks the retained
Game/Shared identities and active platform lifetime without restarting them.

No original guards, property-ID cleanup cells, onexit entries, factory objects
or module registration are fabricated to cross that boundary. The currently
supported successful lower profile is statically expected to stop at the
command-line call; no new browser runtime observation is recorded here.

### Continue the original initialization toward the playable game

The next source work follows `GetCommandLineA` with environment preparation
`20476835`, I/O initialization `204742ff`, argument construction `2047677c`,
environment-vector construction `204764ff` and `cinit204665f4` in their original
order. Their caller receipt alone does not supply their implementations.
The original math initializer pointer bytes are nonzero; continuation must
read its current canonical storage and resolve any reached target. The other
C callbacks, earlier C++ callbacks, onexit initialization,
ScriptAdmin factory/root/accessor, module/session activation and native NPC
lifetime still need actual connected owners. Full exit-table traversal and
CRT teardown are also unfinished. These requirements remain part of the
browser game objective.

For this integration, use the existing source package and review the production
composition with:

```powershell
npm run typecheck
npm run build
```

No new native package, test cases or local test execution are introduced by
this checkpoint. A typecheck, build or bounded startup result does not prove
a complete campaign.

Whole-tree TypeScript and the final production build passed with 430 modules.
The existing large-chunk warning remains. Independent review found and corrected
canonical host-descriptor retention and constructor storage-accessor gaps.
Direct original PE/ASM review of the existing Game package checked 28 bodies,
1,191 instruction rows and 3,453 bytes, with zero byte, assembly-row or excerpt
hash mismatches; full physical tables and selected cold ranges also matched.
The four-document link review passed 369 relative links and 41 Markdown anchors.
These are source, integration and build receipts; no new browser execution or
performance result is claimed.

### Confirmed publication of checkpoint 103

[PR 68](https://github.com/ael-dev3/Tervain/pull/68) merged reviewed head
`555b1aedd6899bb93912c7366a3ff35c85b744c5` into main commit
`af05f7656d66ab8d8a004e7a3d56ec2c033774ab`. The corrected PR check
[37620281526](https://github.com/ael-dev3/Tervain/actions/runs/37620281526)
passed all 2,409 existing cases across 230 files and built 430 modules. The
normal main publication
[37620977457](https://github.com/ael-dev3/Tervain/actions/runs/37620977457)
completed successfully; Pages deployment `6909953497` identifies that exact
main commit. Repository-wide Actions and workflow-trigger review preceded
the remote steps. No workflow was dispatched, rerun or changed.

HTTP checks returned 200 for `/Tervain/`, `/Tervain/gothic3/` and
`/Tervain/gothic3-local/`. Served entry and NPC-service bundle hashes matched
the downloaded successful-run artifact, including the declared ABI and retained
incomplete-attach markers. These checks establish which build was published;
browser interaction and campaign completion were not exercised in this receipt.

## 104. Own the Game command-line and environment prefix

Checkpoint 104 continues the original Game CRT attach immediately after
`preCInit204737dd`. It supplies explicit virtual process inputs and implements
`crtGetEnvironmentStringsA20476835`, including its reached scalar
`memcpy20463ed0` path. The selected fresh browser graph is expected to reach
the I/O call at `204678ce`; attach remains incomplete there.

### Capture the next source without changing the earlier package

Two separate source producers retain the original PE bytes, assembly rows,
catalog extents, C references and dependency manifests:

```powershell
python -B scripts/gothic3_game_memcpy_supplement.py --study '<LOCAL_GOTHIC3_STUDY>' --repo . --output assets/gothic3/game-memcpy
python -B scripts/gothic3_game_attach_continuation.py --study '<LOCAL_GOTHIC3_STUDY>' --repo . --output assets/gothic3/game-attach-continuation
```

The [continuation package](../../assets/gothic3/game-attach-continuation/README.md)
contains 39 methods, 2,167 instructions and 6,256 bytes; two methods reuse
unchanged Game CRT receipts. Five initializers have original ASM-only evidence.
It also retains 19 cold ranges, seven constants and 30 exact imports. The full
C and C++ tables remain source context. Their captured cells do not authorize
runtime traversal or overwrite already canonical Navigation/ScriptAdmin aliases.

The [memcpy supplement](../../assets/gothic3/game-memcpy/README.md) captures
two vector/helper bodies with 129 instructions and 356 bytes. Six readonly
code ranges contain 32 DWORDs: 30 actual scalar targets and two unreachable
words overlapping instruction tails/padding. Negative selectors and physical
aliases are preserved. Vector execution remains an explicit runtime gap.

Independent original-source audits and separate regeneration checked both
landed packages with zero mismatches. All 285 existing Game CRT files remained
byte-identical. The continuation manifest depends on the finalized supplement;
the supplement has no reverse manifest dependency.

### Retain process inputs and their real buffer lifetimes

[`browser-game-process-inputs.ts`](../../src/gothic3/browser-game-process-inputs.ts)
declares the command line `"Gothic3.exe"` and environment entry
`GOTHIC3_BROWSER=1`, with the original required NUL terminators. These are
application inputs, not observations of the installed process. The factory's
optional v2 profile copies and freezes every supplied byte/mask array and
nested policy before retaining it. The default v1 prefix profile is preserved.

[`NativeRuntimePlatform`](../../src/gothic3/native-runtime-platform.ts)
owns the actual endpoint descriptor and process-buffer capabilities. A command
line keeps stable process lifetime. Each A/W environment acquisition issues
its own OS block; successful nonzero release expires that block. A zero release
result leaves it live, and the native environment routine ignores that known
BOOL. Descriptive records, foreign buffers, interior release pointers and
replaced public accessors supply no ownership authority. Logical thread
LastError changes only when the selected outcome declares an effect.

The explicit ACP1252 provider supports ASCII with positive character counts.
Query and fill reread the retained live UTF16 source, including its NULs, and
fill validates the actual Game heap destination. Reached output writes acquire
known masks; an untouched suffix keeps its existing masks. Uncovered encodings
remain unknown. DLL-entry security-cookie entropy and general NLS behavior
still require separate implementations.

### Preserve native environment branches and scalar writes

[`NativeGameCrtEnvironment`](../../src/gothic3/native-game-crt-environment.ts)
reads and writes the actual Game mode cell `207d11b0`. From mode 0, a non-NULL
W acquisition writes mode 1; a NULL result changes mode to 2 only for actual
LastError `0x78`. Other outcomes follow current native mode reads. W scans,
conversion query, Game malloc, conversion fill, zero-result free and W release
occur in source order. An empty W block has the original count of one character.
The A path scans its own block, allocates from Game's current heap, copies,
then releases the OS block. Known allocation/conversion failures follow the
original cleanup; an unknown lower operation preserves its completed prefix.

[`NativeGameCrtByteCopy`](../../src/gothic3/native-game-crt-byte-copy.ts)
uses actual canonical geometry, current dispatch words, byte values and masks.
It preserves overlap direction, scalar alignment/unrolled/tail transfers and
backward `STD`/`REP MOVSD`/`CLD` order. An interruption after `STD` retains DF 1.
Forward copies of at least 256 bytes read the current Game CPU flag before
selecting a scalar/vector path; a reached unowned vector branch stays unknown.
Each completed call can be invoked again through a fresh private frame. An
interrupted or reentered owner cannot replay its partial work. This checkpoint
admits active Game attach invocations; future atexit/draining use remains a gap.

### Connect the original caller and retain the next boundary

[`NativeCrtBootstrap`](../../src/gothic3/native-crt-bootstrap.ts) calls the
actual `GetCommandLineA` endpoint at `204678b9`/IAT `207d7ca0` and stores its
returned pointer at `204678bf` into canonical `207d2b60`. It calls the retained
environment owner at `204678c4`, then stores the returned pointer at `204678c9`
into canonical `207d0a74`. Both stores include NULL; the original caller has
no intervening success test. Progress describes those actual returns and
stores without inventing numeric x86 addresses for browser pointer capabilities.

The next call is `ioInit204742ff` at `204678ce`. Its first lower dependency is
`SEHprolog4` at `20474306`, before `GetStartupInfoA`. Actual exception-frame and
scope ownership, startup handles, I/O records, argument/MBC construction,
environment vectors, C/C++ callbacks and teardown remain required. The attach
count is not incremented and the property-ID initializer remains unentered.
The same platform continues to own the module image, heap and process buffers.

Local review uses whole-tree typechecking, the production build, original-source
and link/diff audits. No new cases or local test execution are introduced by
this checkpoint. A published build does not establish full startup, NPC
activation, browser fidelity or a finishable campaign.

Independent source, provider, environment/copy and caller integration reviews
passed. The physical-access review corrected helper/DataView shadow gaps by
admitting each new Game image access through the retained actual root, preserving
its native address geometry and aliases without copying or reseeding. Whole-tree
typechecking and the final production build passed with 436 modules. The existing
large-chunk warning remains. The documentation audit passed 381 relative links
and 42 Markdown anchors; whitespace review passed. These are static source and
build results, with no new browser interaction or performance observation.

### Confirmed publication of checkpoint 104

[PR 69](https://github.com/ael-dev3/Tervain/pull/69) merged reviewed head
`646bb8d4be70e775d3c5d289a715c585beac6036` into main commit
`15dfc38a6736b5b7883d23cb9e038f15bcbdb8d4` on 7 October 2026.
The [PR run 37625619891](https://github.com/ael-dev3/Tervain/actions/runs/37625619891)
and [publication run 37626377654](https://github.com/ael-dev3/Tervain/actions/runs/37626377654)
passed the existing 2,409 scenarios in 230 files and built 436 modules.
Pages deployment `6910905458` succeeded for that exact main commit. All three
routes returned HTTP 200; their entry bundles and the NPC service bundle
matched the downloaded artifact from the successful main run byte for byte.
This verifies the published version and its static checks. Full CRT startup,
native NPC activation and campaign completion remain unfinished.

## 105. Own the Game I/O startup stack and SEH prolog

The next original caller operation is `CALL204742ff` at `204678ce`, followed
by a result test at `204678d3`. Its callee first calls `__SEH_prolog4` before
reaching `GetStartupInfoA`. A temporary byte buffer and a pointer codec cannot
supply the original register, stack, return-slot, FS and cookie/XOR relations.
This checkpoint connects that bounded source prefix to a retained virtual x86
machine state on the actual Game platform.

### Capture original source and preserve genuine gaps

```powershell
python -B scripts/gothic3_game_io_startup_source.py --study '<LOCAL_GOTHIC3_STUDY>' --repo . --output assets/gothic3/game-io-startup
```

The [package](../../assets/gothic3/game-io-startup/README.md) retains 13
cataloged bodies, 516 original instruction rows and 1,610 instruction bytes.
Three bodies reuse the unchanged continuation source paths; ten add original
C/ASM pairs containing 298 rows and 959 bytes. The manifest pins the final
producer, actually loaded helpers, exact original inputs and prior packages.
Earlier Game CRT, continuation and memcpy packages remain unchanged.

The two readonly EH4 scopes are `206e8e90` and `206e8e70`, each 28 bytes.
Only the I/O scope becomes a new live Game image alias. Two ranges totaling
14 bytes at `20474528`–`20474536` have genuine original C ENTRY, catalog and
ASM gaps. They are retained as PE-only evidence. Manual opcode interpretations
are labeled inference and do not authorize runtime filter/handler execution.
The captured exception closure and section-initializer scope remain context.

### Retain machine words and their physical aliases

[`NativeX86ThreadStack`](../../src/gothic3/native-x86-thread-stack.ts) owns one
reserved physical stack and register/FS bank for the selected logical thread.
The production [factory selection](../../src/gothic3/browser-npc-entity-services.ts)
reserves 4,096 bytes before the Game graph is constructed. The optional v3
selection uses opaque relative stack addresses, unknown incoming registers
and unknown incoming `FS:[0]`. Numeric runtime Windows addresses are not
invented. Default profiles without this service keep their previous boundary.

Private words retain current byte values, bit masks and captured source,
relative-address or XOR provenance. Physical DWORD stores preserve those
values/masks in aliased storage; overwritten or externally changed cells cannot
reuse stale expression authority. XOR of the same captured word with itself
produces known zero. Cookie reversal needs the captured key relation; a changed
current cookie cannot authorize the old expression. Source VAs identify
captured code/image capabilities while numeric runtime pointer masks remain
unknown. The ordinary source prolog requires no exception dispatch.

### Connect the actual caller and source frame

[`NativeCrtBootstrap`](../../src/gothic3/native-crt-bootstrap.ts) retains the
I/O owner before attach starts, then issues a private permit only around its
reached `204678ce` call. The permit verifies the actual same-CRT bootstrap,
running attach, active source scope and current lower call. Descriptive progress
does not supply that permit. The [I/O owner](../../src/gothic3/native-game-crt-ioinit.ts)
executes the incoming CALL, two argument PUSHes, prolog CALL, all 21 original
prolog instructions and four subsequent I/O instructions: 29 source rows in
total. Every operation rechecks its actual controller and caller authority.

For entry ESP `S`, the resulting frame has `EBP=S-4`, returned prolog
`ESP=EBP-0x74` and published `FS:[0]=EBP-0x10`. The original prolog saves
inherited EBP/EBX/ESI/EDI and prior FS, reads current canonical Game cookie
`207b2314`, encodes the scope with that captured word, and stores the frame
cookie/XOR relation and saved ESP. Its RET consumes the transferred private
`2047430b` continuation. The following I/O prefix writes try level zero and
pushes the actual `EBP-0x64` address of its 68-byte STARTUPINFOA alias.

The next boundary is `GetStartupInfoA` at `20474314`/IAT `207d7c1c`, before
the writer call. Unknown interruption retains every applied store, published
FS registration, saved register word, physical alias and outstanding caller
slot. It does not replay the prefix, dispatch a native exception or execute
the epilog. The incoming `204678d3` return slot must remain live through the
final `ioInit` RET at `2047453e`; the separate epilog RET cannot retire it early.

### Continue toward complete startup and gameplay

Full I/O still needs the owned STARTUPINFOA writer, inherited and standard
handle capabilities, current I/O blocks/count, Game calloc, per-record sections,
native exception paths and the source epilog/final return. The caller's result
branch, argument/MBC construction, environment vectors, full C/C++ initializer
traversal, module entry, property factories and native NPC activation remain
required. This prefix supplies a prerequisite for those paths; it does not
establish a finishable campaign.

Local validation uses whole-tree typechecking, the production build, independent
source/ownership reviews and link/diff audits. No new test cases or local test
execution are introduced. Runtime or browser observations are recorded only
when actually performed; source inspection alone does not establish fidelity.

Independent original-source, source-admission, provider and caller integration
reviews passed. Review corrected physical storage checks and made stack/I/O
snapshots copy descriptions without exposing the private writer alias or changing
word records. The final production build passed TypeScript checking and built
441 modules. The existing large-chunk warning remains. The documentation audit
passed 389 relative links and 43 Markdown anchors; diff whitespace review passed.
All 24 package outputs regenerate identically, and 885 files across eight earlier
source packages remain byte-identical. These are source and build results;
no new browser interaction, native execution or campaign completion is claimed.

### Confirmed publication of checkpoint 105

[PR 70](https://github.com/ael-dev3/Tervain/pull/70) merged reviewed head
`75d4a278d0ec109e3a487cfb89c3a23f9d70d5f8` into main commit
`ef2bba53bbb8dae47a8b1c8fd6f192c907da3d9f` on 7 October 2026.
The [PR run 37630163967](https://github.com/ael-dev3/Tervain/actions/runs/37630163967)
and [publication run 37631082331](https://github.com/ael-dev3/Tervain/actions/runs/37631082331)
passed the existing 2,409 scenarios in 230 files and built 441 modules.
Pages deployment `6911853998` succeeded for that exact main commit.

The root, `/gothic3/` and `/gothic3-local/` routes returned HTTP 200 on the
recorded publication review. Their entry bundles and the Gothic NPC service
bundle matched the successful main run's downloaded artifact byte for byte.
The served NPC service retained the v3 stack profile, the I/O caller permit and
the `20474314`/`207d7c1c` boundary markers. This establishes which reviewed
implementation was served. No new browser interaction, native execution,
performance result or campaign completion was observed in this checkpoint.

## 106. Own the startup-info writer and normal import return

The next original I/O operation calls `GetStartupInfoA` through IAT `207d7c1c`
at `20474314`. It must write the 68-byte structure already passed by the actual
caller and return to `2047431a`. This checkpoint connects a declared virtual
writer to that current physical call, then executes the five original rows
preparing the first allocation. It leaves the outer I/O frame and final caller
continuation retained at the next unowned call.

### Preserve the focused original caller evidence

```powershell
python -B scripts/gothic3_game_io_writer_source.py --study '<LOCAL_GOTHIC3_STUDY>' --repo . --output assets/gothic3/game-io-writer
```

The four-output [source package](../../assets/gothic3/game-io-writer/README.md)
captures six selected rows totaling 19 original instruction bytes. Its seventh
instruction pin is the unexecuted next call at `20474327`. It reuses the exact
I/O body and calloc wrapper C/ASM references in the unchanged continuation and
Game CRT packages: 212 contextual rows and 634 bytes. Its manifest retains the
original binary, assembly, catalog and C source identities, final producer and
loaded helpers, nine dependency documents and four reused source artifacts.
The original I/O source gap remains explicitly unfilled.

The void stdcall4 return, preserved registers/FS and unknown volatile registers
are declared virtual Win32 compatibility rules consistent with the original
caller. They are separate from captured native caller instructions. No original
Windows callee or host process output is executed or claimed as captured.

### Select the actual writer before constructing the graph

The [production inputs](../../src/gothic3/browser-game-startup-io-inputs.ts)
select three ordered masked stores: DWORD `cb=68`, WORD `cbReserved2=0` at
offset `0x32`, and the NULL DWORD `lpReserved2` at offset `0x34`. These ten
bytes become known through actual stores; untouched bytes retain their current
unknown masks. The caller does not zero the whole structure.

The [selection contract](../../src/gothic3/native-win32-startup-io.ts) copies and
freezes primitive write data before a fresh Runtime/Game/bootstrap/I/O graph
exists. It rejects accessor or iterator implementations and unsupported partial
or non-NULL reserved pointers. The browser factory's optional v4 profile
declares the writer and retains the selected logical thread and physical stack.
Absent writer selections keep the previous pre-import boundary. No blocked
graph is patched, enlarged, reset or replayed.

### Own the physical call, stores and one normal return

The [stack bridge](../../src/gothic3/native-x86-thread-stack.ts) checks the actual
private I/O controller, current `20474314` call site, current argument word and
exact retained `EBP-0x64` frame alias. It pushes the private `2047431a` return
word, then grants only the Runtime's retained endpoint access during this call.
Each BYTE/WORD/DWORD store checks current physical backing, masks, spans and
lifetime and invalidates overlapping word/pointer provenance. Public endpoint
shapes, source metadata and copied snapshots cannot manufacture a grant.

After the argument PUSH, ESP is `EBP-0x78`; the import CALL places its return at
`EBP-0x7c`. A normal void stdcall4 return consumes that actual return and four
argument bytes, restoring ESP to `EBP-0x74`. EAX/ECX/EDX remain numerically
unknown under the declared ABI, while callee-saved registers and FS remain
retained. A 128-byte reservation fits checkpoint 105 but cannot fit this CALL;
it stops at the attempted PUSH. The production 4,096-byte selection is sufficient.

An unknown writer or escaped JavaScript error retains completed stores, pending
call/argument slots, protected try level and FS registration. It consumes no
normal return, executes no following try-level store and dispatches no native
exception. Snapshots distinguish an attempted CALL, entered writer and completed
normal return using their actual private execution state.

### Continue the caller through its next actual dependency

Only the completed normal import return permits these original source rows:

| PC | Operation |
| --- | --- |
| `2047431a` | Store try level -2 at `EBP-4`. |
| `20474321` | PUSH allocation element size 56. |
| `20474323` | PUSH count 32. |
| `20474325` | POP the current count into ESI. |
| `20474326` | PUSH that retained ESI value as the count argument. |

The selected normal path completes 35 original source operations including the
29-row checkpoint 105 prefix. It stops **before** CALL `20474327` targeting
`204683ce`; the count/size arguments and outer frame remain live. The existing
logical allocator is reusable later, but its result cannot replace the missing
nested stack/SEH execution and return. No allocation, I/O global publication,
record initialization, epilog, final I/O return or module success is supplied.

The bootstrap copies the reached `calloc` boundary only after its actual I/O
invocation interrupts. Its private caller permit remains tied to the original
I/O call. The model inspector's existing folded developer study now shows the
retained startup phase, next operation, startup-info call result and incomplete
I/O return. This is descriptive evidence; it grants no execution authority or
NPC activation.

### Local source, build and browser review

Independent source, provider, stack, caller integration and coherent checkpoint
reviews found no material issue in the final selection and return path. The
four source-package outputs regenerate identically, and all 909 files in the
earlier packages remain byte-identical. Whole-tree TypeScript checking and the
production build passed, transforming 447 modules; the existing large-chunk
warning remains. The documentation audit passed 405 relative links and 53
Markdown anchors, and the diff whitespace check passed. No new cases or local
test-suite execution were introduced.

The local production preview was opened at `/gothic3/`. After entering Ardea,
opening Models, selecting `Ardea_OutNovice_01` and expanding **Original entity
study · developer details**, the displayed retained result was:

```text
Game startup: blocked · next calloc at 20474327
Startup-info import: returned
I/O initialization returned: no
```

The displayed interruption names the missing nested source call, frame,
allocation and return and the retained count 32, size 56 and outer SEH frame.
The model is its exported bind-pose body/head pair, with 11,280 triangles and
two material meshes. The captured browser error log contained no errors during
this review. This observation confirms the selected browser path reached the
new startup boundary. It does not demonstrate complete I/O startup, original
Windows execution, native NPC activation or campaign completion.

The next work is to own the actual nested allocation frame and normal return,
then continue I/O records, inherited/standard handles, sections, native exception
paths and outer return. Remaining argument/environment/initializer traversal,
module and property factories, live NPC activation and the full playable
campaign remain required.

### Confirmed publication of checkpoint 106

[PR 72](https://github.com/ael-dev3/Tervain/pull/72) merged reviewed head
`bacfc4dcccafddf55961e4b6bbc6b21eb59bbe7c` into main commit
`9d8bbfb071e7f22deb0a412162b3aac3bfa01efa` on 7 October 2026.
The [PR run 37638673398](https://github.com/ael-dev3/Tervain/actions/runs/37638673398)
and [publication run 37639921718](https://github.com/ael-dev3/Tervain/actions/runs/37639921718)
passed 2,441 existing scenarios in 231 files and built 447 modules, on attempt 1.
Pages deployment `6913267154` succeeded for that exact main commit.

The root, `/gothic3/` and `/gothic3-local/` routes returned HTTP 200 during the
publication review. The three entry bundles and Gothic NPC service bundle
matched the successful main run's downloaded artifact byte for byte. The served
service retained the v4 writer profile, actual import bridge and `20474327`
allocation boundary. Artifact metadata and the downloaded tar digest bind the
comparison to this run. The ten implementation-file hashes, four source-package
hashes and producer hash matched the reviewed commit. README and the three
rebuilding/tool documents fetched at the exact main revision also matched it.

The browser observation above is from the local production preview. This
publication audit establishes the served code revision; it introduces no new
browser gameplay, Windows execution, NPC activation or campaign completion
claim.

## 107. Own the first I/O allocation and record initialization

This increment extends the retained startup invocation through the original
`calloc` wrapper and nested implementation, then the first I/O record loop.
Its reviewed build, local browser observation and confirmed publication are
recorded below.

### Preserve the full call path and genuine source gaps

The [allocation producer](../../scripts/gothic3_game_io_allocation_source.py)
creates a [four-output supplement](../../assets/gothic3/game-io-allocation/README.md)
using five unchanged full C/ASM bodies: wrapper `204683ce`, implementation
`20477c2a`, prolog `20468570`, epilog `204685b5` and I/O caller `204742ff`.
They contain 337 original rows and 995 instruction bytes. The independent
static audit compared them with the preserved Game DLL, regenerated the four
outputs identically and found all 913 earlier package files unchanged.

The original 28-byte scope at `206e8f98` and the existing loader-zero ranges
`ioBlocks207d2a20/256B` and `ioHandleCount207d29c4/4B` become canonical fresh
Game images. Initial loader zeros do not establish current values: execution
uses the retained backing, current masks and pointer bookkeeping. The five
bytes at cleanup entry `20477d21` remain separately labeled PE-only evidence.
The missing original C/catalog/ASM entries are preserved as gaps; no handler,
cleanup call, exception dispatch or invented cookie check is supplied.

### Follow the physical allocation and normal returns

The [I/O owner](../../src/gothic3/native-game-crt-ioinit.ts) pushes the original
caller return at `20474327`, executes the wrapper's argument forwarding, enters
the nested implementation and runs its actual SEH prolog. The nested frame
retains the outer frame and FS registration. Current arithmetic operands and
private masked flags control the source branches, including DIV, SBB, INC,
IMUL and the current heap-mode check.

At `20477ce8`, the [stack bridge](../../src/gothic3/native-x86-thread-stack.ts)
checks the current heap, three actual arguments, nested frame, pending source
returns and FS registration. Only the Runtime's constructor-retained endpoint
receives the private call grant. The [Game CRT owner](../../src/gothic3/native-engine-crt-locks.ts)
retains the real allocation effect, and the [Runtime owner](../../src/gothic3/native-runtime-platform.ts)
records the actual normal result. The virtual HeapAlloc compatibility contract
is explicit; it does not claim captured Windows callee execution or numerical
addresses for opaque pointers.

The selected mode-1, non-NULL path allocates 1,792 zeroed bytes with flags 8.
Its stdcall12 return consumes the actual import return and arguments. Original
source rows then restore the outer FS registration through the normal epilog,
return to the wrapper, clean its forwarded arguments, restore saved registers
and return to I/O caller `2047432c`. The deepest selected stack depth is 224
bytes; the existing production reservation is 4,096 bytes.

Unknown results retain completed effects, pending return/argument words and
the reached nested or outer registration. They execute no cleanup, unwind,
normal return or replay. Unsupported overflow, mode-3, retry and inherited-handle
paths stop at their actual unmet source row. A logical allocator call cannot
replace the source frame or its returns.

### Publish and initialize the actual first block

After caller cleanup and the actual non-NULL branch, source row `20474336`
publishes the allocation pointer before `2047433b` publishes count 32. Partial
publication stays partial if interrupted. The actual loop initializes 32
records of 56 bytes, with BYTE and DWORD writes kept distinct:

| Record offset | Source value |
| --- | --- |
| `+0` | Handle becomes `0xffffffff` through the original OR operation. |
| `+4`, `+5` | Flags 0 and text-mode byte `0x0a`. |
| `+8` | Section state DWORD 0. |
| `+0x24`, `+0x25`, `+0x26` | Lookahead bytes 0, `0x0a`, `0x0a`. |

Every iteration reloads the current canonical block pointer before its
comparison. Comparisons use live, contained offsets of the same allocation;
copied bytes or numeric zero placeholders do not prove pointer identity. Zero
bytes in the section storage do not initialize a critical section.

The current startup-info WORD `cbReserved2 == 0` permits the inherited-block
skip. Original standard-input prefix rows select record zero, write flags
`0x81`, and push `STD_INPUT_HANDLE == -10`. The next unowned import is
`GetStdHandle` at `204744b4`, IAT `207d7bbc`, before its call or return word.
The static selected ledger is 531 completed source operations including the
preceding 35; this expected count must be distinguished from an observed
execution. The final outer I/O return `204678d3` remains outstanding.

The model inspector's folded developer details describe the actual allocation
return, global publication, initialized record count and source-operation
count. Descriptive snapshots grant no execution authority. Standard handle
results, handle types, sections, final I/O return, remaining CRT traversal,
module/property initialization, active NPCs and campaign completion remain
required.

### Local build and browser observation

Whole-tree TypeScript checking and the local production build passed with 451
modules. The existing large-chunk warning remains. No new cases or local
test-suite execution were introduced. Source, physical provider, I/O caller,
integration and documentation reviews found no material issue in the frozen
implementation.

At `/gothic3/` in the local production preview, the review entered Ardea, opened
Models, selected `Ardea_OutNovice_01` and expanded **Original entity study ·
developer details**. The displayed retained state was:

```text
Game startup: blocked · next GetStdHandle at 204744b4
Startup-info import: returned
First I/O allocation: returned
I/O globals published: yes
I/O records initialized: 32
I/O source operations completed: 531
I/O initialization returned: no
```

The interruption names the actual unowned import and retained -10 argument.
The displayed model remains its 11,280-triangle, two-material exported bind
pose. The captured browser error log contained no errors. This observation
confirms the connected allocation and loop in this local build. It does not
establish standard handle results, completed I/O or module startup, original
Windows execution, NPC activation or a finishable campaign.

### Confirmed publication of checkpoint 107

[PR 74](https://github.com/ael-dev3/Tervain/pull/74) merged reviewed head
`999f53d60ff901afac8bae08347de33aed704021` into main commit
`b6cbd47eaeb56f641eba99eb7e9bdaa4f766fe21` on 7 October 2026.
The [PR run 37649782591](https://github.com/ael-dev3/Tervain/actions/runs/37649782591)
and [publication run 37650693600](https://github.com/ael-dev3/Tervain/actions/runs/37650693600)
passed 2,464 existing scenarios in 235 files and built 460 modules, on attempt 1.
Pages deployment `6915020894` succeeded for that exact main commit.

The root, `/gothic3/` and `/gothic3-local/` routes returned HTTP 200. The three
entry bundles and Gothic NPC service bundle matched the successful main run's
downloaded artifact byte for byte. The ten implementation files, four source
package outputs and producer matched the reviewed commit. README and the three
rebuilding/tool documents fetched at that exact revision matched it too.
The integrated artifact also retained the four reviewed fixes from
[PR 73](https://github.com/ael-dev3/Tervain/pull/73), which had merged before this
checkpoint. The integrated local production build passed with unchanged source
inputs. This publication audit establishes the served revision; the browser
observation above remains a local preview observation.

## 108. Own standard handles, critical sections and the normal I/O return

This increment continues the same retained invocation through the standard
handle loop, three cached critical-section calls, `SetHandleCount` and the
outer epilog and return. It stops before the caller's `TEST EAX,EAX` at
`204678d3`. Full CRT/module startup, property initialization, NPC activation
and campaign completion remain required.

### Preserve original source and distinguish contextual gaps

The [completion producer](../../scripts/gothic3_game_io_completion_source.py)
creates a [four-output supplement](../../assets/gothic3/game-io-completion/README.md).
Its five active original bodies contain 304 rows and 908 instruction bytes:
I/O `204742ff`, prolog `20468570`, epilog `204685b5`, section helper `204741c7`
and DecodePointer wrapper `20467ddb`. A separate original caller TEST receipt
describes the next boundary; it does not execute that instruction.

Retained context contains 12 original C/ASM bodies with 703 rows and 2,118
bytes, plus three separately labeled PE-decoded listings with 20 rows and 68
bytes. Exception filter `2047424d`, handler `20474264` and compiler TLS thunk
`20467e52` have genuine catalog/C/ASM gaps and remain noncallable context.
The runtime's direct cached FlsGetValue procedure does not execute that native
thunk. Earlier source packages and physical image aliases are reused without
reseeding current storage.

### Declare compatibility inputs and prove actual calls

The explicit [browser v5 selection](../../src/gothic3/browser-game-crt-platform.ts)
uses [three declared CHAR handles](../../src/gothic3/browser-game-standard-io-inputs.ts)
and a declared SetHandleCount result of 32. RuntimePlatform mints opaque
handle capabilities and retains the copied policy and immutable endpoint.
These declarations do not capture host Windows handles or implement console
reading and writing. Earlier provider profiles retain their endpoint omissions.

Every reached endpoint requires a private call grant from the actual current
source frame. The bridge checks live arguments, stack cursor, FS registration,
pending return words and the same Game owner. TLS/FLS and DecodePointer calls
reread the actual cached procedure, indices and retained 532-byte PTD.
The read-only PTD proof requires exact allocation-time record membership and
live physical storage; it does not acquire or initialize another record.

Each 24-byte critical section aliases `record+0xc` in the existing 1,792-byte
allocation. The selected spin procedure performs a real physical registry
insertion. Opaque section writes invalidate known bytes and overlapping pointer
bookkeeping across the allocation's aliases. The surrounding handle, flag and
section-count fields retain their separate source effects. A zeroed section
or a copied object does not establish initialization.

### Consume normal returns in source order

Current handle outcomes and file types control the original branches. Valid
CHAR handles take the section path; NULL, invalid and unknown outcomes remain
distinct. Each selected helper runs its own prolog, cached DecodePointer
wrapper, spin call, epilog and source RET. The caller cleans its arguments and
increments the record's section count only after the actual successful result.
The standard loop derives IDs -10, -11 and -12 using the original arithmetic.

After SetHandleCount returns, source rows produce EAX 0, restore the outer
registration and registers, and consume the original incoming `204678d3`
return word. The caller accepts a result only with the private original
invocation's return proof, records that actual number, and stops before TEST.
Unknown calls preserve already applied effects and pending stack/FS state;
they execute no invented cleanup, normal return or replay. Resolver fallback
and native exception dispatch remain unfinished when reached.

The static selected CHAR path adds 368 operations to checkpoint 107's 531,
giving an expected total of 899. This source ledger is not an observed runtime
count. The tail's deepest stack depth is 216 bytes; checkpoint 107's allocator
still supplies the larger 224-byte requirement, within the existing 4,096-byte
reservation.

### Build and local browser observation

The first browser inspection rejected the supplement's normal row ledger.
JavaScript enumerates decimal-looking object keys before other string keys;
the hexadecimal address map therefore needed explicit fixed-width address
sorting. The admission helper now sorts those keys before selecting spans.
Static review confirms exact 368-row normal and 80-row NULL ledgers after this
correction. The producer, four package outputs and 917 earlier source files
remain unchanged.

The first [PR workflow run](https://github.com/ael-dev3/Tervain/actions/runs/37660609795)
on head `6683ea0bc94e2228493973f5ebc9677cfcda6a4f` passed typechecking but
failed eight existing lock-initialization compatibility checks; 2,456 other
cases passed. Static diagnosis traced all eight failures to the cached legacy
section procedure bypassing the existing public lower endpoint and its
platform overrides. Restoring that earlier dispatch preserves the selected
failure, exception and observation paths. The new standard I/O bridge retains
its separate private initializer and actual call-grant checks. The existing
test cases are unchanged; that first failed run is preserved as failure
evidence and is not reused as a successful publication check.

The corrected local production build passed typechecking and transformed 466
modules. A subsequent complete build capture recorded exit zero, identical
before/after binary hashes and inventories for 75,704 tracked and new
nonignored repository files, no input changes and no capture errors. These are
interval snapshots, not continuous monitoring; ignored dependencies, build
outputs and the separate offline source study are outside that inventory.
No new test cases were added and no local tests were run in this increment.

In the local production preview, entering Ardea, selecting
`Ardea_OutNovice_01` in Models and expanding its developer details showed:

```text
Game startup: blocked · next callerTest at 204678d3
Startup-info import: returned
First I/O allocation: returned
I/O globals published: yes
I/O records initialized: 32
Standard handles returned: 3
Standard handle types returned: 3
Standard I/O sections initialized: 3
Handle-count import returned: yes
I/O source operations completed: 899
I/O initialization returned: yes
I/O return value: 0
```

Captured browser error logs were empty. The inspected local service bundle
`browser-npc-entity-services-Bph-DSD9.js` has SHA-256
`b5fbf289d5e890a05384e9c92d9a3cb92d89b77ae489805f9b87abed7f8eceaa`;
the Gothic entry `gothic3-BHWdeEmx.js` has SHA-256
`fd75d43d3f64388f27e2aae077f9734a8f0c1ebeb8384d9af7565184122ab00a`.
Both inspected files match the successful final local build. This establishes
local browser execution of the selected path; matching future served artifact
bytes alone would establish publication identity, not another execution
observation. The fresh inspection and final capture were repeated after the
legacy dispatch correction; the same 899-operation zero return was observed.

The next required work owns the original caller TEST and conditional branch,
then the complete argument initialization path with its MBC/NLS dependencies,
parser passes, allocation and actual return. Whole CRT and module startup,
native NPC activation and the campaign remain unfinished.

### Confirmed publication of checkpoint 108

[PR 75](https://github.com/ael-dev3/Tervain/pull/75) merged the corrected reviewed
head `93a8cbb15e0f5b8138cfa30c8ce271766009a73d` at main commit
`acc3ddfc791614bb772b0832e13203e599b9605c` on 7 October 2026.
The corrected [PR check](https://github.com/ael-dev3/Tervain/actions/runs/37663616326)
and normal [main publication](https://github.com/ael-dev3/Tervain/actions/runs/37665161360)
both succeeded on their first attempts: 2,464 existing cases in 235 files,
typechecking, and a build of 466 modules. The separate first-head failure
described above remains failure evidence. This increment added no test cases
and ran no local tests.

Pages deployment `6917407367` succeeded. The root Tervain URL, `/gothic3/` and
`/gothic3-local/` returned HTTP 200. The four inspected entry/service bundles
matched the `github-pages` artifact `11502855998` from that exact main run;
its retained artifact tar has SHA-256
`963789d52855064efe07b18d017e5b4f481aef50caeda39b738a0392db052d66`.
The Gothic and NPC service bundle hashes also match the corrected local
observation above. Four repository documentation files and 22 source/package
files matched the reviewed commit, with the producer independently verified.

These are publication and source-identity checks. They are not another browser
execution observation and do not establish completed CRT traversal, native NPC
activation or a finishable campaign. A repository-wide paginated workflow audit
after publication found 172 runs and no active jobs; no dispatch, rerun, remote
cancellation or workflow change was used for this increment.

## 109. Own cold encoding initialization and the normal argument return

This increment continues the same original Game I/O invocation through its
caller TEST/JGE, argument initializer CALL at `204678de`, actual callee return
and the caller's following TEST/JL. The next unexecuted operation is
`CALL 204764ff` at `204678e7`, the environment initializer `__setenvp`.
Completing this selected argument path does not complete the outer CRT attach.

### Recover and admit the source

[`gothic3_game_argv_source.py`](../../scripts/gothic3_game_argv_source.py)
produces the [22-file supplement](../../assets/gothic3/game-argv/README.md).
It pins 32 original bodies, 1,850 distinct assembly rows and 5,225 instruction
bytes: 23 reused bodies contain 1,205 rows and 3,486 bytes; nine new bodies
contain 645 rows and 1,739 bytes. The separate original exception-handler
listing has 125 contextual rows and 406 bytes. The 172-site full call inventory
and 78 conditionally selected unique sites describe source coverage, not a
dynamic operation count or complete alternate-path ownership.

All 22 outputs regenerated identically. Independent original PE, C/ASM,
metadata and manifest inspection found no mismatches. The preceding 917
source files and checkpoint 108's producer and four outputs remain unchanged.
The package adds 17 canonical image receipts while reusing the current cookie,
heap, TLS, lock, locale, MBC and command-line storage. Cold bytes are
initialization evidence; they do not authorize resetting those live cells.

The update-MBC exception scope names cleanup entry `2046b8ca`. Its only
captured source is the three original PE bytes `8b75e4`; no original catalog,
C entry or assembly body covers it. The inferred decode is not a callable
implementation. Normal helper `2046b8cd` retains its separate original listing.
Normal prologs and epilogs are implemented; native exception dispatch and
unwinding remain outside this selected path.

### Implement the actual dependency chain

[`NativeGameCrtArgv`](../../src/gothic3/native-game-crt-argv.ts) claims the
actual returned I/O graph once, under the original active bootstrap scope and
a distinct private argument permit. Registers, stack bytes, masks, FS and
return words stay in their current storage. The old controller cannot execute
again. Source snapshots and diagnostic counts grant no continuation authority.

The fresh browser v6 selection declares a 4,096-byte page-aligned virtual
stack and a complete 256-entry CP1252 single-byte NLS policy. The tables derive
from the pinned Unicode CP1252 table and UnicodeData 15.1. Undefined vendor
bytes retain their C1 values; case mappings outside the selected repertoire
retain identity. These are explicit virtual compatibility choices, not
measurements of the installed game's Windows locale.

The original cold MBC flag causes the encoding initializer to run even for
the declared ASCII command line. The implementation follows current PTD and
locale accesses, lock 13, reference-count atomics, allocation, NLS probes and
query/fill calls, real stack probes, table publication, both parser passes and
the argument allocation. Twenty-six fixed import sites require their actual
private source cursor, current physical frames, arguments, procedure identities
and normal return proof. Unknown outcomes retain partial effects and pending
call state. No predicted argument count, successful return or cleanup is
substituted for source execution.

### Preserve failures and validate the corrected increment

The first local typecheck found an unused former alias-local invalidation
helper. Its removal left all current stores using the existing alias-aware
range invalidation. The first captured production build then succeeded, but
its fresh browser inspection correctly rejected argument construction:
`sse2Flag` was a source-receipt label, while the already admitted canonical
storage key was `sse2Flag207d2b50`. The owner now separates that receipt lookup
from the canonical key. Independent review verified all 31 active image
references; the source package, original bytes and current storage are unchanged.
The earlier check and observation evidence remains preserved outside the checkout.

The alias-corrected local build, before the first PR run, passed TypeScript
checking and transformed 473
modules. Binary hashes of all 75,731 tracked and new nonignored repository
inputs matched before and after the build, with no capture errors. These are
interval snapshots; ignored dependencies, build outputs and the separate
offline study are outside that inventory. No test cases were added and no
local tests were run in this increment.

A fresh corrected local production tab entered Ardea, selected
`Ardea_OutNovice_01` in Models and expanded its developer details:

```text
Game startup: blocked · next __setenvp at 204678e7
I/O source operations completed: 899
I/O initialization returned: yes
I/O return value: 0
Argument startup graph transferred: yes
Argument initializer: returned
Encoding startup flag set: yes
Encoding tables published: yes
Argument counting pass returned: yes
Argument filling pass returned: yes
Argument block published: yes
Program name published: yes
Argument count: 1
Argument source operations completed: 14777
Argument return value: 0
```

Captured browser error logs were empty. The observed entry
`gothic3-DGXUkDw7.js` has SHA-256
`abf984303a2d3bbb3f9a8bf56715f98317194e2a22e38826994d0a44c017aa33`;
the inspected local service bundle `browser-npc-entity-services-CBxLp3T-.js`
has SHA-256
`7d726334bee4e68f22a799609c49efdc0f08fb5fd23120047c7fac3c687b82bc`.
Their served bytes match that alias-corrected local build. The development
preview independently showed the same 14,777-operation normal path before
this production observation. Matching later published artifact bytes would
establish publication identity, not another execution observation.

### Diagnose the first PR timeout

The first normal [PR 77 run](https://github.com/ael-dev3/Tervain/actions/runs/37677642994)
at head `d7f4ce35b08d20dac123c68370b3a6d65a8170b3` passed typechecking.
One existing scenario case, the application-owned runtime-admin NPC read,
exceeded its five-second timeout; the other 2,463 cases passed. The build and
deployment were skipped. The preserved failed log has SHA-256
`e57c1907333dd479eb7342ad117e11b7e105e4bfe297c0e943173395ce447b88`.
This was a timeout, with no reported normal-path assertion failure.

Static inspection found repeated immutable work in the 14,777-operation
argument path: instruction and address-expression parsing, image source
receipt validation and native DataView getter lookup. The correction caches
only admitted syntax, constructor-owned image admission records and native
getter functions. Every visit still resolves current registers, memory and
canonical images. The current controller, backing, alias, geometry, bounds,
lifetime and return proofs remain active. No live read result or successful
execution result is cached. The original source package remains unchanged.

The timeout, workflow and existing cases remain unchanged. The failed run
is preserved; no rerun of its unchanged head was requested. These static
findings do not establish a measured speed improvement or successful CI.

### Observe the corrected production build

The subsequent captured production build passed typechecking and transformed
473 modules. All 75,731 repository input hashes matched before and after;
there were no input changes or capture errors. A new production tab entered
Ardea, selected `Ardea_OutNovice_01` and displayed the same actual I/O return,
encoding publication, both parser returns, argument count 1, 14,777 completed
argument operations and return zero shown above. Its next unexecuted operation
remained `__setenvp` at `204678e7`; captured browser error logs were empty.

The actual DOM entry was `gothic3-BsdzFG1t.js`, SHA-256
`aa7a6eb7e98cbae9d2f165e7c28d3aa2b31ea4b6874f2e0b516442df560fe34b`.
The inspected service bundle was `browser-npc-entity-services-DCHzTsqA.js`,
SHA-256 `f34612a1d82c690c5bb8040aefedd00d76f4ee021d3ea27930b3224aa6509fc5`.
Both served files matched this exact local build. The earlier build and local
observation remain preserved separately. This confirms the selected normal
execution path after the correction; it does not measure a speed improvement,
establish successful CI or establish completed startup.

### Preserve the second PR diagnostic failure

The next normal [PR run](https://github.com/ael-dev3/Tervain/actions/runs/37682903878)
at head `e497379a072dabb42a4e284aa43e753d242a740d` passed typechecking and
2,463 existing cases, including the previously timed-out NPC read. One
existing image-admission case failed because the new unknown-label rejection
changed its expected diagnostic. The private admission cache now preserves
the original `independent source admission` message for an unknown label;
missing or changed retained views still use their separate canonical-view
rejection. All current storage checks and immutable-work optimizations remain.

The second failed log has SHA-256
`9a7e13268298ab538ff1475cee34dc67405dfa8e0c6190b7f01cf288487c116b`.
Its build and deployment were skipped. Both failed runs remain preserved;
no unchanged-head rerun, workflow change, timeout change or local test run was
used to resolve them. Passing the former timeout case in this run is specific
CI evidence and is not a controlled performance benchmark.

### Inspect the final diagnostic-corrected build

The final captured build passed typechecking and transformed 473 modules.
All 75,731 input hashes matched before and after, with no capture errors.
A new production tab repeated the actual Ardea novice inspection and displayed
I/O return zero, both parser returns, encoding publication, argument count 1,
14,777 completed argument operations and return zero. The next unexecuted call
remained `__setenvp` at `204678e7`; captured browser error logs were empty.

The actual DOM entry `gothic3-BOReSUbp.js` has SHA-256
`92441d540756edc6603199e4e7543439040de6db0629a929a90ec6ca9d5bb8bc`.
The inspected service bundle `browser-npc-entity-services-jM5Ytaeh.js` has
SHA-256 `0bf285c824fc0d76d9f4cdb3e071cb8c5cc25cb9b252a2bef0d212c4bccd448d`.
Both served files matched this exact build. Earlier observations remain
separate history; this is the final local execution observation for the
diagnostic-corrected code, not a hosted execution or a completed campaign.

Environment initialization and remaining CRT and module startup still require
implementation. Native NPC activation and the finishable campaign remain
unfinished.

### Confirmed publication of checkpoint 109

[PR 77](https://github.com/ael-dev3/Tervain/pull/77) merged the reviewed head
`57f13daa5ef9189e97fb6dc533949a073270d9a5` at main commit
`25e631eb745282d0517f2153723e29a2cf98a1aa` on 2026-10-07.
The corrected [PR check](https://github.com/ael-dev3/Tervain/actions/runs/37685498927)
and normal [main publication](https://github.com/ael-dev3/Tervain/actions/runs/37686349159)
succeeded on their first attempts. The verified main result records 2,464
existing cases in 235 files, typechecking, and a build of 473 modules. The
earlier timeout and diagnostic compatibility failure remain in the record.
This increment added no test cases; local tests were not run.

Pages deployment `6920887507` succeeded. The root Tervain
URL, `/gothic3/` and `/gothic3-local/` returned HTTP 200. The inspected Gothic
entry and NPC service bundles matched both the final local build above and the
`github-pages` artifact `11511606616` from that exact main run.
Its retained artifact tar has SHA-256 `132a9cc8920b94a071cd6214547c47c8852186ac4a3d53d6243689b7b68e8d3e`.
The publication audit also checked the reviewed source/package/producer and
documentation identities recorded in its receipt.

The hosted checks establish code and source identity. The execution observation
above comes from the local production preview, which recorded 14,777 completed
argument operations, argument count 1, both parser returns and actual return
zero. It stopped before `__setenvp` at `204678e7`. Environment initialization,
remaining CRT/module startup, native NPC activation and a finishable campaign
remain unfinished.

A repository-wide paginated workflow audit after publication found
178 runs and no active jobs. No dispatch,
rerun, remote cancellation or workflow change was used for this increment.

### Local SharedBase I/O continuation

The selected no-inherited-handles path now owns a 68-byte startup-info buffer,
executes its actual declared writer through a private grant, allocates and
initializes 32 physical descriptor records, queries canonical standard handles
and file types, initializes descriptor sections before count increments and
returns I/O result 0 after SetHandleCount. Native SEH stack installation and
inherited descriptors remain unimplemented. The next attach boundary is original
`__setargv` at `100adb46 -> 100c0ba7`. Parser/multibyte source evidence is captured,
but argument initialization has not executed. The live Game boundary remains
before `__cinit`; no full NPC activation or finishable campaign is established.


## SharedBase locale and argument continuation — 8 October 2026

PR 94 is merged at `e885eb55aaf70e6eed293cfc2476444c01f3a6b6` and deployed by
successful [Pages run 37722991608](https://github.com/ael-dev3/Tervain/actions/runs/37722991608).
It adds original standard-descriptor construction after environment setup.
The selected no-inherited-handles helper returns I/O result 0; arguments and
SharedBase initializer traversal remain unfinished.

Further local work owns the full original 544-byte multibyte record, with its
refcount and PTD pointer using the same physical backing. It follows warm PTD
lookup, lock-13 multibyte comparison, the NULL locale-update constructor and
`getSystemCP(-3)` through an actual retained platform GetACP service. The temporary
locale flag is restored after normal return. Original malloc and 136 DWORD
copies create a separate candidate multibyte record, then stop before
configuration at `100b1718 -> 100b14a5`. Missing services retain completed writes.

These supporting components are not connected to live Game initializer traversal.
The live startup remains before `__cinit` at `204678f2`; formatter execution,
full NPC activation and a finishable campaign are still unfinished.


### Local single-byte configuration continuation

The next local argument component follows the original five-entry code-page
lookup and actual retained NLS IsValidCodePage/GetCPInfo services. Its selected
CP1252 result writes the original 18-byte CPInfo structure with unknown padding,
clears 257 character-type bytes with source-ordered alignment/DWORD/tail stores,
and initializes the code-page, single-byte and locale-information fields of the
separate candidate record. The source-selected SSE memset branch remains an
explicit boundary with prior effects retained.

Execution now stops before case mapping at `100b1614 -> 100b11fd`. The candidate
has not replaced the PTD or global record. Case tables, the configuration return
and cookie check, complete arguments and original initializer traversal remain
unfinished. This helper does not add live NPC activation or campaign progress.


### Local Unicode classification query continuation

PR 95 is confirmed deployed at `c0fc863caa8b106614ba5ecab991bf13a8e59926` by
successful [Pages run 37724188449](https://github.com/ael-dev3/Tervain/actions/runs/37724188449).
It publishes locale-update, code-page lookup and candidate multibyte allocation.
PR 96 has passed CI and is merged; its deployment is not yet confirmed here.

Further local work follows the original case helper's GetCPInfo call and builds
the 256-byte input repertoire. The ANSI classification wrapper enters its locale
scope, calls the original Unicode-service probe, publishes mode 1 and queries
MultiByteToWideChar through the actual retained platform procedure. The selected
result is 256 code units. Execution stops before aligned temporary stack
allocation at `100c6f4c -> 100ce300`.

The type and lower/upper case outputs remain unknown; conversion fill, mapping,
cookie checks and wrapper return have not run. The wrapper's temporary locale
flag is retained until it can return normally. The candidate remains separate
from the original PTD/global record. Live Game initializer traversal, full NPC
activation and completion of the campaign are still unfinished.


### Local direct-helper stack allocation continuation

PR 96 is confirmed deployed at `d3fbb74114f0d850b4a2de899b0865abe2d77a19` by
successful [Pages run 37724835223](https://github.com/ael-dev3/Tervain/actions/runs/37724835223).
PR 97 has passed CI and is merged; its deployment is not yet confirmed here.

The next local component places the classification stat helper on the canonical
cold logical-thread x86 graph through a private pending-call token. It preserves
the source argument words, saved registers, cookie/EBP relation, original probe
alias and NLS import CALL/RET cleanup. The selected alloca16 path uses explicitly
selected virtual page geometry, derives padding, relocates the owned return word
and writes `0xcccc`. Its 512-byte payload aliases that same actual stack.
Unknown alignment retains the pending call; a Game-bound graph cannot be claimed.

This is a direct translated helper ABI. Preceding SharedBase DLL/CRT caller
frames, module attachment and live Game stack integration are not established.
Execution stops before temporary wide memset at `100c6f80 -> 100a7980`;
conversion/classification fill, case maps, cookie checks and normal wrapper return
remain unfinished. Full NPC activation and the finishable campaign remain missing.


### Local configuration frame and cookie return

The configuration call at `100b1718` now precedes the translated code-page
services. Its original EBP frame reserves 32 bytes, saves EBX/ESI/EDI and retains
the cookie expression at EBP-4. CPINFO is a 20-byte alias at EBP-24 on the same
logical-thread stack. The five code-page table comparisons retain the source
counter and EAX/flag effects. IsValidCodePage and GetCPInfo follow their source argument
words, normal-return capabilities and stdcall cleanup. The configuration memset
uses the source cdecl call and twelve-byte caller cleanup; its lower writes and
getSystemCP lower effects remain translated by the retained owner.

The case helper enters from this running frame, and restores this parent's EBP
and ESP before the configuration epilogue. The canonical-cookie comparison,
saved-register restoration, LEAVE and RET reach `100b171d`. Two caller argument
words remain on the stack because the enclosing setmbcp SEH frame is still
unowned. The selected classification allocation now consumes 520 bytes; each
mapping pair consumes 532 and 528 bytes, derived from the new parent geometry.

Final validation passes 61 focused tests, typechecking, the production build
and all 2,599 tests across 258 files. Candidate installation,
full SharedBase attachment, live Game initializer traversal and the finishable
campaign remain unfinished. See [the configuration integration requirements](gothic3-shared-configuration-frame.md)
for the source-ordered candidate publication and reference-count work.

PR 102 passed CI run 37734612264 and merged at
`95290022ef61505810a6c5155159f0e265a3a24e`; Pages run 37735133657 subsequently succeeded.


### Local setmbcp SEH parent frame

The local source package now also captures the original SEH prologue at
`100aeb68`, epilogue at `100aebad`, lock-release handler at `100b181b`, and
28-byte scope table at `100f8be0`. Their source hashes and scope bytes are pinned;
altered helper receipts or live scope data reject admission.

The setmbcp call at `100b185f` owns a parent frame before PTD, multibyte warmup,
code-page selection and allocation. The original prologue retains the incoming
FS word, encodes the scope pointer with the canonical cookie, saves the
cookie/EBP relation and registers FS with the actual EBP-16 stack alias. It
relocates the prologue return word in source order. The existing lower PTD,
locale, allocation and memset bodies remain translated owner effects.

The candidate copy and configuration now share that parent. After the
configuration returns, the source caller pops both argument words, saves the
zero result at EBP-32, reloads PTD from EBP-36 and pushes the previous multibyte
record for `100b1730`. Execution stops with that decrement import CALL pending:
no reference count is decremented, candidate installed, or initialization flag
published. The parent call and FS registration remain live in the retained
blocked prefix. Exception dispatch, lock-release execution and the SEH epilogue
are captured source but have not executed on this path.

For the explicitly selected 4,096-byte relative stack, the parent EBP is 4,084,
FS points to offset 4,068, configuration EBP is 4,016, and the pending import ESP
is 4,024. These are opaque relative model offsets, not Windows memory addresses.
The selected classification allocation remains 520 bytes and each mapping pair
consumes 532 and 528 bytes.

Final validation passes 64 focused tests, typechecking, the production build
and all 2,602 tests across 258 files. Regeneration reproduces all 159 source
files exactly. Full SharedBase attachment,
live Game initializer integration, NPC activation and a finishable campaign
remain unfinished.

PR 103 passed CI run 37735759120 and merged at
`5e6576d52bfacdf5abdcb1e07a951b7deec557ad`. Its Pages deployment is not yet confirmed here.


### Local multibyte candidate installation and normal return

The source decrement/increment calls now use private pending grants and a
canonical virtual platform counter service. A call is consumed once and its
normal-return object records the exact before/after values. Forged calls cannot
admit storage or mutate a counter. The old static record is not freed when its
PTD reference reaches zero; its later global decrement follows the source even
when this produces `ffffffff`. Counts are not clamped.

The candidate replaces PTD+104 and receives its PTD reference. Own-locale mask
0x02 and global locale mask 0x01 select the original publication branch. The
published branch acquires the actual lock 13, enters the scope, writes three
DWORD fields, five WORD fields, 257 classification bytes and 256 case bytes in
source order, exchanges the old global reference, publishes the typed candidate
pointer and increments its global reference. The table loops retain the source
counter/register effects. The retained lock-release handler returns after the
actual lower unlock service. The other branch retains a PTD-only candidate and
leaves the global record and tables unchanged.

The original normal SEH epilogue restores the incoming FS word and saved
registers, relocates its return word and returns through setmbcp. The init-table
caller removes its argument and sets the initialization flag; the translated
path models its final XOR setting EAX to zero.
Execution now stops at module filename acquisition `100c0bd1`. The candidate's
reference count is 2 after global publication or 1 when retained only by PTD.
All owned calls on the selected normal path have returned and ESP is restored
to the selected stack top.

Final validation passes 65 focused tests, typechecking, the production build
and all 2,603 tests across 258 files. Dynamic old-record free, allocation-failure and exception paths remain
unimplemented. Lower PTD/locale/allocation/memset and lock bodies still use the
retained owner's translated effects. Complete SharedBase attach, live Game
initializer traversal, NPC activation and a finishable campaign remain missing.

PR 104 passed CI run 37736807410 and merged at
`861fbf5ab7fca284b52e3cc8aebaeaf9b0ae2a6f`. Its Pages deployment is not yet confirmed here.

## Processor probe dependencies still to implement

The local probe toggles EFLAGS.ID (bit 21), compares the read-back flags, queries
CPUID leaves 0 and 1 and tests EDX bit 26. The SIMD path calls `100ce045`, whose
normal path copies XMM1 to XMM0 under the original exception frame. The frame
helpers `100aeb68`/`100aebad` and 28-byte scope at `100f8ec0` are now captured
as source evidence. They are not admitted for runtime execution yet. The study
disassembly omits cold handler bytes between `100ce060` and `100ce085`; their
original PE bytes are now recovered using Capstone: filter `100ce062`
recognizes access violation and illegal instruction, and handler `100ce07e`
clears the result local before the normal epilogue. Branch closure and original
bytes are checked. Runtime exception dispatch still needs implementation.

[Intel’s architecture manual](https://cdrdv2-public.intel.com/868137/325462-089-sdm-vol-1-2abcd-3abcd-4.pdf)
defines the ID-bit probe and processor instructions. Implementation must retain
virtual flags, selected CPUID results, XMM state and exception ownership, and
preserve unknown state outside the supported effects. Current execution still
stops before PUSHFD at `100ce0a8`.

Processor exception evidence validation: all 80 generated source files and the
unchanged runtime reproduce exactly. Nine focused checks, typechecking, the
production build and all 2,673 tests across 259 files pass. PR 115 passed CI
run 37757739546 and merged at `d044545e75e4eee4cccdb5ffc447c4ba30c1db76`.
These receipts validate source recovery; they do not establish execution of
PUSHFD, POPFD, CPUID, MOVAPD or native exception dispatch.


## 8 October 2026 — RTC exit-registration checkpoint

PR 118 passed CI run 37763572750 and merged at
`07ac76f56f8124d3f6467abefb4c4bb917429bd6`. It executes FILE initialization,
the repeated processor probe and the original error-table return.

The next local checkpoint captures six additional original bodies, for a total
of 51 bodies, 896 instructions and 98 CALL receipts. All 92 generated package
files and the TypeScript instruction module reproduce byte for byte from the
identified local SharedBase DLL and offline study.

The selected normal atexit/onexit path owns lock 8, DecodePointer identities,
the original allocation-size frame and HeapSize call. It appends the encoded
RTC callback to the actual 128-byte exit table, moves its cursor to offset 4,
releases the lock and restores both normal exception frames. Startup now reaches
the first void initializer `100aa692 -> 100e1660`. This does not execute RTC
shutdown, the remaining void callbacks, full CRT attach or campaign gameplay.

The focused suite passes 146 checks. Changed scope bytes, a replaced HeapSize
import and a missing HeapSize endpoint preserve explicit failure boundaries.
The expanded full suite passes 2,703 tests across 259 files. Typechecking
and production build pass. Table growth, decoder
fallback and exception dispatch remain unresolved.

PR 118 Pages run 37765766597 completed successfully.


## 8 October 2026 — leading void-table registration

The first two original void callbacks, slots 65 and 130, register shutdown
addresses `100e30f0` and `100e26d0` using the same original atexit path. The
selected path now stores RTC termination followed by these two addresses in the
actual exit table, advances its cursor to offset 12 and releases lock 8 after
each append. Both SEH helpers reenter and restore their frames on all three
normal registrations.

The next live dependency is slot 131, `100e1450`: it initializes a critical
section at `10197da0`, then registers `100e2810`. That initializer has not yet
been admitted. No shutdown callback body is executed by registration.

The instruction reader accepts the lowercase opcode/register spelling retained
by source recovery. Both callback bodies retain their original bytes and are
pinned by source hashes. All 92 package files and the generated instruction
module reproduce exactly. The focused suite passes 149 checks, including a
fully NULL void table returning cinit zero without claiming enclosing attach,
and an unknown callback retaining its original CALL boundary. The full suite
passes 2,706 tests across 259 files; typechecking and production build pass.
PR 119 passed CI run 37766553792 and merged at
`04df7277c8166a75cf67a5c688ba766f280f9645`.


## 8 October 2026 — original static critical-section initializer

Void slot 131 at `100e1450` now calls the retained original
InitializeCriticalSection import at `102f95f4` with its 24-byte static storage at
`10197da0`. The producer verifies the import's original KERNEL32 identity and
cold IAT bytes `349b2f00`; the section has 24 loader-zero bytes and no file-backed
bytes. These cold bytes establish preparation, not post-call Windows internals.

The existing virtual platform owns the initialized physical section and makes
its opaque storage bits unknown. The original stdcall removes four argument
bytes, leaving the void return register unknown. The callback then registers
shutdown address `100e2810` through atexit and publishes exit cursor offset 16.
The next boundary is slot 132 at `100aa692 -> 100e1470`, a static-value copy.

153 focused checks pass, including same-owner section entry/leave, foreign-owner
rejection, an unavailable initialization endpoint and a replaced import. Both
failure cases stop before shutdown callback registration. All 92 generated
package files and the instruction module reproduce exactly. Typechecking, the production build and all 2,710
tests across 259 files pass. Full CRT attach and campaign
completion remain unfinished.

PR 120 passed CI run 37767350351 and merged at
`c20d44f022a98aab1bfb8e456673be96a6251f48`.


## 8 October 2026 — static value and following registrations

Void slot 132 now executes its original eight MOV instructions and RET. It
copies four live DWORDs from file-backed source `100ebb28` to loader-zero
storage `101ab150`; values and known-bit masks move through the owned register
and memory state. The implementation reads the live source rather than replacing
the operation with a constant zero assignment.

Slots 133–136 and 138–139 then register shutdown addresses `100e2930`,
`100e2940`, `100e2950`, `100e2960`, `100e2a00` and `100e2a10` in source order.
Slot 137 remains NULL. The exit table now contains ten callbacks including the
preceding RTC and void registrations, with cursor offset 40. Lock 8 and both
normal SEH frames reenter and restore for every registration.

The next boundary is void slot 140 at `100aa692 -> 100e1510`, which constructs
a string through `10003ba7` before initializing additional state and registering
its shutdown callback. That construction is not yet admitted. Registration
continues to store address metadata without executing shutdown bodies.

156 focused checks pass, including nonzero static-value copies, unknown-bit
preservation and file-backed versus loader-zero provenance. All 92 source-package
files and the instruction module reproduce exactly. Typechecking, production
build and all 2,713 tests across 259 files pass. Full startup and a finishable campaign
remain outstanding.

PR 121 passed CI run 37768080880 and merged at
`4a475b14ea6a6a572cdcabe9fd7a1aae636bd3b2`.


## 8 October 2026 — Root CString construction prefix

Void slot 140 now enters its original text-constructor thunk
`10003ba7 -> 100135f0` using literal `Root` at `100e9b5c` and its actual stack
CString destination. The constructor scans the live source bytes, computes
length four, enters Alloc through `10007d65 -> 10013240`, and requests thirteen
bytes before reaching `10013257 -> 10002aae` (MemoryAdmin::GetInstance).

The source package adds the two original bodies and both thunk receipts: 53
bodies, 961 instructions and 102 CALL receipts. All 96 generated files and the
instruction module reproduce exactly from the local DLL and study. Byte-register
reads and writes preserve the unaffected register bits; original RET 4 applies
stdcall argument cleanup. These behaviors are required by the actual scan and
empty-text constructor return.

160 focused checks pass, including length changes from a live terminator,
empty-text return without allocation and the actual pending allocation request.
Typechecking, the production build and all 2,717 tests across 259 files pass. The
memory-admin call remains explicit. Existing standalone CString allocation is
not connected here because its shutdown registration must use the same live
initializer exit-table owner. Full startup and campaign completion remain
unfinished.

PR 122 passed CI run 37768791245 and merged at
`635afde46d2949f22743ebb16ef8ebf7014821ce`.


## 8 October 2026 — MemoryAdmin GetInstance in live initializer

The original thunk `10002aae -> 10020bf0` now executes within the same startup
stack and exit-table owner. It tests guard bit 0 at `101427a4`, ORs that bit into
the live guard, initializes the selected bytes at `1014279c`, `1014279d`,
`101427a0` and `101427a1`, and registers shutdown address `100e2710` through the
original atexit path. Eleven callback addresses are now stored, with cursor
44. A previously set guard follows the original skip branch.

The return is the actual owned static singleton pointer at `101427a0`; the
CString Alloc caller moves it to ECX and reaches `1001325e -> 10003cd8` (Malloc).
This does not bind a disconnected standalone allocator or claim successful
allocation. Guard bytes, singleton storage and exit registration remain owned
by the same initializer. Shutdown registration does not execute shutdown.

The producer now captures 54 bodies, 977 instructions and 103 CALL receipts.
All 98 generated package files and the instruction module reproduce exactly.
MOV from AL infers its original byte store width, preserving adjacent state;
OR retains unknown upper bits. The 165 focused checks cover live flags,
guard reuse, callback order, singleton-pointer return and allocator stack
arguments. Typechecking, production build and all 2,722 tests across 259
files pass.
Full startup and campaign completion remain unfinished.

PR 123 passed CI run 37769622859 and merged at
`3db30c57b5433f8be4bd70ed8e8561b8482a19d4`.


## 8 October 2026 — Malloc critical-section prefix

Malloc follows its original three-jump chain:
`10003cd8 -> 10020b00 -> 10007441 -> 1003d410`. The live initializer now owns
its original exception scope at `100f8318`, checks the singleton receiver and
verifies the FS-linked stack frame. Exception dispatch is not yet implemented.

The source path reads the heap-section flag at `102fb000`, initializes the
24-byte storage at `10189a18` with spin count 1,000 through original IAT
`102f966c`, publishes the original SETZ result, then enters that same physical
section through `102f9604`. The platform owns the canonical section and makes
its opaque storage bits unknown. The normal path reaches
`1003d474 -> 10001028` with a thirteen-byte lower heap request. Its lock and
exception frame remain entered at that pending CALL; no cleanup is invented.

The source's failed-initialization branch skips EnterCriticalSection and still
reaches the lower heap call. A set flag without canonical initialized storage
stops at the actual enter operation. Missing endpoints, replaced imports and
changed scope bytes preserve their applied prefixes.

The package now has 55 bodies, 1,021 instructions and 107 CALL receipts. All
100 generated source files and the instruction module reproduce exactly. The
172 focused checks, typechecking, production build and all 2,729 tests across
259 files pass. Lower allocation, exception dispatch, full startup and campaign
completion remain unfinished.

PR 124 passed CI run 37770523149 and merged at
`3dc3188d9d47712342d76f996e468013a52de98c`.


## 8 October 2026 — Lower heap and 16-byte pool evidence

PR 125 passed CI run 37771585405 and merged at
`90275aa46314fb5c4a7227bb51c7bc63eb0db023`. Its Pages publication is tracked by
run 37772690355, which completed successfully.

The next source package captures four original allocator bodies: lower heap
dispatch, the 16-byte pool dispatcher, its block initializer and bitmap
allocator. The complete dispatch table proves that Root's thirteen-byte request
selects the 16-byte pool. Its cold path requests a 1,056,768-byte virtual region,
then initializes a bitmap and pool descriptor before selecting a payload slot.

The producer verifies all new instruction bytes against the installed DLL and
captures the cold roots, geometry and VirtualAlloc import identity. Focused
checks pin all 4,097 dispatch entries, four body hashes and entry thunks, request
arguments, fallback selection and bitmap instructions. All 107 generated files
and the unchanged live instruction module reproduce exactly. The expanded
focused suite passes 175 checks. Typechecking, the production build and all
2,732 tests across 259 files pass (full-suite duration 182.58 seconds).

These captures do not execute the pool operations. The live boundary remains
`1003d474 -> 10001028`. The next implementation must retain the existing live
MemoryAdmin/exit-table owner, acquire the region through the canonical platform
VirtualAlloc capability, execute original metadata initialization and return an
owned slot. Full startup and campaign completion remain unfinished.


## 8 October 2026 — Live 16-byte pool dispatcher and virtual reservation

The live SharedBase initializer now executes lower heap dispatch and the selected
16-byte pool callback. A thirteen-byte Root CString request reads the original
size table, increments the pool count, updates its peak through the original
branch and reads the live list root. The cold list reaches VirtualAlloc.

The CALL retains its original four arguments and IAT identity. The platform's
private registry proves that the actual returned 1,056,768-byte region is live,
owned and has the original virtual geometry. Its backing and masks become the
same retained SharedBase view. The reservation wrapper requires a fresh region
created during the current invocation; earlier same-platform regions are rejected.
No disconnected MemoryAdmin or invented pointer
is substituted. The caller performs its sixteen-byte stdcall cleanup and passes
the actual region to `10047f7c -> 100061cc`, the block initializer. At that
boundary the heap lock and original exception frame remain entered.

NULL allocation follows the original register pops and indirect fallback jump
to the next pool. Unsupported callbacks and unavailable or replaced capabilities
retain their real operation boundary. Focused checks cover original counters,
region identity/geometry, CALL arguments/cleanup, fallback and rejection of
foreign, freed, CRT-owned and replaced storage. The 187 focused checks and
typechecking pass. All 107 generated files and the instruction module reproduce
exactly. The final full suite passes 2,744 tests across 259 files in 165.02
seconds, and the production build passes.

The next missing work is the original block initializer: its 20-byte descriptor,
callback stores, list exchanges, bitmap memset and pool registration, followed
by actual bitmap slot selection. Full startup, NPC activation and campaign
completion remain unfinished.


PR 126 passed CI run 37773432296 and merged at
`32233abb7fa6f251b893dbdb15b79a277657d940`; Pages run 37774323531 succeeded.
PR 128 passed CI run 37773555162 and merged at
`df155939721d668ef94142e24401d805f67b8a7a`. Its publication is tracked separately;
merging source evidence does not execute the newly captured pool bodies.


## 8 October 2026 — Original CRT descriptor allocation and list exchange

PR 129 passed CI run 37775450873 and merged at
`49d56a21385c8e29d10ef1945639ccb0d25e307c`. Pages run 37777023637 tracks its
publication and completed successfully.

The live pool initializer now executes original CRT operator new and malloc.
Its twenty-byte descriptor request uses the same live SharedBase heap through
HeapAlloc at `100aab6e`. A private allocation receipt proves the actual heap,
flags and requested size, and the returned backing must be fresh for that
invocation. The bridge supports normalized CRT allocation sizes rather than
limiting the primitive to this descriptor. Actual general rounding, mode-three
helper boundaries and NULL allocation's errno boundary remain source-driven.

The malloc caller restores its saved registers; operator new executes its
original LEAVE/RET and caller cleanup. The initializer writes all four original
callback addresses, preserves the old descriptor-list link through XCHG.LOCK
and publishes the real descriptor. The region's occupancy/search fields are
cleared before pending `10045e1e -> 100a7980`: original bitmap memset, offset
0x100000, byte 0xff, count 0x2000. The heap lock and Malloc exception frame remain
entered; no bitmap fill, slot return or enclosing initializer return is invented.

The package now captures 61 bodies, 1,355 instructions and 136 CALL receipts.
All 111 generated source files and the instruction module reproduce exactly.
Typechecking and 199 focused checks pass, covering native descriptor contents,
heap identity, allocation freshness, private request receipts, original return
cleanup, unsupported helpers and retained failure prefixes. The final suite
passes 2,756 tests across 259 files in 187.75 seconds; the production build passes.

Next are the original bitmap fill, list publication and pointer-area registration,
then the bitmap allocator and allocation return. Full startup, world activation
and a finishable campaign remain unfinished.


## 8 October 2026 — Original bitmap fill and cold pointer-area registration

PR 130 passed CI run 37779027856 and merged at
`03187338e1c4539c66d1761544796f77b48a9294`. Pages run 37781043283 tracks its
publication independently of the next local checkpoint and completed successfully.

The retained initializer now executes original memset at `100a7980`. The
0xff fill byte follows its scalar branch, independent of the SSE flag. Private
same-platform geometry supplies only the low address bits required by NEG/AND;
no numeric virtual address is invented. SHL/ADD constructs 0xffffffff and
REP STOSD writes 2,048 DWORDs using the actual logical thread direction flag.
The original return restores EDI and the caller removes twelve argument bytes.
The caller writes 0x7fffffff to the last bitmap word, disabling its reserved bit.

The original list exchange at `10045e3c` publishes the actual region and stores
its previous link. The original pointer-area thunk at `100012e4` enters
`1003c650`. With cold count zero, it skips the binary search and shift, writes
payload start region+16, exclusive payload end region+0x100000, region base and
actual CRT descriptor into the original static area storage, then increments
`102fb030` and returns with twelve-byte callee cleanup. The captured 262,144-byte
PE loader-zero interval ends at the following heap critical section; its
physical size does not prove a logical record limit. Sorting across distinct
regions and the warmed insertion memmove remain unsupported.

The block initializer returns to the pool loop, which reaches pending
`10047f57 -> 1000605a`: bitmap slot allocation. The region, descriptor, heap
lock and original Malloc exception frame remain retained. No slot, CString,
Root constructor or complete module startup has returned.

The package captures 63 bodies, 1,461 instructions and 137 CALL receipts.
All 115 generated source files and the instruction module regenerate exactly.
The 206 focused checks pass, covering physical bitmap contents and masks,
reserved-bit clearing, actual record/list pointer identities, native cleanup,
private alignment proof and reverse-direction stores. The production build
passes. The final full suite passes 2,763 tests across 259 files in 185.49
seconds; typechecking also passes. Authored whitespace checks pass, with
original captured C whitespace preserved.

Full startup, world and NPC activation, integrated saves/progression and a
finishable campaign remain outstanding.


## 8 October 2026 — Original bitmap slot claim and Malloc return

PR 131 passed CI run 37782107395 and merged at
`95d5611207732dbcf1917e0ef0d69854cd9110d4`; Pages run 37782989550 succeeded.

The retained initializer admits the captured `1000605a -> 1003e090` body. Its
original PUSHAD stores the entry ESP among the eight registers; POPAD discards
that ESP slot and restores the other seven. INC.LOCK increments occupancy.
CLD sets the logical thread direction to forward, REPE SCASD compares the actual
bitmap words with zero and advances EDI/ECX, BSF finds the least free bit and
BTR.LOCK clears it and reports the old bit through carry. IMUL uses the original
sixteen-byte stride to compute the slot address. The admitted operations run
synchronously in the retained logical thread; they do not claim host-thread
concurrency support.

The actual returned region+16 becomes a bounded sixteen-byte field view over
the same backing. The owner retains its region, offset, logical capacity and
bitmap claim. Access checks preserve the canonical virtual-region lifetime and
reject a slot whose bit has been returned to the free bitmap. Changed geometry
or an unowned pool receiver cannot grant a logical slot. Aliased region and
slot pointers retain native equality through their common backing and offsets.

The original dispatcher restores registers and returns through the lower heap.
Malloc calls the original LeaveCriticalSection import, restores FS and saved
registers, and returns. The existing frame-restoration checks verify that return.
CString setup then writes its original length, reference count, payload pointer
and terminator into the same slot. The original thirteen-byte request selects a
sixteen-byte pool allocation; it does not allocate a separate host buffer.

Normal execution now stops at `1001362d -> 100a7a00`, the original memcpy CALL
for the four-byte Root payload. Its CString constructor, Root constructor and
enclosing initializer have not returned. A failed critical-section initializer
now reaches the actual unconditional Leave call and stops there if no canonical
section was entered; it does not fabricate a successful unlock.

The 211 focused checks and typechecking pass. All 115 generated source files and
the instruction module regenerate exactly. The final full suite passes 2,768
tests across 259 files in 162.07 seconds, and the production build passes.
Authored whitespace checks pass. Bitmap exhaustion, additional pools and allocation failure/cleanup
cases still need evidence and integration. Complete startup, world activation
and campaign completion remain outstanding.


## 8 October 2026 — Original Root copy and static initializer return

PR 133 passed CI run 37784481242 and merged at
`aae1a3849b756298621b015e611656278be8f1e7`; Pages run 37785902417 succeeded.

The live initializer now enters original memcpy at `100a7a00`. Its owner proves
that the source is retained original static-image storage and the destination
is the actual live bounded pool slot, with both spans contained. For disjoint
spans, either numerical address ordering reaches the same forward block at
`100a7a20`. The interpreter joins those control paths without selecting an
invented address order: the intervening comparisons have no stores, and the
next original CMP overwrites their arithmetic flags. The trace marks that join
explicitly. Same-backing pointer relations continue to use their actual offsets.

The original alignment TEST uses private canonical geometry, then the captured
DWORD/tail tables select the real source loads and destination stores. Normal
Root copies four bytes and restores memcpy's saved EBP, ESI and EDI through
LEAVE/RET; its caller removes twelve argument bytes. The CString constructor
returns the same slot's payload pointer, preserving its terminating byte.

The original parent initializer publishes that pointer at `102f4618`, increments
the sixteen-bit reference count, clears the remaining fields of the original
forty-byte static object and writes its zero float through XORPS/MOVSS. The
selected virtual CPU must explicitly support normal SIMD execution. Its
sixteen-bit decrement preserves adjacent padding, and CX/DX comparison verifies
that a live reference remains before skipping Free. The temporary reference is
balanced; the static Root retains reference count one.

The original atexit/onexit path encodes and appends `100e2b40` as callback twelve
in the same 128-byte exit table, at offset 44 with cursor 48. Registration does
not execute the shutdown body. The Root callback returns to cinit, which reaches
pending `100aa692 -> 100e15d0`, void initializer 141.

The package captures 64 bodies, 1,708 instructions and 137 CALL receipts; all
117 generated source files and the instruction module regenerate exactly.
Typechecking and 220 focused checks pass, covering actual payload/static-pointer
identity, constructor and caller cleanup, reference/padding preservation,
SIMD stores, exit callback ordering, private disjoint-copy proof and unchanged
allocator dependencies. The final full suite passes 2,777 tests across 259
files in 162.29 seconds, and the production build passes. Authored whitespace
checks pass; original captured C whitespace is preserved.

Shortened Root inputs select the original twelve-byte pool and retain its
unimplemented `1003d304 -> 100028f6` boundary. They are not routed into the
sixteen-byte pool to manufacture success. This checkpoint does not establish
general backward, unaligned, REP or SSE memcpy support. Remaining initializers,
full startup, NPC/world activation and a finishable campaign remain outstanding.

### Local `_Root` initializer 141 checkpoint — 8 October 2026

The source generator now retains the original `_Root` literal at `100ea340`
and its cold string storage at `102f47d0`. The live SharedBase owner executes
original initializer `100e15d0`: constructor call, shutdown registration and
return. Its five-byte text uses a second bounded sixteen-byte slot at offset
32 in the existing virtual region. The native copy includes its byte-tail
store; the length, reference count and terminating zero occupy actual owned
storage. The first Root object remains in its original slot.

No second virtual reservation or descriptor is needed on this path. The pool
count and peak become two, and its bitmap clears bits zero and one. Original
shutdown callback `100e2f20` becomes the thirteenth registered callback; its
body has not been executed. Execution stops at initializer 142's admission
boundary, `100aa692 -> 100e1600`; full attach remains incomplete.

Local evidence: 221 focused tests, typechecking and the production build pass.
All 117 generated source files plus the runtime instruction module reproduce
exactly. The full suite passes 2,778 tests across 259 files (187.47 seconds).
This checkpoint is not published.

The preceding Root checkpoint, PR 134, merged at
`ba1aa1c48561502bf05434ecf09377fdd09cf63f`. Pages run 37790192791 is in progress;
a merge alone does not establish successful deployment.

### Local class-name initializer 142 prefix — 8 October 2026

Original getter `1000619f -> 1008e900` copies the cold published pointer on
its first guard branch and sets guard bits one and two in its retained image
storage. Its original `type_info::name` wrapper forwards the actual receiver
and type-info node to `_Name_base`. Execution stops at `100a709e -> 100b0902`;
the cached name is still NULL, the class-name string remains unconstructed,
and initializer 142 has not returned. The first already-set guard preserves
its existing stored copy. No shutdown callback for this getter is registered.

The generator captures both getters and the native name/demangling/search
bodies against the installed DLL. Source evidence now contains 70 bodies,
1,933 instructions and 159 CALL receipts. All 129 generated files and the
instruction module reproduce exactly. The 224 focused checks and typechecking
and the production build pass. The full suite passes 2,781 tests across
259 files (169.43 seconds). This work is local.

PR 134 Pages run 37790192791 completed successfully. PR 135's `_Root` validation
is still running; it has not merged or deployed.

### Local type-info name exception frame — 8 October 2026

The live SharedBase owner retains the original 28-byte exception scope at
`100f8b20`. Original `_Name_base` instructions enter the existing EH4 helper,
with the actual scope, twelve-byte local reservation, saved registers and FS
chain. The helper's return verifies the encoded scope and prior FS relation.
The frame remains entered and unreturned while the cold cached-name path
prepares its original six demangler arguments, including flags `0x2800`.
Execution stops at `100b0931 -> 100c6142`; no demangled name has been allocated
or published. A modified scope rejects admission before frame entry.

Typechecking and 226 focused tests pass. All 129 generated source files and
the instruction module reproduce exactly. The production build and full suite pass: 2,783 tests across 259 files
(185.99 seconds). This checkpoint remains local. PR 135 passed CI run 37790581670 and
merged; its Pages deployment result must be checked separately.

### Local nested demangler exception frame — 8 October 2026

Original SharedBase `___unDName` at `100c6142` now enters its own EH4 frame
using the captured scope at `100f8e80` and 132-byte local reservation. The outer
`_Name_base` frame remains active. The wrapper reads the original allocator
argument `100aaaf6`, takes its non-NULL branch and reaches the original CRT
lock-initialization call `100c6160 -> 100bb7cf` with lock id five. No demangler
state, output string or cached name has been fabricated. Both exception frames
remain unreturned; changed nested scope bytes reject before the second entry.

Typechecking and 228 focused checks pass. All 131 generated source files and
the instruction module reproduce exactly. The production build and full suite pass: 2,785 tests across 259 files
(182.75 seconds). Source evidence contains 71 bodies, 1,975 instructions and 167 CALL
receipts; unimplemented paths remain explicit boundaries.

The preceding class-name getter and `_Name_base` checkpoint is PR 136. Its
local validation passed 2,783 tests across 259 files, focused checks, typecheck,
build and exact regeneration. Publication requires CI, review, merge and a
successful Pages deployment separately.

PR 135 Pages run 37791905285 has completed successfully. PR 136 CI run
37792619176 is running. The native CRT lock-five slot is cold NULL; its next
normal path requires dynamic allocation of the original 24-byte section and
publication through the same retained lock table and live SharedBase heap.

### Local CRT lock-five allocation prefix — 8 October 2026

Original lock initializer `100bb7cf` enters its own retained EH4 frame, selects
slot five in the actual existing CRT lock table, and follows its NULL-section
branch. The original malloc wrapper `100aeed0` requests 24 bytes through
`100aaaf6` and the same live CRT heap, flags zero. Its actual owned allocation
returns to the lock initializer with uninitialized bytes retained. The next
boundary is `100bb834 -> 100bb892`, CRT lock ten entry. Lock five is still NULL;
its section has not yet been initialized or published. All three nested
exception frames remain active. An unavailable heap allocation retains the
pending native heap call without publishing a section.

Typechecking and 230 focused checks pass. All 135 generated source files and
the instruction module reproduce exactly. The production build passes. The full suite records 2,786 passing tests and
one forest-test timeout (196.45 seconds); all 11 forest tests pass in isolation
(5.04 seconds). Full-suite acceptance remains pending. Captured evidence contains 73 bodies, 2,061 instructions and 182 CALL
receipts. Full startup and campaign completion remain unfinished.

PR 136 passed CI run 37792619176 and merged after a repository-wide audit
found no active workflow runs. Its Pages deployment is tracked separately.

### Local CRT lock-five initialization and publication — 8 October 2026

Original CRT lock/unlock instructions now run against the actual retained
bootstrap lock table. The lock initializer enters static lock ten, calls the
existing source-backed section initializer with its owned heap allocation and
spin count 4,000, publishes the resulting allocation pointer in slot five,
releases lock ten and restores its original EH4 frame, FS chain and saved
registers. The demangler then enters the new lock five. Execution reaches
`100c61aa -> 100c2351`, before decorator construction.

The original `100bbf27` helper's bytes are pinned. Its normal initialization
uses the existing owner method and actual platform capability; it is separate
from the emitted lock/unlock instructions. The normal allocation has 24 bytes.
The original general heap branch rounds it to 32 bytes; the physical section
uses a bounded 24-byte view with the same backing and start offset. Its spare
eight bytes retain their unknown masks. Private section identities validate
native table pointers; a forged slot-ten pointer rejects before lock entry.

A false initializer result keeps lock ten held and slot five unpublished,
stopping at original free dependency `100bb853 -> 100aa9a4`. The successful
path leaves lock ten at depth zero and lock five at depth one. The outer
name and demangler exception frames remain active. Decorator/grammar/output,
full SharedBase attachment, Game startup and campaign play remain unfinished.

Typechecking, the production build and 235 focused checks pass. All 143
source files plus the instruction module reproduce exactly. Evidence contains
77 bodies, 2,142 instructions and 196 CALL receipts. The final full suite passes 2,792 tests across 259 files (173.16 seconds),
including rejection of a cleared retained lock slot. This checkpoint remains
local until review, CI and deployment complete.

PR 136 Pages run 37793944879 completed successfully at main revision
`982fc4b69dde919d0767dff34d63f46e54b89a86`.

### Local demangler decorator and scratch-node construction — 8 October 2026

The selected original decorator, replicator and node constructors now execute
against the live thread stack and CRT heap. The scratch allocator requests one
4,104-byte block through the existing CRT allocation path. Four 16-byte nodes
occupy offsets 4,084, 4,068, 4,052 and 4,036; their original vtable value is
`100f29ac`, and their types alternate 3 and 1. The allocator retains the actual
first/last block pointers and 4,032 available bytes.

The two replicators occupy the original stack locations, 60 bytes apart. Their
node pointers retain the actual heap backing. The original masked assignment
`A XOR ((A XOR B) AND 15)` sets the selected low bits while preserving unknown
padding. Its interpreter proof requires the original read and both XOR/AND
results to refer to the same physical word. Relative stack and exception-frame
expressions retain their existing provenance.

Execution reaches `100c61b5 -> 100c5e8f`, before decorator-to-string processing.
The constructor call has returned, while CRT lock five and the enclosing name
and demangler exception frames remain active. Grammar traversal, output name
creation, full engine startup and campaign play remain unfinished.

Local evidence: 239 focused checks and typechecking pass. All 153 generated
source files plus the instruction module reproduce exactly. The package
contains 82 bodies, 2,295 instructions and 204 CALL receipts. The production build passes. A further focused check confirms scratch
allocation failure retains the active lock and frame without publishing a
block. The full suite passes 2,797 tests across 260 files (200.46 seconds).
This checkpoint is not published.

PR 137 passed CI run 37797822192 and merged at
`2d3a0afa06ff1551ecd3ab081d8e78fd4f654ee6` after a 299-run repository-wide
audit found no active runs. Pages run 37800122027 is pending.

### Local decorator-to-string and data-type parser entry — 8 October 2026

The original decorator-to-string, declaration and data-type routines now enter
through the retained demangler frame. Flag `0x2000` selects the data-type path
and is cleared in source order, leaving `0x0800`. The original cursor advances
from `?` to `A` on the same input backing; the original DName constructor
returns with its NULL node and masked flag fields. The parser reaches
`100c67d5 -> 100c59ab`. Its parent calls, lock five and enclosing exception
frames remain active. Grammar decoding and output are still incomplete.

Pointer INC advances the retained relative pointer and preserves carry; other
address-dependent flags stay unknown. Signed narrow loads support the captured
primary-type helper, whose body has not executed on this selected path.

Local validation passes 238 focused checks and typechecking. All 163 generated
files plus the instruction module reproduce exactly. Evidence contains 87
bodies, 2,794 instructions and 257 CALL receipts. The production build and full suite pass: 2,798 tests across 260 files
(177.30 seconds). Publication remains pending. Complete engine startup and campaign play
remain unfinished.

### Local type-encoding dispatch and initial DName — 8 October 2026

The original 441-instruction type-encoding body now enters on the selected
class-name path. Signed SETL consumes known SF/OF without changing flags. The
original encoding arithmetic decodes `A`, advances the same retained cursor
to `V`, and calls the original DName constructor with a zero character. That
constructor stores the NULL node and clears its low twelve flag bits while
preserving unknown upper padding. Execution reaches
`100c5bb1 -> 100c29ed`, before append/copy operations. The parent parser calls,
lock five and enclosing exception frames remain active.

The next append and copy routines have been audited against the installed DLL.
The copy uses masked XOR sequences for ten individual flag fields; these need
physical-word correlation to preserve unknown padding accurately. Their bodies
are research evidence and are not yet executed on this path.

Local validation passes 238 focused checks and typechecking. All 167 generated
files plus the instruction module reproduce exactly. Captured evidence contains
89 bodies, 3,248 instructions and 323 CALL receipts. The production build passes. The full suite passes 2,798 tests across
260 files (167.40 seconds). Publication remains pending. Full startup, world activation,
saves and campaign endings remain unfinished.

PR 137 Pages run 37800122027 succeeded. PR 138 passed CI run
37800373662 and merged at `db376ec97e24aa8ab323a80518539af63b4dd138`
after a 303-run audit found no active main deployment. Its own deployment
is tracked separately.

### Local DName copy/append and primary-type continuation — 8 October 2026

The original DName copy, validity check, append and type-encoding append bodies
now execute. Each masked flag transfer proves its original physical destination,
initial XOR, exact mask and final XOR. Repeated memory reads must reference the
same unchanged field; register operands must retain the actual stored word.
The exact assignment preserves unknown destination padding and takes selected
bits only from the original donor. No numerical equality of unknown words is
used as a substitute for their physical relationship.

Masked SHL preserves known bits and zero-fill bits while exposing carry only
when its source bit is known. The following original SAR sign-extends the
known low nibble. BL/DL use the same low-byte register lanes as AL/CL.

The original type-encoding helper returns. Data-type processing resumes in the
primary-type body, reaching `100c6647 -> 100c6288`; its caller chain and enclosing
lock/frame remain active. This selected path has not produced a demangled name.
Class-type parsing, complete startup and campaign play remain unfinished.

Local evidence: 241 focused checks and typechecking pass. All 175 generated
source files plus the instruction module reproduce exactly. The package contains
93 bodies, 3,387 instructions and 330 CALL receipts. The production build
and full suite pass: 2,798 tests across 260 files (166.93 seconds).
Publication remains pending.

### Local simple-data-type dispatch and class keyword — 8 October 2026

Original simple-data-type dispatch now handles the retained `V` byte using
known signed branch flags. It advances the actual input cursor, rewinds it in
source order and calls the original class/struct/union decoder. That decoder
consumes `V` and selects the seven original bytes `class ` plus NUL from
SharedBase address `100f2b10`. The cursor now points to `bCObsoleteClass` on the
same type-info backing. Execution reaches `100c455a -> 100c28e6`, before text
construction. No output name or completed startup is claimed.

MOVZX supports actual byte/word source widths; AX/BX share the existing low
word lanes. Pointer DEC retains relative identity and carry while leaving
address-dependent flags unknown. JG/JLE consume known SF, OF and ZF.

Local validation passes 241 focused checks and typechecking. All 179 generated
files plus the instruction module reproduce exactly. Evidence contains 95
bodies, 3,741 instructions and 362 CALL receipts. Build/full-suite acceptance
and publication remain pending.

PR 138 Pages run 37802325563 succeeded. PR 140 passed CI run 37801663777
and merged at `ef42975fe912eb308926b1230991130e844d4986` after a fresh
304-run audit found no active workflows. Its Pages deployment is tracked
separately. Full engine startup and a finishable campaign remain unfinished.

### Local class keyword text construction — 8 October 2026

The original text constructor counts the six `class ` bytes. Its Pchar helper
allocates a 16-byte text node and an eight-byte aligned text span through the
existing scratch allocator, then the original text-node constructor invokes
the bounded byte-copy loop. Both allocations belong to the same retained
4,104-byte CRT backing used by the replicators.

The text node is at offset 4,020, with original vtable `100f29bc`, NULL next
pointer, actual buffer pointer at offset 4,012, and length six. Exactly six
bytes are copied; two spare buffer bytes keep unknown masks. Scratch available
bytes become 4,008. The original constructor calls return, and class parsing
reaches `100c457a -> 100c43c1` before scoped-name parsing. The keyword is an
owned graph component, not a completed demangled name or campaign milestone.

Local evidence: 242 focused checks and typechecking pass. All 187 generated
source files plus the instruction module reproduce exactly. The package has
99 bodies, 3,880 instructions and 369 CALL receipts. The production build
and full suite pass: 2,799 tests across 260 files (166.80 seconds).
Publication remains pending. Full startup and campaign play
remain unfinished.

PR 140 Pages run 37804123720 succeeded.
