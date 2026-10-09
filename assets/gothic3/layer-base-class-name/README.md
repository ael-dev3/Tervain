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
`20034649`. Its component initializer publishes the retained static fields;
it does not yet run on the actual browser startup stack.

The string holder requests 29 bytes and uses the existing source-audited
29..32-byte SharedBase pool. Component checks cover the cold name, cleanup,
cached result, prior pointer, separate module caches, missing dependency,
unknown guard bytes, missing allocation pools and foreign MemoryAdmin rejection. Focused tests
across this component, Arena, Game exit-table and CRT demangler passed, together
with TypeScript checking. These checks do not establish complete C++ startup
or a playable campaign. The next integration must retain the actual startup
stack and initializer order.
