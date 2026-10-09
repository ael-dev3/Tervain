# Original Arena property-object startup evidence

This source-only package captures 257 instructions from the matching Game and
SharedBase binaries. The runtime admits the initializer's selected prefix and
executes the original SharedBase wrapper constructor on the retained stack.
The whole initializer has not returned.

The startup table slot `2056c36c` contains `204b1d70`. Despite the decompiler's
destructor label, its instructions construct the root wrapper at `207b5028`,
install vtable `206595dc`, obtain the Arena type singleton through `2000d152`,
initialize the wrapper through `200021d5`, and register cleanup `20549970`.

The wrapper's 16 bytes lie wholly in the PE section's loader-zeroed extent.
The capture distinguishes those initial bytes from file-backed vtable and table
bytes. None is a live memory capture.

## Runtime dependencies to connect

- SharedBase wrapper constructor `10007130 -> 10089290`.
- Existing Arena type owner `2000d152 -> 2006ebf0` and its real registration.
- Wrapper initialization `200021d5 -> 200705b0`.
- Wrapped-object replacement `2002dc8b -> 2006f930`, including its allocation,
  Engine entity-property-set constructor, reference handling and virtual calls.
- Root cleanup `20549970` and its lower destroy/destructor continuations.

The current local continuation returns from the constructor call at `204b1d75`,
installs the derived vtable, and stops at `204b1d8f -> 2000d152`. Its focused
checks prove the retained vtable pointer, flags value 10, zero object/type fields,
constructor CALL/RET and the still-pending parent initializer frame. Five focused
checks and typechecking pass; full-suite, build, browser and deployment evidence
for this continuation remain pending.

The initialization path uses the actual type vtable and property singleton. A
successful source capture does not establish that those runtime dependencies
execute or that world/NPC activation is complete.

## Reproduce

From the repository root, supply the matching local study directory:

```powershell
python tools/gothic3/prepare_game_arena_root_source.py --study 'C:/Users/heyas/OneDrive/Рабочий стол/Gothic3_Decompiled_Study_2026-10-04' --output assets/gothic3/game-arena-root/source.json
```

The generator checks original binary hashes, disassembly bytes and captured
function bodies, follows thunk aliases, and verifies the startup table slot.
Independent regeneration matched byte for byte on 9 October 2026.
