# Original Engine argument setup evidence

`research.json` captures the original call at `30677276 -> 3068e76f`, its
70-instruction argument setup, the two-pass parser, multibyte dependency wrapper,
and CRT malloc wrapper. The package contains eight methods, 631 instructions and
1,829 instruction bytes, checked against the matching original Engine.dll.

The setup calls GetModuleFileNameA, selects the current command line or filename,
counts arguments and characters, allocates storage, parses again, and publishes
argument count and vector globals. Seven image receipts preserve original paths
through labels and addresses, including the module filename buffer and command
line pointer. Their cold bytes do not authorize resetting already-live storage.

Regenerate from the matching local decompiled study:

```powershell
python tools/gothic3/prepare_engine_argv_source.py --study <study-directory> --output assets/gothic3/engine-argv/research.json
```

An independent regeneration is byte-identical, with package SHA-256
`13b142779fdca3113cd58ffc74634f061a5575bbf0b0b04d4a5965027266716c`.
Engine.dll SHA-256 is
`d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3`.

This package is evidence only (`runtimeConnected: false`). The wrapper's nested
multibyte call at `30685012 -> 30684e6d` and three immediate helpers are captured.
Deeper thread, locale, allocation and lock dependencies still require recovery
before claiming full dependency coverage. Module filename
service, parser execution, Engine-owned argv allocation and caller return remain
unfinished. This does not prove complete engine startup or playable campaign.
