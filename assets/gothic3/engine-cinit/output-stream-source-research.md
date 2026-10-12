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
