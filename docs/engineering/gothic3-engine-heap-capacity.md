# Engine heap capacity needed by SharedBase string search

## Observed dependency â€” 11 October 2026

Engine type-name allocation requests six bytes for `float` plus NUL.
The current Engine CRT returns an exact six-byte backing. SharedBase UnMangle
calls strstr with the space literal; its one-character path tail-jumps into
strchr. The selected aligned loop loads the first four bytes, then attempts
another DWORD at offset four (`100a7338`). Current ownership checks correctly
reject that second span. This is a virtual platform dependency, not a missing
string terminator or an unfinished copy.

The original pinned source and TypeScript runtime establish the following:

- Engine DLL hash: `d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3`.
- SharedBase DLL hash: `5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214`.
- Engine malloc passes the original request to HeapAlloc on the selected NT path.
- SharedBase performs a complete DWORD load before evaluating its zero predicate.
- Win32 heap alignment is retained separately from allocation extent.
- The existing fresh Game heap policy already has separate private logical and
  physical views. Engine currently has no corresponding rounded-capacity policy.

## Platform contract

[Microsoft HeapAlloc documentation](https://learn.microsoft.com/en-us/windows/win32/api/heapapi/nf-heapapi-heapalloc)
allows at least the requested size and documents eight-byte alignment on x86.
It does not guarantee an eight-byte capacity for every six-byte request.
A browser allocator may explicitly choose larger physical allocations, but that
choice must be recorded as a fresh virtual platform policy. It cannot be
presented as a captured memory observation of the original game.

## Implementation requirements

1. Select physical allocation layout explicitly when constructing a fresh
   browser platform. Keep the request size in the private allocation receipt.
2. Bind the physical allocation to the actual retained Engine CRT and its heap.
   Another module or an arbitrary caller-shaped heap must not grant access.
3. Provide a six-byte logical view for this request and a separately admitted
   physical view if the selected policy allocates eight bytes. Preserve common
   backing identity, pointer geometry, mutation and lifetime across the views.
4. Keep the two physical padding bytes uninitialized with unknown masks. Do not
   copy host observations, reseed padding or turn unknown bytes into known zeros.
5. Admit the original DWORD through the physical view only after proving current
   owner, heap, allocation membership, view identity and live extent.
6. Evaluate the original masked predicates conservatively. Known NUL before any
   candidate space may establish a return only where the actual instruction
   expression supports that conclusion. Preserve ambiguous branches as pending.
7. Free once through the canonical owning heap; both views must become unusable.
   Pointer numerical bits remain unknown even when alignment is proved.
8. Retain exact-capacity behavior for platforms without the new selection.

## Required validation before integration

Cover exact logical length, physical padding masks, same-backing identity,
cross-owner and forged-view rejection, interrupted calls, release invalidating
both aliases, and byte-identical source regeneration. Exercise padding values
zero and 255 while retaining their unknown masks. Verify the original search
return, caller cleanup, CString construction and exit registration separately.
Run combined startup checks and the full suite on the integrated revision.
Finally inspect the browser route; allocator and startup tests alone do not
establish campaign completion.

## State

This document records the next implementation contract. The physical-span bridge
is not implemented. The current source continuation stops at `100a7338` after
4,234 operations; no CString return or completed initializer is fabricated.

### Owner admission implemented locally

The private constructor registry now resolves an Engine owner from its actual
identity on the same platform. Heap creation retains that Engine owner separately
from any Game owner. Forged identities and cross-platform use are rejected.
Two focused owner-admission checks and typechecking pass. This supplies ownership
for the bridge; rounded Engine allocation views and search continuation are still
unfinished. No allocation layout or public deployment is changed by this step.

### Explicit physical layout implemented locally

A fresh platform may select `engineHeapLayout: 'rounded-eight'`. Only an actual
constructed Engine owner can obtain this layout on its retained heap. Private
allocation receipts preserve requested size and physical capacity separately,
with immutable logical/physical views over the same live backing. Padding masks
remain unknown. Omitted selection retains exact capacity. The capacity accessor
checks the owner, platform, heap, membership, view geometry and release state.
Five focused checks pass, including padding, shared mutation, forged backing,
wrong owner/platform and invalidation after release. Typechecking passes.
The browser profile and startup caller have not yet adopted these aliases;
SharedBase search integration and campaign completion remain unfinished.

### Type-name logical-view integration implemented locally

The original type-name malloc continuation now uses the privately admitted
logical view when Engine rounding is explicitly selected. It verifies the
original request size, retains the owning backing and publishes the six-byte
cache pointer. A focused startup check reaches the actual character-search
boundary with an eight-byte physical backing and two unknown padding bytes.
Exact-capacity startup remains supported without the layout selection. The
original search still reads through its logical view; physical tail admission
and browser profile adoption remain unfinished.

### Physical-tail search and browser adoption implemented locally

The original second DWORD load now admits the privately retained physical alias
only for the selected Engine layout. The existing source-backed scalar search
contract resolves its masked-padding alternatives to the original NULL-return
path. Its internal operations are excluded from admitted source-row counts.
Original register restores, RET, caller cleanup and UnMangle instructions then
reach the CString constructor at `10003ba7` after 4,247 admitted operations.
The search call has returned; UnMangle and CString construction remain pending.

Tests with padding raw bits zero and 255 both pass while padding masks remain
unknown. The fresh browser profile explicitly selects Engine rounding alongside
its environment heap selection. Three focused browser/logical-view integration
checks and typechecking pass. Platforms without layout selection retain their
pending exact-capacity tail boundary. Combined validation of this newer revision
and complete campaign play remain unfinished.

### CString text length implemented locally

The original CString text constructor receives the actual Engine-owned cache
and static property destination. Its scalar loop reads six known bytes,
including NUL, and computes length five from same-allocation pointer offsets.
The original caller passes five to `10007d65`; allocation and subsequent copy
remain pending. Normal selected-layout execution has 4,288 admitted operations.
The destination slot remains untouched. Typechecking and a focused source-loop,
length, ownership and pending-allocation check pass. The next dependency is the
SharedBase allocator's actual MemoryAdmin ownership and construction path.

### Regression observation repairs

Combined validation of the earlier UnMangle revision passed 211 checks and
failed 17. Failures included completed-call assertions left pending, stack
observations using the pre-return depth, and an arena-free probe accidentally
reading freed arena fields during the later temporary-output free. The probe
now captures its arena fields once. Historical allocation-argument checks
capture ESI at the actual malloc call; later string search legitimately changes
that register. Default exact-capacity startup now reports the pending source
boundary through the normal continuation result.

Fifteen affected Engine checks pass in targeted reruns (eight initial fixes,
five follow-up fixes and two startup-reason checks), and typechecking passes.
The browser boundary checks passed separately when the layout was adopted;
a fresh combined run of the latest revision remains required. These receipts
do not claim a new full-suite pass or deployment.

### CString allocation caller and retained MemoryAdmin â€” 11 October 2026

The original allocation thunk and caller execute ten more captured rows. They
preserve the destination, derive the 14-byte request from length five and call
MemoryAdmin through `10013257 -> 10002aae`. A missing or ambiguous platform owner
keeps that call pending at 4,298 admitted operations. No replacement owner or
shutdown registration is created.

With the existing unique owner, its source-backed GetInstance contract returns
the same MemoryAdmin and registers its original shutdown once. Its internal
operations are excluded from admitted source-row counts. The original caller
sets ECX to that owner and calls `1001325e -> 10003cd8` (MemoryAdmin Malloc).
The browser profile reaches this allocation boundary after 4,300 operations.
No CString header, character allocation or destination pointer is published yet.

Typechecking passes. Eight selected layout, length and owner checks pass, as do
two browser integration checks and a getter-failure/replay check. The earlier
combined revision passed all 233 focused checks; its full suite is still running.
This continuation is local. Allocation return, CString copying, complete startup
and a campaign playable through an ending remain unfinished.

### CString allocation and header stores â€” 11 October 2026

The retained `1001325e -> 10003cd8` call now uses the same MemoryAdmin's
source-backed Malloc contract with the actual 14-byte argument and receiver.
Its admitted 16-byte pool returns a distinct live allocation. A read-only owner
proof checks membership, platform, lifetime and backing geometry; a copied
allocation, another owner and freed backing are rejected. Internal allocator
operations are excluded from admitted source-row counts.

The eight original CString allocator rows write length five and reference count
one, advance the character pointer by eight, publish that pointer in the actual
property destination, write its NUL at offset 13 and return with four-byte
argument cleanup. Five original constructor rows load that pointer and prepare
the source, destination and five-byte count for memcpy. Execution stops at
`100a7a00` after 4,313 source operations. The character copy remains pending.

Typechecking and six focused ownership/runtime/browser checks pass. A NULL
allocation stops at the original pending call; interrupting the terminator store
retains the published header and destination at `10013271` after 4,305 operations.
Neither failure replays. Replacing a deep backing-object comparison with an
identity assertion reduced the allocation test body from about 33 seconds to
about four; the standard timeout is retained. This checkpoint is local, and the
earlier combined full suite is still running. Complete startup and a finishable
browser campaign remain unfinished.

### CString text copy and original return â€” 11 October 2026

The evidence generator now captures memcpy `100a7a00` against the matching
SharedBase DLL, bringing the separate SharedBase package to eight bodies. The
retained constructor passes its real character pointer at offset eight, the
live Engine cache and length five. Its existing source-backed scalar memcpy
contract proves the disjoint allocation spans, copies a DWORD and a byte, and
retains their masks. Internal copy operations are excluded from source counts.

The original constructor removes its three memcpy arguments, restores registers
and returns with four-byte cleanup. UnMangle then returns with eight-byte
cleanup into the property initializer. Execution reaches `30076684` after
4,322 admitted source operations; property shutdown registration is pending.
The successful CString has length five, refcount one and `float` plus NUL in
the actual SharedBase pool backing. Its property destination retains the same
character-pointer capability.

Typechecking and eleven distinct focused checks pass (ten in the combined
source/browser/failure run and the normal allocation/copy check separately).
Independent evidence JSON and generated TypeScript are byte-identical. An
interrupted final byte store retains the completed DWORD and pending memcpy
return at 4,313 operations. An unknown final source byte is copied with an
unknown mask, and reading it as known text is rejected. These are local receipts;
complete startup, deployment of this continuation and a playable campaign
through an ending remain unfinished.

### Property shutdown registration and first callback return â€” 11 October 2026

The original property caller pushes callback `30011a40` and calls the existing
Engine exit-registration routine. Its retained EH4 frame, lock eight, pointer
decoding, within-capacity store, encoded cursor update, unlock and cleanup execute
against the same 24-byte exit table already holding two callbacks. The third
slot retains the actual property shutdown callback; registration does not invoke
its destructor. Original property and initializer-wrapper rows then publish the
returned type storage into `30ad9e38` and return to the C++ walker at `3067d229`
after 4,437 admitted operations. The next walker advance remains pending.

Typechecking and five focused normal, masked-byte, browser and lock-failure
checks pass. Failure to acquire the third registration's lock retains the
completed CString and pending lock call without adding its exit slot or replaying.
The earlier combined revision passed 233 focused checks, all 3,542 tests across
318 files, and a production build. Those full-suite/build receipts precede the
MemoryAdmin, CString allocation/copy and property-registration continuations.
A new combined validation with current main is required. Complete startup and
a campaign playable through an ending remain unfinished.

### Second C++ property initializer â€” 11 October 2026

The original walker advances to slot `307bb108` and calls its captured target
`307322c0`. That wrapper calls `30016fea -> 30076560`; its original RTTI at
`30aa29e0` names `.?AVbCString@@`. Separate flags, root, storage and type-info
images preserve that initializer's actual ownership. Fourteen captured prefix
rows initialize its fresh guard/default fields and pass the original shared
cache root plus this second type-info object to `30076593 -> 306713ae`.
Execution stops at that pending type-name call after 4,460 admitted operations.
The first property remains published and its callback remains in exit slot three.

Five distinct runtime/browser checks and all 23 source/image checks pass, with
typechecking and byte-identical independent regeneration. An unknown second
root guard stops at `30076567` after 4,448 operations, retaining the completed
first callback and unknown mask. Tests observe the first property's published
root separately from current EAX, which the walker and second prefix legitimately
replace. The preceding combined first-property revision passed all 243 startup
checks and has entered full-suite validation. This newer second-property
continuation is local and is not included in that frozen validation checkout.
Second type-name construction, complete startup and a playable campaign through
an ending remain unfinished.

### Shared type-name prefix and bCString decoder caller â€” 11 October 2026

The original wrapper, type-name EH4 prolog, cache test and undecoration argument
setup now share one instruction continuation for both property types. The first
float path keeps its existing behavior. The second call uses its retained
bCString type-info object and its own pending caller. Its six original arguments
include the name pointer at offset nine, allocator `30672ec7`, free callback
`30672f8a`, NULL output/length and flags `0x2800`. Execution reaches
`3067dac6 -> 3069b26b` after 4,499 admitted operations. No second decoded name
or allocation is supplied.

Typechecking and ten distinct runtime/browser/regression checks pass. Making
the second cache field unknown stops its original comparison at `3067daa8`
after 4,489 operations, retaining the actual second EH4 frame, first completed
CString and first property shutdown slot. The unknown mask is not repaired.
The preceding first-property combined revision's full suite is still running;
this newer shared-prefix continuation remains local. Decoder execution, complete
startup and a playable campaign through an ending remain unfinished.

### Reused decoder entry and retained second parser call â€” 11 October 2026

The matching decoder entry, 132-byte EH4 prolog, ensure/lock calls and original
global/argument setup now share one continuation for both property calls. The
second call acquires the same retained lock five, installs its actual allocator
and free callbacks, clears the three original arena globals, and passes its
bCString name arguments to parser construction. Execution stops at
`3069b2d3 -> 3069747a` after 4,550 admitted operations. Lock five remains held;
no second parser object, arena allocation or decoded name is supplied.

Typechecking and nine distinct focused runtime/browser/regression checks pass.
Failure of the second lock acquisition retains its real EH4 frame and pending
call at `3069b295` after 4,533 operations, with the first CString and shutdown
slot still present and no replay. The earlier combined first-property revision's
full suite remains running. This newer decoder-prefix continuation is local;
second parser execution, complete startup and a playable campaign through an
ending remain unfinished.

### Shared parser construction and second arena request â€” 11 October 2026

Both property calls now execute the same original parser-constructor and first
field-constructor prefix. The second call retains its actual stack receiver,
sets the known low field-kind bits to three while preserving the upper bits,
and pushes the original arena arguments: 16 bytes and zero. Execution reaches
`3069707d -> 30696bf0` after 4,578 admitted operations. The arena call remains
pending and lock five remains held; no second allocation or decoded name is
supplied.

Typechecking passes. Four focused runtime/browser checks pass, followed by
three focused regression checks that also inspect the pending arena arguments
and field flags. The earlier combined first-property validation is still running
and does not include this continuation. Full startup, deployment of this local
continuation and campaign play through an ending remain unfinished.

### Shared cold arena request and allocator callback â€” 11 October 2026

The second parser now executes the same source-backed cold arena prefix as the
first. Its 16-byte field request selects a 4,096-byte payload, recursively requests
4,100 bytes including the header, and aligns the allocator argument to 4,104.
The actual callback `30696c06 -> 30672ec7` remains pending after 4,609 admitted
operations. Lock five remains held, and the saved parser field still has known
kind-three bits. No second backing allocation is supplied.

Typechecking and three focused runtime/browser checks pass. An initial test
incorrectly expected ESI to retain the field after the arena changed it to the
global owner; the repaired check reads the original field in its retained stack
frame and inspects the actual allocator call argument. The earlier combined
validation remains live and does not contain this change. Complete startup,
publishing this continuation and campaign play remain unfinished.

### Shared arena allocation and second field return â€” 11 October 2026

The second property now invokes the retained Engine allocator for 4,104 bytes,
checks canonical heap ownership, executes the original recursive return, writes
the arena header, publishes the head/tail and remaining capacity, and returns
the 16-byte field destination at offset 4,084. Execution reaches `30697082`
after 4,635 admitted operations. Field-node construction remains pending and
lock five stays held. Allocation failure retains the existing `30696c3d`
boundary instead of supplying storage.

Typechecking and three focused runtime/browser checks pass. The expected source
operation count was corrected from 4,636 to the observed 4,635. Combined revision
`05c8b93077dea4f6bb6d9afb9bf49d1e718b0b6c`, which includes first-property return
but predates the second-property work, passed 243 focused checks, all 3,556 tests
in 319 files, and a production build. Newer work needs combined validation.
Complete startup and campaign play remain unfinished.

### Shared field-node constructor and second field return â€” 11 October 2026

Both properties now execute the same original field-node constructor and field
return. The second parser's live node at arena offset 4,084 contains its retained
vtable reference, zero link, kind three and zero payload. The original stack
field points to that node, and execution returns to `306972c5` after 4,660
admitted operations. The remaining internal object and parser construction are
pending; lock five stays held.

Typechecking and three focused runtime/browser checks pass. The node assertions
inspect the live owner; obsolete argument slots from returned calls were removed
because subsequent constructor calls legitimately reuse that stack storage.
Combined revision `31207602620c9334092b5c9ca494fd0352411a26` remains under
validation and predates this field return. Full startup, deployment of this
continuation and a playable campaign through an ending remain unfinished.

### Shared complete parser constructor and second parse caller â€” 11 October 2026

The remaining original parser-constructor continuation is shared by both
properties. All four second-parser fields use the same live 4,104-byte arena,
at offsets 4,084, 4,068, 4,052 and 4,036, with kinds three, one, three and one.
The retained arena has 4,032 payload bytes remaining. The original constructor
publishes its caller's name, callbacks and flags in the parser configuration,
returns, and reaches `3069b2de -> 3069afb8` after 4,896 admitted operations.
Lock five stays held; parsing the bCString decorated name remains pending.

Typechecking and five focused runtime/browser/regression checks pass, including
checks of all four live second-parser nodes and the earlier float constructor.
The earlier combined revision remains under validation and does not include
this complete second-parser constructor. Full startup, deployment of this
continuation and campaign completion remain unfinished.

### Shared name-parser entry and bCString prefix branch â€” 11 October 2026

Both properties now execute the original name-parser prolog, local masks and
retained name-pointer comparison through a shared continuation. The second name
starts with `?A`; captured instructions compare the second byte with `@` and `$`,
then take the original common call into the type parser. Execution reaches
`3069b03f -> 3069a2f7` after 4,917 admitted operations. Partial AL writes retain
upper-bit masks; the parser configuration still identifies the original type
info and all four arena nodes remain live. Lock five stays held.

Typechecking and five focused runtime/browser/regression checks pass. An initial
failure identified an invalid late use of the type-info register accessor after
constructor calls changed that register. The continuation instead supplies the
original second type-info image and checks it against the retained configuration.
Type parsing, full startup, publication and campaign completion remain unfinished.
The earlier combined validation remains running and predates this continuation.

### Shared type-parser prefix and original temporary â€” 11 October 2026

Both property calls now execute the same original type-parser prolog and flag
branch, clear bit `0x2000` in the retained parser configuration, and pass their
real output slot and NULL temporary argument into the data-type parser. The
original temporary constructor preserves unknown bits while initializing its
pointer and kind fields, then returns to `3069b887`. The second call reaches
that address after 4,946 admitted operations. Its name cursor remains the
original bCString type-info pointer; lock five stays held.

Typechecking and five focused checks pass. Earlier combined revision
`31207602620c9334092b5c9ca494fd0352411a26` passed all 240 focused checks in five
files and is now running the full suite; it predates the newer parser work.
Captured data-parser instructions show that the next `?` comparison branches
at `3069b896` to `3069b8e0`, requiring its own continuation. Data dispatch, full
startup, publication and campaign play remain unfinished.

### Shared data dispatch and original decorated-type call â€” 11 October 2026

The original data-type comparisons now share one dispatch continuation. The
second name takes `3069b896 -> 3069b8e0`. Its source-backed branch advances the
retained type-info cursor from offset nine to ten, preserves carry across INC,
masks the original local field and pushes five actual caller arguments. It
reaches `3069b8fe -> 3069aad4` after 4,965 admitted operations. The next decoder
body is absent from the current source package and must be captured before it
can execute. No decoded bCString name is supplied.

Typechecking and five focused runtime/browser/regression checks pass, followed
by one targeted caller-argument check. Both NULL arguments are read from the
actual pending call's live stack positions. The first float path retains its
normal dispatch and constructor behavior. Earlier combined full-suite validation
remains running and predates this continuation. Full startup, deployment and
campaign completion remain unfinished.

### Captured decorated-type decoder body â€” 11 October 2026

The next decoder at `3069aad4` is now captured from the matching Engine study
and checked against the pinned original PE. Its complete 441-instruction body
ends at `3069afb7`; instruction bytes hash to
`bedc4caa88d3af6da08000a49513460d67c66d13f826de9caeeb33a0206418c4`.
The Engine evidence package now contains 71 bodies and 2,895 instructions.
Independent regeneration produces byte-identical JSON and TypeScript records.
Typechecking and all 24 source/image checks pass, including the retained caller,
prolog, prefix branch and final RET encodings.

This capture does not execute the decoder or supply its return value. The local
runtime remains pending at `3069aad4` after 4,965 admitted operations. Captured
instructions show an 84-byte decoder stack frame followed by the `A` prefix's
original qualifier logic; implementation remains necessary. Combined full-suite
validation still runs on the earlier revision. PR #244 was merged externally
after successful CI; it is not included in that frozen validation checkout.
Full startup and campaign play remain unfinished.

### Original decorated decoder entry and qualifier read â€” 11 October 2026

The second call now executes the captured decoder's 84-byte prolog, original
register saves, local masks and zero fields, then reads its retained `A`
qualifier at type-info offset ten. It takes the original nonempty, non-dollar
branch and stops at `3069ab34` after 4,982 admitted operations. All four parser
nodes and the first completed property remain live; lock five stays held.

Typechecking and five focused runtime/browser/regression checks pass. A separate
failure check makes the qualifier unknown on its decoder read and confirms the
original `3069aadf` boundary, pending caller and retained first-property result.
The initial failure fixture used an incorrect image length and was corrected to
identify the actual name bytes and second qualifier read. No unknown mask is
repaired. Remaining qualifier decoding, full startup, deployment and campaign
completion remain unfinished; earlier combined validation is still running.

### Original qualifier normalization and dispatch â€” 11 October 2026

The captured decoder now executes its signed qualifier comparison, SETL,
normalization arithmetic, local masks, register transfers and conditional
branches. The original `A` qualifier normalizes to zero and reaches `3069acb5`
after 5,005 admitted operations. EAX retains the actual dispatch subtraction
result `0xfffffff8`; ESI retains 32 from the original PUSH/POP pair. DEC preserves
carry, and the parser's original name cursor remains retained.

Typechecking and six focused runtime/browser/failure checks pass, followed by
one targeted check of those register results. The original byte-unknown failure
still stops at its decoder read. The next captured branch advances the cursor
and calls `306976b2`; that continuation needs implementation. Earlier combined
full-suite validation remains running. Full startup, deployment of this local
continuation and campaign completion remain unfinished.

### Original qualifier temporary and next decoder caller â€” 11 October 2026

The qualifier branch now advances the retained name cursor to offset eleven,
checks its normalized value against 31, and calls the original temporary
constructor with its real zero argument. The captured 13-instruction body at
`306976b2` executes its nine-row zero branch, initializes the local pointer and
masked flags, and returns with RET 4. The retained caller then passes its local
output and temporary slots to `3069acda -> 30697b16`, where execution stops
after 5,026 admitted operations. No return from that next routine is supplied.

The evidence package has 72 original bodies and 2,908 instructions. Independent
JSON and TypeScript regeneration is byte-identical. Typechecking and fourteen
focused runtime/browser/source checks pass, followed by a targeted source-byte
check of the constructor's entry, branch and RET. Earlier combined full-suite
validation remains running and predates this continuation. Next decoder
execution, full startup, deployment and campaign play remain unfinished.

### Captured qualified-value wrapper dependency â€” 11 October 2026

The pending routine at `30697b16` is now captured from the matching Engine study
and checked against the original PE. Its complete 29-row body ends with RET 8
at `30697b64`; instruction bytes hash to
`eae1aa310e597134ce69be74b6253365ae768313fe00d3037fc5360cdf1fc4ae`.
It first calls the existing value-copy dependency at `30696c93`, then checks
empty values before selecting assignment or construction. Connecting those
operations to this caller still requires runtime work.

The evidence package now contains 73 bodies and 2,937 instructions. Independent
JSON and TypeScript regeneration is byte-identical. Typechecking and all 25
source/image checks pass, including entry, value-copy and empty-value calls,
and final RET bytes. Runtime remains pending at `30697b16` after 5,026 admitted
operations; the capture supplies no return. Earlier combined full-suite
validation is still live. Full startup, publication and campaign play remain
unfinished.

### Shared value-copy continuation and qualified caller return â€” 11 October 2026

The original value-copy/assignment continuation now takes explicit live stack
addresses and an expected source-value identity. The first float path still
requires its actual arena text node at offset 4,020. The second qualified caller
requires its original known NULL value, preserving physical flag masks rather
than supplying a text node. The wrapper executes its original five-row prefix,
then all 54 value-copy rows and returns to `30697b23` after 5,085 operations.
Its live output contains a zero pointer and known lower twelve flag bits; the
actual copy call is marked returned. Historical first-property text ownership
is retained separately.

Typechecking and six focused runtime/browser/failure checks pass, including
first-parser regression and unknown qualifier handling. The expected operation
count was corrected using the captured 54-row copy plus five wrapper rows.
Remaining empty-value checks and wrapper return still require implementation.
Earlier combined full-suite validation remains running and predates this change.
Full startup, deployment and campaign completion remain unfinished.

### Shared empty check, assignment and qualified wrapper return â€” 11 October 2026

The original NULL-value empty check is now shared by both callers. The qualified
wrapper executes its live check and source-backed branch, assigns the caller's
actual qualifier temporary through the shared assignment continuation, and
returns with RET 8 to `3069acdf` after 5,144 admitted operations. The copy,
empty-check, assignment and wrapper calls are all marked returned. The retained
output is NULL with known lower flag bits, and ESI is restored to 32. The original
decoder's next instruction remains pending.

Typechecking and six focused runtime/browser/failure checks pass, followed by
one targeted check of the actual call returns and restored register. Earlier
combined full-suite validation has reported a lighthouse walking test failure
and remains running; its final diagnostics must be inspected before publication.
No full-suite or deployment success is claimed for this newer continuation.
Remaining decoder execution, full startup and campaign play remain unfinished.

### Original modifier assignment and empty branches â€” 11 October 2026

After the qualified wrapper returns, the decoder now assigns the original live
output into its retained qualifier temporary, checks both original modifier
locals using the shared empty-value routine, and executes the normalized flag
comparison. Both actual modifier pointers are NULL, so the original branches
reach `3069adfc` after 5,211 admitted operations. The original caller, arena,
first property and held lock remain retained; no decoder return is supplied.

Typechecking and six focused runtime/browser/failure checks pass. Combined
revision `31207602620c9334092b5c9ca494fd0352411a26` completed its full suite with
3,560 passes and one lighthouse walking timeout at five seconds. All six tests
in that lighthouse file passed on an isolated rerun; the combined revision's
production build is now running. That revision predates this newer continuation.
The timeout remains recorded as a full-suite failure rather than a green suite.
Remaining decoder execution, full startup, publication and campaign completion
remain unfinished.

### Original qualifier rendering flags and plain-type branch â€” 11 October 2026

The decoder now reads its retained configuration flags, performs the original
SHR/NOT/TEST sequence, preserves the shift's carry and overflow semantics, and
executes the member, volatile and const qualifier comparisons. Its normalized
`A` value selects the original plain-type path at `3069ae9f` after 5,224 admitted
operations. No qualifier text is inserted and no decoder return is supplied.
Typechecking and six focused runtime/browser/failure checks pass.

Earlier combined revision `31207602620c9334092b5c9ca494fd0352411a26` passed its
production build after the isolated lighthouse check passed; its full suite's
five-second timeout remains recorded. New combined revision
`1b37f544b0c382868335973634c91ef1adc9a103` includes main through PR #244 and
runtime through the preceding modifier continuation. It is running typechecking,
a full suite with one worker to reduce contention, then a build on success.
This newer rendering-flags continuation is not in that frozen checkout. Full
startup, publication and campaign completion remain unfinished.

### Original plain qualifier decoder return â€” 11 October 2026

The decoder now executes the caller-mode comparison, both actual empty-argument
checks, original qualifier flag stores, final value copy and original epilog.
It returns to `3069b903` after 5,314 admitted operations. The returned caller
slot is a known NULL pointer with lower twelve flag bits known and value 16.
ESI is restored to the outer data-parser value `0x2000`; the retained name cursor
still points beyond the decoded `A` qualifier. Parsing the remaining class name
is unfinished; this qualifier return supplies no bCString text or startup result.

The shared copy check now permits a fresh scalar read of the same physical
unknown destination flags only when its value and mask equal the retained
operand and current physical slot. Register identity checks and pointer checks
remain in force. This resolves an overly strict identity comparison reached by
the new caller, without repairing unknown bits. Typechecking and seven distinct
focused runtime/browser/failure/regression checks pass, including a separate
returned-output check. An unrelated fatal-call test expectation changed by a
broad replacement was restored and passed; the outer ESI expectation was updated
to the actual restored caller register. Combined validation remains live on the
preceding revision. Full startup, publication and campaign play remain unfinished.

### Shared compound-type prefix and original class-code caller â€” 11 October 2026

After the qualifier return, the data parser now performs its original 20-byte
argument cleanup, assigns the live qualifier output, and follows the common
compound-type call. The compound prolog and dispatch arithmetic are shared with
the first float path. The second call reads the original `V` byte at type-info
offset eleven, preserves its live cursor, and reaches `3069b770 -> 3069b3b1`
after 5,388 admitted operations. EAX contains the actual dispatch subtraction
result 20; the basic-type call remains pending.

Typechecking and six distinct focused runtime/browser/failure checks pass. The
normal check confirms the returned qualifier assignment, pending basic-type
caller and original class-code byte. Obsolete reads of the earlier decoder's
argument slots were removed after the new compound frame reused that storage.
The earlier float constructor and byte-unknown qualifier checks remain passing.
Combined validation is still live on the earlier revision. Class-name decoding,
complete startup, publication and campaign play remain unfinished.

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

The two browser startup fixtures now expect the actual identifier boundary
`306993a2`. All six checks across both browser fixture files pass. These are
browser-service unit checks, not a visual browser observation or campaign proof.

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


### 2026-10-11 — original camera identifier read and copy (local)

The camera scoped identifier now executes the original reader, rejects the
nonmatching special prefixes, scans its actual RTTI until `@`, allocates its
text node/character storage and copies twelve known bytes `eCCameraBase`.
The retained RTTI cursor is offset 24. Startup stops at `306973b7` after
11,815 operations, with the character-copy call returned but text constructor,
scoped parser return and complete type-string assembly still pending.
The separate camera arena remains live; previous property roots, CStrings and
shutdown entries remain intact. No synthetic final string or root is used.

Validation: TypeScript checking passed; four focused runtime checks and all
six browser startup checks passed. A further targeted unknown identifier-byte
check passed, stopping at `30699315` with the original scoped caller pending
and parser lock held. Original evidence packages are unchanged. This is local
implementation, not deployment or complete startup/campaign evidence.


### 2026-10-11 — camera identifier/cache/scoped returns (local)

Executed the original text constructor and delimited-name return for the actual
camera RTTI, then the identifier assignment, name-reference cache allocation
and copy, cookie validation and scoped-name return. Camera delimiters occupy
RTTI offsets 24 and 25; the returned cursor is offset 26. Startup reaches
`30697906` after 12,159 operations, with the original class append call
`306996b0` pending. Final type-string assembly, parser cleanup and camera
publication remain unfinished. All preceding roots and shutdown entries
remain intact; the camera arena remains live and owns its actual text.

Validation: TypeScript checking passed; five focused runtime checks passed,
including unknown qualifier/identifier and unavailable arena cases, actual
cache/cookie/scoped returns and pending append. All six browser startup checks
passed in two files. Original source packages remain unchanged. This local
checkpoint has not been deployed and does not prove complete engine startup
or a campaign playable through an ending with persistence.


### 2026-10-11 — original camera class list append and return (local)

The original append routine now converts the camera keyword text into a list,
allocates its list/value nodes, links the scoped camera name and copies the
result into the class parser output. The class parser physically returns to
`3069b52d`, after 12,375 retained startup operations. Basic-type return, final
output rendering, cleanup and camera property publication remain pending.
This is the original parsed list structure, not a synthesized output string.

Validation: TypeScript checking passed; five focused runtime checks and all six
browser startup checks passed. An additional interrupted camera list-link store
check passed: it stops at `30696e86`, retains the append call and parser lock,
and preserves earlier live CStrings, roots and five shutdown entries. The
interruption is scoped to the camera invocation of the shared instruction.
Original source packages are unchanged. This local checkpoint is not deployed
and does not prove complete startup or campaign completion with persistence.


### 2026-10-11 — camera basic/compound/data/type returns (local)

The original camera basic-type parser now copies the class parsed list, checks
its modifier, and returns through compound, data-type and type parsers into the
NameParser. The retained result is a live camera arena list with known low
kind bits zero; it is copied into the name parser's actual stack value.
Startup stops at `3069b04e` after 12,658 operations. Output length calculation,
rendering, arena cleanup and fourth property publication remain pending.
The original physical call/return order and earlier published roots survive.

Validation: TypeScript checking, six focused runtime checks and six browser
startup checks passed. Runtime checks cover the actual parser returns, live
list provenance, known kind bits, unknown RTTI bytes, unavailable arena and
interrupted list-link store. Original instruction packages are unchanged.
This is local implementation, not deployment or proof of complete engine
startup or campaign completion with save/reload.


### 2026-10-11 — camera measured output allocation (local)

The original NameParser verifies its consumed camera RTTI and measures the live
parsed list through the original virtual length calls: six keyword bytes plus
twelve identifier bytes. It stores output length 19 including NUL, rounds the
allocation request to 24 bytes, obtains a distinct canonical CRT allocation,
and enters the original writer. Startup stops at `30697171` after 12,823
operations. All 24 output bytes remain unknown; no final output is synthesized.
The writer argument length is 19, and the live arena/list remains retained.
Writer execution, cleanup and camera property publication are still pending.

Validation: TypeScript checking passed; six focused runtime checks and all six
browser startup checks passed. An additional unavailable camera output malloc
check passed at `30672ec7`, retaining its pending caller, parser lock, earlier
live CStrings, roots and shutdown entries. Original evidence packages are
unchanged. This local checkpoint has not been deployed and does not prove
complete startup or campaign completion with persistence.


### 2026-10-11 — camera nested keyword writer (local)

The original camera output writer checks the parsed list, calls the original
virtual length and list writer, enters its nested text writer, and copies the
six-byte keyword `class ` into the separate output allocation. The nested node
writer returns to `306971d7`; startup has executed 13,045 operations. Bytes
0..5 are known, bytes 6..23 remain unknown. Identifier output, terminator,
writer return, parser cleanup and camera publication remain pending.

Validation: TypeScript checking, eight focused runtime checks and six browser
startup checks passed. An unavailable readonly writer target stops at
`306971d4` with the output caller pending, lock held and prior CString/shutdown
entry retained. Corrupting that readonly image invalidates image-backed root
and parser snapshots; the failure test explicitly expects those snapshots to
be unavailable. Normal-path tests separately verify the roots and parsed list.
Original source packages are unchanged. This local checkpoint is not deployed
and does not prove complete startup or campaign completion with persistence.


### 2026-10-11 — original camera identifier output and writer return (local)

The original writer now advances past the keyword, measures the actual name
node, copies its twelve bytes using the retained arena offset/length, stores
NUL and returns to the NameParser at `3069b0d3`. Startup has executed 13,222
operations. The separate output contains `class eCCameraBase` plus NUL in
19 known bytes; the five remaining allocation bytes remain unknown. Output
compaction, NameParser return, cleanup and camera publication are pending.

Validation: TypeScript checking, eight focused runtime checks and six browser
startup checks passed. A further interrupted final terminator-store test passed
at `306971f6`, retaining all eighteen text bytes, an unknown terminator byte,
live output, pending writer caller and parser lock. The copy uses actual
`nameCharactersOffset` and `nameLength`, not the earlier class's byte count.
Original source packages are unchanged. This checkpoint is local, not deployed,
and does not establish complete startup or campaign completion with persistence.


### 2026-10-11 — original camera NameParser output scan and return (local)

Executed the original output scan/space compaction over the rendered camera
name, wrote its final terminator and returned the NameParser physically to
`3069b2e3`. Startup has executed 13,381 operations. The output remains the
nineteen known bytes `class eCCameraBase` plus NUL, with five unknown padding
bytes. Arena destruction, parser lock release, type cache and camera root
publication remain pending. The output and parsed camera list remain live.

Validation: TypeScript checking, ten focused runtime checks and six browser
startup checks passed. Unknown rendered terminator stops at `3069b0f3` with
the undecoration caller and lock retained. Normal-path checks verify the
NameParser return, output bytes/masks and prior roots/shutdown entries.
Original evidence packages are unchanged. This local checkpoint has not been
deployed and does not establish complete startup or full campaign persistence.


### 2026-10-11 — camera parser arena destruction and caller return (local)

Executed the original arena chain destructor/free, finally handler releasing
lock 5, EH epilog and undecoration return. The type-name caller regains its
live output at `3067dad1` after 13,427 operations. The parser arena is freed;
checks observe its raw historical bytes without native reads after release.
The separate output still contains nineteen known bytes and five unknown
padding bytes. Length scan, type cache and camera root publication remain
pending. Prior published roots/CStrings/shutdown entries remain intact.

Validation: TypeScript checking, ten focused runtime checks and six browser
startup checks passed. A further unavailable arena free check passed at
`30672f8a`, retaining the destructor caller, lock and earlier CStrings/shutdown
cursor. Original instruction packages are unchanged. This local checkpoint
has not been deployed and does not establish complete engine startup or a
campaign playable through an ending with persistence.


### 2026-10-11 — original camera type-name DWORD length scan (local)

Executed the original aligned DWORD strlen scan over the live camera output,
including its masked zero-byte predicate and third-byte terminator finish.
It returns length eighteen to `3067dae2` after 13,485 startup operations.
The last scan DWORD contains the known NUL at output offset 18 and unknown
padding at 19; the predicate proves the terminator without inventing padding.
Cache allocation/copy, output release and camera publication remain pending.

Validation: TypeScript checking, twelve focused runtime checks and six browser
startup checks passed. Making the scan terminator unknown stops at `30679b11`
with its original caller pending and parser lock already released. Normal
checks verify the length, prior roots/CStrings, output masks and freed parser
arena observations. Original source packages remain unchanged. This local
checkpoint is not deployed and does not establish complete engine startup or
campaign completion with save/reload.


### 2026-10-11 — original camera type-name cache allocations (local)

The original caller checks the output's final nonspace character, acquires
lock 14, verifies its uncached RTTI and allocates a fresh eight-byte list node
and nineteen-byte cache text span. It stores the actual cache text pointer in
camera RTTI and enters the original copy at `3068a84a`, after 13,518 operations.
Both allocations remain live and unwritten; the node is not linked yet.
Cache copy/link, output release, lock release and camera publication are pending.

Validation: TypeScript checking, twelve focused runtime checks and six browser
startup checks passed. An additional unavailable nineteen-byte cache malloc
check passed at `30672ec7`, retaining its caller, live node and lock 14 while
lock 5 remains released. Earlier roots/CStrings/shutdown cursor remain intact.
Original source packages are unchanged. This local checkpoint is not deployed
and does not establish complete startup or campaign completion with persistence.


### 2026-10-11 — original camera cache text copy and list link (local)

The original copy routine writes all nineteen known cache bytes, returns zero,
then links the new camera cache node to the previous live int node and publishes
it in the actual shared type-name list. Startup stops at `3067db62` after
13,700 operations. Camera RTTI points to the actual cache text, the list root
points to the new node, and both allocations remain live. Temporary output
release, lock 14 release, property CString and camera root publication remain
pending.

Validation: TypeScript checking, thirteen focused runtime checks and six browser
startup checks passed. A further interrupted cache character store check passed
at `3068a88a`, retaining the ten-byte prefix, unknown following character,
live cache text, pending copy caller and held lock 14; lock 5 is released.
Normal checks verify copied text and canonical link provenance. Original source
packages are unchanged. This local checkpoint is not deployed and does not
establish complete startup or campaign completion with persistence.


### 2026-10-11 — camera cache cleanup and property caller return (local)

Executed the original temporary-output free, lock-14 finally handler, EH epilog
and property type-name wrapper return. Startup reaches camera caller
`30076708` after 13,726 operations. Temporary output is freed, camera cache
text/node remain live and linked, and both parser/cache locks are released.
The property CString and camera root publication remain pending. The free
proof covers the actual 24-byte output allocation.

Validation: TypeScript checking, fourteen focused runtime checks and six browser
startup checks passed. A further unavailable temporary-output free check passed
at `30672f8a`, retaining live output/cache, held lock 14 and pending free caller;
lock 5 remains released. Normal checks verify output lifetime, property return,
prior CStrings/roots and shutdown entries. Original source packages are
unchanged. This local checkpoint is not deployed and does not establish full
engine startup or a campaign playable through its ending with persistence.


### 2026-10-11 — original camera SharedBase UnMangle caller entry (local)

Original camera bytes at `30076708`, `30076709` and `3007670e` push the returned
cache text, actual property storage and call the retained SharedBase UnMangle
import. Executed its thunk/prolog and argument setup, then its original search
call for the audited space literal. Startup stops at `100a7430` after 13,735
operations. SharedBase retains the live camera cache text in ESI; camera root
is still null. Search completion, CString construction and publication remain
pending. No camera property string/root is synthesized.

Validation: TypeScript checking, fifteen focused runtime checks and six browser
startup checks passed. A further strengthened normal check passed for actual
SharedBase input provenance and null camera root. The call uses return address
`30076714` and original import/SharedBase hash receipts. Source packages are
unchanged. This local checkpoint has not been deployed and does not establish
full engine startup or campaign completion with persistence.


2026-10-11 — original camera cached-name space search (local)

Executed the retained SharedBase single-character search over the actual live
camera cache allocation. Its DWORD scan finds the space at offset 5 in
`class eCCameraBase`, returns that pointer to UnMangle, and passes offset 6
and the actual camera property storage into the original CString constructor.
Startup stops at constructor thunk `10003ba7` after 13,814 operations. The
search call returned; CString construction and camera root publication remain
pending. The camera root is still null, with both parser/cache locks released.

Validation: TypeScript checking, the strengthened normal check and sixteen
focused runtime checks passed. The new unknown-cache-character check stops at
`100a7343`, preserving the pending search caller and live cache allocation.
Six browser startup checks passed. Source packages are unchanged. This local
checkpoint has not been deployed and does not establish complete engine startup
or a playable campaign ending with save/reload.


2026-10-11 — original camera CString constructor length scan (local)

Executed the original constructor thunk/prolog with the camera property storage
as destination and the live cached-name pointer at offset 6 as input. Its byte
scan reads the twelve characters of `eCCameraBase` and its terminator, derives
length 12 from pointers in the same allocation, and calls the original CString
allocation routine. Startup now stops at `10007d65` after 13,883 operations.
No fourth CString has been allocated or published; the camera root remains null.

Validation: TypeScript checking, the strengthened normal runtime check and six
browser startup checks passed. The normal check verifies actual length 12 and
the pending allocation caller. Source packages are unchanged. This checkpoint
is local and does not prove complete engine startup or campaign completion.


2026-10-11 — original camera CString allocation request (local)

Executed the original CString allocation prefix, preserving length 12, adding
its original nine-byte overhead and retaining the actual MemoryAdmin singleton.
The original caller is pending at malloc thunk `10003cd8` after 13,895
operations. Its requested size is 21 bytes; no fourth CString allocation or
camera root publication has occurred yet. The existing scene-startup heap
receipt covers requests 21..24 with stride 24; using it requires admission of
that source-backed extension, rather than guessing allocation capacity.

Validation: TypeScript checking, a strengthened normal runtime check and six
browser startup checks passed. The normal check distinguishes the earlier
returned allocation call from the current pending call and verifies the actual
MemoryAdmin receiver. Source packages are unchanged. This checkpoint is local;
complete startup and campaign completion with persistence remain unproven.


2026-10-11 — original camera CString MemoryAdmin allocation (local)

Allocated the original 21-byte CString request from the already audited 24-byte
pool through the retained MemoryAdmin singleton. The fourth CString has its own
live allocation, physical views and owner proof; it does not alias any earlier
property string. VirtualAlloc-backed pool bytes retain their actual known masks.
The malloc caller returned and startup stops at `10013263`, still after 13,895
counted instructions, before writing the CString header or storage pointer.
Camera root remains null. Allocation admission does not imply SceneAdmin startup.

Validation: TypeScript checking, the strengthened normal runtime check and six
browser startup checks passed. Two normal attempts hit the unchanged 20-second
timeout while an assertion recursively matched allocation internals. Direct
identity/extent comparisons preserve the checks and passed in 9.46 seconds total
(about 3.5 seconds of tests); no timeout was raised. The normal check verifies
requested size, capacity, physical byte masks, distinct identity, canonical
same-platform allocation membership and the actual returned malloc caller.
This checkpoint is local; full startup and campaign completion remain unproven.


2026-10-11 — original camera CString header and copy (local)

Executed the original allocation return, header writes, destination publication
and copy call. The live fourth CString records length 12 and reference count 1;
its bytes at offset 8 contain `eCCameraBase` followed by the original terminator.
The source is the actual retained camera cache allocation at offset 6. Its
SharedBase copy caller returned; startup stops at `10013632` after 13,908
instructions, before constructor cleanup. The camera root is still null.

Validation: TypeScript checking, the strengthened normal runtime check and six
browser startup checks passed. Checks retain physical allocation membership,
byte masks, header values, copied name and original allocation/copy return
state. Source packages are unchanged. This checkpoint is local and does not
prove full engine startup or campaign completion with save/reload.


2026-10-11 — original camera property root and shutdown registration (local)

Completed the original CString constructor and UnMangle returns, registered
camera shutdown callback `300307f1` through the original Engine onexit/EH/lock
path, and published the actual property storage through `307322e5`. The sixth
exit entry is retained and the exit cursor advances to 24. The original C++
walker then reaches its next callback `307322f0` after 14,039 instructions;
its cursor is at offset `0x114`. Camera property initialization is complete,
while the next initializer and full engine startup remain unsupported.

Validation: TypeScript checking, the strengthened normal runtime check, two
interrupted-registration checks and six browser startup checks passed. The
negative checks stop at the original exit lock/unlock instruction, retain the
live completed CString, and keep the camera root known null. Failed unlock
preserves the held lock and physically registered sixth callback; failed lock
preserves the previous exit cursor. Source packages are unchanged. This local
checkpoint has not been deployed and does not establish campaign completion.

Next reference: original callback `307322f0` calls thunk `300247da`, which jumps
to property routine `30076740`, then stores its result at `30ad9e28`. These
addresses are research findings, not an implemented next callback.


2026-10-11 — next bCObjectRefBase initializer source capture (local)

Captured original callback `307322f0`, property thunk `300247da` and its
22-instruction body at `30076740`. Added original flags at `30ad9a18`, root at
`30ad9e28`, storage at `30ad9a10`, and the complete 30-byte RTTI record at
`30aa202c` containing `.?AVbCObjectRefBase@@`. This is a source capture;
the next initializer has not executed yet.

Validation: TypeScript checking and 46 source/image checks passed. Independent
regeneration reproduced both artifacts exactly. The package now contains 92
Engine methods and 3,614 body instructions. SHA-256: JSON
`15c4fc760e5f46e709a8f0bdf50c0e46b8c7df1624c801ccb88c5764cb3deb30`;
TypeScript `2fe484c9551ab95bbd7843eb00cae204adc7f4094698f8b569637c1d258a2959`.
This local capture does not establish full startup or campaign completion.


2026-10-11 — original object-reference-base property prefix (local)

Executed callback `307322f0` through thunk `300247da`, original cold flags and
storage setup, and the type-name wrapper for the actual bCObjectRefBase RTTI.
The original undecoration prolog and lock-5 setup retain the RTTI input at
its actual offset 9, allocator/free callbacks, and parser-constructor call.
Startup stops at `3069747a` after 14,145 instructions. Camera initialization
remains published with its sixth shutdown callback; the new property root
remains known null and its flags are 3. No new property string is fabricated.

Validation: TypeScript checking, the strengthened normal runtime check and six
browser startup checks passed. The normal check distinguishes the returned
camera wrapper from the pending next wrapper and verifies actual RTTI input,
held parser lock, cold root and existing camera CString/root/exit state.
Source packages are unchanged. This checkpoint is local, and full startup
and a playable campaign ending with save/reload remain unproven.


2026-10-11 — original reference-base parser construction (local)

Executed the original name-parser constructor, its cold 4,104-byte arena request,
four internal field constructors and configuration writes. The new live arena
is distinct from the camera parser's freed arena; its original field offsets
are 4,084/4,068/4,052/4,036 with kinds 3/1/3/1. The actual configuration stack
pointer returns through the retained constructor caller. Startup stops at
`3069b2d8` after 14,489 instructions, before beginning name parsing. RTTI cursor
remains at offset 9, output length is zero, lock 5 is held and the new root is
known null. The published camera property and six exit callbacks remain intact.

Validation: TypeScript checking, six browser startup checks, a strengthened
normal runtime check and an unavailable-arena check passed. The normal check
verifies same-owner physical arena membership, distinct lifetime, field offsets
and types, and the returned configuration pointer. The unavailable-arena check
retains the original caller at `30672ec7`, keeps lock 5 held and preserves the
completed camera string and registration while leaving the new root null.
Source packages are unchanged. This local checkpoint does not establish full
engine startup or a finishable campaign with save/reload.


2026-10-11 — original reference-base decorated-type dispatch (local)

Executed the original NameParser and TypeParser prefixes, the DataTypeParser
local construction and its first-byte dispatch. The actual retained RTTI byte
at offset 9 is `?` and selects `3069b8e0`; startup stops there after 14,548
instructions. Name/type/data callers remain pending, the new arena stays live,
its root remains null and lock 5 stays held. Camera state remains published.

Validation: TypeScript checking, the strengthened normal runtime check and six
browser startup checks passed. The normal check distinguishes returned earlier
camera calls from the new pending name/data calls, checks the actual masked
RTTI byte and preserves same-owner arena membership and internal field state.
Source packages are unchanged. This local checkpoint does not establish full
startup or campaign completion with save/reload.


2026-10-11 — original reference-base qualifier decoding (local)

Executed the decorated-type decoder prolog, actual `A` qualifier read, original
classification arithmetic and cursor increment to offset 11. Its temporary
constructor is pending at `306976b2` after 14,606 instructions. The original
push/pop sets ESI to 32 and EAX to `fffffff8` on this path. Lock 5 remains held;
the new root remains null and the camera string/root/registration stay intact.

Validation: TypeScript checking, the strengthened normal runtime check, six
browser startup checks and an unknown-qualifier check passed. Unknown RTTI byte
10 stops at `3069aadf`, leaves the decorated-type caller pending, retains the
cursor at 10 and does not enter the qualifier temporary constructor. The byte
mask remains unknown; the new root stays known null. Source packages are
unchanged. This local checkpoint does not establish complete engine startup
or campaign completion with save/reload.


2026-10-11 — original reference-base qualifier returns and class selector (local)

Executed the original qualifier temporary, qualified-value copies and assigns,
empty-modifier checks, decoder cleanup and retained return. Its returned value
is assigned through the actual DataTypeParser caller before CompoundTypeParser
and BasicTypeParser read the original `V` class marker. Startup stops at
`3069b43a` after 15,002 instructions, with RTTI cursor at offset 12. The new
arena stays live, lock 5 stays held, and the new root stays null. Earlier
camera state and its captured historical class node remain retained.

Validation: TypeScript checking, the strengthened normal runtime check and six
browser startup checks passed. Checks distinguish the completed decoder return
from pending compound/basic calls, verify the actual class byte/register state,
and preserve canonical arena membership, physical fields and camera lifetime.
Source packages are unchanged. This local checkpoint does not establish
complete engine startup or campaign completion with save/reload.


### 11 October 2026: reference-base class keyword and scoped-name prefix

The original reference-base type selector now enters the class parser using its
own retained RTTI image. The captured class-keyword constructor allocates its
node and six character bytes in the distinct live 4,104-byte reference-base
parser arena, copies `class `, and enters the original scoped-name routine.
Execution reaches identifier parser `30699300` after 15,323 admitted operations.
The RTTI cursor remains at offset 12. Lock 5 stays held, the reference-base root
remains known NULL, and the camera CString and six registered shutdown callbacks
remain intact. The snapshot's copied-type record still describes the completed
camera parse; it is historical evidence, not the new class node.

Typechecking, three selected runtime checks and six browser-startup checks pass.
The class keyword/scoped-name prefix matches the previously implemented captured
camera path exactly except for the RTTI owner. Interrupting the third character
write stops at `30696f4b`, retains only `cl` as known bytes, preserves the live
arena and held lock, and leaves the original copy call pending. No identifier,
property root or callback return is fabricated. This checkpoint is local and
has not been deployed. Complete startup and a finishable campaign remain
unfinished. The earlier combined validation process is still running and does
not validate this newer continuation.


### 11 October 2026: original reference-base identifier copy

The original identifier parser reads the retained reference-base RTTI image,
rejects the nonmatching template and generic prefixes, and scans the actual
`bCObjectRefBase` name through its original delimited-character loop. Its text
node and 15 copied characters occupy the same live reference-base arena as the
class keyword. The closing delimiter position is derived from the measured
name length. The constructor returns at `306994a9` after 16,031 operations;
the RTTI cursor is now offset 28. Identifier caching and outer parser returns
remain pending. The reference-base property root remains known NULL.

Typechecking, four focused runtime checks and six browser-startup checks pass.
The continuation matches the captured camera identifier path except for its
RTTI owner and length-derived closing delimiter. Making the eighth name byte
unknown during the copy stops at `30696f47`: only `bCObjec` is known, the remaining
eight character bytes are unknown, the arena stays live and lock 5 stays held.
The original copy and name-constructor calls remain pending. The completed
camera CString and prior callback registrations remain intact. This checkpoint
is local, not deployed; complete startup and campaign play remain unfinished.


### 11 October 2026: reference-base identifier cache and scoped return

The original identifier assignment and name-reference cache append now execute
against the retained reference-base name node. The original cookie XOR and
comparison complete before the identifier physically returns; the scoped-name
routine assigns that returned value, consumes the actual second delimiter and
restores its caller. Execution reaches `306996a8` after 16,338 operations, with
the RTTI cursor at offset 29. The parsed identifier and class keyword remain in
the live reference-base arena, lock 5 stays held and the property root stays
known NULL. Class-list append and outer parser returns remain pending. The
copied-type snapshot still records the earlier completed camera parse.

Typechecking, four selected runtime checks and six browser-startup checks pass.
The continuation matches the captured camera path except for the derived
reference-base delimiter positions. Making the actual Engine security cookie
unknown at its original comparison stops at `3067746c` with the full name live,
the cache append returned and the identifier/cookie calls pending. No successful
return or root publication is synthesized. This is a local checkpoint, not a
deployed game or proof of complete startup and campaign play. The unchanged
combined revision `015b00c0c3a1b7db32bc6620d1e54295d88b59cb` is still validating
and predates this newer continuation.


### 11 October 2026: reference-base class list and type-parser returns

The original class parser now converts its keyword node into a list, appends the
actual reference-base identifier, and returns through the class, basic type,
compound type, data type and outer type-parser callers. The name parser retains
that returned list, verifies the actual consumed RTTI terminator and calls its
original length routine. Execution stops at `30697114` after 16,908 operations;
the RTTI cursor remains offset 29. The copied-type snapshot now describes the
live reference-base list, separately from historical camera text records.
The arena, camera CString and six prior shutdown registrations remain live;
lock 5 stays held and the reference-base property root remains known NULL.

Typechecking, five focused runtime checks and six browser-startup checks pass.
The list append and parser returns match the captured camera continuation except
for the reference-base RTTI owner and measured end cursor. Interrupting the
original name-link store stops at `30696e86`, retaining both full text nodes and
the pending append/class calls without publishing the property root. Original
pointer fields retain opaque pointer ownership rather than invented numeric
addresses. Name measurement, output construction and remaining startup still
need continuation. This is a local checkpoint, not deployment or proof of a
finishable browser campaign. The full combined validation at
`015b00c0c3a1b7db32bc6620d1e54295d88b59cb` is still live and predates this work.


### 11 October 2026: reference-base measured output allocation

The original virtual length routine traverses the retained class list and its
actual text nodes, measures 21 characters, adds the NUL capacity and requests
a separate aligned 24-byte Engine CRT output allocation. It publishes that
allocation in the actual parser output slot and passes capacity 22 to the
original writer. Execution reaches `30697171` after 17,007 operations. All output
bytes remain unknown before the writer starts; the arena and output are distinct
live allocations. Lock 5 stays held and the reference-base root stays known NULL.

Typechecking, three runtime checks and six browser-startup checks pass. The
length/allocation continuation exactly matches the existing captured class path;
its lengths come from live node fields. An unknown readonly virtual length
target stops at `30697129`, invalidating subsequent image-backed snapshots while
retaining the already captured root reference and live list. Unavailable output
allocation stops at `30672ec7` after measuring the actual required capacity 22.
Both failures retain pending callers without entering the writer. This local
checkpoint is not deployed and does not prove complete startup or campaign play.
The earlier combined validation remains live at
`015b00c0c3a1b7db32bc6620d1e54295d88b59cb`.


### 11 October 2026: original reference-base output writer return

The captured list and text writers now copy the actual class keyword and
reference-base name into the separate 24-byte output. The outer writer writes
the NUL at offset 21 and physically returns at `3069b0d3` after 17,430 operations.
The output contains `class bCObjectRefBase` followed by NUL; all 22 text bytes
are known, while the two padding bytes remain unknown. Both output and parser
arena are live. Lock 5 stays held, six earlier shutdown callbacks remain intact,
and the reference-base root is still known NULL. Outer name-parser return,
arena cleanup, lock release and property CString construction remain pending.

Typechecking, five focused runtime checks and six browser-startup checks pass.
The output writer matches the captured class writer exactly; its actual nodes
supply lengths and character storage. An unknown eighth identifier character
stops at `30696f47`, retaining only `class bCObjec` in the output. Interrupted
terminator storage stops at `306971f6`, preserving all 21 characters with no
fabricated NUL. The output allocation and held lock remain owned and live, and
the writer call stays pending in both cases. This is a local checkpoint, not a
deployed game or proof of complete startup and campaign play. The older combined
validation at `015b00c0c3a1b7db32bc6620d1e54295d88b59cb` is still running.


### 11 October 2026: original reference-base name-parser return

The name parser now processes its actual written output, retains the single
class/name separator, writes its final terminator and restores its original
frame. It returns the owned output pointer at `3069b2e3` after 17,613 operations.
The 24-byte allocation still contains 22 known text/NUL bytes and two unknown
padding bytes. The separate arena remains live, lock 5 remains held and the
reference-base root remains known NULL. Arena cleanup, unlock and outer return
remain pending.

Typechecking, five focused runtime checks and six browser-startup checks pass.
The parser continuation exactly matches the captured class-name path. Making
output byte 8 unknown stops at `3069b0f3` while all other writer-established
bytes retain their masks. Interrupted final terminator storage stops at
`3069b0fb`; the writer's already established NUL stays known rather than being
artificially erased. The writer call is returned and the name-parser call stays
pending in both failures. This is a local checkpoint, not deployment or proof
of complete startup and campaign play. Earlier combined validation remains live
at `015b00c0c3a1b7db32bc6620d1e54295d88b59cb`.


### 11 October 2026: reference-base arena cleanup and undecoration return

The original destructor loads the next arena block before calling the actual
Engine CRT free callback, releases the reference-base arena and restores its
caller. The finally helper releases lock 5, and the original EH epilog restores
the saved initializer cursor and returns the live output to the type-name
caller. Execution reaches `3067dacb` after 17,657 operations. The output retains
22 known text/NUL bytes and two unknown padding bytes; its separate 4,104-byte
arena is freed. The root remains known NULL. Type-name cache publication and
property CString construction remain pending.

Typechecking, five focused runtime checks and six browser-startup checks pass.
The destructor/finally/EH continuation exactly matches the captured class path.
Normal lifetime checks capture arena bytes before the free callback, retain
historical pointer records and reject subsequent canonical reads through the
released allocation. The restored ESI is the actual retained C++ initializer
cursor, with the same owner and offset. Unavailable arena release stops at
`30672f8a` with the arena still live; unavailable unlock stops at `3069b307` with
the arena freed and lock 5 still held. Both retain the live output and pending
original caller. This is a local checkpoint, not deployment or proof of complete
startup and campaign play. Earlier combined revision
`015b00c0c3a1b7db32bc6620d1e54295d88b59cb` passed all 3,703 tests and its build;
that receipt predates the newer parser/writer/cleanup continuations.


## Local continuation â€” 11 October 2026: reference-base name length scan

The reference-base type-name caller now scans its live 24-byte undecoration
output through original routine `30679ad0` and returns length 21 at `3067dae2`
after 17,723 admitted operations. Its 22 initialized bytes contain
`class bCObjectRefBase` followed by NUL; both padding bytes remain unknown.
Changing their stored bits to zero or 255 preserves the measured length. An
unknown terminator stops at the original ambiguous DWORD predicate without
returning the current scan or overwriting the earlier measured length.

The admitted scan matches the captured camera continuation after normalizing
its stack helper and diagnostic wording. The reference-base property wrapper's
call at `30076773` now retains return address `30076778`, matching the original
five-byte CALL and following PUSH instruction; it previously retained the
camera wrapper's return address. The wrapper itself remains pending.

Typechecking, four focused runtime checks and six browser startup checks pass.
These results are local; the earlier combined full-suite process remains live.
Type-name cache publication, complete startup, world activation and a finishable
browser campaign remain incomplete.


## Local continuation â€” 11 October 2026: reference-base cache allocations

The original caller inspects the last character of its measured 21-character
name, acquires CRT lock 14, verifies the reference-base type-info cache slot is
NULL, and allocates an eight-byte list node. Its original arithmetic derives
a 22-byte text allocation with physical capacity 24. Both allocations remain
uninitialized and live, separate from the live undecoration output and the
previous camera cache. Execution stops before publication at `3067db21` after
17,749 admitted operations; lock 14 remains held.

Unavailable node or text allocation retains the actual pending malloc call,
original output and held lock. The cache slot remains NULL. The allocation
continuation matches the previously captured camera span without code changes.
Typechecking, six runtime checks and six browser startup checks pass locally.
Cache publication and copy, complete engine startup and a finishable campaign
remain outstanding. These changes have not been deployed.


## Local continuation â€” 11 October 2026: reference-base bounded cache copy

The original type-name caller publishes its actual 22-byte cache allocation in
the reference-base type-info slot and passes it, its derived capacity and the
live undecoration output to `3068a84a`. The captured bounded copier writes
`class bCObjectRefBase` followed by NUL, restores its saved registers and returns
status zero through its physical caller. Execution stops before list linking
at `3067db48` after 17,955 admitted operations. The cache node remains
uninitialized, the prior camera list root remains intact, and lock 14 is held.

An unknown ninth source byte or interrupted ninth destination write leaves the
actual eight-byte prefix `class bC`, unknown remaining destination bytes and the
pending copier call. The live output and cache allocation are retained. No
successful return or cleanup is fabricated. The admitted publication/copy span
matches the captured camera continuation without code changes.

Typechecking, eight focused runtime checks and six browser startup checks pass
locally. List linking, output release, type-name return, complete startup and a
finishable campaign remain outstanding. These changes are not deployed.


## Local continuation â€” 11 October 2026: reference-base cache list linking

The original caller reloads the published reference-base cache text, stores it
in the new list node, copies the actual prior camera list root into that node's
next field and publishes the new node as the list root. The existing camera
chain remains live. Execution stops before output release at `3067db62` after
17,962 admitted operations. Both cache allocations and the temporary output
remain live, and CRT lock 14 remains held.

Interrupted next-field publication preserves the prior root and known text
link. Interrupted root publication retains the actual prior root in the new
node's next field; the interrupted root store has invalidated opaque pointer
authority, so its destination remains unknown rather than being presented as
an established old or new pointer. Neither failure fabricates cleanup.
The admitted list-link span matches the captured camera continuation unchanged.

Typechecking and six browser startup checks pass. Nine of ten selected runtime
checks passed in the first run; after correcting the root-failure observation,
both link-interruption checks passed. All ten distinct runtime checks therefore
have passing evidence across these runs. Output release, type-name return,
complete startup and a finishable browser campaign remain outstanding. This
checkpoint is local and has not been deployed.


## Local continuation â€” 11 October 2026: reference-base type-name cleanup and return

The original caller releases its actual temporary 24-byte undecoration output,
runs the lock-14 finally helper, reloads the live 22-byte cache pointer and
executes its EH epilog and wrapper return. It returns through the physical
reference-base caller at `30076778` after 17,988 admitted operations. The cache
node and text remain live and linked; both locks are released. The restored
ESI retains the actual initializer cursor owner and offset. The released
output no longer grants canonical allocation access.

Unavailable output release preserves the live output and held lock. Unavailable
unlock preserves the freed-output state, live published cache and held lock.
Both cases retain the pending property caller. The cleanup/return span matches
the captured camera continuation with only its original caller return address
changed from `30076708` to `30076778`.

Typechecking and six browser startup checks pass locally. Eleven of twelve
selected runtime checks passed initially; the normal check then passed after
updating its remaining pending-return assertion and checking actual restored
ESI. All twelve distinct selected checks have passing evidence across the runs.
The SharedBase UnMangle conversion, property CString construction, shutdown
registration, complete startup and finishable campaign remain outstanding.
This checkpoint is local and has not been deployed.


## Local continuation â€” 11 October 2026: reference-base SharedBase UnMangle

The original reference-base caller pushes its live cache pointer and storage
address, then enters the captured SharedBase UnMangle import. The original
space search finds the actual space at offset 5 in `class bCObjectRefBase`.
UnMangle advances that pointer to offset 6 and passes the suffix and actual
reference-base storage to the captured CString constructor. Execution stops
before the constructor thunk at `10003ba7` after 18,076 admitted operations.
The UnMangle and constructor calls remain pending with their physical return
addresses; the cache stays live and the earlier output remains freed.

An unknown byte in either searched DWORD stops at the original XOR instruction
rather than producing a guessed match. The admitted continuation matches the
captured camera path after normalizing original wrapper instruction addresses.
Typechecking and six browser startup checks pass locally. Four of five selected
runtime checks passed initially; the normal check passed after distinguishing
the new pending constructor call from the earlier completed camera call. All
five distinct selected checks have passing evidence across these runs.

CString construction, property publication, shutdown registration, complete
startup and the finishable browser campaign remain outstanding. This work is
local and has not been deployed.


## Local continuation â€” 11 October 2026: reference-base CString length scan

The captured SharedBase CString constructor receives the actual cache suffix at
offset 6 and the reference-base storage destination. Its original byte scan
reads all fifteen characters plus NUL, subtracts the actual same-allocation
cursor offsets, and passes length 15 to its allocation routine. Execution stops
before the allocator thunk at `10007d65` after 18,157 admitted operations.
The constructor and allocation calls remain pending with physical return words.

Unknown source byte 13 or terminator byte 21 stops at the original byte load,
retaining the actual scan cursor and live cache; no guessed length or allocation
is supplied. The admitted constructor span matches the captured camera
continuation without code changes. Typechecking and six browser startup checks
pass. Four of five selected runtime checks passed initially; the normal check
passed after updating its allocation-call observation to the new pending call.
All five distinct checks have passing evidence across those runs.

CString allocation, byte copy, property publication, shutdown registration,
complete startup and a finishable browser campaign remain outstanding. This
checkpoint is local and has not been deployed.
