# Engine CRT environment source

This package captures the matching installed Engine.dll routine `3068e828`:
130 instructions and 304 body bytes, verified against the original PE. It also
records the six referenced KERNEL32 imports, loader-zero mode `30af7908`,
loader-zero result pointer `30af70d4`, and the caller/store/next-call bytes.

Reproduce from the repository root:

```powershell
python tools/gothic3/prepare_engine_environment_source.py --study '<matching study directory>' --output assets/gothic3/engine-environment/research.json --typescript src/gothic3/native-engine-environment-source.ts
```

The study directory contains `00_Original_Runtime/Engine.dll` and
`01_Decompiled_Code/Engine_dll/` with its function catalog and disassembly.
The generator checks the pinned DLL hash and each captured instruction's bytes.
Independent regeneration into a separate file compared byte for byte on
10 October 2026.

The routine probes the wide API, retaining selection in its own mode global.
Error 120 selects the ANSI API. Both paths scan the double-NUL input block,
allocate CRT-owned output, and release the OS block. The wide path measures and
performs conversion; conversion failure frees the allocation. Direct native
dependencies are allocation `3067c9c1`, free `30672f8a`, and copy `30671cf0`.
Their execution requires separate ownership and source evidence.

The generated admission pins the original package text. The browser bootstrap
now invokes `NativeEngineCrtEnvironment` for the actual Engine CRT, independently
of Game's environment mode. The translated prefix selects and scans wide or ANSI
input, measures wide conversion, and retains the pending allocation call at
`3068e8c2` (wide) or `3068e92a` (ANSI). NULL inputs return NULL. A zero conversion
measurement releases wide input before returning NULL; the original raw release
BOOL is ignored. Completed calls permit another physical invocation, while a
blocked call preserves its state and cannot replay the prefix.

Output allocation, fill conversion, ANSI copy and allocation cleanup remain
unconnected. Once the routine
returns, its original caller stores EAX at `30af70d4` and calls `306886ec` at
`30677266`; this package does not establish that those operations execute.
