# Game memcpy source supplement

Reproduce from the repository root (replace STUDY with the original decompiled-study directory):

    python -B scripts/gothic3_game_memcpy_supplement.py --study "STUDY" --repo . --output assets/gothic3/game-memcpy

This package captures original PE/catalog/C/ASM for 20469fe9 and 20469f62. The scalar memcpy, environment, attach, cinit and ASM-only CPU-flag writer are original source context. No runtime owner, current live values, native execution or full startup is claimed.

Six original readonly .text ranges contain 32 DWORDs /128 bytes. Thirty are actual scalar dispatch targets. Two unreachable selector-index0 words overlap an indirect JMP tail and NOP; retain their raw bytes and canonical code aliases. Forward short-copy dispatch uses negative indices at base 20464054; backward DWORD dispatch uses base 20464190. Every real target has an original scalar instruction receipt.

Forward copies >=256 bytes read current Game 207d2b50 before any peel/store. Fresh cold zero can select scalar execution only after proving prior writer/order history; original cold metadata is not a live read. Vector execution requires native modulo16, signed placement and direction-flag proof. Preserve the SSE helper's four 16-byte loads/four stores, then four loads/four stores per 128-byte block, with native masks, aliases, lifetimes and completed prefixes.

The producer is self-contained Python standard-library code. Its final repository path and the original source files and existing Game CRT dependency records are pinned in source-manifest.json. Regeneration does not modify the older Game CRT package.
