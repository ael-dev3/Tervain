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

Seven image receipts distinguish original file-backed bytes from loader zero
fill and retain section bounds. They are initial image evidence, not captured
live object state. The generated TypeScript admission now supplies the actual
initializer instructions and canonical image receipts to browser startup.
The original SharedBase wrapper constructor executes on FreePoint's separate
storage and returns; flags become ten, the object field is zero, and the
initializer installs its actual vtable pointer. Startup stops at the type
getter call `204b214f -> 20035a08` in the preceding wrapper checkpoint.
The later translated getter now sets its actual guard, constructs the
property-type base with flag one and installs the derived vtable. It stops
at `20073309 -> 20073120` in that earlier checkpoint. The class-name getter
now demangles the original descriptor, constructs its retained CString,
registers its captured cleanup thunk and returns. Its named factory then
constructs at the type's `+0x18` subobject. Startup stops at `2007331f`.
The FreePoint initializer has not returned or registered its type.

Reproduce from the matching local study:

```powershell
python tools/gothic3/prepare_freepoint_source.py --study '<study directory>' --output assets/gothic3/freepoint-startup/source.json --typescript src/gothic3/native-game-freepoint-source.ts
```

Two separate generations matched exactly for both JSON and generated TypeScript.
JSON SHA-256 is
`a7a0df92c359be5b15458a5f41dbb6faa79079ac03a09a7da7e00085a3058fd4`.
