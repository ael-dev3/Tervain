# AI Label startup evidence

The current browser startup boundary is original Game initializer `204b23d0`
for `gCAIHelper_Label_PS`. This package captures its fourteen instructions,
five helper bodies and seven initial image regions from the matching local
Game DLL. Every listed instruction is checked against the original PE bytes;
entry jumps, section bounds, hashes and loader zero fill are recorded.

| Helper | Body | Instructions |
| --- | --- | --- |
| Reflected type getter | `20075290` | 21 |
| Wrapper initialization | `20075040` | 73 |
| Class-name getter | `20072fa0` | 22 |
| Object replacement | `20074640` | 125 |
| Type accessor | `20074400` | 2 |

The accessor returns the receiver's `+0x18` property factory. The original
initializer constructs the wrapper at `207b51c4`, obtains its type, initializes
it with argument one, and registers cleanup `20549c50`. Type cleanup is
`20549c20`; the class-name getter registers thunk `20007702`. Cleanup bodies
and execution are not captured by this package. These are source receipts,
not proof that the Label initializer executes in the browser.

Reproduce with:

```powershell
python tools/gothic3/prepare_label_source.py --study '<study directory>' --output assets/gothic3/label-startup/source.json
```

Two independent generations matched byte for byte. JSON SHA-256:
`d41e8d05e1b9da04362176ffb356935fa19ca5ca379b43b72bc87330f8f17f79`.
