# Original Engine byte-copy dependency

The ANSI environment branch calls Engine's memcpy at
`3068e945 -> 30671cf0`, with the actual allocated output, OS input and byte
count. Its caller cleans up three arguments and releases the OS input through
`FreeEnvironmentStringsA` at `3068e94e`, IAT `30afc750`.

This package captures the matching DLL's 247 instructions and 711 instruction
bytes, six dispatch images and loader-zero SSE flag `30af7e68`. The scalar
routine includes forward copying and backward copying for overlap. Table
targets and imports are taken from Engine's bytes. The vector tail at
`3067fda9` is a separate dependency. Some alignment table cells contain
instruction tails rather than selectable branch targets; runtime admission
must distinguish them.

Reproduce with your matching study directory:

```powershell
python tools/gothic3/prepare_engine_byte_copy_source.py --study '<matching study directory>' --output assets/gothic3/engine-byte-copy/research.json --typescript src/gothic3/native-engine-byte-copy-source.ts
```

The generated module admits the exact receipt. `NativeEngineCrtByteCopy`
translates the scalar routine with Engine's instruction addresses and retained
dispatch images. Every reached source operation is checked against its captured
instruction. Each load/store uses current same-platform allocator or process
storage and preserves byte knowledge. Overlapping spans copy in the original
direction, including STD/REP/CLD. Changed table targets or storage stop without
replaying the applied prefix. Numerical source addresses are metadata and do
not grant host memory access.

Engine's ANSI environment branch now calls this owner with its actual output
allocation and process-input block. It releases input only after copying
returns and returns that same allocation. A failed copy retains the allocation,
written bytes and unreleased OS input. The separate Game owner supplies no
Engine memory or instruction authority. Matching Game and Engine routines were
compared instruction by instruction during adaptation: all 247 operations
correspond after accounting for their actual module addresses.

The current flag and dispatch views are retained per Engine CRT and exposed
through the owner's checked image getter for subsequent integration. Engine's
later CPU initialization must use that same flag view. Vector execution,
shutdown-drain admission and a complete Engine attach remain unfinished.
