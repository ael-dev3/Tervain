# Game environment initialization — checkpoint 110

This checkpoint extends the same Game CRT startup invocation that already
returned from I/O initialization and argument parsing. The original
`__setenvp` routine now counts and copies the current virtual process
environment, publishes its environment table, releases the input allocation,
returns zero, and executes the caller's `TEST`, `JL`, and `PUSH 0`.
Execution stops before the original `__cinit` call at `204678f2`.

This advances a dependency needed by module registration and live NPC
construction. Remaining CRT initialization, module attachment, NPC processing,
and the complete campaign still require implementation.

## Source and execution

The [source package](../../assets/gothic3/game-setenvp/README.md) reuses eight
original bodies containing 377 assembly rows and 1,022 instruction bytes.
The caller and two other original routines are retained as context. Static
receipt counts describe available source; they do not count completed runtime
operations or implemented gameplay features.

[`NativeGameCrtSetEnvp`](../../src/gothic3/native-game-crt-setenvp.ts) lowers the
reached source instructions on the same physical graph that returned from
argument initialization. Its distinct private permit remains inside the
original I/O and argument callbacks. The handoff is consumed once; an earlier
stopped graph cannot be upgraded or replayed.

The environment's logical input remains 19 bytes. A fresh selected virtual
Game heap provides 24 bytes of physical capacity for that input, with five
unknown padding bytes. The copied 18-byte string has six unknown padding bytes
in its own 24-byte allocation.
The original aligned `strlen` operations can inspect that physical span
without assuming values in the padding. Masked arithmetic propagates only
bits and flags established by the current bytes.

The original source executes its own `calloc`, `strlen`, `strcpy_s`, and
`free` bodies. Fixed import grants connect their actual heap calls to the
virtual platform. On successful `HeapFree`, every alias of the input is
retired before the import returns. A private release receipt supports the
remaining source return operations without permitting access to freed bytes.

The input is declared by the [browser process profile](../../src/gothic3/browser-game-process-inputs.ts):
`GOTHIC3_BROWSER=1`, followed by two NUL bytes. It is an application input,
independent of the host Windows environment. The physical capacity and
successful free outcome are also explicit virtual platform policies.

## Validation and diagnosis

The [integration checks](../../tests/gothic3-dialogue/game-crt-setenvp.test.ts)
run the actual browser startup profile through the source owners. They verify
the zero return, one copied string and its bytes, unknown allocation padding,
the retained 532-byte logical PTD, input release, restored source call stack,
and preparation of the next initializer argument. They also verify that
omitting this fresh selection preserves the previous argument frontier, and
that failed or unknown frees neither clear the input nor fabricate a return.
Empty and multiple-entry environments exercise the source loops, including
exclusion of entries beginning with `=`. A NULL input returns minus one and
reaches the original failure-cleanup boundary. Repeating startup preserves
the original result and effects.

A fresh local production browser observation confirmed 565 completed
environment source operations, one copied string, a released input, a zero
return, and the prepared `__cinit` argument. The displayed next boundary was
`__cinit` at `204678f2`.

Validation of the integrated implementation passed 2,468 tests in 236 files,
TypeScript checking, and the production build. The focused source package
also reproduced byte for byte and was independently compared with the
original PE, assembly, catalog, and C references. All 528 admitted source
points matched; the 176 manifest records and three loaded helper files matched.
The manifest uses a repository-relative producer path.

During integration, a retained completed `GetStartupInfoA` grant incorrectly
blocked the environment handoff and return. Its private completed call receipt
now distinguishes it from a pending import. Retaining the grant continues to
prevent replay; the call's actual return is required by the new checks.

In the browser, enter Ardea, open **Models**, and expand **Original entity
study · developer details**. Environment diagnostics are available for any
selected model. They report the actual source owner's return, copies, release,
completed operations, prepared initializer argument, and next boundary.

The complete rebuilding workflow and campaign requirements remain in the
[overview](gothic3-rebuild-overview.md) and
[detailed rebuilding process](gothic3-rebuilding-process.md).
