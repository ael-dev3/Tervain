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

This checkpoint exposes and validates the lower platform operation. The normal
startup continuation still stops at `30671341`; its stdcall return, constructor
cleanup, remaining filebuf initialization, and destruction must be connected
before claiming that constructor is complete. This does not prove full engine
startup or campaign playability and has not been published.
