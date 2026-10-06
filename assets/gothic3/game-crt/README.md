# Original Game CRT source receipts

This additive package records the installed Gothic 3 `Game.dll` CRT algorithms, actual Game storage and selected Navigation class-name/type dependencies. Game owns its heap, locks, thread indexes, pointer slots, demangler, exit table and class caches. Corresponding method labels help compare source algorithms with the earlier Engine packages; they do not admit an Engine owner for Game or establish blanket algorithm equivalence.

## Reproduce

Run from the repository root with the original study directory available:

```powershell
python tools/gothic3/prepare_game_crt_source.py --study 'C:/Users/heyas/OneDrive/Рабочий стол/Gothic3_Decompiled_Study_2026-10-04'
```

The [producer](../../../tools/gothic3/prepare_game_crt_source.py) rejects a different original `Game.dll` SHA. It selects bodies using the actual Game `functions.csv`, follows original entry aliases, and verifies every selected instruction and complete extent against the PE. No constant Engine-to-Game address delta selects a function or field. Original CSV, assembly and complete reconstructed C chunk hashes remain in `native-evidence.json`.

Reconstructed C is explanatory. Byte-checked original x86 operands govern source order and fields. C excerpts strip trailing line whitespace, use LF line endings, and end with one newline; their normalized excerpt hashes are separate from the original chunk hashes.

## Package contents

- `runtime-rules.json` records Game method tuples, cold/constant storage, actual imported IAT names, source call inventory, selected physical layouts and initializer-table summaries.
- `native-evidence.json` contains every selected instruction, original source provenance, explicit assembly-gap recovery, storage receipts and exact pointer bindings.
- `sources/Game/` contains normalized ASM/C excerpts. ASM-only initializers, destructor and compiler thunks have no fabricated CSV rows or reconstructed C bodies.
- `tables/cInitializers.json` and `tables/cppInitializers.json` pin complete original bytes and the exact ordered non-NULL slots separately from the browser rules.
- `source-manifest.json` pins every package file except itself, the producer and its imported local Python dependencies.

The selected Game `crtAttach` body is complete and distinct from the older partial Engine demangler receipt. Game's `localeFree`, `getPtdNoExit`, `freePtdCallback` and `crtAttach` have complete analyzed ASM coverage. Explicit PE recovery covers the otherwise omitted critical-section SEH entries, two TLS compiler thunks, and the full 57-byte terminate extent; the originally analyzed terminate ranges remain recorded.

## Original ownership and remaining boundaries

All static storage is an original image receipt, with file-backed and loader-zero-filled bytes distinguished. Cold zeros do not prove live heap, critical-section, encoded-pointer, thread or allocator readiness. Original locale pointers are validated against Game objects, including the zero-filled one-byte empty string at `207d1544`; they are not replaced with Engine pointers.

The C initializer table has five non-NULL callbacks. Onexit initialization is its first callback. Navigation class-name initializer `204b1840` occupies C++ slot `2056c220`, index 136 and non-NULL ordinal 72, with 71 preceding callbacks. Capturing or invoking this one callback does not complete the table or Game startup. Full table execution is unproven.

Navigation class-name cache `207b4964`, RTTI descriptor `20796ce4`, selected type-name list `207d0a18` and property-type singleton `207bf7e4` are separate source receipts. The captured `_Type_info_dtor` uses list `207d0a98`; it does not prove cleanup of the Navigation list. Actual class-name construction, Shared property type/factory/registry services, entity attachment and full NPC activation require their own retained owners and source-ordered execution.

The producer performs offline source audits only. It executes no native code, captures no live process state, and runs no repository tests or builds. Earlier source packages remain frozen.
