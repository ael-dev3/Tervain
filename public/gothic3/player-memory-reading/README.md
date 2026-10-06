# Original PlayerMemory reading

This bounded detached factory/read reconstruction uses the real 184-byte
tag-0xc4 fresh allocation 20327f10 → 20036cdc → 2031e9c0. The copy constructor
2000cce3 → 2031e440 is distinct. Original PE registration order proves 25
fields; the original Hero property table stores 24, leaving IsConsumingItem
at its actual false default. The 1,617-byte Hero packet has a 1,125-byte native
version 5 read containing 15 attributes. The native GetVersion export returns
6 and the property set selector returns 60; their original forwarding and
body bytes are audited independently. All 197 focused nested record checks
and their independently decoded indexed strings are freshly compared with
the original world; prior seeds and cloned excerpts do not substitute for
these reads.

Actual descriptor defaults are pinned separately: bool/scalar zero writes,
array destination getters without payload mutation, random PropertyID creation
and mutable WeaponConfig copying. The live enum value is not inferred from
cold PE or virtual zero-fill storage. CString hashing consumes actual physical
character/NUL bytes with known mask, uses signed MOVSX characters and uint32
multiply33, and has an original file-backed empty literal proof. The pure
helper is source code, never evidence of native execution.

Construction and loading retain real map nodes, CString/header/refcounts,
NativeAttribute references and the same objects used by startup/HUD/combat.
Frontend use requires actual memory/reallocation, PropertyID, mutable-global,
localization, logging and terminal-lifetime services at their source callbacks.
The factory/read profile remains detached; this checkpoint does not establish
world residency, complete progression or a native game playthrough.

All cataloged excerpts use complete inclusive original PE body ranges,
including discontiguous ranges. Supporting captured source entry counts are
not implemented feature counts. Reproduce with `python -B
tools/gothic3/research_player_memory_reading.py --study $study --capture-only`
while runtime work is active; omit --capture-only only after runtime freeze.
The self-excluding current receipt then pins runtime, producers, imported
helpers, source dependencies and owned outputs. No native code, tests, build,
browser, remotes or Actions run.
