# SharedBase configuration frame integration

## Source and current boundary

This implementation plan follows the committed original instruction receipts:
- `assets/gothic3/shared-crt-bootstrap/100b14a5.asm.txt`
- `assets/gothic3/shared-crt-bootstrap/100b16ba.asm.txt`

The existing enclosing case helper returns normally to `100b1619`, then models
`100b14d5` setting EAX to zero. It stops at `100b166f` because the configuration
caller frame has not been established. Its current cold graph entry is a
translated helper boundary, not evidence of complete SharedBase attachment.

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
