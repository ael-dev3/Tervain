# SharedBase initializer source

Original `SharedBase.dll` evidence for the next startup boundary,
`100adb5a -> 100aa632`. This package captures 39 function bodies,
662 instructions and 1,927 instruction bytes. It executes no native code and
does not establish successful browser initializer execution.

## What startup requires

1. A non-NULL floating-point hook at `100ed568` points to `100a78fe`.
   Its slot belongs to the nonwritable `.rdata` section. The original initializer
   checks image ownership before calling it. The hook installs conversion
   functions, queries SSE2 support and clears floating-point exceptions.
2. `100b4407` encodes ten conversion-function pointers.
3. `100aa47d` walks 135 error-table slots at `100e545c..100e5678`.
   Five are non-NULL, at indices 65–69: `100a7265`, `100b1854`,
   `100b4b6b`, `100bef05`, `100ce0f5`. A nonzero result stops startup.
4. The caller registers RTC termination `100bb8e7` through atexit.
5. The void table at `100e5000..100e5358` has 214 slots and seventeen
   non-NULL callbacks. Preserve their indices and order, including NULL gaps.
   These callbacks include exit registration, critical-section initialization
   and object construction; displaying extracted assets does not run them.
6. The dynamic TLS hook at `102f858c` is zero in the cold loader-filled image.
   A live non-NULL hook requires the original ownership check and call `(0,2,0)`.

The tables' ends are exclusive. Cold bytes are source evidence, not captured
live process state. `source.json` retains table slots, callback entries,
section headers, relevant cold globals and 69 CALL sites with direct targets
or import identities where available.

## Evidence and recovery

ASM and available C excerpts are checked against the exact original DLL.
Five callback bodies have original disassembly but no standalone C export.
Four void callbacks were absent from that export and disassembly; Capstone
5.0.7 recovers their reachable instructions directly from the original PE.
Every direct branch in those bodies is recovered, overlapping instructions are
rejected, and unknown indirect branches fail preparation. Calls retain their
dependency targets; this recovery does not recursively implement those callees.

## Reproduce

Use the matching read-only local study and an isolated Capstone 5.0.7 directory:

```powershell
python tools/gothic3/prepare_shared_initializer_source.py `
  --study "<Gothic3_Decompiled_Study_2026-10-04>" `
  --output assets/gothic3/shared-initializer-source `
  --capstone-path "<directory-containing-capstone>"
```

Run `npx vitest run tests/gothic3-dialogue/shared-initializer-source.test.ts`
to check the committed package. The browser still stops before this initializer;
its runtime frames, dependencies, callbacks and enclosing CRT attach need
implementation before live Game startup can proceed.
