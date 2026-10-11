# Engine CRT initializer evidence

This package records the next dependency after Engine environment-vector return.
It captures 78 original bodies (3410 instructions), the caller at `30677284`,
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

## Original parser arena cleanup — 11 October 2026

The selected continuation executes the original HeapManager destructor and its
stored CRT free callback. It loads the next block before freeing the original
4,104-byte arena, then returns at `3069b2f0` after 3,989 admitted operations.
The separate eight-byte output remains live with five characters, a NUL, and
two unknown padding bytes. Text-node snapshots retain historical records after
release and expose `undecorationTextNodeLive: false`; they do not read freed
fields. Lock 5 remains held. The original finally helper, lock release, outer
return, type-name cache publication and complete startup remain unfinished.

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

## Original type-name length caller

The original caller removes its six undecoration arguments, retains the returned
owned output in its local, compares it with NULL and passes it to the original
`30679ad0` strlen. The pending call is reached after 4,015 admitted operations.
The optimized scan now executes through its actual return, as recorded below. Cache publication, startup and
a complete playable campaign remain unfinished.

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

## Local cache-list continuation — 11 October 2026

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

## Local temporary-output cleanup — 11 October 2026

The normal cold-cache path pushes its actual temporary output at `3067db62`
and calls the retained Engine free owner. After release, the recovered caller
sets its original exception state and invokes the lock-14 finally helper.
Execution reaches `3067db77` after 4,163 admitted operations with the output
freed, the cache node and text live, and lock 14 released. Interrupted free or
unlock retains the actual pending call and the appropriate resource state.
The previously supported NULL-allocation branches retain their earlier boundary.
Typechecking and eighteen selected regression checks pass. This is local work;
full startup and campaign completion remain unfinished.

## Local type-name wrapper return — 11 October 2026

The original type-name routine reloads its live cached text, runs the actual
EH epilog and returns through `306713ae` to property construction at `30076678`.
The returned EAX retains the same Engine-owned six-byte cache allocation.
The temporary output is freed and lock 14 is released. Normal execution has
4,180 admitted operations. A dedicated return/ownership check passes; combined
validation of this newer continuation is still pending. Full startup and a
finishable browser campaign remain unfinished.

## Local SharedBase UnMangle caller — 11 October 2026

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

## Local SharedBase space-search dispatch — 11 October 2026

The retained call executes the original UnMangle thunk, saves ESI, loads the
actual Engine-owned input and passes the original two-byte space literal to
SharedBase strstr. The literal's known terminating NUL selects the one-character
path, restores strstr's saved registers and tail-jumps to `100a7306` with AL=32.
The 23 SharedBase instructions are traced separately; total admitted operations
are 4,206. The search and UnMangle calls remain pending, the cache stays live,
and the temporary output stays freed. No CString construction result is supplied.
Typechecking and a dedicated dispatch/ownership/lifetime check pass. Full
integration validation of this continuation remains pending.

## Local aligned character-search DWORD — 11 October 2026

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
