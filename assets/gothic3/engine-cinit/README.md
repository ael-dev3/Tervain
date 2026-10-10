# Engine CRT initializer evidence

This package records the next dependency after Engine environment-vector return.
It captures 18 original bodies (448 instructions), the caller at `30677284`,
the floating-point callback at `30892ac0`, and two original initializer tables.
The C initializer table has 200 slots with 6 nonzero entries. The C++ table has
93,705 slots with 1,963 nonzero entries; omitted entries are verified zero.

Generate from the matching offline study:

```powershell
python tools/gothic3/prepare_engine_cinit_source.py --study '<study-root>' --output assets/gothic3/engine-cinit/research.json
```

The generator checks the original Engine.dll hash and exact caller bytes.
Independent regeneration produced identical JSON, SHA-256
``6a6f005183049a29a92e5c52447e8e18df46d346e867ef604273d76b96162dfe``.

The capture's `runtimeConnected: false` records evidence preparation; it grants
no execution authority. The TypeScript continuation separately obtains a
private permit from the actually reached Engine startup caller.
The captured bodies cover the readonly image guard, floating-point setup,
pointer encoding, C initializer walker and exit registration. The individual
C++ callback implementations and their downstream dependencies remain work.
The selected continuation now executes the readonly guard contract, original
floating-point conversion setup, divide dispatch, ten-pointer encoding loop,
and C initializer walker. Its first callback allocates and publishes the
128-byte CRT exit table, including the original failure result of 24. The normal
path also initializes the stream table at `3067c3c7`, including its 20-entry
allocation retry and failure result of 26. It links the original 20 static FILE
records and reads the existing Engine I/O blocks under their retained owner.
The normal path stops at the next callback, `3067f720`. Initializer completion and campaign
activation remain unfinished.

Use retained Engine ownership when implementing these routines; captured
addresses identify original locations and cannot serve as browser pointers.
