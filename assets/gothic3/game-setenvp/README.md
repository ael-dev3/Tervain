# Original Game environment source (checkpoint 110)

This package records eight complete original bodies (377 ASM rows, 1,022
instruction bytes). All bodies reuse exact earlier source files. The full caller
(151 rows, 473 bytes), free cleanup (4/9) and cinit (50/146) remain original source
context. There are 22 reused C/ASM references and 12 focused dependency JSON files.
No reconstructed C/ASM is invented or copied into this focused package.

The finite caller path is CALL204678e7 to __setenvp204764ff, actual RET204765c3 to
204678ec, caller TEST/JL and PUSH0 at204678f0, stopping before cinit CALL204678f2.
Only source availability is captured. Current conditions, instructions, frames,
memory/known masks, import grants and actual returns must be independently owned.
Source-only context and original call tables do not grant runtime execution.

Original PE-only gaps20476593 (3 bytes after the nonreturning Watson path) and
20477d21 (5-byte calloc EH4 prefix) have genuine catalog/C/ASM gaps. They remain
noncallable PE context; any mnemonic decoding is explicitly inference. Normal
captured freeCleanup20467cc0 is separate from the calloc gap.

Current environment input has a19-byte logical contract. Original aligned strlen
DWORD2046dc00 at offset16 requires a20-byte physical span. The selected fresh
24-byte capacity policy keeps padding unknown and uses conservative masked
arithmetic. This package cannot widen/reseed current storage or certify the new
heap contract. The same actual environment pointer, Game heap, scope, cookie and
existing canonical aliases must be retained. HeapAlloc flags8/HeapFree flags0
require new private physical call grants; earlier IO/malloc grants do not suffice.

Reproduce from the original local study with the repository producer:

```
python scripts/gothic3_game_setenvp_source.py --study <original-study> --repo . --output assets/gothic3/game-setenvp
```

The producer verifies original DLL/catalog/ASM/C, old listing bytes, scope/cold
geometry, genuine negative source evidence and exact imports. The manifest pins
its actual in-repository path and all loaded local helpers, original inputs,
existing listings/dependency files and generated outputs except itself.
Regenerate the manifest and immutable admission pins after changing any pinned
input or moving the producer. No external plan file is a production dependency.

No native/game/browser/TypeScript execution, tests, builds, Windows process state,
complete failure closure, completed CRT attach or full game is claimed.
