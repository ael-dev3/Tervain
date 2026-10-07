# Game attach continuation source

Reproduce from the repository root (replace STUDY with the original decompiled-study directory):

    python -B scripts/gothic3_game_memcpy_supplement.py --study "STUDY" --repo . --output assets/gothic3/game-memcpy
    python -B scripts/gothic3_game_attach_continuation.py --study "STUDY" --repo . --output assets/gothic3/game-attach-continuation

The source profile retains 39 original methods /2,167 instructions /6,256 bytes, including two existing Game CRT bodies as source context. Five initializers remain genuinely ASM-only: 20469f3a,2047470c,2047e687,204b11b0,204b11c0. No C/catalog recovery is invented. All original rows, bytes, extents, C file/line/hash references, ASM lines, cold masks, math initializer and dependency receipts remain available. The two reused bodies reference their unchanged Game CRT package.

runtime-rules.json normalizes method receipts, 19 cold ranges, the nonzero math pointer and six scalar memcpy storage ranges. The complete C++ table has 238,852 physical slots /2,468 callbacks; the C table has 135 slots /5 callbacks. They and the 363 CALL/store/RET patterns are source context only. No table traversal, live module mapping, runtime owner, native execution or full attach is claimed by this source package.

The native memcpy table ranges include 30 actual targets and two unreachable index0 words overlapping instruction tails/NOP padding. Their original readonly code provenance and negative-index aliases are retained. Runtime storage must preserve real physical aliases; copying old navigation/ScriptAdmin fragments into a larger table cannot establish canonical identity.

Only actual canonical reads/writers can establish current environment/command-line/CPU state. Source cold zeros are not host API results. Fresh native order and prior-writer closure are required before selecting the first-attach scalar memcpy branch. Vector bodies are captured separately; modulo16, signed placement, direction flags, exact SSE access order, masks and allocation lifetimes remain implementation requirements.

The manifests pin the actual final scripts and their loaded helpers, focused Game CRT dependencies and finalized memcpy supplement. Producers execute only offline parsing/hashing and leave the older Game CRT package unchanged.
