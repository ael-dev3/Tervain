# Engine environment-vector setup evidence

This package captures `Engine.dll` setup at `3068e4f2` and four dependencies:
string length, CRT calloc, bounded string copying and free. The original caller
tests the argument-setup return at `3067727b`, branches on failure, and calls
environment setup at `3067727f`. The package contains five bodies and 252
instructions, including nine instructions recovered from original PE bytes in
cleanup tails omitted by the disassembly export.

The supported setup now executes both scans, vector and string allocation, the
bounded-copy success path, vector publication and normal cleanup. It returns
zero through the original `30677284` caller. NULL input or vector allocation
returns minus one. Per-string allocation failure releases and clears the vector
before the minus-one return; the retained input stays live on that failure path.

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

## Connected environment setup

The retained Engine stack executes the caller TEST/JL and actual `3067727f`
setup call. It reads the existing converted environment block, counts its
strings while excluding entries beginning with `=`, allocates the pointer vector
and copies each accepted string into a separate owned allocation. The vector
entries carry pointer capabilities into those allocations, and its last entry
is NULL.

Normal cleanup frees the converted input block, clears `30af70d4`, publishes
readiness at `30af7e6c`, restores the saved registers and returns zero. For the
default `GOTHIC3_BROWSER=1` input, the new allocations are an 8-byte vector and
an 18-byte string. The earlier 19-byte input block (including its double NUL) is released.

`strlen`, CRT calloc and free use translated contracts through the same Engine
owner. Their internal machine paths are not counted as executed source rows.
The setup caller and bounded-copy instructions execute from their admitted
receipts with the original call and return words. The source package's
`runtimeConnected` capture flag grants no blanket execution authority; private
call permits select these supported runtime paths.

Unknown bytes, unavailable allocation and interrupted publication retain the
state and pending calls already produced. Input release is tracked separately
from clearing its global, so interruption between those operations cannot replay
free. The bounded-copy range-error errno path remains an explicit unsupported
operation rather than a fabricated successful return.

The counting prefix passed 120 focused checks, typechecking and a production
build. The completed setup's 13 targeted checks also pass. The six-file run passed
156 checks and found two assertions observing values after startup advanced.
Both assertions are retained at their actual observation point and pass in a
separate rerun, covering all 158 distinct focused checks. Typechecking and the
production build (59.10 seconds) pass. Full combined validation is pending. Independent source regeneration matches byte-for-byte.
The next unsupported operation is the caller TEST at `30677284`. Full Engine
attachment, world activation, deployment of this checkpoint and a finishable
campaign remain separate work.
