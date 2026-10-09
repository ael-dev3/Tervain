# Second original Game C++ class-name initializer

Original table slot `2056c108` selects `204b11c0`. Its three instructions call
getter `2002c9f8`, store the static object address at `207b471c`, and return to
the original C++ initializer loop. The getter forwards to `20047070` and uses
descriptor `20796030`, whose original decorated name is `.?AVbCObjectRefBase@@`.

The physical cache is `207b458c`: CString at +0, prior initializer result at +4
and two guard bits at +8. This cache and descriptor are separate from LayerBase.
The exact cleanup forwarding entry is `20007a81 -> 20549170`; its body loads
the cache into ECX and jumps through SharedBase's CString destructor import.

`prepare_object_ref_class_name_source.py` runs the complete verified batch
capture before selecting this initializer. It preserves supplemental Ghidra
initializer provenance, original getter assembly, and the explicit cleanup
assembly/PE recovery where the function catalog has a gap.

```powershell
python tools/gothic3/prepare_object_ref_class_name_source.py --study '<study-directory>' --output assets/gothic3/object-ref-class-name/source.json --runtime-output src/gothic3/native-game-object-ref-source.ts
```

The source package itself grants no execution. Runtime admission compares it
with the generated independent receipt. The retained browser startup controller
must select the original callback, create its actual CALL frame and use the same
SharedBase heap before invoking the translated getter. The original result
store and RET execute through the existing interpreter.

The CString allocation requests 24 bytes, using the captured 21–24-byte pool.
An unavailable pool retains both nested CALL frames, the completed first
initializer, guard bits and RTTI cache; it leaves the second result unpublished
and registers no second cleanup callback. Successful execution selects the
next original target `204b11d0`. Complete CRT traversal, engine attachment,
live world activation and a finishable campaign remain unfinished.
