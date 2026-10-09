# Original Game primitive RTTI demangling

This package verifies four original methods, 614 instructions, primitive keyword
bytes and original dispatch-table bytes against the matching Game PE. The runtime
implements the selected empty-qualification branches for `_N`, `E`, `G`, `H`,
`J`, `K` and `M`, including their unsigned prefixes and retained cursor effects.
Other grammar requires additional source evidence and implementation.

The `bool` class-name initializer executes during browser startup. Its space search
preserves the native DWORD load and unknown post-NUL padding; a NULL result is
accepted only when both possible original branch outcomes are proved NULL.
The complete local suite passes 3,166 tests across 292 files, typechecking and
production build pass, and a rendered Ardea preview confirms startup reaches
`204b1620`. This is a partial demangler and startup reconstruction.

```powershell
python tools/gothic3/prepare_game_primitive_demangler_source.py --study '<matching study directory>' --output assets/gothic3/game-primitive-demangler/source.json --runtime-output src/gothic3/native-game-primitive-source.ts
```
