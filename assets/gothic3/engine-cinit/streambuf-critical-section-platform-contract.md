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
