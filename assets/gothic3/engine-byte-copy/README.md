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
python tools/gothic3/prepare_engine_byte_copy_source.py --study '<matching study directory>' --output assets/gothic3/engine-byte-copy/research.json
```

The package is evidence only. Engine environment capture still stops at the
ANSI memcpy call. Runtime copying must use Engine's live allocation and the
actual process-input block, preserve byte knowledge and overlap direction,
validate current dispatch storage and retain any applied prefix at a boundary.
It must release input only after the real copy returns. Game's similar routine
does not provide Engine instruction addresses or memory authority.
