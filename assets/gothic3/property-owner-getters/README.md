# Game property owner pointer getters

The recovered initializer callbacks contain 328 candidate property vtables.
Their owner-type getters consist of `MOV EAX,[ECX+offset]` followed by `RET`:
291 read offset `0x18`, and 37 read offset `0x1c`. Every captured body and entry
thunk is checked against the original Game.dll by the preparation producer.

The source callback scan identifies vtable candidates. It does not establish
their current runtime values or prove that intervening calls preserved them.
The support reader selects a getter from the actual retained receiver's vtable,
then reads its actual pointer field. Unknown tables, unknown words, insufficient
storage and ended receiver storage remain unknown. Returned pointer capabilities
are not dereferenced or promoted into initialized type-singleton owners.

[`native-property-owner-getter.ts`](../../../src/gothic3/native-property-owner-getter.ts)
provides this read support. It does not execute a live virtual-call frame,
register property templates, activate NPCs or finish module initialization.
The generated admission text pins the entire captured source document.

```powershell
python tools/gothic3/prepare_property_owner_getters.py `
  --study "PATH/TO/Gothic3_Decompiled_Study_2026-10-04" `
  --callbacks assets/gothic3/game-cinit-callbacks `
  --output "PATH/TO/new-source.json" `
  --admission "PATH/TO/new-admission.ts"
```
