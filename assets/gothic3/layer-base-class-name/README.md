# First Game C++ class-name initializer

This package captures the first non-null callback in Game's C++ initializer
table: slot `2056c104` contains `204b11b0`. The callback calls the class-name
getter at `2000e8d6`, stores its result at `207b4760`, and returns.

The getter forwards to `20047000`. Its actual type descriptor at `20796004`
contains `.?AVeCProcessibleElement@@`. This is the base type used by the
`gCLayerBase` property object; replacing it with a guessed `gCLayerBase` name
would change the original behavior.

The receipt includes the 12-byte class-name fields at `207b4580`, the cached
initializer result, the original table slot and the descriptor bytes. It also
records the SharedBase `UnMangle` and string destructor imports. The destructor
entry `20034649` forwards to `20549180`; its two original instructions are
verified independently because that body is absent from the function catalog.
The initializer retains its supplemental Ghidra recovery provenance and pinned
assembly and pseudocode hashes. Every captured initializer instruction is also
checked against the original PE bytes.

Regenerate from the matching offline study:

```powershell
python tools/gothic3/prepare_layer_base_class_name_source.py --study 'C:/Users/heyas/OneDrive/Рабочий стол/Gothic3_Decompiled_Study_2026-10-04' --output assets/gothic3/layer-base-class-name/source.json --runtime-output src/gothic3/native-game-layer-base-source.ts
```

The generated admission module pins this complete receipt independently of the
imported JSON. The translated `NativeGameLayerBaseClassName` component uses
canonical Game image fields and the existing Game RTTI, demangler, SharedBase
string and Game shutdown callback owners. Its cold getter yields
`eCProcessibleElement`, retains both guard writes and registers cleanup at
`20034649`. Its component initializer publishes the retained static fields.
When browser startup supplies its existing same-platform MemoryAdmin, the
interpreter executes the initializer's three original instructions on the
retained Game stack. The getter uses the translated component and a physical
CALL/RET frame; its 22 native instructions are not interpreted individually.
The returned module pointer is stored by the original `MOV`, and the original
`RET` resumes the C++ table loop at `20466656`. The next selected slot contains
`204b11c0`, whose initializer remains unsupported.

The string holder requests 29 bytes and uses the existing source-audited
29..32-byte SharedBase pool. Component checks cover the cold name, cleanup,
cached result, prior pointer, separate module caches, missing dependency,
unknown guard bytes, missing allocation pools and foreign MemoryAdmin rejection.
Eighty-six focused tests across this component, startup stack, Game environment,
Game image owner, exit-table and CRT demangler passed, together with TypeScript
checking. Additional stack checks verify the successful
original CALL/store/RET sequence and the retained nested CALL frames when the
string pool is unavailable. Game startup retains its supplied heap and rejects
replacement, foreign or caller-shaped MemoryAdmin objects. A profile without a
supplied heap retains its earlier explicit initializer boundary.

These checks do not establish complete C++ startup or a playable campaign.

## Integrated checkpoint validation

After integrating main's reviewed changes through PR #192, TypeScript checking,
all 3,160 tests across 291 files (409.84 seconds) and the production build
(40.4 seconds) passed. The browser preview rendered Ardea's original human
model and reported startup blocked at the next target `204b11c0`, with 2,769
environment-source operations completed. Original NPC activation still has
0 of 16 property sets attached and stops at the unconnected ScriptAdmin getter.
