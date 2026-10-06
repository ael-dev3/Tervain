# Original CString text construction receipts

This additive source package audits the installed Gothic 3 SharedBase text constructor, `Alloc`, `memcpy`, `strstr`, `strchr`, and class-name `UnMangle`. The byte-checked original x86 assembly is authoritative. The CSV-selected reconstructed C explains the selected routines; it is not a successful native recompilation.

## Reproduce

Run from the repository root with the original study directory available:

```powershell
python -B tools/gothic3/prepare_cstring_text_construction_source.py --study '<LOCAL_DESKTOP_STUDY>'
```

The producer rejects a different `SharedBase.dll` SHA. It follows original entry jumps, selects each body through `functions.csv`, and checks every instruction byte and the complete catalog extents against the original PE. Reconstructed C excerpts normalize trailing line whitespace, use LF line endings, and end with one newline. Their original complete C chunk hashes remain in `native-evidence.json`; the normalized excerpt hashes are separate.

## Contents and scope

- `runtime-rules.json` supplies source addresses, instruction hashes, complete ranges, six reachable `memcpy` jump tables, the exact NUL-terminated space literal, and a cold-image vector flag receipt.
- `native-evidence.json` includes complete selected instructions, original input/CSV/assembly/C hashes, and the derived `strchr` entry.
- `sources/SharedBase/100a7306.derived.asm.txt` is the exact subset reached by `strstr` inside the audited `strchr` body. It retains the earlier NULL-return block. There is no fabricated CSV row or separate reconstructed C routine for this entry.
- `source-manifest.json` pins every package file except itself, plus the producer and its imported local Python dependencies.

The alignment jump-table slot with index zero overlaps instructions and is unreachable; only the reachable index-one through index-three slots are recorded. The backward DWORD dispatch uses a negated count. Every recorded jump target is an instruction in the byte-audited `memcpy` body.

These are offline source receipts. The producer runs no native game code, captures no live process globals, and does not run repository tests or builds. Cold `102f854c = 0` is not evidence of its live value. Forward copies of at least 256 bytes read that live global and can enter the separately unowned vector routine `100b4c1a`. The backward overlap branch uses the scalar copy without that CPU dispatch.

The browser must obtain alignment, capacity, disjointness or native address order, and lifetimes from actual storage and allocator owners. These receipts do not make generic JavaScript backing an original pointer, supply full module startup, or prove that the original class-name/type owners are running. Earlier source packages remain frozen.
