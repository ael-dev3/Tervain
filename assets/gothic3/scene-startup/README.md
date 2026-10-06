# SceneAdmin startup source evidence

This package is an offline audit of the installed Gothic 3 `SharedBase.dll`
and `Engine.dll`. It supplies original instruction bytes, bounded reconstructed
C excerpts, cold image bytes, import identities, and source operands for the
selected SceneAdmin startup dependencies. Native code was not executed.

## Reproduce

From the repository root, run:

```powershell
python -B tools/gothic3/prepare_scene_startup_source.py --study 'C:/Users/heyas/OneDrive/Рабочий стол/Gothic3_Decompiled_Study_2026-10-04'
```

[The manifest](manifest.json) records the input identities and output hashes.
[Rules](runtime-rules.json) admit the selected constants and methods.
[Evidence](native-evidence.json) contains 61 newly audited method bodies,
2,041 unique instructions, and zero PE byte mismatches. Twenty-two additional
method receipts are reused from the frozen runtime-admin and npc-heap packages;
their source excerpts and original instruction bytes are checked again.

## Captured dependencies

- Heap pool 24: requests 21 through 24; heap pool 384: requests 321 through 384.
  Dispatch table boundaries, bitmap allocation, initialization, inline free,
  descriptor callbacks, realloc, shutdown, statistics, and cold globals are
  audited. The selected pointer-area prefix has twelve 16-byte records.
- SceneAdmin cached getter, class-name startup, initializer, destructor callback,
  reflected creator, and complete constructor/destructor bodies are captured.
- EngineComponent, InputReceiver, ObjectBase, ObjectRefBase, EntityAdmin,
  math invalidation, and SetSpinCount dependencies are captured.
- All five map constructors/grow methods are recorded. Their constructor order
  is physical offsets `+14`, `+24`, `+34`, `+44`, `+54`; each cold map backing
  allocation requests 204 bytes for capacity 51 and logical bucket count 43.
- ModuleAdmin getter, lookup, registration, array growth, destructor, shutdown
  callback, and InputDispatcher dependencies are captured.

## CRT and class-name distinctions

Class-name startup copies the cached initializer result at `30ad9d6c` into
`30ad9c48`. Those are class-name pointers. Both are zero in the original cold
image. Initializer `307325e0` calls the class-name getter and stores its returned
CString address at `30ad9d6c`.

The CRT `type_info::name` call independently uses the literal RTTI descriptor
`30aa3050`, whose original name is `.?AVeCSceneAdmin@@`. Its cached name pointer
at `+4` begins at NULL. Its shared CRT list at `30af70ac` is eight loader-filled
zero bytes. The unbound import thunk bytes recorded here are not live pointers.

The reconstructed disassembly and C mistakenly annotate `_free` as not returning
and omit ten original PE instructions across the type-info body and cleanup.
The producer checks exact opcodes and recovers those rows explicitly, including
the CRT unlock and return path. These rows are marked `originalPERecovered`;
the package does not attribute them to a nonexistent source assembly excerpt.

## Runtime scope

These receipts do not prove application initialization, `___unDName` execution,
CRT allocation/locking owners, EntityAdmin critical-section initialization,
reflection registration, ModuleAdmin attachment, or complete shutdown ownership.
Capturing a full function does not imply every branch is implemented in the
browser. A legitimate startup owner must supply those dependencies in source
order and preserve any applied prefix when a service is unavailable.
