# SharedBase initializer source

Original `SharedBase.dll` evidence for the next startup boundary,
`100adb5a -> 100aa632`. This package captures 51 function bodies,
896 instructions. It executes no native code and
does not establish successful browser initializer execution.

## What startup requires

1. A non-NULL floating-point hook at `100ed568` points to `100a78fe`.
   Its slot belongs to the nonwritable `.rdata` section. The original initializer
   checks image ownership before calling it. The hook installs conversion
   functions, queries the Pentium floating-point division erratum and clears
   floating-point exceptions. The selected caller passes zero, so the later
   conditional default-precision call is skipped when that query returns.
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
section headers, relevant cold globals and 98 CALL sites with direct targets
or import identities where available.

The committed TypeScript runtime now enters cinit, executes the original image
validation and section lookup, restores FS and installs the ten conversion
function addresses. It now executes the original division-erratum query at
`100b448b`, reads the actual module/procedure name storage and uses retained
virtual import slots. `GetModuleHandleA`, `GetProcAddress` and the feature call
retain original stdcall cleanup of 4, 8 and 4 bytes. The query returns its
selected BOOL and the caller publishes it at `102f6424`. FNCLEX at `100a7919` clears the owned x87 exception status bits while
preserving all other unknown bits. The hook returns and reaches the next
error table after cached conversion encoding. Its first callback allocates and
publishes the encoded exit table; the second uses the actual initialized
multibyte flag. The third executes its processor probe using an explicit virtual
CPU selection. The normal SIMD path owns the original EH4 prologue/epilogue,
checks the live scope bytes, copies unknown XMM1 state to XMM0 and returns the
source result. The fourth callback `100bef05` allocates the FILE vector, fills its first twenty
slots with aliases of the original FILE image and updates the first three
records from the owned descriptor block. Its allocation fallback returns 26 on
double failure. The fifth callback repeats the probe and publishes its result
to the live memcpy flag. The normal error table returns zero and reaches RTC
registration `100aa676 -> 100a72d0`. The selected normal registration path now
executes atexit/onexit, locks the retained critical section at index 8, decodes
the owned exit pointers, queries the actual allocation capacity through
HeapSize and appends the encoded RTC callback. It publishes the cursor at
offset 4, releases the lock and restores both original normal SEH frames.
The next boundary is the first void callback at `100aa692 -> 100e1660`.
Growing the table, decoder fallback resolution and exception dispatch remain
unimplemented. Registering the RTC address does not execute its shutdown body. Missing CPU
selection stops at PUSHFD; missing CPUID leaves and SIMD exception dispatch
remain explicit boundaries. Enclosing CRT attach and live Game startup are
unfinished. Header rejection and a NULL hook preserve their original skip paths.
Source code addresses stored by installation grant no browser callback authority.

The browser profile explicitly selects the processor export and erratum false.
This is a virtual process contract, not a measurement of the host CPU or a
captured Windows result. Missing export availability or result selections stop
at the actual unresolved call. A NULL module or absent export follows the
original tail jump into the x87 fallback frame and stops before FLD at
`100b4455`; no fallback arithmetic result is fabricated. Procedure identities
are bound to the same platform, and forged import slots are rejected.
Feature 0 means `PF_FLOATING_POINT_PRECISION_ERRATA` in
[Microsoft's API contract](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-isprocessorfeaturepresent).

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
  --capstone-path "<directory-containing-capstone>" `
  --runtime-output src/gothic3/native-shared-initializer-instructions.ts
```

Run `npx vitest run tests/gothic3-dialogue/shared-initializer-source.test.ts`
to check the committed package and generated syntax. Its remaining dependencies,
callbacks and enclosing CRT attach need implementation before live Game startup
can proceed. The 808-byte cold PE header supplies actual DOS/NT magic, optional
header size, section count/ranges and write flags for the ownership check.

## Pointer encoder dependency capture

The evidence package now also retains original availability helper `100ae20f`,
its CALLs to the version reader and section-name comparison, KERNEL32.DLL and
EncodePointer literals, the cold TLS indices and TlsGetValue import slot. These
are original cold inputs, not live initialized indices or import capabilities.
The cached-PTD path and fallback resolution must preserve original CALL/RET,
callee cleanup and the procedure capability before conversion addresses can be
encoded. The cached PTD path now encodes all ten pointers and returns. The runtime stops
at `100aa664 -> 100aa47d`; a NULL getter still stops at fallback module lookup
`100ae2b4`.

The original error-table walker now reads live slots, skips the leading 65 NULL
entries and enters the first callback at `100a7265`. Normal execution stops at
its original calloc CALL `100a726a -> 100aef10`. An all-NULL live table returns
zero and reaches the unimplemented atexit CALL. Captured callback bodies still
do not imply their execution has completed.

The first error callback now enters the original calloc wrapper, uses the
existing translated selected lower calloc path, encodes and publishes its
128-byte exit table, initializes its first DWORD and returns zero. Execution
reaches the second callback `100b1854` through `100aa490`. Allocation failure
encodes NULL, publishes the original failure prefix and returns cinit result
24 to the still-unimplemented attach continuation at `100adb5f`. Positive
Sleep retry and unsupported heap paths remain explicit boundaries. The lower
calloc translation does not establish original x86 SEH traversal.

The second callback now reads the actual initialized multibyte flag and returns
through its nonzero branch. The third callback clears its processor flag and
enters the retained probe frame at `100ce095`. It stops before PUSHFD at
`100ce0a8`: full flags, ID-bit probing, CPUID and SIMD state remain unimplemented.
A cleared multibyte flag retains its original repeated-initialization CALL.

The processor scope's original filter and handler targets are recovered directly
from PE bytes with Capstone. The filter recognizes access violation and illegal
instruction; the handler clears the result local and rejoins the normal
epilogue. Their branch closure and per-instruction byte identities are audited.
This remains source evidence: exception dispatch is not executed yet.
