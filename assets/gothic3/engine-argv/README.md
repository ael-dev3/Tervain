# Original Engine argument setup evidence

`research.json` captures the original call at `30677276 -> 3068e76f`, its
70-instruction argument setup, the two-pass parser, multibyte dependency wrapper,
and CRT malloc wrapper. The package contains 11 methods, 688 instructions and
1,992 instruction bytes, checked against the matching original Engine.dll.

The setup calls GetModuleFileNameA, selects the current command line or filename,
counts arguments and characters, allocates storage, parses again, and publishes
argument count and vector globals. Twelve image receipts preserve original paths
through labels and addresses, including the module filename buffer and command
line pointer. Their cold bytes do not authorize resetting already-live storage.

Regenerate from the matching local decompiled study:

```powershell
python tools/gothic3/prepare_engine_argv_source.py --study <study-directory> --output assets/gothic3/engine-argv/research.json --typescript src/gothic3/native-engine-argv-source.ts
```

Independent JSON and TypeScript regenerations are byte-identical. Two source checks and TypeScript checking pass. The JSON package has SHA-256
`12c33e7727a7b816bcbb3d66c6b5e35b3a0bf14673895c80c1ee1d266b4a2b30`.
Engine.dll SHA-256 is
`d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3`.

This package is evidence only (`runtimeConnected: false`). The wrapper's nested
multibyte call at `30685012 -> 30684e6d` and three immediate helpers are captured.
Deeper thread, locale, allocation and lock dependencies still require recovery
before claiming full dependency coverage. Module filename
service, parser execution, Engine-owned argv allocation and caller return remain
unfinished. This does not prove complete engine startup or playable campaign.

## Game implementation comparison

`game-comparison.json` compares the original argument setup (70 instructions),
parser (175) and initialization wrapper (eight) with the separately captured Game
versions. After module-address operand mapping, instruction structure, constants
and offsets match with equal lengths and no reported mismatches. Regenerate with
`tools/gothic3/compare_engine_game_argv_source.py --engine assets/gothic3/engine-argv/research.json --game assets/gothic3/game-argv/native-evidence.json --output assets/gothic3/engine-argv/game-comparison.json`.
Independent regeneration and changed-instruction rejection pass. This comparison
is an implementation aid, not authority to reuse Game pointers or call grants.

## Engine code-page continuation

The package also admits Engine's original `GetACP` import at IAT `30afc734`.
The supported runtime path constructs the original 16-byte locale record on the
retained Engine stack, obtains the same Engine PTD, and temporarily owns flag
`0x2` only when it was previously clear. The original constructor returns with
`RET 4`. The private import invocation returns the selected virtual process code
page, then clears only the flag it acquired and returns to `30684e97`.

With the browser CP1252 inputs, execution reaches the real 544-byte MBC malloc
call at `30684ea8 -> 3067c9c1` after 186 admitted operations. Allocation and the
remaining multibyte initialization are unfinished. With no NLS selection, the
actual GetACP call remains pending at `30684c28` after 171 operations; the
constructor's temporary flag remains set. This checkpoint does not finish
startup or the campaign.
