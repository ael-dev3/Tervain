# Engine CRT initializer evidence

This package records the next dependency after Engine environment-vector return.
It captures 14 original bodies (319 instructions), the caller at `30677284`,
the floating-point callback at `30892ac0`, and two original initializer tables.
The C initializer table has 200 slots with 6 nonzero entries. The C++ table has
93,705 slots with 1,963 nonzero entries; omitted entries are verified zero.

Generate from the matching offline study:

```powershell
python tools/gothic3/prepare_engine_cinit_source.py --study '<study-root>' --output assets/gothic3/engine-cinit/research.json
```

The generator checks the original Engine.dll hash and exact caller bytes.
Independent regeneration produced identical JSON, SHA-256
``eab6984f4c075c0f4cd0fd55f121d1e2d8e18e8c31662bbd18a3512d8b00627b``.

This is evidence preparation. The initializer is not connected to runtime yet.
The captured bodies cover the readonly image guard, floating-point setup,
pointer encoding, C initializer walker and exit registration. The individual
C++ callback implementations and their downstream dependencies remain work.
Use retained Engine ownership when implementing these routines; captured
addresses identify original locations and cannot serve as browser pointers.
