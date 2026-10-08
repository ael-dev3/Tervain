# SharedBase initializer source

Original `SharedBase.dll` evidence for the next startup boundary,
`100adb5a -> 100aa632`. This package captures 55 function bodies,
1,021 instructions. It executes no native code and
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
section headers, relevant cold globals and 107 CALL sites with direct targets
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
The first two void callbacks register `100e30f0` and `100e26d0` through the
same path and advance the cursor to offset 12. The next boundary is the
string-construction initializer at `100aa692 -> 100e1510`. The static-value
copy now moves four live DWORDs from `100ebb28` to `101ab150`, preserving
unknown bits. The following six registration wrappers append their callbacks
in original order, bringing the exit cursor to offset 40. The preceding critical-section
initializer initializes its original 24-byte storage through the retained
InitializeCriticalSection import and registers `100e2810`, advancing the
exit cursor to offset 16. The virtual platform owns the section; post-call
storage remains opaque and the void return register remains unknown.
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


The Root initializer now enters `10003ba7 -> 100135f0`, scans the live
five-byte literal at `100e9b5c`, and enters Alloc through
`10007d65 -> 10013240`. Its normal four-character path requests thirteen bytes
and enters `10013257 -> 10002aae`, MemoryAdmin::GetInstance. Both thunks and
bodies are byte checked. Empty text follows the original NULL-holder store and
RET 4 cleanup; allocation and the enclosing initializer remain incomplete.


MemoryAdmin GetInstance now executes its original guard and flag stores in
owned static storage at `10142798`, registers shutdown `100e2710` in the live
exit table and returns the singleton pointer `101427a0`. A set guard skips
registration. The normal exit cursor is offset 44. The next boundary is
`1001325e -> 10003cd8`, Malloc; allocation and full startup remain incomplete.


Malloc now follows its three original entry thunks, owns the original exception
scope and FS-linked stack frame, and initializes/enters its actual heap critical
section at spin count 1,000. The next pending CALL is `1003d474 -> 10001028`,
the lower heap dispatcher. The normal prefix retains the entered lock and
exception frame; no allocation, release or return is fabricated. Exception
dispatch and the full initializer remain incomplete.


## Lower allocator source evidence — 8 October 2026

The package now captures the lower heap dispatcher (`10001028 -> 1003d2f0`),
the 16-byte pool dispatcher (`10002d97 -> 10047f10`), its block initializer
(`100061cc -> 10045da0`) and bitmap allocator (`1000605a -> 1003e090`). The
pool dispatcher's C export is unavailable; its original disassembly and thunk
bytes are checked directly against the installed PE.

The full 4,097-DWORD table at `102fb050` maps requested sizes to pool callbacks.
Request 13 selects `10002d97`; a failed VirtualAlloc reaches the indirect jump
through `102fb094`, selecting the next pool. Cold count/list/peak storage at
`102ffd58`, descriptor at `102ffef0`, descriptor-list root at `102fb004`, and
stride/capacity at `100e7aa8` are captured separately from live state.

The first cold pool requests VirtualAlloc(NULL, 0x102000, 0x103000, 4) through
IAT `102f9680`. The block initializer allocates a 20-byte descriptor, sets four
original callback addresses, fills the 8,192-byte bitmap at region offset
0x100000, masks its last DWORD with 0x7fffffff, links the region into the pool
list and registers the payload. The bitmap allocator uses the original scan,
bit selection and locked bit-clear sequence; its slot stride is 16 and its
capacity is 65,535.

These four bodies are source evidence only and are not admitted to the live
initializer instruction interpreter. The runtime still stops at
`1003d474 -> 10001028` with Malloc's lock and exception frame active. Executing
the dispatcher, owning the VirtualAlloc region, initializing its metadata and
returning a real slot remain the next implementation work.


## Live lower dispatch and pool reservation — 8 October 2026

The lower heap and 16-byte pool dispatcher bodies and their original thunks are
now admitted to the live initializer. The owned dispatch table retains all
4,097 original callbacks; the executed path reads its live size-13 slot. Pool
count/peak/list share the original contiguous twelve-byte storage.

The original VirtualAlloc CALL at `10047f74` validates NULL address, 0x102000
bytes, flags 0x103000 and protection 4, invokes the selected platform and proves
that its returned region belongs to that platform's private virtual-allocation
registry and geometry and was newly allocated during this invocation. Returning
an earlier same-platform region is rejected. The same backing becomes the retained SharedBase local
view. Successful stdcall cleanup consumes sixteen argument bytes; EAX and ECX
carry the actual region into pending `10047f7c -> 100061cc`.

NULL return follows the source pops and indirect jump through `102fb094` to the
unimplemented next pool. An unknown endpoint, foreign import or foreign, freed,
CRT-owned or replaced backing retains the applied prefix and pending operation.
Normal reservation leaves the heap lock and Malloc exception frame entered.
Pool block initialization, descriptor registration, bitmap slot selection and
allocation return are still unfinished. Their captured bodies remain source
only; reservation alone does not complete CString construction or startup.


## Live descriptor construction — 8 October 2026

The block initializer now enters original CRT operator new at `100aabd2` and
malloc at `100aaaf6`. Its normal 20-byte request follows the live heap-selection
branch and calls the original HeapAlloc IAT at `102f9684`. The same live
SharedBase CRT heap owns the fresh backing. The private platform receipt must
match that heap, flags 0 and the actual requested size. Returning earlier,
foreign or differently allocated storage does not grant a descriptor pointer.
The bridge supports normalized CRT sizes; it does not impose a 20-byte limit.

Original malloc restores its saved registers and returns; operator new performs
its original LEAVE/RET. The initializer writes the four callback addresses,
clears the first link, exchanges the descriptor-list head and publishes the
actual descriptor at `102ffef0`. Callback addresses are stored without granting
execution of their bodies. Its occupancy/search stores then reach
`10045e1e -> 100a7980`, requesting an 8,192-byte bitmap fill at region offset
0x100000 with byte 0xff. That fill has not executed in the initializer yet.

NULL HeapAlloc follows the original errno-helper CALL boundary; mode-three
small-block allocation stops at its original helper. Missing or replaced
capabilities retain their applied prefixes. The region, descriptor, Malloc lock
and exception frame remain owned. Bitmap initialization, pool registration,
slot allocation, CString return and complete startup remain outstanding.


## Live bitmap fill and cold area registration — 8 October 2026

The initializer executes original `100a7980` memset. Its nonzero fill byte
selects the scalar path even when the earlier CPU query enables SSE. Private
platform geometry proves the low address bits used by NEG/AND alignment;
opaque pointers do not acquire invented numeric Windows addresses. Original
SHL/ADD builds the DWORD pattern and REP STOSD fills 8,192 bytes using the
logical thread's actual direction flag. The caller disables the final bitmap
bit with 0x7fffffff, then exchanges the region-list head and preserves its link.

The original `100012e4 -> 1003c650` registrar writes the cold first area record:
payload start at region+16, exclusive end at region+0x100000, region base and
actual descriptor. It increments `102fb030` and performs RET 12. The area
storage is the original PE loader-zero interval `10149a18..10189a18`; this
physical capture does not establish a logical maximum record count. Warmed
sorting across distinct regions and its memmove remain unsupported.

Normal execution now reaches `10047f57 -> 1000605a`, the bitmap slot allocator.
The enclosing heap lock and Malloc exception frame remain entered. No payload
slot, CString, Root constructor or complete module startup has returned.


## Live bitmap slot claim — 8 October 2026

The generated instruction module now admits original `1000605a -> 1003e090`.
Its register save/restore, occupancy increment, CLD, REPE SCASD, BSF and locked
bit reset select the actual free slot. The owner retains a sixteen-byte view
of that slot over the same virtual backing and verifies its live bitmap claim.
This distinguishes the logical allocation from the region's physical capacity.

The lower allocator and Malloc return through their original register and FS
restoration, with the heap section released. CString setup stores the length,
reference count, payload pointer and terminating byte. Execution reaches
`1001362d -> 100a7a00`, the original four-byte Root memcpy CALL. The CString and
Root constructors have not yet returned. Other allocation paths, full startup
and campaign completion remain unfinished.


## Live Root payload copy and static initializer — 8 October 2026

Original memcpy's normal four-byte scalar path copies Root into the actual
sixteen-byte slot. A private original-image/slot span proof joins the two
disjoint address-order paths at `100a7a20` without inventing addresses or branch
flags; the next CMP overwrites those flags. Original dispatch tables, loads,
stores and LEAVE/RET preserve the real payload and caller cleanup.

The Root static initializer publishes the pointer, balances its sixteen-bit
reference count, clears the remaining original forty-byte image object, writes
its zero float via XORPS/MOVSS and registers callback `100e2b40` through the same
exit table. Its callback body remains unexecuted. Cinit now reaches pending
`100aa692 -> 100e15d0`, void initializer 141.

The package contains 64 bodies, 1,708 instructions and 137 CALL receipts.
Capturing memcpy's complete body does not establish all its execution paths.
Other allocator pools, backward/unaligned/REP/SSE copies, remaining startup and
campaign completion remain unfinished.

## Class-name getter dependencies — 8 October 2026

The package now captures both class-name getters (`1000619f -> 1008e900`
and `10005e5c -> 1008e970`), `type_info::name`, `_Name_base`, class-name
unmangling and strstr: 70 bodies, 1,933 instructions and 159 CALL receipts.
Cold receipts preserve their guard/string/published storage, original decorated
type names and the type-info node.

Initializer 141 constructs `_Root` in the second owned slot and returns after
registering shutdown. Initializer 142 then executes its getter guard prefix and
the type-info wrapper. Execution stops at `100a709e -> 100b0902`. The lower
name allocation/demangling body is captured but not admitted for execution.
Initializer 143 and the unmangling/strstr bodies are also source evidence only.
No generated evidence alone establishes full startup or playable completion.

### Live `_Name_base` frame prefix

Original body `100b0902` is emitted for source execution. Its cold-cache prefix
enters EH4 using pinned scope `100f8b20` and reaches the original demangler CALL
`100b0931 -> 100c6142`. The frame remains active, its prior FS and register
identities retained. The lower demangler and the remaining allocation, locking,
copy and cleanup paths still require implementation. Emitting the full body
does not establish those paths.

### Live demangler wrapper frame prefix

`100c6142` is captured and emitted with its original scope `100f8e80`. Its
selected non-NULL allocator path enters the nested EH4 frame and reaches
`100c6160 -> 100bb7cf`, before the CRT lock query returns. Both it and the outer
type-info frame remain active. There are 71 bodies, 1,975 instructions and
167 CALL receipts. The demangler grammar and output remain unimplemented on
this live SharedBase path.

### Live CRT lock-five allocation prefix

Original lock initializer and malloc-wrapper bodies are captured and emitted.
Their cold slot-five path returns a real 24-byte allocation from the existing
SharedBase CRT heap, then stops at `100bb834 -> 100bb892`. The slot stays NULL
until section initialization/publication; three exception frames remain active.
There are 73 bodies, 2,061 instructions and 182 CALL receipts. The CRT lock
table alias is the retained bootstrap image, with its identity and geometry
validated by its owner.

### Live CRT lock-five initialization/publication

Original CRT lock/unlock and lock-cleanup instructions execute against the
retained table. The source-pinned section helper runs through the existing
owner and actual platform initializer. Original publication and EH4 cleanup
return the lock initializer, and the demangler enters lock five. The boundary
is `100c61aa -> 100c2351`. General heap rounding preserves the 32-byte backing
with a bounded 24-byte physical section view. False initialization retains
lock ten at the original unimplemented free call; forged table pointers reject.
There are 77 bodies, 2,142 instructions and 196 CALL receipts.

### Live decorator construction

The original decorator, replicator, scratch allocator and node constructors
execute through the live CRT heap and thread stack. One 4,104-byte block owns
four descending 16-byte nodes. Stack tables retain those actual node pointers;
masked flag assignments preserve unknown padding. Execution reaches
`100c61b5 -> 100c5e8f` before grammar/output processing. Lock five and the
outer name/demangler frames remain active. There are 82 bodies, 2,295
instructions and 204 CALL receipts. Allocation failure retains the pending
heap call without publishing a block. Full startup and campaign play remain
unfinished.
