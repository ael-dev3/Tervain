# Original Game startup math evidence

This package captures the dependencies reached after the current browser Game
startup frontier: `__cinit` at caller `204678f2`, target `204665f4`.
It contains 24 original method receipts and 863 instructions verified against
the matching local `Game.dll`, along with 672 bytes of original PE headers,
the math callback slot, floating-point constants, names used by dynamic lookup,
the ten-entry floating-point function pointer table and the complete 135-slot
C initializer table at `20655514` (540 bytes, exclusive end `20655730`).

The callback slot points to `20463917`. Before calling it, the original code
validates the PE image and searches its section table to check writability.
The callback initializes conversion pointers, checks the Pentium divide feature,
sets precision when requested, and clears x87 exceptions. Dynamic lookup uses
`GetModuleHandleA("KERNEL32")` and `GetProcAddress` for
`IsProcessorFeaturePresent`; a failed lookup branches to an actual x87 divide
test. Successful lookup still requires an owned feature result.

The source package itself does not execute startup or supply an assumed feature
result. The generated admission module selects thirteen functions (276 instructions):
`__cinit`, the protection check, PE validation, section lookup, the math callback,
conversion-pointer initialization, processor-feature dispatch, the pointer-encoding
loop, the C initializer walker, both SSE2 callbacks and the query/probe helpers. The original
caller pushes `0`, so this path skips optional precision setup. It writes the ten
conversion pointers, invokes the owned processor-feature service, clears x87
exceptions and returns to `20466616`. The original loop at `20469672` then encodes
all ten pointers through the existing source-admitted Game CRT owner. Its actual
CALL/RET and caller argument cleanup are retained; interpretation of the codec
wrapper's 36 instructions is not claimed. Duplicate conversion addresses retain
one code identity and one encoded identity.

The walker at `2046643f` then reads the retained table in source order. It executes
the 65 leading null slots and calls `20463763` through the existing canonical
Game exit-table owner. That owner allocates 128 zeroed bytes, publishes the same
encoded base to both exit cursor globals, and returns `0` on success or `24` for
a returning allocation failure. The stack bridge preserves the actual CALL/RET
frame and EAX result. The callback's 19 instructions are independently recovered
in `game-crt`; this getter does not interpret them. Execution currently stops at
`20466452 -> 2047470c`, the fourth C initializer, on the declared normal virtual
CPU profile. Later startup and campaign integration remain unfinished.

The second initializer uses original EFLAGS ID-bit toggling, CPUID leaves 0/1 and
the original normal MOVAPD probe. It does not infer the browser host's CPU. The
probe uses the actual Game EH4 frame and its original 28-byte scope table.
Undeclared CPU state, missing CPUID leaves and SIMD exceptions retain their
actual instruction boundary; native exception dispatch is unfinished. A fixed
ID bit or absent SSE2 feature follows the original returning-zero branch.
Single-bit XOR correlation proves the ID-toggle subtraction even when unrelated
arithmetic flags remain unknown.

Both callback bodies were recovered in the separate Ghidra project already
recorded by `game-cinit-callbacks`. The generator preserves that provenance,
checks its ASM/C hashes, and compares every instruction byte with the original
Game PE. Supplemental assembly line numbers identify each small ASM file, with
an explicit path and origin; they are not fabricated full-disassembly lines.
The third callback reuses the independently admitted Game argv source. It reads
the multibyte initialization flag set earlier by argv and skips reinitialization
on that actual state. A cleared flag reaches the unsupported `2046bb65` call;
startup never forces the flag to bypass it.

Optional precision, SSE control and the failed-lookup divide fallback remain
context evidence outside the instruction getter.
Further callees must be captured or matched to admitted source before execution.

Regenerate from the repository root:

```powershell
python tools/gothic3/prepare_game_cinit_math_evidence.py --study 'C:/Users/heyas/OneDrive/Рабочий стол/Gothic3_Decompiled_Study_2026-10-04' --output assets/gothic3/game-cinit-math-source/source.json --runtime-output src/gothic3/native-game-crt-cinit-source.ts
```

An independent regeneration matched the committed JSON byte for byte. No runtime
or gameplay completion is established by that comparison.
