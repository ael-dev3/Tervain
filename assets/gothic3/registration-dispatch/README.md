# Registration diagnostic dispatch source

`source.json` captures original SharedBase Debug (23 instructions),
MessageAdmin.GetInstance (16 instructions) and OnMessage (43 instructions).
The preparation tool verifies the matching DLL hash, follows entry thunks and
compares every selected disassembly instruction with original PE bytes.

OnMessage's actual body is `10049510`. It compares the supplied message type
with the DWORD at owner offset `0x1c`. Signed `type <= threshold` branches to
`10049574`, returns AL=1 and executes `RET 0x18`; no lock or callback runs on
that branch. The registration Debug call supplies type one. The recovered
MessageAdmin constructor writes threshold one, but integration must establish
the actual getter returned and read its retained storage before selecting this
branch. This source capture does not claim message dispatch or startup return.

The alternative branch enters the critical section, invokes `10006ebf` three
times with indices zero through two and leaves the critical section. Its callee
requires separate recovery before that branch can be supported.

Regenerate from the matching local study:

```powershell
python tools/gothic3/prepare_registration_dispatch_source.py --study '<study directory>' --output assets/gothic3/registration-dispatch/source.json
```
