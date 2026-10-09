# AI helper administrator startup evidence

Original Game initializer `204b2660` constructs the `eCAIHelperAdmin` wrapper
at `207b5298`, obtains its reflected type, initializes it with argument one,
and registers cleanup `20549d60`. The package checks all fourteen initializer
instructions, six helper bodies and seven initial image regions against the
matching original Game DLL. File-backed bytes and loader zero fill are recorded
separately; these receipts do not represent captured live game state.

| Helper | Body | Instructions |
| --- | --- | --- |
| Reflected type getter | `20077330` | 21 |
| Wrapper initialization | `20077040` | 73 |
| Class-name getter | `20077150` | 22 |
| Object replacement | `20076630` | 132 |
| Type accessor | `200763f0` | 2 |
| Virtual class-name target | `20077150` | 22 |

The virtual class-name slot has three recovered jumps to the canonical getter.
The property factory accessor returns the receiver's `+0x18` subobject. Type
cleanup `20549d10` is captured from five original instructions; wrapper cleanup
`20549d60` is captured from thirty PE bytes with a bounded five-instruction
decode. Shutdown execution remains unfinished.

The current interpreter executes the SharedBase wrapper constructor, retains
flags ten and a zero object field, and installs the original derived vtable.
It stops at reflected-type getter CALL `204b267f -> 20016e32`. The complete
initializer has not returned. TypeScript checking and all 31 focused startup
tests passed; broad validation and browser proof of this continuation are pending.

```powershell
python tools/gothic3/prepare_ai_helper_admin_source.py --study '<study directory>' --output assets/gothic3/ai-helper-admin-startup/source.json --typescript src/gothic3/native-game-ai-helper-admin-source.ts
```

Independent JSON and TypeScript generations matched exactly. JSON SHA-256:
`1716d1a2980e089c828704b0c7432ad5332376583cc4758f72dc2df6e6013bcc`.
