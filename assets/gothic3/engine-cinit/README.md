# Engine CRT initializer evidence

This package records the next dependency after Engine environment-vector return.
It captures 54 original bodies (2091 instructions), the caller at `30677284`,
the floating-point callback at `30892ac0`, and two original initializer tables.
The C initializer table has 200 slots with 6 nonzero entries. The C++ table has
93,705 slots with 1,963 nonzero entries; omitted entries are verified zero.

Generate from the matching offline study:

```powershell
python tools/gothic3/prepare_engine_cinit_source.py --study '<study-root>' --output assets/gothic3/engine-cinit/research.json
```

The generator checks the original Engine.dll hash and exact caller bytes.
Independent regeneration produced identical JSON, SHA-256
``11da4b149f92582ce554297c5c15723b06820a65779d21e32122fcb694ddd3a6``.

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
