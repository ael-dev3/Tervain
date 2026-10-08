# SharedBase configuration frame integration

## Source and current boundary

This implementation plan follows the committed original instruction receipts:
- `assets/gothic3/shared-crt-bootstrap/100b14a5.asm.txt`
- `assets/gothic3/shared-crt-bootstrap/100b16ba.asm.txt`

The local implementation now establishes the configuration caller at
`100b1718`, before code-page setup. CPINFO aliases EBP-24 on the canonical
selected thread stack. The IsValidCodePage and GetCPInfo imports, configuration
memset ABI, nested case frame and configuration cookie return retain their source
CALL/RET sequence. Execution reaches `100b171d` with EAX zero and the two caller
argument words still present. The enclosing setmbcp SEH prologue is now owned;
its caller removes those words and follows the reference-count exchange,
PTD installation and optional global publication. The selected normal path
executes the parent epilogue and restores incoming FS; the next boundary is
argv allocation at `100c0c23 -> 100aeed0`, after the original parser query returns. The enclosing setargv
frame now owns module filename acquisition at `100c0bd1`, publication of its
buffer pointer and selection of nonempty process input or the module fallback.
Its canonical filename service uses the declared virtual `Gothic3.exe` profile.
The actual count locals are known; global argc/argv remain unpublished. Dynamic-record free
and exception paths remain unfinished.

The lower getSystemCP body and configuration memset body still use the retained
owner's translated implementation. Complete SharedBase attachment and live Game
integration are not established by this helper boundary.

## Required frame lifecycle

1. Before configuration services execute, admit a private owner token for the
   original call at `100b1718 -> 100b171d`. Push candidate and code-page arguments
   in source order. Preserve the selected logical thread and canonical graph.
2. Execute `100b14a5`: push old EBP, select the new EBP, reserve 32 bytes, retain
   cookie XOR EBP at EBP-4, and save EBX, ESI and EDI. EBX refers to the actual
   candidate; ESI starts as the code-page argument. No reset of the graph or
   synthetic successful return is admissible.
3. Place CPINFO in the configuration frame at EBP-24, established by
   `100b1524`, replacing the existing independent physical local. Model source
   imports and cleanup on this frame. Earlier locale-update services must retain
   their stated translation boundary until their lower frames are implemented.
4. Enter the existing case helper from this running configuration frame at
   `100b1614`. Preserve its private ownership and adjusted EBP layout. Its return
   must restore the configuration EBP and ESP, rather than the initial stack top.
5. At `100b166f`, load the retained cookie expression, pop EDI and ESI, decode
   using the same EBP, pop EBX, and execute the cookie call
   `100b1677 -> 100b167c`. Compare against the canonical cookie owner; this does
   not establish that the cookie startup initializer has run.
6. LEAVE and RET to `100b171d`. The caller pops two argument words, saves EAX at
   EBP-32, and tests that result. The enclosing setmbcp SEH frame must itself be
   owned before treating those local writes as native execution.

## Candidate installation after successful configuration

The source does not permit marking multibyte initialization complete immediately
on case return. On the zero-result branch:

- Decrement the previous PTD multibyte record through the retained interlocked
  procedure at `100b1730`. Free only when the result is zero and the pointer is
  not the original static record `10140e60`.
- Install the candidate at PTD+104 (`100b174b`) and increment it through the
  retained procedure at `100b1755`.
- Respect PTD own-locale mask 0x02 and global locale mask 0x01. Otherwise acquire
  lock 13, publish the code page, multibyte flag, locale, five WORD fields,
  257 classification bytes and 256 case bytes in the original order.
- Decrement the previous global record, apply its static-record free guard,
  publish the candidate pointer and increment its reference count. Follow the
  source unlock handler and SEH epilogue before returning to argument startup.
- Only the completed setmbcp return permits the initialization flag write and
  subsequent module filename acquisition at `100c0bd1`.

Typed candidate pointer identity must remain usable by warmup readers; replacing
it with a numeric address or continuing to require only the original cold pointer
would lose the installed state. Refcounts must follow source operations, including
operations on the static record, rather than being clamped to a desired value.

## Evidence required for the implementation

Check nested frame offsets, argument cleanup, register preservation, canonical
cookie relation, actual CPINFO aliases and same-thread identity. Reject forged
or replayed grants without altering a legitimate pending frame. Exercise both
PTD own-locale branches and the global publication branch. Verify every copied
byte and reference-count transition, including static-record free guards.
Retain explicit boundaries for unsupported code pages and failure paths.

A passing helper check proves only this source path. Full SharedBase attachment,
live Game initializer traversal, world activation and a finishable campaign need
separate runtime evidence.

## Parent SEH source layout

The captured prologue relocates its original return word, preserves FS:[0],
encodes the scope-table pointer with the cookie, and registers EBP-16 as FS:[0].
The cookie/EBP expression is retained at EBP-52. Source locals EBP-32 and EBP-36
hold the configuration result and PTD respectively. The original epilogue and
lock-release handler now execute on the selected normal publication path.
Exception dispatch remains unimplemented.

The helper entry still starts on a cold selected graph. Earlier SharedBase DLL
and CRT caller frames and live Game graph integration are not established.

## Current normal installation path

Private grants admit each counter operation exactly once to the canonical
virtual platform service. Source branches select PTD-only or PTD-and-global
ownership, producing candidate counts 1 or 2. The global path copies all five
WORD fields and both complete tables under lock 13, publishes a typed pointer
and returns through the lock-release handler and SEH epilogue. Warmup readers
resolve that retained typed global pointer rather than requiring the original
cold numerical pointer. The cold static record follows both original decrement
operations; the global branch leaves its count at ffffffff.

The selected normal return permits the init-table flag write. It does not prove
complete argument setup, full module attach, live Game initialization or campaign
completion. Exception dispatch and dynamic old-record free remain unimplemented.
