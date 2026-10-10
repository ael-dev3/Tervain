# Engine environment-vector setup evidence

This package captures `Engine.dll` setup at `3068e4f2` and four dependencies:
string length, CRT calloc, bounded string copying and free. The original caller
tests the argument-setup return at `3067727b`, branches on failure, and calls
environment setup at `3067727f`. The package contains five bodies and 252
instructions, including nine instructions recovered from original PE bytes in
cleanup tails omitted by the disassembly export.

The normal tail frees the retained environment block, clears `30af70d4`, writes
the vector terminator, publishes readiness at `30af7e6c` and returns zero. The
allocation-failure tail clears `30af7118` and returns minus one. These are source
receipts; allocation, vector publication, copying and cleanup still need runtime integration.

The environment block already belongs to Engine's retained CRT bootstrap.
Integration must use that allocation and preserve its ownership and lifetime.
The cold vector/ready receipts are separate from the existing block pointer;
capturing them does not grant permission to reseed live startup state.

Reproduce with your matching study directory:

```sh
python tools/gothic3/prepare_engine_setenvp_source.py --study "$STUDY" --output assets/gothic3/engine-setenvp/research.json --typescript src/gothic3/native-engine-setenvp-source.ts
```

Generate into a separate directory and compare both outputs before accepting a
source change. The generator rejects a different original DLL or cleanup byte
sequence. Complete Engine attachment and browser campaign play remain unfinished.

## Connected counting prefix

The retained Engine stack now executes the caller TEST/JL and the actual
`3067727f` setup call. It reads the existing environment pointer, scans its
strings, excludes entries beginning with `=`, and pushes the vector slot count
and element size before the pending calloc call `3068e532 -> 3067ca01`.
`strlen` uses a translated value contract over the canonical owned input span;
its alignment-dependent machine paths are not counted as executed instructions.
Caller instructions and real return words are tracked separately.

A NULL environment takes the original minus-one return through `30677284`.
Unknown bytes retain the scan prefix and pending call. Repeated attach requests
reuse the retained outcome. No vector allocation or completed attachment is
claimed by this counting prefix.

Local validation: 120 focused checks across three files passed in 131.54
seconds, typechecking passed, and the production build passed in 1m 6s.
Independent regeneration of the JSON and TypeScript source package matched
byte-for-byte. These are component results; combined full-suite, deployment
and campaign validation remain separate work.
