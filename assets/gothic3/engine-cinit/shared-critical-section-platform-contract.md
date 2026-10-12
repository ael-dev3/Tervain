# Next platform contract: shared critical-section initialization

## Original caller evidence

The captured Engine constructor `30670444` increments the reference counter at
`30ad40cc`. Its zero-result branch starts at `30af6d70`, calls wrapper
`3067133d`, adds `0x18` to the element pointer and compares against `30af6dd0`.
This establishes four consecutive 24-byte elements in the retained 96-byte
array. The wrapper pushes its actual caller argument and calls the original
`KERNEL32.dll!InitializeCriticalSection` import at `30afc6e4`.

The source records and original binary hash are in `research.json`. The current
implementation stops at the first imported call, `30671341`, with return address
`30671347`. The counter write has completed; the array is still loader-zero-filled
because the platform initialization operation has not executed.

## Documented API behavior

[Microsoft's InitializeCriticalSection contract](https://learn.microsoft.com/en-us/windows/win32/api/synchapi/nf-synchapi-initializecriticalsection)
defines a void operation on caller-allocated storage. The object is logically
opaque: it cannot be copied or moved, must be managed through critical-section
APIs, and must be deleted before reinitialization. The documentation does not
establish a reproducible byte pattern for its internal pointers and fields.

[Microsoft's account of initialization failure across Windows versions](https://devblogs.microsoft.com/oldnewthing/20171020-00/?p=97256)
explains the historical low-memory exception behavior. A selected platform
contract must retain its supported failure behavior rather than infer success
from the existence of the import.

## Implementation requirements

- Admit each call against the retained Engine CRT, exact array view, element
  offset, original IAT receipt and actual pending stack argument.
- Bind the initialized object to that live storage and owner. Reject duplicate
  initialization and copied or retired storage.
- Record an opaque platform capability and its initialization/locking/deletion
  lifecycle. Do not replace the original array with unrelated lock identities.
- Do not invent numerical native pointer values or claim the original zero bytes
  remain a known initialized object. Any native bytes not established by the
  selected platform's explicit output contract must remain unknown.
- Return from the actual imported call only after its initialization effects
  complete. A void call must not manufacture a scalar success result in EAX.
- Preserve the wrapper's return, caller argument cleanup, loop stride/comparison,
  saved registers and constructor return. Interrupted initialization must leave
  the actual call and completed prior elements available for diagnosis.
- Connect deletion through captured destructor `30670473` and shutdown callback
  `307b805a`, with the same reference counter and four storage owners.

These requirements describe the next missing operation. They do not establish
that initialization, shutdown, complete engine startup or campaign play works.
