# Arena Status enum metadata

The next original C++ initializer is `204b1e70`: construct the temporary name
`gEArenaStatus_None`, invoke `20011b99 -> 20071e60` with the actual Status
descriptor, value zero and flags zero, then destroy the temporary name.

`source.json` verifies the initializer's targeted disassembly against the
matching Game DLL. The original functions CSV lacks this subsequently recovered
initializer, so the preparation tool reads its committed targeted disassembly.
The three callees follow original entry thunks and retain complete bodies:

| Operation | Body | Instructions |
| --- | --- | --- |
| Enum value construction | `20071e60` | 48 |
| Value naming | `200719a0` | 40 |
| Value insertion | `20071060` | 38 |

The constructor writes the original scalar scratch image, allocates twelve
bytes with category `0x46`, constructs and names its value, then attempts
insertion into the property descriptor. Allocation failure and rejected
insertion have distinct original branches. A rejected non-NULL object follows
virtual destruction and allocator cleanup; runtime integration must preserve
these paths and actual object ownership.

The source also retains the original name bytes, two vtables, scalar scratch and
one-byte constructor receiver. PE section evidence distinguishes file bytes
from loader zero-fill. The receiver is loader zero-fill, not file-backed data.
Independent regeneration matched exactly. Execution of this initializer is
still unimplemented; capture does not claim runtime or campaign completion.

```powershell
python tools/gothic3/prepare_arena_enum_source.py --study '<study directory>' --output assets/gothic3/arena-enum/source.json
```
