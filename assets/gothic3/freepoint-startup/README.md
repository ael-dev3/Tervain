# AI FreePoint startup evidence

The recovered Game C++ initializer is `204b2130`. Its fourteen
instructions construct the wrapper at `207b511c`, obtain its reflected type,
initialize it with argument one, and register cleanup callback `20549b80`.

`source.json` captures matching original Game DLL instructions and image bytes:

| Operation | Body | Instructions |
| --- | --- | --- |
| Type getter | `200732e0` | 21 |
| Wrapper initialization | `20073010` | 73 |
| Class-name getter | `20073120` | 22 |
| Object replacement and registration toggles | `200725c0` | 125 |
| Type accessor | `20072380` | 2 |
| Wrapper object getter | `20072960` | 2 |

The actual type vtable's class-name slot resolves to the captured class-name
getter. Its accessor returns the receiver's `+0x18` subobject. The wrapper's
object getter reads the actual `+8` field. These identities must be preserved
when implementing registration and initialization.

The package also captures type cleanup `20549b30` and class-name cleanup
`20549b60`, including their terminal imported tail jumps. Both are missing
from the original functions CSV, so their targeted disassembly is checked
directly against the DLL. Wrapper cleanup `20549b80` is captured from its
exact thirty original PE bytes using five bounded instruction encodings.

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
The later registration continuation now inserts the actual type into the
shared property table, registers type cleanup `20549b30` and returns the
getter through its actual startup frame. The initializer stores that type
pointer at wrapper `+12` and stops at `204b216a -> 20008571`.
The later wrapper continuation executes its captured body prefix on the retained
startup stack, reads argument one and changes flags from ten to eleven. It stops
at object-replacement call `20073024 -> 2002a987` in that earlier checkpoint.
The current continuation executes that helper, the type accessor and property
factory registration, then returns from wrapper initialization and initializer
`204b2130`. The later class-name initializer `204b23c0` shares the canonical
CString owner and returns. Startup next stops at callback `204b23d0`. Cleanup
callbacks are registered; shutdown traversal remains unfinished.

Reproduce from the matching local study:

```powershell
python tools/gothic3/prepare_freepoint_source.py --study '<study directory>' --output assets/gothic3/freepoint-startup/source.json --typescript src/gothic3/native-game-freepoint-source.ts
```

Two separate generations matched exactly for both JSON and generated TypeScript.
JSON SHA-256 is
`73208900fc37801000d4805e647e61078ffbf7ba857a065e7da3d8c7ed2cf122`.
