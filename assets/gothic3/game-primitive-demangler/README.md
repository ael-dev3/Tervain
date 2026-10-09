# Original Game primitive RTTI demangling

This package verifies four original methods, 614 instructions, primitive keyword
bytes and original dispatch-table bytes against the matching Game PE. The runtime
implements the selected empty-qualification branches for `_N`, `E`, `G`, `H`,
`J`, `K` and `M`, including their unsigned prefixes and retained cursor effects.
Other grammar requires additional source evidence and implementation.

The same recovered primary/simple-type branch now also serves template arguments.
The original template parser supplies an empty qualification DName, assigns the
returned value, records it only when more than one encoded byte was consumed,
and appends it to the argument list. Template parsing retains its own flags;
the ordinary RTTI caller restores its original decorated-name flag separately.
The focused startup checks confirm `bTValArray<float>`, 139 returned class-name
initializers, 140 shutdown callbacks and the next boundary at
`204b1c80 -> 2000b596`: an unaudited 59-byte allocation. Typechecking and all five
focused checks pass. This continuation has not yet had a full-suite, production
browser or deployment validation; the preceding results below belong to the
earlier primitive checkpoint.

The `bool` class-name initializer executes during browser startup. Its space search
preserves the native DWORD load and unknown post-NUL padding; a NULL result is
accepted only when both possible original branch outcomes are proved NULL.
The complete local suite passes 3,166 tests across 292 files, typechecking and
production build pass, and a rendered Ardea preview confirms startup reaches
`204b1620`. This is a partial demangler and startup reconstruction.

```powershell
python tools/gothic3/prepare_game_primitive_demangler_source.py --study '<matching study directory>' --output assets/gothic3/game-primitive-demangler/source.json --runtime-output src/gothic3/native-game-primitive-source.ts
```
