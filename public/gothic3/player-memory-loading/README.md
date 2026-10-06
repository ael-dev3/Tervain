# Original PlayerMemory loading evidence

This is an offline evidence checkpoint, not an implemented factory or a loaded
Hero. The native allocator `20327f10` calls the no-argument export `20036cdc`,
whose actual body `2031e9c0` constructs 184 bytes with tag `0xc4`. The copy
overload `2000cce3` is not used for fresh allocation. Ordered PE initializer
pointers and registrar stores establish 25 fields, while the current Hero
stores 24; `IsConsumingItem` must keep its native default. The 1,617-byte packet
contains a 1,125-byte native version 5 read with 15 nested attributes.
Every selected body range and every
captured instruction is checked against immutable original PE bytes, including
discontiguous ranges. The nested record/string proof is checked against the
original world, not trusted as a substitute for executing its native reader.

The remaining factory must construct and then destroy the original default
attributes before loading the stored ones, preserve map nodes and reference
lifetimes, and share the resulting actual attribute objects with startup/HUD/
combat. It must retain real allocation, CString, localization and logging
services at their original call sites. Captured supporting bodies and service
methods do not imply runtime implementations, world residency or completion.

Reproduce from this source revision:

```powershell
python -B tools/gothic3/research_player_memory_loading.py --study $study
```

The producer only reads original inputs and writes its two owned namespaces.
No native execution, tests, build, browser, deployment or playthrough occurs.
Its self-excluding evidence receipt pins the producer, imported helpers,
previous schema/packet evidence and every current owned output.
