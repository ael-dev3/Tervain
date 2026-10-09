# Original Game startup math evidence

This package captures the dependencies reached after the current browser Game
startup frontier: `__cinit` at caller `204678f2`, target `204665f4`.
It contains 16 original method receipts and 660 instructions verified against
the matching local `Game.dll`, along with 672 bytes of original PE headers,
the math callback slot, floating-point constants, names used by dynamic lookup,
and the ten-entry floating-point function pointer table.

The callback slot points to `20463917`. Before calling it, the original code
validates the PE image and searches its section table to check writability.
The callback initializes conversion pointers, checks the Pentium divide feature,
sets precision when requested, and clears x87 exceptions. Dynamic lookup uses
`GetModuleHandleA("KERNEL32")` and `GetProcAddress` for
`IsProcessorFeaturePresent`; a failed lookup branches to an actual x87 divide
test. Successful lookup still requires an owned feature result.

The source package itself does not execute startup or supply an assumed feature
result. The generated admission module selects four functions (150 instructions):
`__cinit`, the protection check, PE validation and section lookup. The existing
Game startup interpreter now calls `__cinit` on its retained frame, loads current
owned header bytes, and returns from the protection check. With the original
readonly callback slot, execution stops before the indirect math callback at
`20466610`. Invalid headers or a writable section follow the original branch
to the unimplemented pointer-initialization call at `20466617`.

Floating-point methods remain context evidence outside the instruction getter.
Further callees must be captured or matched to admitted source before execution.

Regenerate from the repository root:

```powershell
python tools/gothic3/prepare_game_cinit_math_evidence.py --study 'C:/Users/heyas/OneDrive/Рабочий стол/Gothic3_Decompiled_Study_2026-10-04' --output assets/gothic3/game-cinit-math-source/source.json --runtime-output src/gothic3/native-game-crt-cinit-source.ts
```

An independent regeneration matched the committed JSON byte for byte. No runtime
or gameplay completion is established by that comparison.
