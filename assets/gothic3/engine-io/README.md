# Engine CRT I/O initialization source

Original `Engine.dll` entry `306886ec` is the current browser startup boundary.
This package captures five verified bodies: I/O initialization (186 instructions,
562 bytes), EH4 prologue `3067e500` (21 instructions, 69 bytes), and calloc wrapper
`3067ca01` (26 instructions, 72 bytes), EH4 epilogue `3067e545` (11 instructions,
20 bytes), and critical-section helper `30696484` (50 instructions, 147 bytes).
The DLL hash, catalog/disassembly hashes,
instruction bytes, imports and original data images are retained in `research.json`.

Reproduce from the repository root:

```powershell
python tools/gothic3/prepare_engine_io_source.py --study '<matching study directory>' --output assets/gothic3/engine-io/research.json --typescript src/gothic3/native-engine-io-source.ts
```

The matching study has `00_Original_Runtime/Engine.dll` and the function catalog
and disassembly under `01_Decompiled_Code/Engine_dll/`. Independent regeneration
into a separate file compared byte for byte on 10 October 2026.

## Original initialization order

1. Enter the actual EH4 frame with scope table `30956c00` and local size `0x54`.
2. Call `GetStartupInfoA` at `30688701` with the physical 68-byte local structure.
3. Allocate 32 records of 56 bytes through the actual Engine calloc wrapper:
   1,792 bytes at `30688714 -> 3067ca01`.
4. Store count 32 in `30af7cdc` and the allocation in the first slot at `30af7d20`.
   Initialize each record's handle, flags, text markers and section-count fields.
5. Read inherited descriptors only if the startup-info reserved block exists.
   Further blocks, handle validation and critical sections follow their original
   branches. The pointer table has 64 slots; inherited count is capped at 2,048.
6. Resolve the first three standard handles, their file types and needed critical
   sections. Call `SetHandleCount`, restore the frame and return the actual result.

The original caller tests that result at `3067726b`. A negative result calls
`3067dfb8`; a nonnegative result reaches `30677276 -> 3068e76f`.

## Implementation work remaining

The generated TypeScript module admits the exact source receipt. The retained
Engine bootstrap now owns the source-backed count, pointer table and EH4 scope
through `NativeEngineIoImages`. Mutable count/table storage is retained without
reseeding; changed scope bytes, foreign owners and released or replaced storage
are rejected. This establishes cold image ownership, with no I/O execution yet.
The Engine frame, startup-info output, record allocations, critical sections and
opaque handle capabilities must be connected to their actual owners. Implement
the captured epilogue and section helper, and capture their remaining reached
dependencies before claiming a normal I/O return. Preserve explicit
boundaries for inherited-handle paths and exception dispatch until implemented.
