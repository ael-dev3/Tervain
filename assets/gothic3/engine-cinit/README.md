# Engine CRT initializer evidence

This package records the next dependency after Engine environment-vector return.
It captures 66 original bodies (2422 instructions), the caller at `30677284`,
the floating-point callback at `30892ac0`, and two original initializer tables.
The C initializer table has 200 slots with 6 nonzero entries. The C++ table has
93,705 slots with 1,963 nonzero entries; omitted entries are verified zero.

Generate from the matching offline study:

```powershell
python tools/gothic3/prepare_engine_cinit_source.py --study '<study-root>' --output assets/gothic3/engine-cinit/research.json
```

The generator checks the original Engine.dll hash and exact caller bytes.
Independent regeneration produced identical JSON, SHA-256
``b5f17695031d703eb3b3e5b3d36621e168bc36d71c2d5001d9e8a48f0f19f051``.

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
