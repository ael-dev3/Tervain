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

These support owners are not yet connected to the live `__cinit` invocation.
They do not register property templates or dispatch virtual `Create` calls.
Full startup, NPC activation and campaign completion remain unfinished.

Regenerate from your frozen original study:

```powershell
python tools/gothic3/prepare_property_type_constructors.py `
  --study "PATH/TO/Gothic3_Decompiled_Study_2026-10-04" `
  --output "PATH/TO/new-property-constructor-capture"
```
