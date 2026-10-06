# Engine CRT demangler source receipts

This is an offline package from the original installed Engine.dll, SHA-256
`d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3`. It executes no native code and captures no live process state.
The reconstructed C is explanatory. Original x86 instruction operands and the
byte-checked assembly govern the receipt and its physical layouts.

## Reproduce

From the repository root, run:

```powershell
python -B tools/gothic3/prepare_crt_undname_source.py --study '<LOCAL_DESKTOP_STUDY>'
```

The study must contain `00_Original_Runtime/Engine.dll` and the exported
`01_Decompiled_Code/Engine_dll` function catalog, assembly, and pseudocode.
The producer also verifies the frozen SceneAdmin rules before writing this
separate package. It never modifies the earlier packages.

## Contents

- `80` catalog methods and two recovered SEH entry receipts.
- `3686` unique PE-checked instructions, including eight recovered
  post-free instructions and fifteen uncataloged SEH instructions.
- Exact cold storage for the CRT heap, OS fields, allocation policy, 36-record
  lock table, fourteen static sections, type-info list, and demangler globals.
- Four node vtables, keyword/prefix literals, call/import bindings, physical
  field layouts, source excerpt hashes, and a selected plain class parse trace.

`runtime-rules.json` uses `gothic3-crt-undname-rules-v1`.
`native-evidence.json` retains individual instructions and original source
references. `manifest.json` pins the generated rule/evidence hashes.

## Physical scope

The lock table starts with NULL pointer slots and preserves the nonzero static
flags. The CRT heap handle starts NULL. Startup must retain an actual admitted
heap capability and initialize its section capabilities before demangling.

The selected RTTI input is descriptor offset 9, `?AVeCSceneAdmin@@`, with flags
0x2800. Its source grammar constructs `class eCSceneAdmin`: the identifier is
read from input bytes, recorded in the second Replicator, and concatenated in a
physical DName graph. The normal graph consumes 152 arena bytes in one 4,104-byte
CRT backing. Output is a separate 24-byte CRT allocation. The arena is freed
before lock 5 is released; the output is retained for the caller.

This selected trace is a source deduction. It is not a constant production
demangler, an executed-game observation, a complete CRT loader, or evidence of
owned generic template/function parsing. OS services, pointer encoding, errno,
new handlers, unsupported heap modes and unimplemented grammar branches remain
explicit runtime boundaries until their source owners are implemented.

All C excerpts preserve their original study spelling, including erroneous
noreturn annotations. The producer restores omitted continuations directly
from PE bytes and records that recovery in the method receipts.
