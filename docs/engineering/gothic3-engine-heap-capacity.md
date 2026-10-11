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
