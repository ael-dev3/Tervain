# Engine CRT initializer evidence

This package records the next dependency after Engine environment-vector return.
It captures 86 original bodies (3539 instructions), the caller at `30677284`,
the floating-point callback at `30892ac0`, and two original initializer tables.
The C initializer table has 200 slots with 6 nonzero entries. The C++ table has
93,705 slots with 1,963 nonzero entries; omitted entries are verified zero.

Generate from the matching offline study:

```powershell
python tools/gothic3/prepare_engine_cinit_source.py --study '<study-root>' --output assets/gothic3/engine-cinit/research.json
```

The generator checks the original Engine.dll hash and exact caller bytes.
Independent regeneration produced identical JSON, SHA-256
``5faeab76169ad5f11fd83ccb10a2c979b923aa1334da7db39ae1b1084f4dbbcf``.

The capture's `runtimeConnected: false` records evidence preparation; it grants
no execution authority. The TypeScript continuation separately obtains a
private permit from the actually reached Engine startup caller.
The captured bodies cover the readonly image guard, floating-point setup,
pointer encoding, C initializer walker and exit registration. The individual
C++ callback implementations and their downstream dependencies remain work.
The selected continuation now executes the readonly guard contract, original
floating-point conversion setup, divide dispatch, ten-pointer encoding loop,
and C initializer walker. Its first callback allocates and publishes the
128-byte CRT exit table, including the original failure result of 24. The normal
path also initializes the stream table at `3067c3c7`, including its 20-entry
allocation retry and failure result of 26. It links the original 20 static FILE
records and reads the existing Engine I/O blocks under their retained owner.
The SSE2 callback at `3067f720` executes its original ID-toggle and CPUID logic
using the retained virtual CPU selection. Its normal execution probe contract
copies XMM1 into XMM0 and returns one; the contract's internal instructions are
excluded from the executed-source count. Missing selections or an unsupported
SIMD exception retain the actual pending instruction. Zero feature results take
the original zero-return path. The normal path stops at `30685007`.
Initializer completion and campaign
activation remain unfinished.

Use retained Engine ownership when implementing these routines; captured
addresses identify original locations and cannot serve as browser pointers.

The fourth C initializer reads the retained argument multibyte-ready image.
Its ready branch returns normally; a cleared flag preserves the pending original
setup call. The fifth initializer reruns the original CPU helper and publishes its own
SSE2 control global. The sixth initializer pushes shutdown callback `30671144` and enters the original
exit-registration wrapper and onexit routine. The EH4 prolog returns after publishing the original exception frame. Exit lock
8 is acquired through the retained Engine service. Execution stops at callback
storage `30671472`, with the lock held, after 1,580 admitted operations.

The sixth initializer is absent from the original disassembly and function CSV.
Its exact pinned PE bytes are decoded with Capstone 5.0.7, with decoder provenance
in the receipt. Install that version or supply `--capstone-path <library-root>`.
The onexit scope includes its 16-byte header and 12-byte handler record; its
original bytes are checked as immutable storage. Registration is not complete.

The normal storage routine decodes the retained exit pointers, queries the actual
allocation size through Engine msize, encodes the original shutdown callback and
stores it in the existing table. It publishes the encoded cursor at offset 4
and returns to onexit `30671577`, after 1,624 admitted operations. The allocation
growth branch remains a pending dependency. Lock and exception cleanup have not
yet returned.

The normal shutdown-registration path now releases lock 8, restores FS and saved
registers through the original epilog, and returns from both callback wrappers.
The C initializer walker consumes the remaining zero slots and returns zero to
`3067d1fe` after 2,176 admitted operations. C++ initialization remains unfinished.

The C++ initializer table is now owned by the same Engine image class. Its entire
93,705-slot runtime image matches the original table SHA-256. The original loop
reaches callback `307322b0` after 65 zero slots, preserving the pending return
to `3067d229`. Normal execution stops there after 2,692 admitted operations.

The first C++ callback now calls the admitted export thunk and executes the
visual-animation float property getter. Its root-copy and initialization-bit
stores use retained original images. The type-name wrapper forwards the actual
default pointer and type-info record, whose decorated name is `.M`. Execution
stops at name routine `3067da97` after 2,711 operations. Unknown tested flag bits
stop at their branch; unrelated unknown bits remain unknown through the stores.

The type-name routine now enters and returns from its original EH4 prolog using
its own immutable 28-byte scope. The same admitted instructions serve both
registration and name setup, with separate frame records and actual return
checks. Execution stops at `3067daa3` after 2,735 admitted operations.

The name routine now loads its actual type-info argument, checks the original
cache and physically pushes all six undecoration arguments. The name pointer
selects offset 9, containing `M` and its NUL terminator; allocator/free code
pointers and flags `0x2800` remain source capabilities. Execution stops at
`3069b26b` after 2,747 admitted operations, with the caller pending. Unknown
cache bytes stop at their actual comparison rather than fabricate a name.

Undecoration now enters its own original EH4 scope and 132-byte local frame.
It loads and tests the actual allocation callback, then preserves the pending
lock-5 initialization call at `306832e3`, after 2,777 admitted operations. The
C++ cursor snapshot retains the caller cursor before nested code reuses ESI.

The original undecoration caller now bridges ensure-lock and lock 5 to the
retained Engine CRT services under its active private permit. Service internals
are translated contracts, not counted x86 rows. Normal execution stops at
`3069b29e` with lock 5 held after 2,784 admitted operations. Unavailable services
retain their actual pending returns and leave lock ownership unreported.

The undecoration caller publishes its allocator/free capabilities and three zero
work fields in the owned global image. Its parser constructor now executes its
original frame setup and reaches the first internal-object initializer at
`306972b8`, after 2,804 admitted operations. Lock 5 remains held and both parser
calls remain pending. The constructor dependency and parser remain unfinished.

The first internal-object constructor enters its field constructor with kind 3.
The original bit operations set only the low four flag bits, retaining the
remaining bits and their masks. Its 16-byte allocation request now stops at
`30696bf0` after 2,826 operations; no allocation or parser result is fabricated.

The arena allocator follows the actual cold-capacity branch, requests a new
4,100-byte arena block recursively, aligns that request to 4,104 bytes and calls
the stored malloc capability. Execution stops at `30672ec7` after 2,857 admitted
operations. Both arena calls and their caller remain pending; allocation and
cleanup are still unfinished.

The admitted stored malloc callback now uses the retained Engine CRT allocation
contract. Contract internals are excluded from the physical instruction count.
The successful arena caller links its actual allocation, retains 4,080 free
bytes and returns the 16-byte slice at offset 4,084. Original POPs and RET 8
return both arena calls. The field constructor at `30696ef8` remains pending
after 2,888 operations. Null and unavailable malloc retain their actual boundaries.

The first allocated field node now stores its original owned vtable pointer,
zero flags, kind 3 and zero payload. The original RET 4 returns it to the field
wrapper, which publishes the node and returns to the internal object. Execution
reaches the second field constructor at `30697051` with kind 1, after 2,911
operations. The captured first vtable entry is retained as a readonly image.

Both internal parser objects now construct their four fields using shared
original routines. The first request creates one 4,104-byte arena block; three
warm requests consume further 16-byte slices. Retained free capacity is 4,032
bytes, with field nodes at offsets 4,084, 4,068, 4,052 and 4,036. All four node
constructors and both internal-object constructors return physically. Execution
stops at parser configuration `30697490` after 3,121 admitted operations.

The parser constructor now configures its two local objects, original name and
cursor pointers, NULL output, zero output capacity, flags 0x2800, zero limit and
zero status in its owned 37-byte global image. Its original RET 20 returns to
undecoration, which calls the name parser at `3069afb8`. Execution stops there
after 3,144 admitted operations. No parsed name or type-info cache is supplied.

The name parser now creates its original 32-byte frame and reads the actual
name byte M. Its normal branch calls the type parser with a physical destination
pointer. The type parser follows the actual 0x2000 flag branch, clears that bit
and calls data-type parser `3069b876`. Execution stops there after 3,173
operations. The original caller arguments retain flags 0x2800; working parser
flags are 0x0800. Unknown name bytes retain the actual comparison boundary.

The data-type parser constructs its original zero-input temporary, retaining
upper unknown flag bits, and dispatches M through the compound parser. Original
comparisons and DEC select the basic-type call at `3069b3b1`, with the actual
output and modifier stack pointers. Execution stops after 3,223 operations; no
parsed type text or cached name is supplied. The original cursor has not advanced.

The basic-type parser reads M, advances the actual cursor to its NUL byte and
uses the original readonly 11-byte case map and 24-byte target table. Index 10
maps to target 4 at `3069b430`, which pushes the original float literal from
`30819794`. The literal is captured as exact readonly bytes, not supplied decoded
output. Execution stops at its original string constructor `30697a0f` after
3,252 operations. Name allocation, cleanup and cache publication remain pending.

The string constructor now scans the five original float-literal bytes and
passes that actual length to its initializer. The initializer preserves masked
flag fields, follows its empty-destination branch and uses the same warm arena
routine to allocate a 16-byte text node at offset 4,020. Free capacity is 4,016
bytes. Execution stops at original text-node constructor `30697364` after 3,336
operations. No character copy or completed string has been supplied yet.

The text-node constructor publishes its readonly original vtable, zero flags,
character pointer and length. Its five-byte character request aligns to eight
bytes in the same warm arena, leaving 4,008 free bytes. The original copy loop
writes exactly five bytes at offset 4,012; three padding bytes remain unknown.
Copy, text-node, initializer and string-constructor returns now execute through
the physical stack. The basic-type caller stops at `3069b601` after 3,449
operations. Final parser output, cleanup and cache publication remain pending.


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

## Original parser arena cleanup â€” 11 October 2026

The selected continuation executes the original HeapManager destructor and its
stored CRT free callback. It loads the next block before freeing the original
4,104-byte arena, then returns at `3069b2f0` after 3,989 admitted operations.
The separate eight-byte output remains live with five characters, a NUL, and
two unknown padding bytes. Text-node snapshots retain historical records after
release and expose `undecorationTextNodeLive: false`; they do not read freed
fields. Lock 5 remains held. The original finally helper, lock release, outer
return, type-name cache publication and complete startup remain unfinished.

## Local continuation â€” 11 October 2026: original undecoration return

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

## Original type-name length caller

The original caller removes its six undecoration arguments, retains the returned
owned output in its local, compares it with NULL and passes it to the original
`30679ad0` strlen. The pending call is reached after 4,015 admitted operations.
The optimized scan now executes through its actual return, as recorded below. Cache publication, startup and
a complete playable campaign remain unfinished.

## Local continuation â€” 11 October 2026: original type-name length scan

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

## Local continuation â€” 11 October 2026: original type-name cache allocations

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

## Local continuation â€” 11 October 2026: original bounded cache copy

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

## Local cache-list continuation â€” 11 October 2026

The original root at `30af70ac` is captured as eight bytes: two list-root
words. After the bounded copy returns status zero, the original instructions
`3067db48` through `3067db59` put the published cache-text pointer in the
owned eight-byte node, retain the previous head and publish the node at root+4.
Pointer values retain private ownership; unknown numerical address bits remain
unknown. Execution stops at `3067db62` after 4,154 admitted operations.
The temporary output remains live and lock 14 remains held. Cleanup, full
startup and a finishable browser campaign remain unfinished.

Independent JSON and TypeScript regeneration is byte-identical. Typechecking,
ten selected runtime checks and all nineteen source/image checks pass.
Combined validation and publication are recorded separately.

The missing cleanup caller at `3067db6a` and lock-14 finally helper at
`3067db83` are now independently captured from exact pinned PE bytes.
Five source checks pass, including their encodings; runtime execution of this
cleanup continuation remains unfinished.

## Local temporary-output cleanup â€” 11 October 2026

The normal cold-cache path pushes its actual temporary output at `3067db62`
and calls the retained Engine free owner. After release, the recovered caller
sets its original exception state and invokes the lock-14 finally helper.
Execution reaches `3067db77` after 4,163 admitted operations with the output
freed, the cache node and text live, and lock 14 released. Interrupted free or
unlock retains the actual pending call and the appropriate resource state.
The previously supported NULL-allocation branches retain their earlier boundary.
Typechecking and eighteen selected regression checks pass. This is local work;
full startup and campaign completion remain unfinished.

## Local type-name wrapper return â€” 11 October 2026

The original type-name routine reloads its live cached text, runs the actual
EH epilog and returns through `306713ae` to property construction at `30076678`.
The returned EAX retains the same Engine-owned six-byte cache allocation.
The temporary output is freed and lock 14 is released. Normal execution has
4,180 admitted operations. A dedicated return/ownership check passes; combined
validation of this newer continuation is still pending. Full startup and a
finishable browser campaign remain unfinished.

## Local SharedBase UnMangle caller â€” 11 October 2026

The actual property caller pushes the returned Engine cache pointer and its
original static result storage, validates IAT `30afdab0` against the original
SharedBase export receipt and retains call `3007667e -> 100088cd` pending.
Its arguments preserve Engine ownership; no CString result or successful
SharedBase return is fabricated. Normal execution has 4,183 admitted operations.
A dedicated argument/lifetime/pending-call check and typechecking pass.

The next dependency is SharedBase UnMangle (`10091550`) and its CString
construction. Its search uses DWORD reads. Engine allocations currently retain
exact capacity; rounded physical allocation views exist only for the explicitly
selected Game heap. Alignment alone does not prove readable tail capacity.
Combined validation and browser campaign completion remain pending.

The package also captures four SharedBase UnMangle/CString dependency bodies
from the hash-pinned original DLL, separately from Engine instructions. The
space literal is `20 00` at `100e6f44`. Six source checks pass, including the
UnMangle export thunk and rejecting cross-module or interior-byte lookups.
Independent JSON and TypeScript regeneration matches byte for byte. This is
source preparation; the pending SharedBase call has not returned.

## Local SharedBase space-search dispatch â€” 11 October 2026

The retained call executes the original UnMangle thunk, saves ESI, loads the
actual Engine-owned input and passes the original two-byte space literal to
SharedBase strstr. The literal's known terminating NUL selects the one-character
path, restores strstr's saved registers and tail-jumps to `100a7306` with AL=32.
The 23 SharedBase instructions are traced separately; total admitted operations
are 4,206. The search and UnMangle calls remain pending, the cache stays live,
and the temporary output stays freed. No CString construction result is supplied.
Typechecking and a dedicated dispatch/ownership/lifetime check pass. Full
integration validation of this continuation remains pending.

## Local aligned character-search DWORD â€” 11 October 2026

The original character-search tail uses retained allocator alignment, expands
its space byte into a repeated DWORD and executes the first native DWORD load
and its match/zero predicates. That word contains `floa`; neither predicate
selects a return. EDX advances to offset four. The second four-byte load at
`100a7338` cannot be admitted against the six-byte Engine allocation, so the
actual load remains pending after 4,234 operations (51 SharedBase operations).
The cache remains live and known; no tail bytes, CString or return are invented.
A dedicated execution/span/lifetime/repeated-call check and typechecking pass.
The next dependency is a justified Engine physical-span policy; alignment alone
cannot supply it. Full integration validation remains pending.

See the [Engine heap capacity contract](../../../docs/engineering/gothic3-engine-heap-capacity.md)
for the next physical-span bridge and its required ownership checks.

Seven SharedBase bodies now include CString allocation, MemoryAdmin lookup
and tagged allocation. Eight source/owner checks pass; independent regeneration
matches exactly. The runtime owner lookup reuses the existing unique MemoryAdmin
without constructing or initializing a replacement. Ambiguous ownership is
rejected. The allocator continuation remains pending.

The local CString allocation caller now reaches the retained MemoryAdmin getter.
Missing/ambiguous ownership stops at `10002aae` after 4,298 source operations;
the selected browser owner returns through its existing GetInstance contract
and reaches Malloc `10003cd8` after 4,300. Internal getter operations are excluded
from these counts. Eleven targeted runtime/browser checks and typechecking pass.
Allocation and subsequent CString writes remain pending; this is not a deployed
startup or campaign completion receipt.

The local allocation bridge now returns the actual MemoryAdmin 16-byte pool
slot for the original 14-byte request. Original length/refcount, character
pointer publication and NUL stores execute, and the constructor reaches memcpy
`100a7a00` after 4,313 admitted source operations. Allocator internals are not
counted as executed source rows. Six ownership, normal, browser and failure
checks pass. Character copying, complete startup and campaign play remain
unfinished; this newer checkpoint has not been deployed.

Eight separately pinned SharedBase bodies now include the original memcpy.
The scalar copy contract consumes the actual five-byte constructor arguments,
retains unknown masks and partial stores, and returns through the original
constructor and UnMangle cleanup. Those nine caller rows reach `30076684` after
4,322 admitted source operations. Internal memcpy operations are excluded from
that count. Eleven distinct runtime/browser/source checks and typechecking pass;
independent JSON and TypeScript regeneration is byte-identical. Shutdown
registration, complete startup and campaign play remain unfinished. This is
a local continuation, not a deployment receipt.

The property initializer now registers its original shutdown callback in exit
slot three using the retained Engine exit machinery and returns its first C++
callback at `3067d229` after 4,437 source operations. Five focused checks and
typechecking pass. Callback destruction and remaining C++ traversal are not
claimed complete. The earlier combined revision passed 3,542 tests and its
production build; the newer CString/registration work needs combined validation.

The local C++ walker advances the first returned callback and reads the second
original table slot, `307bb108 -> 307322c0`. The separately captured property
thunk uses bCString RTTI and its own flags/storage/type-info images. Its original
fresh prefix reaches `30076593 -> 306713ae` after 4,460 source operations. The
first property's root and third exit slot remain published. Five runtime/browser
checks, all 23 source/image checks and typechecking pass; independent regeneration
is byte-identical. An unknown second guard retains the completed first callback
and stops at `30076567` without repairing its mask. Second type-name execution,
remaining startup and the campaign remain unfinished.

The local type-name wrapper, EH4 frame and argument setup are reused for both
properties. The actual bCString name pointer and allocator/free callbacks reach
the undecoration call `3069b26b` after 4,499 source operations. Ten focused
runtime/browser/regression checks and typechecking pass. An unknown second
cache field retains its pending comparison and first-property results. No second
decoded name is invented; complete startup and campaign play remain unfinished.

The local shared decoder prefix now executes the second 132-byte EH4 frame,
retained lock-five acquisition and original global/parser-argument setup. The
pending parser-construction call is `3069747a` after 4,550 source operations.
Nine focused checks and typechecking pass, including second-lock failure without
replay or loss of the first property. No second parser or decoded name is
fabricated. Full startup, publication of this continuation and campaign play
remain unfinished.

The shared parser-constructor prefix now reaches the second original 16-byte
arena request at `30696bf0` after 4,578 source operations. The actual pending
caller, stack field-kind bits and held lock five are retained. Typechecking,
four focused runtime/browser checks and three subsequent regression checks pass.
The second arena allocation and decoded name remain unfinished; this local
continuation has not been published or proven as complete startup or campaign play.

The shared cold arena routine advances the second property to its original
allocator callback at `30672ec7` after 4,609 operations. The recursive backing
request is 4,100 bytes, aligned to 4,104 at the pending callback. Three focused
checks and typechecking pass; no second allocation, complete startup or campaign
completion is claimed. This continuation remains local.

The local second arena allocation now returns its original 16-byte field
location at offset 4,084 and stops at `30697082` after 4,635 operations.
Canonical ownership, recursive return, header and arena globals are retained.
Typechecking and three focused checks pass. Earlier combined revision
`05c8b93077dea4f6bb6d9afb9bf49d1e718b0b6c` passed 3,556 tests and its build;
it predates this continuation. Full startup and campaign play remain unfinished.

The shared field-node constructor now returns the second parser's first field
at `306972c5` after 4,660 admitted operations. Its live node at arena offset
4,084 and original stack field remain owned. Typechecking and three focused
checks pass. Remaining parser construction, full startup and campaign play are
unfinished; this continuation is local.

The shared remaining parser constructor now builds all four second-parser fields
from its retained arena and returns to the actual parse caller at `3069afb8`
after 4,896 operations. Typechecking and five focused checks pass, including live
node ownership and first-property constructor regressions. The bCString name
parse, complete startup and campaign remain unfinished. This continuation is local.

The shared name-parser entry now executes the original `?A` prefix branch and
reaches the second type-parser call at `3069a2f7` after 4,917 operations.
Typechecking and five focused checks pass. Name bytes, partial-register masks,
parser configuration and arena ownership are retained; no decoded name is
supplied. Type parsing, full startup and campaign remain unfinished and local.

The shared type-parser prefix and original temporary constructor now return the
second call to `3069b887` after 4,946 operations. Typechecking and five focused
checks pass. Earlier combined revision passed 240 focused checks and is running
its full suite; it predates this local continuation. The next original question
mark data-type branch, full startup and campaign remain unfinished.

The shared data-type dispatch follows the second name's question-mark branch
through its original cursor increment and five-argument call to `3069aad4`,
after 4,965 operations. Typechecking, five focused checks and one caller-argument
check pass. Capturing the next decoder body, full startup and campaign remain
unfinished; this continuation has not been published.

The next decorated-type decoder body at `3069aad4` has been captured and checked
against original Engine bytes: 441 instructions through RET at `3069afb7`.
Independent JSON/TypeScript regeneration is byte-identical; typechecking and
all 24 source/image checks pass. Runtime execution of this body remains pending.

The original decorated decoder entry now reaches `3069ab34` after 4,982
operations. Typechecking, five focused checks and a qualifier-unknown failure
check pass. The failure stops at the actual byte read with the caller and first
property retained. Remaining decoder execution, startup and campaign are
unfinished; this continuation remains local.

The original qualifier normalization now selects `3069acb5` after 5,005
operations. Typechecking, six focused checks and one register-result check pass.
Signed comparison, arithmetic, masks and DEC carry preservation are retained.
The next cursor advance and temporary-constructor dependency, complete startup
and campaign remain unfinished and local.

The original 13-row qualifier temporary constructor is captured and its zero
branch executes on the retained stack slot. The caller reaches `30697b16` after
5,026 operations. Independent regeneration matches; typechecking, fourteen
focused checks and a targeted constructor-byte check pass. The next decoder,
startup and campaign remain unfinished; this continuation is local.

The pending qualified-value wrapper at `30697b16` is captured: 29 rows through
RET 8 at `30697b64`. Original bytes, independent regeneration, typechecking and
all 25 source/image checks pass. Runtime integration with value-copy and empty
checks remains unfinished; no return or completed startup is supplied.

The original copy continuation is shared with explicit live stack addresses and
source-value ownership. The qualified caller's verified NULL value copies and
returns to `30697b23` after 5,085 operations, while float copies still require
their original text node. Typechecking and six focused checks pass. Remaining
wrapper execution, full startup and campaign play remain unfinished and local.

The qualified wrapper now shares the original empty-value check and assignment,
then returns to `3069acdf` after 5,144 operations. Typechecking, six focused checks
and a call-return check pass. Earlier combined full-suite validation reported a
lighthouse walking failure and is still running. Remaining decoder execution,
startup, publication and campaign completion remain unfinished.

The original modifier assignment and two empty-value branches now reach
`3069adfc` after 5,211 operations. Typechecking and six focused checks pass.
Earlier combined full-suite validation ended with 3,560 passes and one five-second
lighthouse timeout; all six lighthouse tests then passed in isolation. Its build
is running. Newer decoder work, startup and campaign remain unfinished and local.

The original qualifier rendering-flag branches now select `3069ae9f` after
5,224 operations. Typechecking and six focused checks pass. The preceding
combined build passed after an isolated lighthouse check; a newer combined
checkout including PR #244 is under validation with one test worker. This local
continuation, complete startup and campaign remain unfinished.

The original plain qualifier decoder now returns to `3069b903` after 5,314
operations. Its live output is NULL with known qualifier flags 16, and the outer
ESI is restored. Typechecking and seven distinct focused checks pass. Copy
operand checks admit a fresh equal scalar read of the same physical unknown
flag slot, while retaining register and pointer checks. Remaining class-name
parsing, full startup and campaign remain unfinished and local.

The shared compound-type prefix now consumes the original second `V` class code
and reaches the basic-type parser at `3069b3b1` after 5,388 operations.
Typechecking and six distinct focused checks pass. The actual qualifier
assignment has returned; the basic-type call remains pending. Class-name
parsing, complete startup and campaign remain unfinished and local.

## 2026-10-11: original class-code basic parser entry

The shared basic-type prefix now executes nineteen original instructions for
both the completed float path and the second property. The second path reads
`V` (86) from the original type-info at offset eleven, advances its live cursor
to twelve, and follows the original signed `JG` to `3069b43a`. The retained
initializer has executed 5,407 source operations. Its basic-type caller remains
pending; this checkpoint does not supply a decoded class name.

TypeScript checking and five distinct focused checks pass: the retained
MemoryAdmin allocation path, unknown final CString byte, unknown decorated
qualifier, parser constructor and fatal PTD call. The diff was inspected.
Combined validation remains live on an earlier revision. This continuation is
local; complete startup, publication and campaign completion remain unfinished.

## 2026-10-11: original class-code fallback dispatch

The second property's original upper basic-type comparisons now select the
fallback at `3069b5d6`. The actual local destination is passed on the retained
stack, the live cursor is decremented from twelve to eleven, and the original
call `3069b528 -> 306995dd` remains pending after 5,421 admitted operations.
The new continuation does not synthesize class-name output or return the call.

TypeScript checking and five focused allocation, byte-unknown, qualifier,
constructor and fatal-call regression checks pass. The source diff was reviewed.
Combined validation is still live on its earlier frozen revision. This work is
local; the class parser body, complete startup and full campaign remain unfinished.

## 2026-10-11: original class-type parser evidence

Captured `UnDecorator::getECSUDataType` at `306995dd-306996dc` from the matching
reference binary and disassembly: 91 instructions, 256 bytes, instruction hash
`7c1bb22e3048ef88118274d8c75d3ad3f61b8f9da92e6b6bc2e80891f9dd470c`.
The evidence package now contains 74 Engine bodies and 3,028 instructions.
Independent JSON and TypeScript regeneration are byte-identical. Structural
comparison confirms the new method is the only evidence-package change.

TypeScript checking and all 26 source/image checks pass. Runtime remains pending
at this parser's entry after 5,421 operations; capturing its body does not execute
it or establish startup. This work remains local. Full campaign play is unfinished.

## 2026-10-11: live class-parser entry and tag dispatch

The class-type parser now executes its original prolog and flag checks from
`306995dd`, including the fifteen-bit shift and retained carry behavior. It
reads the live `V` byte at offset eleven, advances the actual cursor to twelve,
and follows the original subtraction/DEC dispatch to `3069966d`. The retained
initializer has executed 5,450 source operations. The pending class-keyword
construction is not replaced with synthesized output.

TypeScript checking and five focused allocation, byte-unknown, qualifier,
constructor and fatal-call checks pass for both the entry checkpoint and final
tag dispatch. The source continuation was reviewed against the captured rows.
This change remains local; class-name output, complete startup and campaign
completion remain unfinished. Earlier combined validation remains live.

## 2026-10-11: original class-keyword literal ownership

Captured the seven original bytes `636c6173732000` (`class ` plus terminator)
at `3089f408`. The Engine image owner retains them as read-only evidence and
rejects modified bytes and unknown masks. Independent JSON and TypeScript
regeneration are byte-identical; structural comparison confirms the new literal
is the only evidence-package change. TypeScript checking and all 28 source/image
checks pass. Runtime remains pending at `3069966d`, with 5,450 operations.
This local evidence capture does not construct the name or prove startup.
Complete startup and browser campaign completion remain unfinished.

## 2026-10-11: shared original string-constructor prefix

The class parser now passes the retained `class ` literal and its actual local
destination to `30699683 -> 30697a0f`. The original string constructor's prefix
is shared with the existing float path. It reads the actual bytes, counts six
characters, and passes the live literal and length to `30697a2e -> 3069760c`.
The initializer reaches 5,483 source operations; string initialization remains
pending. No class text node or final decoded name is fabricated.

TypeScript checking and five focused allocation, unknown-byte, qualifier,
constructor and fatal-call checks pass. The extracted prefix and its retained
first-path continuation were reviewed. This change remains local; complete
startup and campaign completion remain unfinished. Earlier combined validation
is still running in its frozen checkout.

## 2026-10-11: original class string-initialization prefix

The shared original initializer checks the live class value's kind and NULL
node, reads its retained literal and six-character length, and reaches the
16-byte text-node allocation at `3069765e -> 30696bf0`. The retained initializer
has executed 5,512 source operations. The existing float path uses the same
prefix; the arena allocation remains pending for the class path.

TypeScript checking and five focused allocation, unknown-byte, qualifier,
constructor and fatal-call regression checks pass. The extracted prefix was
reviewed against its unchanged original operations. This work remains local;
class text-node construction, complete startup and campaign play are unfinished.
Earlier combined validation remains running in its frozen checkout.

## 2026-10-11: live class text-node allocation and construction prefix

The actual warm arena now returns a 16-byte class text node at offset 4,020,
reducing its remaining payload to 4,016. The original initializer passes the
actual node, literal and six-character length to `30697364`. Its shared text
constructor prefix stores the retained vtable reference and known zero field,
then reaches `3069739f -> 30696bf0` for character storage after 5,558 operations.
The class node belongs to the same live second-property arena; character storage
and the constructor return remain pending.

TypeScript checking and five distinct focused checks pass. The first run's two
normal-path expectations used a count one instruction too low; both pass after
correcting the count and adding node-ownership, zero-field and call-return checks.
The qualifier, original constructor and fatal-call checks passed unchanged.
The shared prefix was reviewed against the captured instructions. This change is
local; complete startup and campaign completion remain unfinished.

## 2026-10-11: original class character allocation and copy return

The warm arena now allocates six requested character bytes in an eight-byte
slot at offset 4,012, reducing remaining payload to 4,008. The original text
constructor publishes its live character reference and length six, then the
shared original copy loop writes exactly `class ` and returns to `306973b7`.
The initializer reaches 5,642 admitted operations. The text-node constructor
and outer class parser remain pending; no complete type name is claimed.

TypeScript checking and five focused allocation, unknown-byte, qualifier,
constructor and fatal-call checks pass. The normal check verifies all six
written bytes and masks, length, live arena ownership and both allocation/copy
returns. The copy extraction was inspected; the existing first-path node input
range and pointer checks remain retained. This change is local. Complete startup
and browser campaign completion remain unfinished.

## 2026-10-11: original class keyword constructor returns

The shared original text-node, initializer and string-constructor epilogs now
return to `30699688` using the retained call frames and real return addresses.
The class parser then clears its next local value and flag bits, reaching
`3069968f` after 5,663 admitted operations. The actual six-byte `class ` keyword
and length remain in the live arena. The `bCString` name has not been appended
and the class parser itself remains pending.

TypeScript checking and five focused allocation, unknown-byte, qualifier,
constructor and fatal-call checks pass. The normal check now requires the class
constructor call to have returned, retains arena byte and length checks, and
observes the restored ESI. Earlier temporary register ownership expectations
were updated for the real epilog restores. The shared return sequence was
reviewed against its original instructions. This continuation remains local;
complete startup and browser campaign completion are unfinished.

## 2026-10-11: original class keyword assignment and scoped-name call

The class parser now tests its live keyword flag, assigns the constructed value
through the original `3069969a -> 30696da9` call, and reaches
`306996a3 -> 306994ea` (`UnDecorator::getScopedName`) after 5,716 source operations.
The assignment checks the actual text-node arena and offset before storing its
reference. Its original masked flag expressions and real return remain retained.
The scoped-name call is pending; the final `bCString` name is not supplied yet.

TypeScript checking and five focused allocation, unknown-byte, qualifier,
constructor and fatal-call checks pass. The normal check requires the keyword
assignment to have returned and the scoped-name call to remain pending, while
retaining keyword bytes, length and ownership checks. The diff was inspected.
This change is local; complete startup and campaign completion remain unfinished.

## 2026-10-11: scoped-name and identifier parser evidence

Captured the original `UnDecorator::getScopedName` at `306994ea-306995cd`
(89 instructions, 228 bytes; hash
`27712fde99caba7288ba719a974fe8f2d99474f7e8314fc786376c1704803fc4`)
and its immediate `getZName` dependency at `30699300-306994e9`
(177 instructions, 490 bytes; hash
`f5cd2a99e27cae9769e317658aa916d61482dfdf3472378b5209efe18768d4e6`).
The package now contains 76 Engine bodies and 3,294 instructions.

Independent JSON and TypeScript regeneration are byte-identical. Structural
comparison shows exactly the two added bodies. TypeScript checking and all 29
source/image checks pass; generator and admission-test diffs were inspected.
Runtime remains pending at `306994ea` after 5,716 operations. These local captures
do not execute the routines or prove complete startup or campaign completion.

## 2026-10-11: original scoped-name and identifier entry

The scoped-name parser now clears its actual caller output with the original
masks and calls `30699505 -> 30699300` with its local destination and flag one.
The identifier parser preserves the retained Engine cookie and actual EBP XOR
relationship, reads the original `b` at type-info offset twelve, and takes the
ordinary-name branch to `306993a2`. The initializer has executed 5,747 source
operations. Identifier construction and both parser returns remain pending.

TypeScript checking and five focused allocation, unknown-byte, qualifier,
constructor and fatal-call checks pass for the scoped entry and final identifier
entry. The source diff was inspected against the captured instructions. The
normal check retains completed keyword bytes/length and pending name calls.
This continuation is local; complete startup and campaign completion remain
unfinished. Earlier combined validation remains running in its frozen checkout.

## 2026-10-11: original identifier prefix literals and completed validation

Captured `template-parameter-` plus terminator at `3089f3d4` (19 bytes)
and `generic-type-` plus terminator at `3089f3c4` (14 bytes). The Engine image
owner retains and protects both inputs. Independent JSON/TypeScript regeneration
are byte-identical; structural comparison shows exactly the two added literals.
TypeScript checking and all 31 source/image checks pass. Runtime remains pending
at `306993a2` after 5,747 operations; the prefix comparisons are not executed yet.

The earlier frozen combined revision `1b37f544b0c382868335973634c91ef1adc9a103`
completed typechecking, all 3,569 tests across 319 files (1,709.89 seconds), and
production build successfully. This validation covers work through the earlier
modifier checkpoint, not the newer class and identifier continuations. The
previous lighthouse timeout receipt remains distinct from this successful run.
Newer work remains local. Complete startup and campaign completion are unfinished.

## 2026-10-11: original identifier prefix dispatch

The identifier parser now reads the retained template and generic prefix
literals and compares their first bytes with the live original `b`. Both
mismatch branches execute their original difference instructions and select
ordinary identifier construction. The original `306994a4 -> 30697709` call
receives the actual cursor slot at parser-global offset twelve and delimiter
`@` (64), reaching 5,781 admitted operations. The delimited-name constructor
remains pending; no `bCString` output is fabricated.

TypeScript checking, five runtime allocation/failure checks, and six browser
service checks pass. Browser fixtures now expect the actual constructor boundary.
The added source sequence was reviewed against the captured instructions.
Combined validation is running on the earlier frozen identifier-entry revision;
this new dispatch is local. Complete startup and campaign completion remain
unfinished.

## 2026-10-11: original delimited-name constructor evidence

Captured `DName::DName(char const*&, char)` at `30697709-306977d8`:
89 instructions, 208 bytes, instruction hash
`b28a7979f8797f684584712d69fe13c6bf321b680c271447e95d3cb6accbc086`.
The body retains its character validation, live cursor updates, initializer
call and delimiter handling. The package now has 77 Engine bodies and 3,383
instructions. The source-admission checks pin the entry, cursor load, delimiter
comparison, initialization call and original `RET 8`.

Independent JSON and TypeScript regeneration are byte-identical. Structural
comparison shows exactly the new body. TypeScript checking and all 32 source/image
checks pass; generator and admission-test diffs were inspected. Runtime remains
pending at `30697709` after 5,781 operations. This local capture does not execute
the constructor. Complete startup and browser campaign completion are unfinished.

## 2026-10-11: original delimited-name scan

The retained constructor now follows its original per-character validation and
cursor instructions through all eight `bCString` characters. It stops at the
actual `@` delimiter at type-info offset twenty and passes the original start
reference and count eight to `3069778c -> 3069760c`. The initializer reaches
6,001 admitted operations. Text initialization and the constructor return remain
pending; no completed decoded type name is claimed.

TypeScript checking, six distinct runtime checks, and six browser-service checks
pass. One initial normal-path check expected an obsolete EAX pointer; it now
checks the actual partial-register delimiter byte and mask. The added unknown
character check masks the third read at offset fifteen and proves execution
stops at `30697736`, retaining the caller, lock and completed first CString,
without calling initialization. Source and fixture diffs were inspected.
Combined validation remains running on its earlier frozen revision. This work
is local; complete startup and browser campaign completion remain unfinished.

## 2026-10-11: original identifier text allocation and copy

The scanned name now uses the shared original initializer with its actual source
at type-info offset twelve. The warm arena allocates its text node at 3,996 and
eight character bytes at 3,988, leaving payload 3,984. The original copy loop
writes all eight `bCString` bytes and returns to `306973b7` after 6,176 source
operations. The earlier `class ` text remains separate. Initialization and the
delimited-name constructor still need to return; no full decoded type is claimed.

TypeScript checking, six runtime checks and six browser-service checks pass.
The normal check confirms bytes, masks, length, retained cursor and actual
allocation offsets. The unknown character regression remains passing. Shared
input checks now accept an explicit original source offset, defaulting to zero
for the existing float/keyword paths, while retaining same-owner and field checks.
The code and fixture diffs were inspected. This continuation remains local;
complete startup and browser campaign completion remain unfinished.

## 2026-10-11: original delimited-name return and identifier assignment

The shared text/initializer return now resumes the actual delimited constructor
at `30697791`. It compares the closing byte with its live delimiter argument,
advances the cursor from twenty to twenty-one, clears the original kind bits,
and returns through the retained `RET 8` to `306994a9` at 6,208 operations.
The identifier parser then assigns the actual constructed node through
`306994ad -> 30696da9`, returning to `306994b2` at 6,255 operations. Its node
and eight `bCString` bytes remain owned by the live second-property arena.
The identifier/reference-cache and scoped-name returns remain pending.

TypeScript checking and six runtime checks pass at both return checkpoints;
six browser-service checks pass at the final boundary. The normal check requires
the real constructor, initialization and name-assignment calls to have returned
and the cursor to point to the remaining `@`. Unknown-character and first-path
regressions remain passing. The shared epilog extraction and new original steps
were inspected. This work is local; complete startup and browser campaign
completion remain unfinished.

## 2026-10-11: original name-reference cache caller and body

The identifier parser now restores its original saved registers, checks its
actual cache argument and retained reference count, and reaches
`306994c9 -> 306972d6` after 6,265 source operations. The name-reference append
body is captured from `306972d6-3069731c`: 27 instructions, 71 bytes, hash
`e23b2baff71710fef3f17c195214bf88c727edc543ea8ddaf1fc12cd1b482c75`.
The package now has 78 Engine bodies and 3,410 instructions. Cache append and
both name-parser returns remain pending.

Independent JSON/TypeScript regeneration are byte-identical; structural
comparison shows exactly the new body. TypeScript checking, six focused runtime
checks, and all 39 source/image/browser-service checks pass. Source, generator
and admission-test diffs were inspected. Combined validation remains running
on its earlier frozen revision. This continuation remains local; complete
startup and browser campaign completion remain unfinished.

## Local continuation — 11 October 2026: name-reference cache entry

The second property identifier now enters the captured cache append at
`306972d6`, saves ESI, retains the actual stack cache owner, compares its
counter against nine, loads the actual name argument, and calls the original
empty-value predicate. Execution stops at `306970c9` after 6,271 admitted
operations. The cache call and predicate call remain pending; no cache entry
is synthesized. Both parser locks and the live second arena remain retained.

Typechecking, six focused engine checks and six browser-service checks pass.
The cache-pointer assertion checks the actual configured stack offset after
ESI changes at its original instruction. The earlier accidentally broad test
invocation was stopped after identifying its stale ESI assertion; it is not
claimed as a passing suite. The separate older combined validation remains
running and does not cover this continuation. Full startup, world activation
and a finishable browser campaign remain unfinished. This checkpoint is local.

## Local continuation — 11 October 2026: nonempty-name validity return

The cache argument's actual constructed name node is checked against its
canonical Engine allocation before the original nonempty predicate enters
`306970b2`. The predicate reads the live stack flag word, executes the original
left and arithmetic-right shifts, selects its zero-kind branch, and returns
valid through `306970d3`. The outer empty predicate returns zero through its
actual caller at `306972e7`, after 6,285 admitted operations. Shift carry and
undefined overflow are retained conservatively; unknown flag bits are preserved.
The pending append still owns its saved ESI and unmodified cache counter.

Typechecking, six focused engine checks and six browser-service checks pass.
The first validation attempt exposed use of the general memory resolver for
an Engine allocation; the corrected implementation uses the canonical Engine
heap owner proof. This is local implementation only. The cache's eight-byte
allocation and copy, cache publication, complete engine startup and the
finishable browser campaign remain unfinished. The older combined suite
remains active and is not evidence for this revision.

## Local continuation — 11 October 2026: original name-reference append returns

The original append requests eight bytes from the live parser arena, reducing
its retained capacity from 3,984 to 3,976 bytes. The allocated value at offset
3,980 receives the actual name node and masked flag fields through the captured
copy constructor. The counter increments from all-one bits to zero, preserving
carry, and the original entry receives the actual allocated pointer. ESI is
restored and RET4 returns to `306994ce` after 6,382 admitted operations.

The copy helper now accepts an explicitly proved canonical Engine arena
destination while preserving its existing stack destination checks. Copying
the cached name does not overwrite the historical first-property text node.
Typechecking, six focused engine checks, one interrupted-copy check and six
browser-service checks pass. An interrupted copy retains the unchanged cache
counter, live arena, held lock and pending caller; replay remains forbidden.

Older combined revision `2ecc0b2ddfcb1215b3f5975c830e964dbce125f7` finished
typechecking, all 3,575 tests across 319 files and the production build. Its
full suite took 1,769.02 seconds and predates the cache continuation. These
results are separate receipts. This checkpoint is local; identifier return,
complete startup and the finishable browser campaign remain unfinished.

## Local continuation — 11 October 2026: original identifier return

The identifier copies the actual parsed name into its caller's stack output
using the original 54-instruction value constructor. It retains the historical
first-property text node separately. Its epilog decodes the saved cookie XOR
using the same EBP identity, compares with the canonical Engine cookie, restores
ESI and EBP, and returns through the actual scoped-name caller at `3069950a`.
Execution reaches 6,450 admitted operations. Caller argument cleanup and the
remaining scoped-name continuation are still pending.

The source package adds the four original cookie-check instructions, including
the failure jump, verified against the pinned Engine DLL. The body hash is
`5301830da53ad2ffa60943819b7aef623e476ee054612876edffe7ffe4de2e4e`.
It now captures 79 Engine bodies and 3,414 instructions. Independently generated
JSON and TypeScript match byte-for-byte. Typechecking, seven focused runtime
checks and 40 source/image/browser-service checks pass. This checkpoint is local.
The combined cache-append revision `3244c7c5f5ffa65674b0eb09513fba0f797939fd`
is still validating and predates this identifier return.

Separately, GitHub run 38116210143 completed both build and deployment for main
revision `287b49d53bd08ad08998334ea0308e680a8a3117` (PR 246). That deployment
contains prototype fixes and does not prove engine startup or campaign
completion. Complete startup and the finishable browser campaign remain
unfinished.

## Local continuation — 11 October 2026: original scoped-name return

The scoped caller removes the identifier arguments and assigns its returned
name through the original value assignment. It tests the actual known flag
nibble, retains the original `::` literal, reads the second `@` from the original
RTTI bytes, advances the actual cursor to offset 22 and restores its physical
frame. The class parser receives the real scoped-name return and calls its
value append at `30697906`, after 6,520 admitted operations. Its class-prefix
and name operands remain live; concatenation has not been fabricated.

The package adds the 38-instruction append body, hash
`ad2472d219743788dec4e13650a0adec9101873ea40468a3bdd44dc446aa2e95`,
and the three-byte original scope separator at `3088feb4`. The separator is
owned and protected by the readonly image checks. There are now 80 Engine
bodies and 3,452 instructions. Independent JSON/TypeScript regeneration matches
byte-for-byte. Typechecking, seven focused runtime checks and 42 source/image/
browser-service checks pass. Assertions retain the original restored ESI
`0xfffff000` and only claim the known copied flag nibble.

This checkpoint is local. The earlier combined cache revision continues its
full validation separately. Prefix concatenation, complete engine startup and
the finishable browser campaign remain unfinished.

## Local continuation — 11 October 2026: value-append operand checks

The original append retains its two actual stack operands, validates the
constructed name and class-prefix nodes through the captured nonempty
predicate, and loads the class node for the original node-to-list call.
Execution stops at `3069731d` after 6,562 admitted operations. Both predicate
calls returned through their physical callers. The pending append and
node-to-list calls retain live arena ownership and held parser locks.

Typechecking, seven focused engine checks and six browser-service checks pass.
The next source dependencies were independently captured from the pinned DLL:
node-to-list (31 instructions), list append (18) and list constructor (16).
Those research captures do not prove execution. This checkpoint is local;
joining the text nodes, complete startup and the finishable campaign remain
unfinished. The combined cache-append revision continues validating separately.

## Local continuation — 11 October 2026: original text-node list wrapper

The class node now enters the original node-to-list routine. Its 12-byte list
request consumes 16 arena bytes after alignment, followed by the actual eight-
byte value request. The value at offset 3,956 retains the existing class text
node and its original masked flags. The original constructor initializes the
list at offset 3,964, stores its captured vtable, zero field and live value
pointer, then restores the real caller. Execution stops at `30697944` after
6,652 admitted operations; remaining arena capacity is 3,952 bytes.

The source adds node-to-list (31 instructions), list append (18), list
constructor (16), and the original 12-byte list vtable at `3089f29c`. There
are now 83 Engine bodies and 3,517 instructions. Independent JSON/TypeScript
regeneration matches byte-for-byte. Typechecking, seven focused engine checks,
one constructor-interruption check and all 44 source/image/browser checks pass.
The interrupted first constructor store retains both actual allocations, the
initialized value, held locks and pending calls. No successful return is
fabricated. One expected entry encoding in the source test was corrected
against the original captured MOV instruction before the passing rerun.

This checkpoint is local. Publishing the list in its parsed value and appending
the name node remain unfinished, as do full startup and the finishable browser
campaign. Earlier combined revision 3244c7c5f5ffa65674b0eb09513fba0f797939fd
continues validating independently. PR 247 remains open with its reviewed head
fc7457deae4ab66310a74d600d0496f61685d1ff and active CI; the paginated Actions
audit found its run active, so no duplicate run or merge was performed.

## Local continuation — 11 October 2026: original class-type parser returns

The append publishes its actual list in the class parsed value, passes the
actual name node to the captured list appender, verifies the original NULL tail
and links that node through the list's physical tail field. The append restores
its registers and returns through the real class caller. The class parser
copies the resulting list into its caller's output with the original masked
value constructor, restores its frame, and returns to `3069b52d` after 6,736
admitted operations. The remaining arena capacity stays 3,952 bytes.

Typechecking, eight focused runtime checks, a new interrupted name-link check
and six browser-service checks pass. Interrupting the link leaves the actual
class list published, its tail NULL, allocations live, locks held and the
original append call pending. Earlier constructor and copy interruption checks
remain passing. This checkpoint is local. Basic-type continuation, complete
startup and the finishable campaign remain unfinished.

Separately, PR 247 passed run 38117276412 and was merged into main as
`9adc29dbac2d025c82bae033a9028c7023922238`. Its deployment run 38117866407
is active; deployment success and browser observation are not claimed. The
combined cache-append revision 3244c7c5f5ffa65674b0eb09513fba0f797939fd
continues validation independently and does not cover this class return.

## Local continuation — 11 October 2026: class type returns to name parser

The basic-type caller assigns the actual returned class list, validates it
through the original nonempty predicate, follows the actual V-code qualifier
branches and checks its empty modifier. Its original value copy and frame
restore return to the compound caller after 6,891 admitted operations. The
compound and data-type callers remove their actual arguments and restore their
frames. The outer type parser restores working flags, copies the retained list
to its caller and returns to `3069b044` after 6,971 operations. The class list
and both original text nodes remain live in the retained arena.

Typechecking, nine focused runtime checks and six browser-service checks pass.
All earlier copy, constructor and name-link interruption checks remain passing.
The length and writer targets were read from the captured list vtable and
independently captured from the pinned DLL for the next continuation (six,
six and ten original instructions). Captured methods do not establish runtime
execution. This checkpoint is local; name output construction, complete startup
and the finishable campaign remain unfinished. The older combined cache-append
revision continues full validation separately, and PR 247's main deployment
remains active on the latest observation.


### 2026-10-11: class-name output assignment

The second property's original NameParser now consumes the returned class/type
value, performs both original assignments, checks its live flags and the NUL
at cursor offset 22, and calls StringLength at `3069b0a2`. Execution retains
the pending call at `30697114` after 7,085 admitted source operations. The
length routine and output construction remain pending. Pointer ownership,
unknown upper flag bits, physical return addresses, and both held parser locks
are preserved. The first property's published CString remains unchanged.

The source package now contains 86 Engine bodies and 3,539 instructions. Newly
captured list methods are `3069740c`, `3069741b`, and `3069742a`. Independent
JSON and TypeScript regeneration was byte-identical. Type checking passed;
three focused parser checks passed in 13.58 seconds, and six browser-boundary
checks passed in 30.64 seconds. The preceding wider selection passed 75 checks
and found one scalar-provenance assertion mismatch, corrected before the final
focused pass. These local changes are not deployed, and do not prove complete
engine startup or playable campaign integration.


### 2026-10-11: original class-name length and allocation caller

The retained StringLength follows the actual list head and tail and dispatches
through the protected virtual tables. The list virtual method tail-calls the
original length routine on its arena value; both text nodes return their live
length words. Their actual sum is 14. NameParser adds the terminator, stores 15
in its configuration, aligns the request to 16, and calls its retained allocator.
Execution now stops at `30672ec7` after 7,176 admitted operations, before a
second output allocation or writer return has been produced.

Canonical allocation proofs cover the nested arena receiver and node extents;
physical calls and saved registers are retained. External changes to a stored
class-prefix length stop at `30696ec5` with the virtual caller pending. Three
normal/fidelity checks passed in 13.02 seconds, this interruption check passed
in 8.96 seconds, and six browser startup checks passed in 25.34 seconds.
TypeScript checking passed. These local checks do not prove full engine startup,
world activation, or campaign completion; this continuation is not deployed.


### 2026-10-11: class-name output allocation

The original retained allocation callback returns a separate live 16-byte span
for the second property's undecorated name. NameParser stores that pointer,
preserves the requested length 15 including the terminator, and passes both
physical arguments to its writer at `3069b0ce`. Execution stops at `30697171`
after 7,184 admitted operations. All 16 output bytes remain unknown; writing,
termination, cleanup and second property publication remain pending.

Type checking passed. Three focused checks (including the externally changed
length interruption) passed in 14.73 seconds; six browser startup checks passed
in 27.89 seconds. The new span's actual size, live ownership and writer pointer
identity are checked. The earlier combined validation is still running on its
frozen revision and does not include this allocation continuation. These local
changes remain undeployed; full engine startup and campaign completion are
still unproven.


### 2026-10-11: class-name writer list entry

The original writer prologue retains its actual output and capacity arguments,
checks the nonempty value, enters the live list node, and dispatches its length
method through the protected list vtable. That method tail-calls StringLength
on the actual arena head and returns the six-character class prefix length.
Execution stops at `306971be` after 7,263 source operations; the node writer and
character copying remain pending. The separate 16-byte output is live and all
its bytes remain unknown.

TypeScript checking passed; the normal allocation/dispatch check passed in
9.48 seconds, three fidelity/interruption checks passed in 14.96 seconds, and
six browser startup checks passed in 31.17 seconds. The earlier combined suite
remains active on its frozen revision, which predates these writer changes.
This local continuation is not deployed and does not prove full engine startup
or campaign completion.


### 2026-10-11: original nested list writer

The outer writer's original capacity arithmetic and virtual write dispatch now
enter `3069742a`. This list method loads its live arena head, checks its actual
output/count arguments, and tail-calls the original writer without fabricating
a new return address. The nested writer retains its own stack frame, confirms
the class-prefix value, dispatches the text length, and calls the text writer.
Execution reaches `306973db` after 7,334 admitted operations. The actual
character copy is pending; the live output still has 16 unknown bytes.

Type checking passed. Four focused normal/fidelity/interruption checks passed
in 16.70 seconds, and six browser startup checks passed in 27.37 seconds.
The previous combined suite remains active on an older frozen revision. This
local continuation is not deployed and full startup/world/campaign completion
remains unproven.


### 2026-10-11: original class-prefix character copy

The original text-node writer now passes the actual class character pointer
and six-byte count into its original bounded copy loop. The loop writes
`class `, returns its actual output pointer, and unwinds the original node
writer call. Execution stops at `306971d7` after 7,406 source operations.
Six output bytes are known; the remaining ten bytes, terminator, outer list
continuation, cleanup and second property publication remain pending.

The shared copy helper accepts an explicit owned node span for this six-byte
prefix while keeping the first property's five-byte source span. With an
unknown fourth source byte, execution stops at `30696f47`, retains `cla` and
its three known output bytes, and retains pending copy/node/outer writer calls.
Type checking passed; the normal check passed in 8.74 seconds, four fidelity
and interruption checks in 17.04 seconds, and six browser startup checks in
29.75 seconds. The older combined suite remains running.

PR 248 was externally merged as `1756116e540cb8badabda1407cb4bdbcbb40a8fd`
after CI run `38118841598` succeeded. A repository-wide audit covered 533 runs
over six pages, all recorded attempts and the Pages workflow; its only active
run was deployment `38119510962`. No duplicate merge or run was requested.
The native continuation above remains local and does not prove full startup
or campaign completion.


### 2026-10-11: complete original class-name writer return

The nested prefix writer terminates its six-byte output and returns through
the original list caller. The outer writer follows its actual tail into the
name text node, requests its live eight-character length, and copies from the
owned character span at arena offset 3988 to output offset 6. The original
outer termination overwrites the temporary prefix terminator with the name
and writes the final NUL at offset 14. All fifteen string bytes are known;
the alignment byte at offset 15 remains unknown.

Execution returns through the physical `3069b0ce` call to `3069b0d3` after
7,551 source operations. NameParser's space compaction, cleanup, and second
property publication remain pending. TypeScript checking passed; five focused
normal/fidelity/interruption checks passed in 22.38 seconds and six browser
startup checks passed in 31.28 seconds. The earlier combined suite remains
active on an older frozen revision. This continuation is local and does not
prove complete engine startup or campaign completion.


### 2026-10-11: original class-name parser return

NameParser now traverses its actual output, retains one space between `class`
and `bCString`, skips further adjacent spaces through the captured original
branch, writes its final terminator, and physically returns to `3069b2e3`.
Normal execution has 7,678 source operations. The live fifteen-byte string
remains known; its alignment byte remains unknown. Cleanup, parser lock
release and second-property publication are pending.

A perturbed output containing two spaces compacts to `class bCString` through
the additional original skip instructions (7,681 operations). An unknown byte
after the first space stops at `3069b0e8` while retaining the writer return and
the pending NameParser call. Type checking passed; the normal check passed in
10.14 seconds, six fidelity/interruption checks in 27.48 seconds, and six
browser startup checks in 40.43 seconds. The earlier combined suite remains
active on its older frozen revision. This local continuation is undeployed;
full startup and campaign completion remain unproven.


### 2026-10-11: original second arena-free caller

The retained decoder receives the returned class-name output, stores it in its
actual stack slot and enters the original arena destructor at `30696606`.
The destructor follows its live block head, loads the original chain header,
updates the retained head, and calls its retained free callback. Execution
stops at `30672f8a` after 7,695 source operations, with the physical free
argument and return address `3069661f` still pending. The arena has not yet
been freed; the separate completed name allocation remains live.

Type checking passed; seven focused fidelity/interruption checks passed in
28.36 seconds and six browser startup checks in 29.69 seconds. An additional
free-caller check passed in 10.23 seconds, checking the actual pending call,
return provenance and opaque physical pointer argument. The earlier combined
suite is still active on its frozen revision. PR 248's Pages deployment
`38119510962` completed successfully; these native changes remain local.
Actual arena release, lock release, second-property publication and complete
engine startup/campaign play remain unfinished.


### 2026-10-11: original second arena and lock release

The original arena-free callback verifies the exact owned 4,104-byte base and
frees it. The destructor follows the actual NULL chain terminator, returns
through its physical caller, and the original finally routine releases lock 5.
The EH epilog restores the saved registers and FS state, and returns the live
class-name output to `3067dacb` after 7,722 admitted source operations. The
separate 16-byte output is still live. Outer type-name processing, lock 14
release and second-property publication remain pending.

Arena assertions now use observations captured immediately before the real
release, retaining the actual allocation identity. Native reads through the
freed view are explicitly rejected. An interrupted release retains the live
arena, pending destructor/free calls, held parser lock and completed output.
Type checking passed; eight focused normal/fidelity/interruption checks passed
in 29.43 seconds and six browser startup checks passed in 31.10 seconds. The
earlier combined suite remains active on an older frozen revision. This
continuation is local, not deployed, and full startup/campaign play remains
unproven.


### 2026-10-11: original class-name strlen return

The retained type-name caller now passes the live completed output to the
original aligned DWORD scan. Four actual DWORD loads find the known NUL in
the third byte of the last DWORD; the original third-byte return path computes
14 and returns to `3067dae2` after 7,774 admitted operations. The unknown
alignment byte remains unknown. Type-name trim/cache publication are pending.

The original third/fourth-byte terminator instructions were checked against
the captured bytes. Unknown padding values 0 and 255 both produce length 14;
an unknown terminator stops at `30679b11` with the strlen caller pending. A
perturbed known fourth-byte terminator produces length 15 through the original
fourth-byte return path. Type checking passed; the normal check passed in
10.70 seconds, eight fidelity/interruption checks in 28.32 seconds, six browser
startup checks in 29.95 seconds and the fourth-byte check in 9.06 seconds.

The frozen combined revision `9e02cd54211c44e04cf49b796e107c8e9214bc83`
remains running and has reported a hero-animation action-layer failure. Its
final diagnostic is pending; it is not a successful validation receipt. It
predates the latest native continuations and PR 248. These native changes
remain local and full startup/campaign completion is unproven.


### 2026-10-11: original class type-name cache allocations

The type-name caller retains the measured length, checks its final character
through the original trim path, obtains lock 14 and confirms the live RTTI
cache is empty. Its original callbacks allocate an eight-byte cache node and
a fifteen-byte logical text span, then store the actual text pointer in the
type-info cache field. The original copy call receives that span, its capacity
and the live undecorated source. Execution stops at `3068a84a` after 7,807
source operations. The new text remains wholly unknown and the copy result
for this pending call is unset. The completed source allocation remains live;
the parser arena is freed and lock 5 released.

Type checking passed; the normal check passed in 10.31 seconds, nine fidelity
and interruption checks in 40.24 seconds and six browser startup checks in
31.09 seconds. An interrupted cache allocation retains the original malloc
caller, held cache lock, released arena and live completed source. The combined
validation is still active on frozen revision
`24a7bad8f17523a46b911868ac6ff9b275017ce0`, which predates this continuation.
These changes remain local; copying, cache linking, cleanup, second-property
publication and complete startup/campaign play remain unfinished.

### 2026-10-11: original class type-name cache copy and link

The original bounded copy transfers the fifteen known bytes `class bCString`
plus its terminator from the live parser output into the fifteen-byte logical
cache span and returns zero. The caller stores the actual text pointer in its
new eight-byte node, retains the prior cache head as its next pointer, and links
the node into the original shared root. Execution reaches `30672f8a` after
7,959 source operations with the original temporary-output free call pending.
Lock 14 remains held; the parser arena is freed and lock 5 released. Both the
completed temporary output and cache text remain live at this boundary.

Type checking passed. The normal focused check passed in 12.72 seconds, ten
fidelity and interruption checks in 33.66 seconds, and six browser startup
checks in 29.64 seconds. An unknown ninth source byte stops the original copy
at `3068a888`, preserving the first eight copied bytes and the pending caller.
The combined suite on revision `24a7bad8f17523a46b911868ac6ff9b275017ce0`
predates this continuation and supplies no full-suite evidence for it. This
checkpoint remains local. Temporary-output cleanup, cache-lock release,
second-property publication, complete startup and campaign play remain pending.

### 2026-10-11: original class type-name output cleanup and return

The original free callback validates the actual sixteen-byte temporary output
owner and releases it. The retained finally call releases lock 14, the type-name
wrapper restores the original exception frame and registers, and its physical
returns reach the second property's actual caller at `30076598`. This boundary
follows 7,983 source operations. The cached fifteen-byte text stays live;
its returned pointer retains its allocation identity. The earlier parser arena
is freed and both parser and cache locks are released. The second property's
CString construction and publication have not yet executed.

Type checking passed. The normal check passed in 9.51 seconds, eleven fidelity
and interruption checks in 35.43 seconds, and six browser startup checks in
29.13 seconds. An interrupted output free retains its physical caller and cache
lock with both output and cached text live. The normal path rejects reading
through the freed output's native view. The broader combined validation still
runs at revision `24a7bad8f17523a46b911868ac6ff9b275017ce0`, which predates
this continuation. These changes remain local; complete engine startup and
new-game-to-ending browser play remain unproven.

### 2026-10-11: original second class-name search and CString length

The second property passes its live cache pointer and actual destination to
SharedBase UnMangle. The original DWORD character search finds the space at
cache offset five and physically returns that owned pointer. The matched-name
branch advances it to offset six, preserving the eight-character `bCString`
input. The original CString byte scan measures eight and its allocation caller
requests seventeen bytes, including the original nine-byte header/terminator
allowance. The retained MemoryAdmin singleton returns to the actual caller.
Execution stops at its malloc import `10003cd8` after 8,136 source operations;
this second CString allocation has not executed. The first float CString and
published first property remain retained, and the second property is unpublished.

Type checking passed. The normal check passed in 9.01 seconds. The fidelity
batch passed twelve checks; its new unknown-byte assertion initially expected
a later address and was corrected to the actual unsupported DWORD XOR at
`100a7343`. That corrected check passed separately in 10.69 seconds. Six browser
startup checks passed in 29.61 seconds. Unknown cache bytes remain unknown and
retain the search caller, with no constructor call fabricated. These receipts
cover local changes only. The combined suite still runs on older revision
`24a7bad8f17523a46b911868ac6ff9b275017ce0`; it does not validate this addition.
Second-property construction and publication, full startup, campaign completion
and save/reload through an ending remain unfinished.

### 2026-10-11: original second property CString construction

With the source-audited 17..20-byte MemoryAdmin pool admitted, the actual
seventeen-byte request returns a twenty-byte allocation from that owner.
The original constructor writes length eight and reference count one, stores
its actual text pointer in the second property, writes the terminator and
copies eight bytes from cache offset six. Original physical returns reach
`300765a4` after 8,158 source operations. The second CString contains
`bCString` plus NUL, while the first `float` CString remains live and unchanged.
The two allocations have separate retained fields and the same canonical
MemoryAdmin owner proof. Only the allocator-proven low two pointer bits are
known. Reserved header bytes retain the actual known zeroes of the fresh page.
The second property root and its shutdown registration remain pending.

The base-only standalone owner still stops at the unaudited seventeen-byte
pool, and the browser owner already admits that pool through its NPC extension.
A separate admitted-pool fixture covers completed construction. Type checking
passed. Four fidelity/interruption checks passed in the initial batch; the new
normal construction check needed its expected pointer mask corrected from zero
to the allocator-proven mask three, and then passed in 10.47 seconds. Six browser
startup checks passed in 31.94 seconds. An interrupted terminator store retains
the second constructor's physical caller and initialized header without claiming
completed copying. Full startup and browser play through an ending remain
unproven. This continuation remains local and postdates the passing combined
revision `24a7bad8f17523a46b911868ac6ff9b275017ce0`.

### 2026-10-11: original second property publication

The second CString caller registers its actual shutdown callback `3001c602`
through the original Engine onexit wrapper. Its fourth exit-table entry retains
that source callback after the first float property's callback, and the cursor
advances to offset sixteen. Original lock and exception-frame cleanup returns
reach the property caller, which publishes its actual storage pointer in the
second-property root `30ad9e34`. Its physical initializer
returns resume the original C++ initializer loop. Execution reaches the next
callback `307322d0` after 8,280 source operations. The second CString and first
float CString remain live; lock 8 is released. Shutdown callback execution is
not implied by registration.

Type checking passed. Three focused publication/interruption checks passed in
15.34 seconds and six browser startup checks in 31.40 seconds. Failed lock
acquisition keeps the second root known NULL and retains the physical caller,
completed CString and first three exit-table entries. The unused fourth entry
retains its original known-zero contents. Current combined validation remains
active on frozen revision `80f90a64de485c9778e75db45c9f77e57db8e95a`, which
includes construction but predates this publication continuation. These changes
remain local. The next initializer, full engine startup and browser campaign
completion with persistent saves remain unfinished.

### 2026-10-11: original third visual-animation property dispatch

The reproducible source package now captures the `307322d0` initializer,
`30015bef` thunk and its `300765d0` property body, plus separate root, storage,
flags and the eleven-byte `.H` RTTI image. Captured encodings agree with the
pinned Engine DLL. The package contains 88 Engine bodies and 3,564 body
instructions. Independent regeneration produced byte-identical JSON and
TypeScript (SHA-256 `aef6b166435b363984fc8bb2094507cbbef92be51e230bf453571b915701a969`
and `21628b4e42e249b30734a54f31744b84ebabb8cabd07d5ab48ea04c74050c8b2`).

The third initializer preserves its actual arguments through the original
property and type-name callers. Its original undecoration helpers obtain lock
5, allocate a new owned parser arena, construct the parser and consume type code
H. The original readonly case map selects the int literal branch at `3069b41c`
after 8,836 source operations. That literal branch has not executed. The first
float and second bCString properties remain published with their allocations
and shutdown entries retained; the third property flags are three, its root is
still NULL, and its parser arena is live with lock 5 held.

Type checking passed. Four selected execution/source/image checks passed in
13.17 seconds; all forty source/image checks passed in 7.52 seconds and six
browser startup checks in 29.94 seconds. Unknown third-cache bytes stop at the
original comparison `3067daa8`, retaining the third caller and both published
properties. The combined validation continues on frozen revision
`80f90a64de485c9778e75db45c9f77e57db8e95a`, which predates second-property
publication and this third-property dispatch. These additions remain local.
Third-property completion, full engine startup and playable browser campaign
completion with save/reload remain unfinished.


## 2026-10-11: original third-property int text construction

The original readonly `int\0` literal at `3089f5d0` is now captured and
protected against altered bytes or masks. The third-property basic-type branch
executes its original string constructor, arena allocation and character-copy
instructions. It constructs three characters at arena offset 4012, with a
16-byte text node at 4020 and length three at 4032. Execution now reaches
`3069b601` after 9,015 source operations. The parser arena remains live and
lock 5 remains held; the third property has not yet been published.

TypeScript checking passed. Three focused runtime checks passed in 16.33 seconds,
including interruption at the actual final-character store `30696f4b`, which
retains `in` and an unknown last byte, and an unknown third-cache word. Forty-eight
source, image and browser-startup checks passed across four files in 51.41 seconds.
Independent regeneration produced byte-identical JSON and TypeScript packages
(SHA-256 `12193f572b8a5d99899e89cb453375c7415dd81dfc06ae92f6e9799d0500a696`
and `9b702c814c62ef6e7726e436f2bf0a4f83cfb846f91058ba27bbb8b28cdccc1f`).

The historical published float node remains a separate observation; the checks
inspect the actual third arena captured during its physical character write.
This checkpoint is local. Combined full-suite validation is still running on
`80f90a64de485c9778e75db45c9f77e57db8e95a`, which predates this change.
Full engine startup, campaign completion and campaign save/reload remain unproven.


## 2026-10-11: original int parser returns

The third-property path now executes the original basic-type qualifier tests for
H, which select no extra qualifier, and checks the empty modifier value. The
original parsed-value copies and physical return instructions carry the int node
through basic, compound, data-type and type parsing into name parsing. The
retained parsed value refers to the actual live third arena node at offset 4020;
the original parser call at `3069b2de` remains pending. Execution reaches
`3069b04e` after 9,232 source operations, with lock 5 still held.

TypeScript checking passed. Three focused runtime checks passed in 15.99 seconds,
including verification of the actual int-node provenance and seven returned
call frames. Six browser startup checks passed in 42.92 seconds. The first
browser attempt failed only because two assertions still named the previous
`3069b601` boundary; the corrected assertions retain the unfinished-startup
result and now identify its actual address. The source evidence package is
unchanged from the preceding int-literal checkpoint.

This change remains local. The separate combined validation at
`80f90a64de485c9778e75db45c9f77e57db8e95a` is still live and predates these
third-property steps. The third property's output, cache, CString and root
publication are unfinished. Full engine startup and a complete browser campaign
with save/reload are not established by these component checks.


## 2026-10-11: original int output length and allocation

The original name-parser flag and input-cursor checks now continue after the int
value return. Its parsed value is assigned to the output receiver, measured
through the original readonly text-node vtable, and found to contain three
characters. Original arithmetic retains four bytes including the terminator
and requests an eight-byte aligned output allocation. The output is a separate
canonical Engine allocation, with its actual pointer and capacity retained in
the pending writer arguments. Execution reaches `30697171` after 9,349 source
operations; the text writer has not executed and lock 5 remains held.

TypeScript checking passed. Four focused runtime checks passed in 19.90 seconds,
including an unavailable original output allocator that retains the live int
node and pending `3069b0b4` caller. Six browser startup checks passed in 47.57
seconds. An initial assertion incorrectly expected MemoryAdmin metadata on the
CRT output allocation; it was replaced with checks of its actual physical
extent and canonical allocation ownership. Source evidence remains unchanged.

This checkpoint remains local. The preceding combined revision
`80f90a64de485c9778e75db45c9f77e57db8e95a` has since passed all 3,631 tests in
322 files and its build, but predates third-property work. Full engine startup,
third-property publication and complete browser campaign persistence remain
unfinished.


## 2026-10-11: original int text writer and name-parser return

The original text writer now follows the readonly virtual text-node length and
write targets, copies three actual arena characters into the separately owned
output allocation, and stores the terminator. Its original physical calls and
returns complete. The original output scan and compaction instructions then
consume `int\0` and return from the name parser. Execution reaches `3069b2e3`
after 9,499 source operations. The third arena and output remain live and lock
5 remains held; arena cleanup and third-property publication have not executed.

TypeScript checking passed. Five focused runtime checks passed in 22.69 seconds,
verifying complete output, retained node ownership, returned writer/copy frames,
and interruption at the actual terminator instruction `306971f6`. That failure
retains `int` with an unknown terminator byte and the pending writer caller.
Six browser startup checks passed in 48.02 seconds. Source evidence is unchanged
from the int-literal checkpoint; each executed instruction uses the retained
original instruction record.

This checkpoint is local. Combined validation is live on frozen revision
`6a6de81b6f535c855a9ac8b3c12510b9186d99d5`, which combines deployed PR 250
with native work through int output allocation and predates this writer step.
Full engine startup and browser campaign completion with save/reload remain
unfinished.


## 2026-10-11: original int arena cleanup and caller return

The original undecoration arena destructor now reads its actual block chain,
invokes the retained Engine free callback, and releases the third arena. Its
finally handler unlocks lock 5 and the original EH epilog restores the caller's
register and stack state. The owned `int\0` output remains live. Execution
reaches the type-name caller at `3067dad1` after 9,545 source operations.
The freed node is retained only as provenance and pre-release word observations;
normal execution does not read its freed allocation.

TypeScript checking passed. Three focused checks passed in 16.23 seconds,
including a failed arena release (live arena, held lock) and failed unlock
(freed arena, held lock). Both preserve the pending original caller and live
output. Six browser startup checks passed in 48.32 seconds. Source evidence is
unchanged. The next original strlen path must handle the terminator in the
fourth byte of the `int\0` DWORD before cache construction can continue.

This checkpoint remains local. The combined suite is still live on
`6a6de81b6f535c855a9ac8b3c12510b9186d99d5`, which predates the text writer
and cleanup stages. Third-property publication, full engine startup and a
complete browser campaign with save/reload remain unfinished.


## 2026-10-11: original int DWORD string-length scan

The type-name caller now executes the original aligned DWORD scan on its live
`int\0` output. The original byte tests reach the fourth-byte terminator and
return through `30679b33`, `30679b36`, `30679b3a` and `30679b3c`. The resulting
length is three, computed from pointers into the same canonical allocation.
Execution reaches `3067dae2` after 9,573 source operations. Lock 5 is released,
the parser arena is freed and the output remains live; the cache is unfinished.

TypeScript checking passed. Four selected runtime checks passed in 18.36 seconds.
An unknown output terminator byte stops at the original DWORD predicate
`30679b11`, retaining its pending scan caller and live output after cleanup.
Six browser startup checks passed in 47.92 seconds. The retained original source
package already contains these instructions and remains unchanged.

This checkpoint remains local. Combined validation is still live on frozen
`6a6de81b6f535c855a9ac8b3c12510b9186d99d5`, which predates the writer,
cleanup and scan steps. Third-property publication, full engine startup and a
complete browser campaign with save/reload remain unfinished.


## 2026-10-11: original int cache construction and linkage

The original type-name caller now checks its final character, obtains lock 14,
rechecks the third RTTI cache word, and requests a fresh eight-byte cache node
and four-byte cache text. Original character-copy instructions write `int\0`,
return zero and publish the actual cache-text pointer in the third type info.
The original list stores link this node to the previous cache head and publish
it as the new head. Execution reaches `3067db62` after 9,668 source operations.
Lock 14 remains held and the temporary output remains live. The parser arena
has already been freed; third-property CString construction remains unfinished.

TypeScript checking passed. Four focused checks passed in 17.24 seconds,
verifying text bytes/masks, actual node/text relationships, and the live prior
cache node. Unavailable node or text allocation retains its physical caller;
an interrupted final-character store at `3068a88a` retains `in`, unknown
remaining bytes, the pending copy caller and held cache lock. Six browser
startup checks passed in 43.51 seconds. Source evidence is unchanged.

This checkpoint remains local. Combined validation remains live on frozen
`6a6de81b6f535c855a9ac8b3c12510b9186d99d5`, predating writer, cleanup, scan
and cache stages. Third-property publication, full engine startup and complete
browser campaign save/reload remain unfinished.


## 2026-10-11: original int cache cleanup and constructor return

The original type-name caller releases its actual eight-byte temporary output,
runs the cache finally handler to unlock lock 14, reloads the third RTTI cache
pointer and restores its physical EH frame. The original wrapper then returns
the live cache-text pointer to the third property constructor at `30076608`.
Execution has performed 9,694 source operations. The parser arena and temporary
output are freed, both locks are released and the cache node/text remain live.
The third property's separate CString and root have not yet been constructed.

TypeScript checking passed. Three focused checks passed in 20.23 seconds.
A failed output release stops at `30672f8a` with output and cache lock retained;
a failed cache unlock stops at `3067db85` with output freed and lock retained.
Both preserve the actual live cache and pending constructor caller. Six browser
startup checks passed in 48.73 seconds. Source evidence is unchanged.

This checkpoint is local. Combined validation is still live on frozen revision
`6a6de81b6f535c855a9ac8b3c12510b9186d99d5`, which predates the writer and
subsequent int stages. Third-property publication, full engine startup and
complete browser campaign persistence remain unfinished.


## 2026-10-11: original int SharedBase name search

The third constructor now preserves the actual cached name and destination
arguments across the original SharedBase UnMangle import. Its original literal
search and scalar DWORD character search inspect `int\0`, find no space, detect
the terminator through the original high-byte predicate, restore the physical
search frame and return NULL. Execution reaches `10091560` after 9,757 source
operations. The outer UnMangle call is pending; the third CString is not yet
constructed. The cache remains live and the prior locks remain released.

TypeScript checking passed. Two focused runtime checks passed in 13.18 seconds.
The normal search returns NULL with its physical caller returned. An unknown
cache character stops at `100a7343`, retaining both search and UnMangle callers
and the live cache. Six browser startup checks passed in 48.47 seconds. Every
executed search instruction is checked against the existing retained original
SharedBase instruction records; the source package is unchanged.

This checkpoint is local. Combined validation remains live on frozen
`6a6de81b6f535c855a9ac8b3c12510b9186d99d5`, predating the writer and later
int stages. Third-property CString construction/publication, full engine startup
and complete browser campaign persistence remain unfinished.


## 2026-10-11: original third-property CString construction

The plain-name UnMangle branch now executes the original CString constructor,
measures the actual cache text, requests twelve bytes from the retained
MemoryAdmin owner, writes length three and reference count one, and stores the
character pointer in third-property storage. It writes the original terminator,
copies three actual cache characters through the existing memcpy contract and
returns to `30076614` after 9,831 source operations. Its separate
`typeNameThirdCString` observation preserves both earlier CString allocations.
The SharedBase physical-memory check admits that observation only with the
same exact live canonical owner, allocation, buffers and DataView checks.

TypeScript checking passed. Three focused checks passed in 16.64 seconds,
verifying the actual twelve-byte allocation/header, `int\0` bytes/masks and
returned UnMangle call. An unavailable allocation stops at `10003cd8`; an
interrupted terminator store stops at `10013271`. Both preserve prior CStrings
and the pending third constructor. Six browser startup checks passed in 46.15
seconds. Source evidence is unchanged.

This checkpoint is local. Shutdown registration and third root publication
remain unfinished. Combined validation is still live on frozen revision
`6a6de81b6f535c855a9ac8b3c12510b9186d99d5`, predating the writer and later
int stages. Full engine startup and complete browser campaign persistence
remain unfinished.


## 2026-10-11: original third-property shutdown registration and root publication

The third int property's original constructor registers shutdown callback
`3002f56d`, restores the exit-registration caller, and returns its actual storage
pointer. The original initializer writes that pointer into the third root and
returns to the C++ loop. The retained exit cursor advances to offset twenty and
the initializer cursor to offset `0x110`. Execution now reaches the next pending
initializer `307322e0` after 9,953 source operations. The first three property
roots, CStrings and shutdown entries are retained; this is not full startup.

TypeScript checking passed. Two focused runtime checks passed in 11.55 seconds,
verifying original root provenance, fifth shutdown entry and returned calls.
An unavailable exit lock stops at `3067cfea`, preserving the third CString and
pending shutdown/initializer callers while leaving its root NULL. Six browser
startup checks passed in 41.95 seconds. All executed instructions were already
present in the retained source package, which is unchanged.

This checkpoint remains local. Combined validation is still live on frozen
`6a6de81b6f535c855a9ac8b3c12510b9186d99d5`, predating the writer and later
int stages. Full engine startup, world activation and a browser campaign through
an ending with working save/reload remain unfinished.


## 2026-10-11: original camera object initializer prefix

The source package now captures initializer `307322e0`, thunk `3000d9f9` and
body `300766d0`, plus its distinct flags, root, storage and 27-byte RTTI at
`30aa2a1c` (`.?AVeCCameraBase@@`). The original prefix preserves the default
and RTTI arguments, checks the empty cache, enters undecoration and obtains
lock 5. Execution stops at the pending parser constructor `3069747a` after
10,059 source operations. All three preceding properties remain published;
the camera root has not been published.

TypeScript checking passed. Two focused runtime checks passed in 13.97 seconds.
An unknown camera-cache word stops at `3067daa8`, retaining the camera caller
and the preceding published int property. Fifty source, image and browser
startup checks passed across four files in 46.28 seconds. Independent source
regeneration produced byte-identical JSON and TypeScript packages (SHA-256
`74162b01e1aa1ba8bc18d1a3d64b54c5d931497bcae89d738a9846cb707071b6` and
`33f95590ccd7a50e731b27a3d9d66c538f3af70fb10aaa766db7cc33c93fb979`).
A reused-call assertion was corrected to distinguish the prior returned
undecoration caller from the new pending camera caller.

The earlier frozen combined revision `6a6de81b6f535c855a9ac8b3c12510b9186d99d5`
has completed: all 3,642 tests in 323 files and its production build passed.
It predates the writer and later int/camera steps. These additions remain local.
Full engine startup and complete browser campaign persistence remain unfinished.


### 2026-10-11 — original camera property parser construction (local)

The fourth property initializer now follows the original cold parser arena request,
allocation, field construction and constructor return, then the NameParser,
TypeParser and DataType dispatch for the retained `.?AVeCCameraBase@@` RTTI.
The retained startup reaches `3069b8e0` after 10,462 operations. This is the
original decorated class branch; class-name parsing and camera publication
remain pending. The first three published property roots, live CStrings and
five shutdown registrations remain intact. The new parser has its own live
arena and zero initial output length; prior freed parser observations are not
used as live memory.

Validation: TypeScript checking passed; six selected runtime/startup checks
passed, including unavailable camera arena allocation retaining the caller and
lock at `30672ec7`; all six browser startup prerequisite checks in two files
passed. The independently generated original instruction package is unchanged.
This checkpoint is local and does not establish complete engine startup,
deployment, or a campaign playable through an ending.


### 2026-10-11 — camera decorated qualifier return (local)

Executed the original decorated qualifier decoder for the actual camera RTTI,
including stack temporaries, empty-value copies/checks, physical decoder return,
and compound/basic parser entry. The qualifier byte is `A`, the class code is
`V`, and the retained cursor advances to offset 12, the first character of
`eCCameraBase`. Startup now stops at `3069b43a` after 10,916 operations;
class-name construction and fourth property publication remain pending.
Prior published roots and shutdown entries remain intact. No class string or
camera root is synthesized at this boundary.

Validation: TypeScript checking passed; four focused runtime checks passed,
including an unknown qualifier byte stopping exactly at `3069aadf` with the
original decoder call pending and lock held. All six browser startup checks
in two files passed. Original instruction/source packages are unchanged.
This local checkpoint has not been deployed and is not complete engine startup
or proof of a campaign playable through its ending.


### 2026-10-11 — camera class keyword and identifier caller (local)

The original basic-type `V` branch now enters the class parser, constructs the
`class ` literal through its arena allocator and character copy, assigns the
parsed value, and enters the scoped identifier caller. The next unsupported
operation is `30699300`, after 11,237 retained startup operations. The actual
camera arena contains six known keyword bytes at 4012 and length six at 4032.
The identifier `eCCameraBase` itself, parser return and camera publication are
still pending. Historical int text-node snapshot fields remain historical;
the checks capture the distinct camera arena from its actual writes.

Validation: TypeScript checking passed; four focused runtime checks passed,
including unknown qualifier and unavailable cold arena cases. Six browser
startup checks passed across two files. Original source packages are unchanged.
This checkpoint is local, not deployed, and does not prove complete startup or
campaign completion with persistence.
