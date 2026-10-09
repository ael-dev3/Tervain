# Original Game exit-table growth

This package captures source evidence for Game startup exit-table growth.
`204b13a0 -> 2002694a` reaches shutdown registration after 32 callback cells
have been filled. The local runtime now executes the normal heap-mode growth
path and reaches the next unsupported getter at `204b1620 -> 2000fed4`.

The local platform now has an explicitly selected
`move-preserve-unknown-extension` relocation operation. Its checks cover pointer
and mask preservation, growth, shrink, foreign/interior/freed inputs and exceeding
the selected allocation bound without freeing the original. A returning NULL
failure profile still requires its own declaration. The Game CRT wrapper and
exit-table caller are connected to it. Twenty-two focused checks and typechecking
pass. The complete suite passed 3,166 tests across 292 files in 446.85 seconds;
the production build passed in 47.18 seconds. A rendered Ardea preview confirmed
the next getter at `204b1620`, with 3,130 environment/startup operations. Publication
remains outstanding. Small-block and oversized-request branches remain explicit boundaries.

After integrating main, revision `af55ce5f` passes 3,179 tests across 293 files
in 480.11 seconds and the production build in 37.87 seconds. The integration
changes none of the tested Gothic runtime or source paths from `3c84d749`.

## Captured methods

| Method | Original entry | Instructions |
| --- | --- | ---: |
| Exit-table append | `204636aa` | 75 |
| CRT realloc retry wrapper | `20468416` | 28 |
| Realloc | `20477d87` | 181 |
| Small-block cleanup | `20477ecb` | 4 |

The producer uses `audit_module` to verify disassembly against the matching
original PE. The receipt retains DLL, catalog, assembly and method hashes,
instruction bytes and source locations. Original Game SHA-256 is
`b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f`.

## Required runtime behavior

The append routine first requests `size + min(size, 0x800)` and, on overflow
or a NULL result, attempts `size + 0x10`. Both failed attempts return NULL.
After success, `20463728` restores the previous end offset relative to the
returned table. The routine encodes and publishes the new begin at `20463735`,
stores the encoded callback at `20463743`, then encodes and publishes the next
end at `2046374f`. Preserve this order and each completed effect on interruption.

The normal heap mode calls `HeapReAlloc` through IAT slot `207d7c60` at
`20477f3c`. The mode-3 small-block branch is separate. A browser implementation
needs an owned platform operation returning an actual retained allocation;
existing encoded callback sidecars and unknown physical masks must survive
relocation. Old storage must follow the selected platform operation's lifetime.
The CRT wrapper retains its original NULL, zero-size, malloc-wait and Sleep
behavior. Allocation failure, new-handler retry and OS-error mapping must keep
their original state and call order.

Checks must cover table growth, retained callback identities, begin/end rebasing,
unknown padding, failed growth and fallback, foreign/interior pointers and
interruption without replay. Passing source regeneration alone does not prove
any of these runtime behaviors.

## Reproduce

```powershell
python tools/gothic3/prepare_game_exit_growth_source.py --study '<matching study directory>' --output assets/gothic3/game-exit-growth/source.json --runtime-output src/gothic3/native-game-exit-growth-source.ts
```

An independent capture on 9 October 2026 matched the 72,930-byte source file
byte for byte, and the generated TypeScript admission file also matches. No native
code was executed by the producer and no live state was captured.
