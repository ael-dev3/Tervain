# Engine CRT bootstrap source receipts

Offline receipts for the original Engine.dll, SHA-256 `d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3`.
The producer executes no game code and captures no live process state.
Original x86 operands and PE bytes govern the layouts; reconstructed C is explanatory.

## Reproduce

```powershell
python -B tools/gothic3/prepare_crt_bootstrap_source.py --study '<LOCAL_DESKTOP_STUDY>'
```

The study must contain the original Engine.dll and Engine function catalog,
assembly and reconstructed C. The frozen CRT demangler package is verified;
its selected receipts are explicitly referenced and never modified.

## Scope

52 method receipts include 18 reused receipts,
31 newly audited catalog methods and 3 uncataloged compiler thunks.
All 1665 unique instructions match the original PE.
Post-free recovery retains 8 prior instructions and restores
41 further instructions omitted by erroneous noreturn annotations.
One reused receipt (crtAttach) is explicitly extended by its recovered continuation;
the other 17 retain their original instruction hashes.

The actual PTD request is calloc(1,0x214):532 bytes. Cold cookie/complement,
procedure and encoded-pointer slots, default locale/MBC/time objects, aliases,
pointer bindings and the zero pre-C-init callback table are byte-pinned.
Cold original pointers retain their numeric source value until an owner maps
them to the corresponding canonical capability. No nonzero field is forced zero.

The selected process path reaches the next GetCommandLineA boundary after
the captured MT/bootstrap and pre-C-init operations. Environment, I/O, full C
initialization, native application/module startup and gameplay remain separate
dependencies. Capturing a method does not establish runtime ownership.
