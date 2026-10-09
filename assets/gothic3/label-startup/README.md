# AI Label startup evidence

The current browser startup boundary is original Game initializer `204b23d0`
for `gCAIHelper_Label_PS`. This package captures its fourteen instructions,
six helper bodies and seven initial image regions from the matching local
Game DLL. Every listed instruction is checked against the original PE bytes;
entry jumps, section bounds, hashes and loader zero fill are recorded.

| Helper | Body | Instructions |
| --- | --- | --- |
| Reflected type getter | `20075290` | 21 |
| Wrapper initialization | `20075040` | 73 |
| Class-name getter | `20072fa0` | 22 |
| Object replacement | `20074640` | 125 |
| Type accessor | `20074400` | 2 |
| Virtual class-name thunk target | `20072fa0` | 22 |

The accessor returns the receiver's `+0x18` property factory. The original
initializer constructs the wrapper at `207b51c4`, obtains its type, initializes
it with argument one, and registers cleanup `20549c50`. Type cleanup is
`20549c20`; the class-name getter registers thunk `20007702`. Type cleanup is captured as five original instructions ending in an imported
tail jump, checked directly against the DLL. Wrapper cleanup and shutdown
execution remain uncaptured. The initializer prefix now executes the original SharedBase wrapper
constructor on its own retained storage, sets flags to ten, clears its object
field and installs the Label vtable. The reflected type getter now sets its guard, constructs the type base with
flag one and installs vtable `2065a384`. Its class-name getter reuses the earlier static initializer owner and the
named factory constructs at type offset `+0x18`. The type now registers in the shared property table, registers cleanup
`20549c20` and returns through its retained startup frame. The initializer
stores that type at wrapper offset twelve and stops at wrapper initialization
CALL `204b240a -> 200340e0`. The complete Label initializer has not returned.

Reproduce with:

```powershell
python tools/gothic3/prepare_label_source.py --study '<study directory>' --output assets/gothic3/label-startup/source.json --typescript src/gothic3/native-game-label-source.ts
```

Two independent generations matched byte for byte. JSON SHA-256:
`3c7d7782caf55541d4b094a4d9b97659060401bd474c01376c6eeeea7d1a668b`.
