# AI FreePoint startup evidence

The next unsupported Game C++ initializer is `204b2130`. Its fourteen
instructions construct the wrapper at `207b511c`, obtain its reflected type,
initialize it with argument one, and register cleanup callback `20549b80`.

`source.json` captures matching original Game DLL instructions and image bytes:

| Operation | Body | Instructions |
| --- | --- | --- |
| Type getter | `200732e0` | 21 |
| Wrapper initialization | `20073010` | 73 |
| Class-name getter | `20073120` | 22 |
| Parent-type dependency | `200725c0` | 125 |
| Type accessor | `20072380` | 2 |
| Wrapper object getter | `20072960` | 2 |

The actual type vtable's class-name slot resolves to the captured class-name
getter. Its accessor returns the receiver's `+0x18` subobject. The wrapper's
object getter reads the actual `+8` field. These identities must be preserved
when implementing registration and initialization.

The package also captures type cleanup `20549b30` and class-name cleanup
`20549b60`, including their terminal imported tail jumps. Both are missing
from the original functions CSV, so their targeted disassembly is checked
directly against the DLL. Wrapper cleanup `20549b80` remains uncaptured.

Six image receipts distinguish original file-backed bytes from loader zero
fill and retain section bounds. They are initial image evidence, not captured
live object state. This package does not implement or execute FreePoint startup.

Reproduce from the matching local study:

```powershell
python tools/gothic3/prepare_freepoint_source.py --study '<study directory>' --output assets/gothic3/freepoint-startup/source.json
```

Two separate generations matched exactly, SHA-256
`da8aa591bcde0b1c52d4127725b135ef2964b99c713b990e7ad0308473b87b02`.
