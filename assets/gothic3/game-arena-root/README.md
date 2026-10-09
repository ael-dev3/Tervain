# Original Arena property-object startup evidence

This source package captures 282 instructions from the matching Game and
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

The subsequent type bridge now connects the existing canonical Arena type
owner through the original singleton CALL/RET frame. It constructs and registers
the type and stores its pointer in the wrapper. Startup next stops at
`204b1daa -> 200021d5`, with 157 shutdown callbacks retained. Twenty focused
checks pass; broad validation and deployment of this continuation are pending.
Runtime cold-image receipts use the established `cold-original-image` scope;
the capture separately preserves the proven PE zero-fill origin.

The next local prefix enters wrapper initialization through the captured
`200021d5 -> 200705b0` alias. Original instructions consume the actual stack
argument and set bit zero through their XOR sequence. Wrapper flags become 11,
and execution stops at `200705c4 -> 2002dc8b`. Twenty focused checks and
typechecking pass. The initializer and wrapper call remain pending; this does
not establish complete property-object initialization.

## Reproduce

The latest local continuation bridges the Arena type's actual vtable pointer
and reads its current factory slot at byte offset 12. The independently captured
slot contains `2002adfb`; its original `2006d780` LEA/RET body returns the
factory subobject at type offset 24. The original caller's wrapper argument
remains on the stack for the following registration call. The virtual call
returns at `200705d4`, then startup stops at `200705d6 -> [207d86e0]`
(`RegisterPropertyObject`). Twenty focused checks and typechecking pass, and
independent source/runtime regeneration matches. Broad validation and deployment
of this continuation are pending.

The subsequent local continuation returns from wrapped-object replacement.
Both property-singleton getters use the actual canonical SharedBase image;
the original `EnableRegistration` body disables registration for this wrapper
and restores it after replacement. Checks prove both toggle returns, enabled
flag 1, a cleared temporary owner pointer and the returned replacement frame.
Startup next stops at `200705ce`, whose Arena type virtual-table access still
needs its pointer bridge. Twenty focused checks and typechecking pass; independent
source/runtime regeneration matches. Full-suite, build, browser and deployment
validation of this continuation remain pending.

The latest local continuation enters replacement at `2006f930`, retains the
original saved registers, loads the captured SharedBase import targets, clears
the wrapped-object pointer and returns from the indirect `IsRoot` call at
`2006f97c`. Execution next stops at property singleton import `2006f985`.
Twenty focused checks and typechecking pass, and the source/runtime independently
regenerate byte for byte. Replacement, wrapper initialization and the parent
initializer have not yet returned; broad validation and deployment are pending.

From the repository root, supply the matching local study directory:

```powershell
python tools/gothic3/prepare_game_arena_root_source.py --study 'C:/Users/heyas/OneDrive/Рабочий стол/Gothic3_Decompiled_Study_2026-10-04' --output assets/gothic3/game-arena-root/source.json
```

The generator checks original binary hashes, disassembly bytes and captured
function bodies, follows thunk aliases, and verifies the startup table slot.
Independent regeneration matched byte for byte on 9 October 2026.
