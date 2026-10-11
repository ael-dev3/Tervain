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
