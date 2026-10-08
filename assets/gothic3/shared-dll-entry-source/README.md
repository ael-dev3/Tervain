# SharedBase DLL entry evidence

Read-only original-byte capture of nine functions (497 instructions), including
entry thunks, imports, hashes and initial image bytes. Captured functions are
not yet executed by the browser runtime.

## Startup chain

- CRT wrapper `100adc25` checks the optional hook at `100ed680` (NULL in the original image), calls CRT attach, then calls `10008a76`.
- DLL entry thunk `10008a76` resolves to `100a1630`. Guard `102f48f0` controls initialization of object `102f48ec`; both start at zero. DLL entry returns one with `RET 0xc`.
- Initializer thunk `10006645` resolves to `100a1590`. It initializes four local output words to zero, queries `sharedbase.dll`, and logs separators and the compile version.
- Version query `10008058` resolves to `1004c580`. Imports include `lstrcpyA`, `LoadLibraryA`, `GetProcAddress` and `FreeLibrary`. The export table has 4,805 named exports and no `DllGetVersion` match. The installed module therefore uses the captured resource fallback.
- Logging thunks resolve to `100497f0` and `10049850`; their formatting, output and cleanup callees still require implementation.

The next runtime work must retain the outer wrapper's SEH frame and actual
version-query output storage, then implement its dependency chain. A successful
CRT helper return alone does not prove complete DLL startup.

## Installed version resource

The original resource path is type 16, name 1, language 1031. Its 868 bytes
have SHA-256 `2b94742476a11cd051b72d535033a373ab7d4ddb68ec2ecda3cdf459e59974d3`.
The `FileVersion` text is `1, 60, 25931, 29`; translation bytes are `0000b004`.
The package preserves raw resource bytes and the parsed block hierarchy.

Fallback `1004c4c0` queries resource size, allocates and reads the buffer, and
calls `1004c2c0` to query translation and `FileVersion`. It then calls
`1004c420`, which tokenizes the version string using delimiter `,` and converts
up to four tokens to integers. It releases its buffers through the original
heap calls. These bodies and dependencies still require runtime execution.

## Reproduce

```sh
python tools/gothic3/prepare_shared_dll_entry_evidence.py --study "PATH_TO_STUDY" --output assets/gothic3/shared-dll-entry-source --runtime-output src/gothic3/native-shared-dll-entry-instructions.ts
```

The generator checks the original SharedBase DLL SHA-256 before capture. A
second independent output directory reproduced `source.json` byte for byte.

The generated instruction table preserves all 497 body instructions and entry
thunks. Four focused source checks and typechecking pass. Both generated
outputs reproduce byte for byte. Runtime execution is still pending.

## Explicit host resource API observation

The hash-matching installed DLL was inspected through Windows VERSION.dll
resource APIs without loading or executing Gothic code. On the recorded host,
`GetFileVersionInfoSizeA` returned 1,740 bytes and cleared the handle to zero.
After `GetFileVersionInfoA` initialized that allocation, translation query
returned offset 864, length 4; ANSI FileVersion query returned offset 1,200,
length 17, bytes for `1, 60, 25931, 29` including the terminator.
The observation preserves the prepared buffer after these two queries. Its
layout is an explicit host selection and is not asserted for every Windows
version or every query order.

Microsoft explains why the prepared buffer must include ANSI conversion space:
[prepared version buffers](https://devblogs.microsoft.com/oldnewthing/20070731-00/?p=25783).
The [API contract](https://learn.microsoft.com/en-us/windows/win32/api/winver/nf-winver-getfileversioninfosizea)
requires the size returned by the API. Raw PE resource size must not be used as
that allocation size. Browser import execution remains pending.

Reproduce the explicit Windows selection with:

```sh
python tools/gothic3/capture_shared_version_api.py --binary "C:/Program Files (x86)/Steam/steamapps/common/Gothic 3/SharedBase.dll" --output assets/gothic3/shared-dll-entry-source/windows-version-api-observation.json
```

The initialized buffer and query mutation receipts are retained separately.
Translation changes no bytes; FileVersion changes 16 bytes in the prepared
ANSI area. Two independent captures matched exactly on the recorded host.
Six focused source checks and typechecking pass.

## Recorded version-resource backend

`native-shared-version-resource.ts` retains one explicitly selected host
observation per constructed runtime platform. It writes the initialized buffer
into a canonical live allocation, applies the observed query mutations and
returns physical aliases of that allocation. It requires the recorded filename,
size, query sequence and unchanged prepared bytes. Foreign allocations and
ended lifetimes are rejected. Seven backend checks and six source checks pass,
as does typechecking. Original DLL import call-frame integration remains pending;
this backend alone does not establish startup completion.

The backend tracks independent allocation bases, including the outer resource
buffer and the nested helper's size-plus-one allocation. Freeing the nested
buffer preserves the outer buffer's query state. Reinitialization resets the
selected query sequence for that allocation.
