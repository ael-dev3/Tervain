# AI helper PropertyID startup evidence

Original Game initializer `204b26c0` constructs the retained PropertyID at
`207b52a8` from `{63A89794-0E97-480a-9999-3A9569A4FCE3}`.

`research.json` records the matching Game.dll hash, all 19 original instructions,
five SharedBase import names, destination and literal image regions, and the
two-instruction cleanup callback `20549ce0`. Cleanup passes the same retained
destination to the original PropertyID destructor import `207d88d4`.

Reproduce it from the installed-game study:

```powershell
python tools/gothic3/prepare_ai_helper_property_id_source.py --study "C:/Users/heyas/OneDrive/Рабочий стол/Gothic3_Decompiled_Study_2026-10-04" --output assets/gothic3/ai-helper-property-id-startup/research.json
```

The generator checks original DLL bytes and loader storage geometry. It does
not execute the initializer. Runtime integration must preserve the stack
temporaries, existing CString/GUID constructors, PropertyID validity checks,
temporary destruction and original exit-table registration. Related behavior
exists in `src/gothic3/native-game-script-admin-startup.ts`; its use by another
initializer does not establish that this startup callback returns.
