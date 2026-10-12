# Next native output stream: source evidence

This research continues the returned stdout filebuf initializer at `0x30791f4d`.
It is source capture, not evidence that the output stream constructor executes.
The pinned Engine hash is recorded in `research.json`; the generator reproduces
these methods from the matching original DLL, function table and disassembly.

## Actual caller and dependencies

The initializer pushes virtual-base flag `1`, standard-stream registration flag
`0`, and the existing filebuf `0x30af6e08`. It passes receiver `0x30af6e58` to
`0x305f2650`, with return address `0x30791f60`. Only after a real constructor
return does it register shutdown `0x307b8078` and return to the initializer walker.

The constructor installs a virtual-base table, reads its displacement and calls
basic-ios initialization at `0x305f21b0`. The original virtual-base displacement
is four bytes. Basic-ios initializes state, allocates a four-byte locale wrapper,
retains the existing locale under its actual lock, connects the filebuf and
widens the fill character (ASCII space). Its registration argument is zero on
this original caller, so the stream registration helper is not taken here.

The fill operation is more than assigning ASCII space. It obtains the current
locale through `0x30030b16`, resolves its character facet through `0x305f13e0`,
and performs an original virtual call. When the facet is absent, the actual
factory `0x305f0a30` allocates 24 bytes and calls `0x305f0700` to construct it.
That constructor sets vtable `0x3088dab4`, constructs the original C locale,
and obtains character-table state through `0x30670bba`. These dependencies must
be implemented from matching evidence before declaring fill conversion complete.

The facet acquisition helper allocates its facet identifier while holding the
original shared locale lock. It searches the retained locale facet array and
may fall back to the global locale. Newly created facets are retained and added
to the original shutdown list through `0x30670734`, which allocates eight-byte
nodes and registers callback `0x306706f1` on first use. Locale reference counts,
locks, allocation failure and shutdown ordering remain part of this continuation.

## Captured methods and validation

The generator adds 14 original methods: the initializer, output constructor,
basic-ios initialization/state/registration/fill routines, locale acquisition,
facet acquisition/factory/constructor/registration/shutdown, and output shutdown.
The Engine source bundle now contains 389 methods. This count describes captured
evidence, not executed behavior.

Local source/image checks passed: 159 tests across two files. The runtime is
unchanged by this evidence checkpoint and remains pending at `0x30791f4d`.
Complete native startup and campaign gameplay remain unfinished.

## Implemented initializer entry

The TypeScript continuation now executes the five original instructions from
`0x30791f4d` through CALL `0x30791f5b`. It retains the actual filebuf owner and
output-stream receiver and pushes the original arguments (filebuf, zero, one).
The pending constructor is `0x305f2650`; its return address is `0x30791f60`.
No constructor return or shutdown registration is manufactured.

A 56-byte BSS prefix at `0x30af6e58` is captured for the receiver. This is the
required prefix through virtual-base fill-character storage, not a claim about
the complete native object size. It is initially zero and fully known. The
frame snapshot records the live constructor receiver and arguments explicitly;
the generic thread snapshot intentionally omits this Engine image provenance.

Typechecking and the focused contiguous-initializer runtime case pass. The case
checks the original argument owners, flag values, pending call, unchanged receiver
bytes, existing locale and filebuf state, and idempotent pending startup. The
previous stack-position assertion was updated to the live constructor CALL,
which has pushed three arguments and a return address (16 bytes).

## Constructor continuation to basic-ios

The runtime now executes the original constructor from `0x305f2650` through
CALL `0x305f26bc`, pending at `0x305f21b0`. It preserves the saved FS exception
chain, pushes the actual handler, builds the cookie frame, saves ESI and installs
the exception frame using the original stack offsets. The caller's virtual-base
flag is proven to be one before taking the original nonzero branch.

The captured readonly table at `0x3088db28` contains displacement four. The
constructor installs that table at receiver offset zero and initially installs
the base vtable at offset four, then replaces it with the original derived vtable
at `0x3088da1c`. These are owned image pointers with unknown numeric address bytes,
not fabricated browser addresses. The table displacement is read from the actual
captured image and validated before either virtual-base calculation.

The basic-ios call receives the original filebuf and zero registration flag,
with ECX pointing to the stream receiver plus four and return address
`0x305f26c1`. Both constructor and basic-ios calls remain unreturned. FS stays
installed until the original cleanup can execute; the saved previous FS word
remains in the original frame. The snapshot records this saved word, original
constructor arguments, live base arguments and installed table pointer identities.

Typechecking and the focused contiguous-initializer case passed. The case checks
these owners and offsets, the original flag values, unchanged remaining receiver
bytes, table displacement, two unreturned calls and idempotent pending behavior.
Complete construction, locale/facet continuation and native startup remain pending.

## Basic-ios initial state and allocation caller

The continuation executes `0x305f21b0`'s call to `0x305f0ac0`. The base routine
saves its actual receiver and registers, zeroes the exception mask and counters,
sets original formatting flags `0x201` and precision `6`, and invokes state
setter `0x30046556` with zero state and zero rethrow flag. The captured entry
thunk leads to `0x30466f40`. Its normal path masks state with `0x17`, writes zero
state, tests the actual zero exception mask, and returns with RET 8 to
`0x305f0aec`. The exception-string branches are not used by this admitted caller.

The base initializer then pushes four and calls `0x306728e3`, return address
`0x305f0af3`. This allocation factory is the current pending boundary. The
constructor, basic-ios initialization and base initialization are still active;
only the state setter has returned. Locale allocation and reference retention
must complete before unwinding these callers.

The frame snapshot retains original constructor and basic-ios argument records
from their original call positions. It locates saved FS at the constructor's
original slot rather than a current-ESP offset, which changes during nested calls.
The requested four-byte allocation is exposed from the actual pending call stack.
The focused runtime case checks the written fields, actual calls and returns,
retained owners, saved exception state and idempotent pending behavior.

## Basic-ios owned locale allocation

The output initializer now uses the same captured throwing-allocation factory as
the existing streambuf initialization. The helper was moved into their common
scope without changing its native instruction sequence or ownership checks.
The original request of four bytes is verified at the actual malloc call.
The rounded-eight heap service supplies a canonical logical four-byte view;
the allocation is retained as `standardOutputStreamLocaleAllocation` and proven
separate from the earlier streambuf locale wrapper.

On success the factory returns to `0x305f0af3`, restores its EBP frame, and the
base initializer saves the allocation in EDI. The original comparison proves
this is a non-null owned allocation against the saved zero EBP. It then saves
EBX and calls `0x30670832`, return address `0x305f0b02`. Locale initialization is
the current pending operation; no locale pointer has been written into the new
wrapper yet and no reference count has been incremented for this wrapper.

On NULL the actual malloc call has returned but the original new-handler call
at `0x306728ee` remains active, pending at `0x306824b9`. The original allocation
caller has not returned and locale initialization has not been called. The new
failure case checks these call records, the unchanged receiver mask, initializer
cursor `0x208`, shutdown cursor 268 and idempotent pending result.

Typechecking passed. Three focused runtime cases passed: normal contiguous
initializer progression, the existing streambuf NULL path and the new basic-ios
locale NULL path. The startup suite now contains 504 cases; only these three
were run for this change. The full campaign remains unfinished.

## Existing global locale reuse and cleanup

The basic-ios initializer's call at `0x305f0afd` now executes the actual existing
locale path of `0x30670832`. The shared EH3 prolog and epilog helpers were moved
to their common scope without changing their instruction sequence. The prolog
captures the original handler, previous FS head, saved registers, EBP and cookie.
The actual retained global locale pointer is checked against its canonical
52-byte allocation before the non-null branch to `0x306708c4` is taken.

The initializer returns that same locale through the original EH3 epilog and RET
to `0x305f0b02`. The epilog restores the calling output-stream exception frame,
not a fabricated zero FS head. The new four-byte wrapper receives this exact
locale pointer. The getter at `0x3067063c` then returns the same global object to
`0x305f0b09`, and the base initializer pushes lock index zero, sets the original
stack-local lock receiver, and calls `0x30670503` at `0x305f0b10`.

That lock constructor is the current pending operation. The wrapper points to
the existing locale, but its reference has not yet been incremented: refcount is
still three, established by the earlier classic/global and filebuf setup. The
actual lock acquisition must complete before the base initializer retains it.
The frame snapshot exposes the wrapper's stored pointer identity separately from
the opaque raw address bytes.

Typechecking passed. Three focused runtime cases passed, covering the normal
continuation and both streambuf and basic-ios allocation failures. Checks confirm
the locale call and getter returned, the lock caller is pending, global locale
identity is preserved, reference count is unchanged, original constructor
arguments survive, and repeated startup retains the same pending result.

## Basic-ios locale retain and matched release

The runtime now executes the actual lock constructor at `0x30670503` for caller
`0x305f0b10`. Platform admission verifies the enclosing base-initializer call
`0x305f21b3`, the original lock index and array, and stack-local receiver at the
constructor CALL position plus 24. It does not admit arbitrary lock callers.

After the original EnterCriticalSection wrappers return, the base initializer
reads the live locale refcount and follows its original sentinel check. The
normal count increments from three to four. Its destructor caller at
`0x305f0b27` must refer to that same lock receiver, the returned constructor and
the exact acquired enter receipt. The original LeaveCriticalSection wrappers
then release that acquisition once; the section's held depth returns to zero.
The shared constructor/destructor instruction helpers were moved into their
common scope while retaining their original checks and instructions.

Base initialization stores the allocated wrapper at receiver offset `0x24`
(stream storage offset 40), restores the actual saved registers and returns to
`0x305f21b8`. Basic-ios then connects the original stdout filebuf at receiver
`+0x28` (storage 44), clears `+0x2c`, pushes fill character 32 and calls
`0x305f18c0`, return address `0x305f21cf`. Character-facet conversion is the current
pending operation. Basic-ios and the outer output constructor have not returned.

Typechecking and three focused runtime cases passed. The normal case checks
four completed locale enters and matching releases, count four, held depth zero,
actual wrapper and filebuf pointer owners, base return, pending fill call and
idempotent pending startup. The two NULL cases continue to retain their original
new-handler call. No full startup or campaign completion is claimed.

## Character facet virtual target and locale dependencies

The actual facet vtable is now captured from `0x3088dab4`, with seven four-byte
entries and readonly image admission. Its entry at byte offset `0x18` targets
`0x305f08a0`, matching the original virtual call at `0x305f195e`. The target has
two instructions: MOV AL from the caller's first byte argument, then RET 4.
The byte return is proven by native source; it does not justify bypassing the
original facet construction, ownership and acquisition.

The facet's deleting-destructor target at entry zero is `0x305f09e0`, also
captured. The constructor calls a native character-locale constructor through
`0x30022a70` (body `0x30466e10`), table acquisition at `0x30670bba`, and destruction
through `0x30032a33` (body `0x30466c00`). Their relevant allocation, locale-release,
string-duplication and finalization dependencies are now captured as well.

The character-table acquisition helper reads the current thread locale through
`0x3067a085` and `0x3067a039`. Both read the actual PTD locale pointer at offset
`0x6c` and locale-status flags at `0x70`; the latter returns the locale's table
pointer at offset four. A thread/global locale mismatch can call `0x3067a36b`.
These relationships must be represented by actual owned structures rather than
invented numeric memory addresses or a host locale assumption.

The Engine evidence bundle now has 399 methods. This checkpoint changes source
evidence and readonly facet-table admission. Runtime remains at `0x305f18c0`;
there is no new facet construction or widening execution claim.

## Fill exception frame and temporary locale acquisition

The fill routine now executes its original frame setup from `0x305f18c0` through
CALL `0x305f18eb`, return address `0x305f18f0`. It saves the original fill handler
`0x30728358`, prior FS exception-frame word, EBX/ESI/EDI and cookie, then installs
its own FS head. Its temporary locale output is the actual local at fill-entry
ESP minus 20, not a separately invented heap object.

The original locale acquisition thunk `0x30030b16` leads to `0x30465130`. The
continuation validates the basic-ios receiver and its owned four-byte wrapper,
loads the retained locale, saves registers, reads the actual caller output
argument and writes the exact locale pointer into that temporary local. It then
pushes lock index zero and calls `0x30670503` at `0x30465143`, with return address
`0x30465148`. This new caller's lock acquisition is pending; the reference count
remains four until acquisition succeeds.

Snapshots preserve the basic-ios receiver from its actual saved slot, the fill
routine's saved FS word, and the temporary locale pointer. The nested fill frame
keeps the outer output constructor's exception frame intact. No facet creation,
virtual widening call or character return has been manufactured.

Typechecking and three focused runtime cases passed. Checks confirm the nested
FS heads, temporary locale identity, original output argument, active fill and
locale-acquisition callers, pending lock and both original NULL allocation paths.

## Temporary locale retention and facet lookup caller

Locale lock admission now includes the original acquisition caller `0x30465143`
only with its actual enclosing call `0x305f18eb`. Its stack receiver is at the
constructor CALL position plus 20. The matching destructor at `0x3046515a` uses
the same receiver at destructor CALL plus 16; its enclosing caller and exact
returned enter receipt must also match before platform release is allowed.

The acquisition helper follows the original reference-count sentinel check,
increments the normal locale count from four to five, and releases the acquired
section. It returns the actual temporary output handle in EAX, restores EDI and
ESI, and executes RET 4 to `0x305f18f0`. The retained temporary locale remains
live and the original shared section's held depth returns to zero.

The fill caller validates this returned stack-local handle and its stored locale
owner, pushes the handle, marks its actual exception state zero, and calls
`0x305f13e0` at `0x305f18f9`, return address `0x305f18fe`. Facet acquisition is
the current pending operation. It must finish before the temporary locale can
be released and the original virtual widening call can execute.

Typechecking passed. Three focused runtime cases passed. The normal case confirms
five completed locale enters and five matching releases, count five, unchanged
locale identity, returned acquisition helper, restored saved register state,
pending facet lookup and idempotent startup. Both allocation NULL cases remain
at their original new-handler call. Complete startup and campaign play remain
unfinished.

## Original mutable facet globals

Four separate four-byte images are now captured and owned by the Engine runtime:

| Original address | Image | Native use |
| --- | --- | --- |
| `0x30af6a04` | `standardCharacterFacetCache` | Existing character facet reused by acquisition |
| `0x30af6de0` | `standardLocaleFacetIdentifierCounter` | Shared facet identifier counter |
| `0x30af6de4` | `standardCharacterFacetIdentifier` | Character facet identifier allocated under the locale lock |
| `0x30af6dd4` | `standardLocaleFacetShutdownHead` | Head of owned eight-byte shutdown-list nodes |

The pinned PE proves each image has zero file-backed bytes and four loader-zero
bytes. All four therefore begin as known zero BSS, not unknown pointers or seeded
facet instances. They remain mutable owned images; the facet vtable remains
readonly. The cache is distinct from the adjacent filebuf global state, and the
shutdown list is distinct from the existing global locale pointer and reserved
atexit slot pool.

Source/image checks passed (159 cases across two files), and typechecking passed.
The captured fields provide the inputs required by the original acquisition and
registration routines. This checkpoint does not execute those routines; runtime
remains at `0x305f13e0`. Original identifier allocation, facet construction and
shutdown ownership still need their native continuation implemented.

## Facet acquisition exception frame and outer lock caller

Facet acquisition now executes the original instructions from `0x305f13e0`
through CALL `0x305f140c`. It saves handler `0x307282b8`, the fill routine's FS
head and EBX/ESI/EDI, reserves 24 local bytes, pushes the original cookie, and
installs its own exception-frame head. The saved fill frame remains intact.

The routine pushes original lock index zero and selects its original local lock
receiver at entry ESP minus 28. It then calls `0x30670503`, with return address
`0x305f1411`. This facet lookup caller's lock is currently pending. Identifier
allocation, cache selection and facet construction have not been executed, and
the temporary locale's reference count remains five.

Typechecking and three focused runtime cases passed. The normal case verifies
the facet, fill and output-constructor exception-frame relationship, retained
temporary locale, preserved base receiver, pending original lock call and
idempotent startup. Both original allocation-failure cases still retain their
new-handler boundary. This change is local and does not prove complete startup
or campaign gameplay.

## Outer facet lock and nested identifier caller

Lock admission now permits the original outer facet constructor caller
`0x305f140c` only with enclosing facet lookup call `0x305f18f9`. Its actual
stack-local receiver is constructor CALL plus 32. The original enter wrapper
returns and the shared locale section is held at depth one.

Facet lookup reads the actual initial identifier and cache images. Both are
zero in this original startup path. It marks its exception state zero, saves the
empty cache in its actual local and follows the identifier-zero branch. It then
pushes lock index zero, selects its second local lock receiver and calls
`0x30670503` at `0x305f1432`, return address `0x305f1437`.

That nested identifier lock is pending. The outer acquisition remains live;
the routine has not allocated an identifier or facet, and the temporary locale
refcount remains five. A nonzero identifier retains the original pending branch
at `0x305f145b` rather than assuming first-time initialization.

Typechecking and three focused runtime cases passed. The normal case checks six
returned enters, five returned leaves, current held depth one, the returned outer
constructor and pending nested constructor, preserved frames and idempotent
startup. Both NULL allocation cases remain at their original new-handler call.

## Native facet identifier allocation under the nested lock

The nested constructor caller `0x305f1432` is now admitted only under the actual
facet lookup call `0x305f18f9`, with receiver at constructor CALL plus 28. The
original shared section enters recursively. The routine rechecks its actual
identifier image while this nested acquisition is held. If still zero, it reads
the original counter, performs the native DWORD increment, and stores the result
into both counter and character-facet identifier. The normal first identifier is
one; it is produced by original stores rather than seeded during image creation.

The destructor caller `0x305f1456` uses receiver at destructor CALL plus 24 and
must match that exact nested constructor and returned enter receipt. Its original
leave wrappers release only this nested acquisition. The outer facet acquisition
remains held at depth one. The next pending instruction is `0x305f145b`, where
facet lookup will read the temporary locale and search its facet array.

Typechecking and three focused runtime cases passed. The normal case checks the
counter and identifier are one, seven returned enters, six matching leaves,
held depth one, returned nested constructor/destructor, retained temporary locale
and idempotent pending startup. Both original allocation NULL paths remain intact.
Facet lookup, construction and full startup are still incomplete.
