# Original SharedBase property-object destruction

The producer captures and byte-checks three original dependencies:

| Entry | Body | Operation |
| --- | --- | --- |
| `10001e1a` | `100880a0` | Property-object type base destruction. |
| `10002f86` | `1008d110` | Named property factory destruction. |
| `10002347` | `10088720` | Property pointer-array clear and storage release. |

```powershell
python tools/gothic3/prepare_property_object_destruction.py --study $env:LOCAL_GOTHIC3_STUDY --output assets/gothic3/property-object-destruction
```

`NativePropertyObjectConstruction.destroy` requires its actual completed
constructor owner. Base destruction restores the base vtable, invokes the pointer
array clear twice, retains both following conditional free blocks, then destroys
the base CString. Factory destruction restores its vtable, destroys the name
CString first, then retains both raw-array conditional free blocks. Destruction
does not zero stale CString slots or untouched flag/padding bytes.

The pointer clear handles the actual array count and NULL element branches. A
non-NULL property requires its original virtual destructor at vtable offset
`0x58`; that dispatch remains an explicit boundary. A failure retains its prior
native field changes and prevents replay. This does not claim full property
shutdown or any campaign completion.
