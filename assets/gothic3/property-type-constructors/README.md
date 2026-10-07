# Original property-type constructors

The two SharedBase `bCPropertyTypeBase` constructors are imported by 843 Game
initializer callbacks. Their original entries are `10006a23` and `10007ccf`,
which jump to bodies `10088d50` and `10088cc0`. The captured bodies contain
26 instructions / 81 bytes and 19 instructions / 60 bytes respectively.
The capture producer checks every instruction against the original image.

The TypeScript support owner is
[`native-property-type-construction.ts`](../../../src/gothic3/native-property-type-construction.ts).
It writes the base vtable, retains each source string holder, writes the DWORD
property type and BYTE flag, and leaves the three padding bytes untouched.
The named constructor copies name, category, then value type in original order.
The simple constructor copies name and default-constructs the other strings.
An empty allocated holder is retained and its WORD reference count incremented;
ordinary string assignment has different behavior.

The package also captures the array reserve helper `100013ed -> 10088570`
(49 instructions / 124 bytes). Its support owner is
[`native-property-template-array.ts`](../../../src/gothic3/native-property-template-array.ts).
It uses signed capacity comparisons, original automatic growth limits,
DWORD-wrapped allocation sizes and the source zero-fill range beginning at
the current count. It retains the NULL pointer store if reallocation returns
NULL, then blocks before an invalid memset dereference. The allocator's copy
path now carries complete unchanged pointer slots along with their bytes and
known-bit masks, preserving pointer identity when an allocation moves.

The registration lookup's CString equality overload is also captured at
`10002eb9 -> 10011600` (42 instructions / 107 bytes) and implemented by
`NativeHeapCString.equalsCString`. It distinguishes a NULL string from an
allocated empty holder, compares stored lengths and follows the original
two-byte comparison loop. It reads native fields and bytes without converting
the operands to JavaScript strings.

These support owners are not yet connected to the live `__cinit` invocation.
They do not register property templates or dispatch virtual `Create` calls.
Full startup, NPC activation and campaign completion remain unfinished.

Regenerate from your frozen original study:

```powershell
python tools/gothic3/prepare_property_type_constructors.py `
  --study "PATH/TO/Gothic3_Decompiled_Study_2026-10-04" `
  --output "PATH/TO/new-property-constructor-capture"
```
