# Original Engine argument setup evidence

`research.json` captures the original call at `30677276 -> 3068e76f`, its
70-instruction argument setup, the two-pass parser, multibyte dependency wrapper,
and CRT malloc wrapper. The package contains 22 methods, 1,531 instructions and
4,307 instruction bytes, checked against the matching original Engine.dll.

The setup calls GetModuleFileNameA, selects the current command line or filename,
counts arguments and characters, allocates storage, parses again, and publishes
argument count and vector globals. Sixteen image receipts preserve original paths
through labels and addresses, including the module filename buffer and command
line pointer. Their cold bytes do not authorize resetting already-live storage.

Regenerate from the matching local decompiled study:

```powershell
python tools/gothic3/prepare_engine_argv_source.py --study <study-directory> --output assets/gothic3/engine-argv/research.json --typescript src/gothic3/native-engine-argv-source.ts
```

Independent JSON and TypeScript regenerations are byte-identical. Two source checks and TypeScript checking pass. The JSON package has SHA-256
`de5c66335b474e309e2f0963a97ac60e06229bab7502ac55d972b8350678dc03`.
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

## Engine MBC allocation continuation

The malloc wrapper now runs its retained source stack and bridges the existing
translated lower allocator `30672ec7` against the same Engine CRT owner. The
lower body's 78 instructions are captured as evidence; they are not counted as
instructions executed on this source stack. No Game allocation is reused.

Normal allocation returns through both cdecl callers. The original REP MOVSD
copies 136 DWORDs from the actual thread MBC into the separate 544-byte Engine
allocation, preserving physical bytes and known-bit masks. It observes the
selected logical thread's direction flag. The following AND clears only the new
record's reference count. Execution then issues the actual initialization call
`30684ecb -> 30684c58`, stopping at that helper after 211 admitted operations.

NULL allocation, unavailable lower service and unsupported backward copy retain
their actual branches, pending calls or allocation effects. Code-page table
initialization, publication and full startup remain unfinished.

## Engine MBC initializer and process services

The initializer now calls the same retained code-page helper with its positive
argument, preserving a separate caller and stack record. It scans the five
original code-page table records at `30ad5000`; those owned bytes are read in
their current state. The CP1252 path returns through the original
IsValidCodePage and GetCPInfo imports with private current-call grants and exact
stack arguments. CPInfo stores eighteen defined bytes into its original 20-byte
stack record, preserving its two padding bytes.

The current path reaches the actual classification memset call
`30684cf4 -> 30671690` after 337 admitted operations. Classification, case tables,
MBC publication and complete startup remain unfinished. The earlier allocation
checkpoint is PR #224; it does not include this initializer continuation.

## Engine single-byte initialization

The retained caller now bridges the captured memset's memory behavior for its
exact same-Engine destination, zero value and 257-byte classification span. The
bridge requires the current forward logical-thread direction and retains partial
writes if interrupted; it does not count the memset's CPU-dispatch instruction
body as executed source instructions. Its original cdecl return precedes caller
argument cleanup.

GetCPInfo output writes now use a private current-call writer to invalidate
only the owned stack expression slots they overwrite. The next actual read of
MaxCharSize therefore consumes the returned bytes without treating an old cached
word as current. Fake and replayed grants cannot write output.

The supported single-byte branch publishes code page 1252, clears the related
record fields with the original STOSD instructions, and issues the case-table
call `30684dc7 -> 306849b0`. It stops at that helper after 354 admitted operations.
Case-table construction, MBC publication and full startup remain unfinished.

## Classification wrapper checkpoint

The retained Engine continuation returns the case GetCPInfo import, prepares the 256-byte character input and enters the original classification wrapper. Its locale constructor uses the same Engine PTD and a separate stack record. The default path reaches `306916cb -> 306914ea` after 1459 admitted operations. The lower classification body is captured but not executed. Temporary PTD ownership remains held until the real caller can return. Full startup and campaign integration remain unfinished.

## Unicode probe checkpoint

The lower classification body now executes its cold API probe with the immutable original Unicode input and a separate retained stack WORD. The checked GetStringTypeW return sets the same Engine-owned selector to one and reaches `3069155d` before wide conversion, after 1486 admitted operations. Cached dispatch, failed-probe handling and the conversion path remain unfinished.

## Conversion-query checkpoint

The source now issues the indirect MultiByteToWideChar size query using the original procedure and six stack arguments. Its checked same-Engine 256-byte input alias remains unchanged; NULL output and zero capacity produce count 256 through the selected process NLS table. Source branches prepare a 520-byte buffer request and stop before stack reservation `306915af -> 3068de60`, after 1510 admitted operations. Conversion output, classification completion and full startup remain unfinished.

## Current local conversion-buffer boundary

The original alignment and page-probe helpers now execute on the retained stack. They relocate the actual caller return word and return with ESP at the aligned reservation. Source instructions write the stack marker and prepare the wide span; the bounded memset bridge clears exactly 512 bytes. The default path stops before the conversion output call at `306915f8`, after 1557 admitted operations. The memset body remains captured evidence rather than counted source instructions. No Windows stack addresses or host page probes are supplied.


## Engine mapped byte output

The matching DLL import receipt now includes `WideCharToMultiByte` at IAT
`30afc6fc`. The mapping body executes its original eight-argument call at
`3067c792` and returns with 32 bytes of stdcall argument cleanup. Its mapped
Unicode input and 256-byte destination remain separate aliases of the same
Engine stack. A private output grant permits one-byte writes only within the
actual converted count; interrupted writes preserve both earlier output and the
pending return identity. Default CP1252 startup reaches buffer cleanup at
`3067c79b` after 3394 admitted operations. Cleanup, wrapper return, the upper-case
mapping, MBC publication and complete campaign integration remain unfinished.


## Engine mapping cleanup and caller return

The retained mapping body now executes both stack-buffer cleanup calls. Each
checks its actual allocation header and returns through its own source return
word; neither frees the Engine heap allocation. The body restores its saved
registers, validates the original cookie XOR relation and returns to its wrapper.
The wrapper clears only locale ownership it acquired, returns to `30684a6b`, and
the case routine removes the original 68 bytes of caller arguments. Default
execution reaches uppercase mapping preparation `30684a6e` after 3436 operations
with the Engine PTD flag restored to one. A previously owned flag remains owned.
Uppercase mapping and subsequent publication/startup/gameplay remain unfinished.


## Both Engine case mappings

The case routine now executes its original second call at `30684a8b` with
`LCMAP_UPPERCASE` (`0x200`), the original `0x198` byte destination and return
address `30684a90`. It reuses the verified mapping wrapper/body against a fresh
current frame, preserving the completed `0x298` lowercase destination. Both
calls run their original conversion, cleanup, cookie and locale-release paths.
Temporary stack aliases describe the current call; they are reused by the next
call and are not historical value snapshots. Completed byte tables remain live
in distinct spans of the case frame.

Default CP1252 execution reaches case-table publication `30684a93` after 5261
operations, cached selection after 5248 and an input NUL at byte seven after
2279. Every lower/upper output and the one-time probe passed targeted checks.
Interrupted uppercase narrowing preserves the complete lower table, its partial
upper output and the actual pending return. Typecheck and production build
passed. The character-flag/conversion loop, MBC publication, complete startup and
campaign integration remain unfinished.
