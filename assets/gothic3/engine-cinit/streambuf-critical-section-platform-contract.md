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
