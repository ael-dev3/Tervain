# Engine heap capacity needed by SharedBase string search

## Observed dependency — 11 October 2026

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

### CString allocation caller and retained MemoryAdmin — 11 October 2026

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

### CString allocation and header stores — 11 October 2026

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

### CString text copy and original return — 11 October 2026

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

### Property shutdown registration and first callback return — 11 October 2026

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

### Second C++ property initializer — 11 October 2026

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

### Shared type-name prefix and bCString decoder caller — 11 October 2026

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

### Reused decoder entry and retained second parser call — 11 October 2026

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

### Shared parser construction and second arena request — 11 October 2026

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

### Shared cold arena request and allocator callback — 11 October 2026

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

### Shared arena allocation and second field return — 11 October 2026

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

### Shared field-node constructor and second field return — 11 October 2026

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

### Shared complete parser constructor and second parse caller — 11 October 2026

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

### Shared name-parser entry and bCString prefix branch — 11 October 2026

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

### Shared type-parser prefix and original temporary — 11 October 2026

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

### Shared data dispatch and original decorated-type call — 11 October 2026

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

### Captured decorated-type decoder body — 11 October 2026

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

### Original decorated decoder entry and qualifier read — 11 October 2026

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
