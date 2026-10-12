# Allocated streambuf critical-section platform contract

The captured `30670963` member constructor allocates 24 bytes through
`306728e3`, retains the allocation at receiver offset 4, and invokes the
`3067133d` wrapper at `30670970`. The wrapper calls the captured
`KERNEL32.dll!InitializeCriticalSection` import at `30671341` and returns
through `30671347`.

`initializeEngineCinitStreambufSection` admits only this actual pending call
chain, its retained Engine CRT owner, the actual stack argument, and the
canonical live 24-byte heap allocation. Registration uses the existing physical
critical-section service; no numerical address is assigned to the allocation.
Initialization leaves all internal byte masks unknown. Duplicate registration
and use by a different owner fail. The four image-backed shared critical
sections keep their separate admission and registration.

Validation: TypeScript checking and one focused runtime check passed locally.
The check reaches the original pending caller, initializes its storage, enters
and leaves it with the retained owner, rejects another owner and duplicate
initialization, and confirms the shared-array service rejects this heap argument.

## Connected member-constructor continuation

The normal startup path now invokes that admitted platform operation, consumes
its actual stdcall return with four argument bytes, returns through the wrapper,
and executes the captured `30670975`–`3067097a` cleanup and return. It restores
ESI and returns the retained member receiver in EAX to `305ee69a`. Startup stops
there before the next four-byte allocation. The enclosing streambuf and filebuf
constructors and destruction remain unfinished.

TypeScript checking passed. Nine focused checks passed together, covering the
normal caller, five interrupted/forged shared-array initialization cases,
allocated-lock admission, the null-allocation new-handler branch, and the earlier
enum checkpoint. A separate nonzero shared-reference branch check also passed.
The earlier failed run exposed five incorrectly changed interruption-PC test
expectations; those expectations were restored to the original pending import,
and all five were rerun successfully. These are focused checks, not a full suite
or campaign verification. This continuation has not been published.


## Four-byte allocation continuation

The captured streambuf instructions `305ee69a`–`305ee6b2` now execute their
four-byte allocation request, exception-state store, factory return, cdecl
argument cleanup, and nonnull pointer branch. The allocation factory is shared
with the existing 24-byte member path, with each actual stack size and caller
return checked independently. The frame retains the canonical four-byte logical
view separately from the lock allocation, preserving the allocator's physical
capacity and unknown initial bytes. It is not yet written to receiver offset
`0x38`; that store occurs later in the original routine.

The normal boundary is now the actual pending call to `30670832`, made at
`305ee6b2` with return address `305ee6b7`. That helper's body is not implemented.
If the four-byte malloc returns null, the original factory instead remains in
its new-handler call at `306824b9`; no helper call or fabricated factory return
is made. The earlier initialized lock remains live.

TypeScript checking and six focused checks passed locally: normal allocation,
nonzero shared-reference bypass, earlier enum checkpoint, both allocation-null
paths, and allocated lock admission. The normal test proves separate allocation
identities, exact logical extent, unknown byte masks, both factory returns, and
the pending helper caller. Full startup and campaign verification remain absent.


## Locale initializer source capture

The source preparation now captures `30670832` (46 instructions) and its
`30679b5b` EH3 prologue (17 instructions) from the pinned Engine DLL. The bundle
contains 359 methods. Comparison before adoption proved all earlier 357 method
records and all other source metadata, images, imports, initializer tables and
SharedBase records unchanged.

The initializer reads the global locale pointer at `30af6dd8`, enters a locking
path through `30670503` when that pointer is null, and can allocate 52 bytes
through the existing factory before calling `30670790`. It later releases the
lock through `30670524` and uses `30679c33` for exception-frame cleanup. These
dependencies require their own admitted storage, ownership and original caller
state before continuation. No global locale pointer or successful helper return
has been synthesized.

TypeScript checking and 150 source/image checks passed locally. The new test
pins selected instruction bytes, including the original FS exception-chain
stores. Its first run caught an extra zero byte in a test expectation; the
expectation was corrected to the six-byte original instruction and the full
source/image checks passed on rerun. Capturing these routines is evidence
preparation; the runtime boundary remains `30670832` and its body is not yet
executed. This checkpoint is local and does not establish campaign completion.


## Connected locale EH3 prefix

The runtime now executes `30670832`–`30670839` and all 17 captured instructions
of `30679b5b`. It uses the actual eight-byte local extent, saved registers,
previous EBP, retained Engine security cookie, and FS exception-chain head.
The cookie XOR preserves symbolic stack-pointer provenance and masks. The
prologue moves its actual caller return word onto the new stack, initializes
the exception state to `-1`, installs the nested chain, and returns through
`30679b8d` to `3067083e`.

Six focused runtime checks and TypeScript checking passed. The normal test
checks the actual locale caller's position against EBP (`position - 4`), ESP
(`position - 40`), and the nested FS head (`position - 16`), plus the original
prologue return word. Allocation failures still stop before entering this
prefix, and the earlier property and lock checks remain intact.

Startup now stops before the load from `30af6dd8` at `3067083e`. The locale
pointer image, locale locking, object construction, exception epilogue and final
filebuf continuation remain unfinished. No locale object or successful outer
constructor return is fabricated. These changes remain local and do not prove
complete engine startup, hosted playability, or campaign completion.
