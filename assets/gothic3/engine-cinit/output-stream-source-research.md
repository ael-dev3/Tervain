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
