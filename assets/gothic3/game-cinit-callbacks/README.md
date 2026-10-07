# Original Game initializer callback sources

This package records both initializer tables reached by Game `__cinit` at
`204665f4`: five C callbacks and 2,468 C++ callbacks. The complete table ranges
contain 135 and 238,852 DWORD slots respectively. Zero slots are retained as
zero by the table extent and digest; every nonzero slot is listed explicitly.

The package contains 2,473 assembly listings and matching reconstructed C-like
listings. Of those, 1,079 C-like listings reuse the frozen local study. The
other 1,394 were recovered with Ghidra 12.1.4 in a separate copy of its saved
Game project. The frozen catalog and canonical project were preserved.
All supplemental functions decompiled successfully. Each assembly instruction
was checked against the original Game.dll bytes, and the instruction byte count
matches the exported function extent. Across the callbacks this covers 49,272
instructions and 207,641 bytes.

These are source inputs for the TypeScript reconstruction. Successful
decompilation and matching bytes establish source coverage. They do not prove
that recovered signatures are correct, that callback dependencies are owned,
or that the browser executes these callbacks. No runtime owner imports this
package yet. Whole initialization, NPC activation and campaign completion
remain unfinished.

## Reproduce the capture

Use your frozen `Gothic3_Decompiled_Study_2026-10-04` and supplemental export
directory. The image SHA-256 is
`b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f`.

```powershell
python tools/gothic3/prepare_game_cinit_callbacks.py `
  --study "PATH/TO/Gothic3_Decompiled_Study_2026-10-04" `
  --recovery "PATH/TO/cinit_recovery_exports" `
  --output "PATH/TO/new-callback-source-capture"
```

The producer verifies the original image/catalog, table target set,
supplemental coverage, every listed instruction byte and full function extent.
`callback-index.json` records table digests, source origins and individual
listing digests. `source-manifest.json` records generated file digests and the
producer digest. Repeated captures produce identical files.

The supplemental Ghidra scripts are in
[`tools/gothic3/ghidra`](../../../../tools/gothic3/ghidra/README.md).
Recovering functions is a preparation step performed in a project copy.
The original Windows DLL is never executed by these tools.
