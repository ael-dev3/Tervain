# SharedBase DLL entry evidence

Read-only original-byte capture of six functions (252 instructions), including
entry thunks, imports, hashes and initial image bytes. Captured functions are
not yet executed by the browser runtime.

## Startup chain

- CRT wrapper `100adc25` checks the optional hook at `100ed680` (NULL in the original image), calls CRT attach, then calls `10008a76`.
- DLL entry thunk `10008a76` resolves to `100a1630`. Guard `102f48f0` controls initialization of object `102f48ec`; both start at zero. DLL entry returns one with `RET 0xc`.
- Initializer thunk `10006645` resolves to `100a1590`. It initializes four local output words to zero, queries `sharedbase.dll`, and logs separators and the compile version.
- Version query `10008058` resolves to `1004c580`. Imports include `lstrcpyA`, `LoadLibraryA`, `GetProcAddress` and `FreeLibrary`. Its procedure-call and fallback dependencies still require implementation.
- Logging thunks resolve to `100497f0` and `10049850`; their formatting, output and cleanup callees still require implementation.

The next runtime work must retain the outer wrapper's SEH frame and actual
version-query output storage, then implement its dependency chain. A successful
CRT helper return alone does not prove complete DLL startup.

## Reproduce

```sh
python tools/gothic3/prepare_shared_dll_entry_evidence.py --study "PATH_TO_STUDY" --output assets/gothic3/shared-dll-entry-source
```

The generator checks the original SharedBase DLL SHA-256 before capture. A
second independent output directory reproduced `source.json` byte for byte.
