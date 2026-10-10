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
receipts; this package does not implement those runtime effects yet.

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
