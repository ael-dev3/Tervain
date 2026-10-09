# Original Game pointer demangler evidence

`source.json` captures six complete functions (1,077 instructions) from the
matching original `Game.dll`, with byte verification, addresses and input hashes.
Regenerate it with `tools/gothic3/prepare_game_pointer_demangler_source.py` using
the local decompiled study directory. The generated TypeScript module admits the
exact captured JSON before the selected runtime branch executes.

The current implementation selects only a `PAV` class-pointer template argument:
`P` supplies an empty const/volatile prefix, `A` supplies ordinary data indirection,
and `V` selects the existing class-name branch. It constructs the pointer DName,
preserves its qualifier bit and composes it with the parsed class DName using the
original operations. Other pointer grammar remains unsupported.

The original initializer `204b1620` now reaches the SharedBase CString allocation
for 52 bytes. The original allocator dispatch table maps requests 49..56 to
`1000196a -> 10048370`; that pool is not yet admitted. The initializer therefore
still does not return. This evidence does not establish completed startup,
world/NPC activation, saves or a finishable campaign.

The capture's `executionAdmitted: false` describes the entire source package:
capturing all function instructions does not admit all their branches. Runtime
admission is limited to the selected branch described above.
