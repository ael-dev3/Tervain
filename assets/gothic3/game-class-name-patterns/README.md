# Original Game class-name initializer patterns

This source package records 363 original three-instruction C++ initializers,
their getters, static images, decorated descriptors and cleanup callbacks.
It supplies evidence for extending engine startup past the first initializer.
It is not imported by the browser runtime and grants no execution permission.

## Recovery

`tools/gothic3/prepare_game_class_name_patterns.py` verifies the matching
`Game.dll`, function catalog, full disassembly and frozen callback index by hash.
It checks initializer instructions and callback table entries against original
PE bytes, including the full C++ table hash.

304 getters have matching original catalog/disassembly evidence. Another 59
are absent from both sources. These are recovered directly from original PE
bytes using a decoder restricted to the exact 22-instruction, 87-byte pattern.
The decoder is compared with all 304 available assembly getters before those
59 recoveries are accepted. Missing assembly line numbers and reconstructed C
remain null; the package does not fabricate catalog entries. The corresponding
59 cleanup bodies are recovered from the original two-instruction PE pattern.

Every getter is also checked for matching guard fields, initializer result,
descriptor, branch destinations, RTTI call, CString import and cleanup callback.
Image records preserve original bytes, section provenance and hashes.

Coverage: 1,089 initializer instructions, 7,986 getter instructions and 726
cleanup instructions. Descriptor strings include primitive type encodings;
they must be interpreted from the actual bytes rather than assumed class names.

## Reproduce

From the repository root, supply the original study directory:

```powershell
python tools/gothic3/prepare_game_class_name_patterns.py --study '<study-directory>' --output assets/gothic3/game-class-name-patterns/source.json
```

The study must contain `00_Original_Runtime/Game.dll` and the matching
`01_Decompiled_Code/Game_dll/` catalog and disassembly. The preparation script
uses the repository's frozen `game-cinit-callbacks` package by default.

## Runtime work still required

Integrate each supported initializer through the retained original startup
stack and callback cursor. Preserve existing canonical owners for overlapping
static addresses, use the existing platform heap, and implement actual
descriptor demangling, allocation and cleanup registration. Stop at unsupported
operations with their original state retained. Capturing these patterns does
not prove complete CRT traversal, world activation or campaign completion.
