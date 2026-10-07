# Original Game standard-I/O and final ioInit return source

Reproduce from the repository root with the unchanged original readonly study:

    python -B scripts/gothic3_game_io_completion_source.py --study "STUDY" --repo . --output assets/gothic3/game-io-completion

This four-output supplement reuses five full original C/ASM bodies: ioInit, SEH prolog/epilog, section helper and DecodePointer wrapper (304 rows/908 B). One separate original caller TEST204678d3 receipt is an unexecuted boundary. No source listing is duplicated. Original PE, catalog, C ENTRY/excerpt, ASM line/extents, source hashes and exact eight IATs are checked; earlier packages are read-only.

Retained context is 12 cataloged original C/ASM bodies703 rows/2118 B plus three PE-recovered decode listings20 rows/68 B (aggregate15/723/2186). Exception filter2047424d, handler20474264 and TLS compiler thunk20467e52 preserve genuine catalog/C/ASM gaps, inferred decode scope, and noncallable context. They never enter the active instruction getter. The full130-file C corpus and original ASM/catalog hashes prove the missing entries; no fabricated C, catalog records or native EH dispatch are supplied.

The static selected character-handle path adds368 operations to531, reaching899: three real source section calls, each with21 own rows,21 prolog,25 DecodePointer wrapper and11 epilog rows; actual TLS/FLS/Decode/spin calls; original argument cleanup, SetHandleCount, outer epilog and final RET. Three explicitly normal NULL handles follow a separate80/611 ledger. These are expected source paths, not observed runtime execution or permission to force branches. Normal/failure/unknown outcomes remain distinct.

Existing canonical sectionInitExceptionTable206e8e70/28 B is reused readonly, and crtSectionInitializer207d109c/4 B retains loader-zero provenance. Existing TLS indices, cookie and107 IO globals are reused aliases. No source receipt captures a live cache, PTD, handle, allocation, current Windows output or grants reseeding. Each reached runtime call must prove current private procedure/PTD/heap/section/frame authority. Direct Runtime FlsGetValue at20467e01 does not execute native thunk20467e52.

The actual section frame EBP=outerEBP-0x84 and deepest selected tail216 B preserve107's larger224 B allocator requirement. Three24 B sections alias record+0xc in the same1792 B backing; opaque initialization requires real physical registration and overlap invalidation, not copied zero storage. Unknown calls retain pending returns/current FS/applied stores with no invented unwind, cleanup or replay. Normal IO0 requires final RET2047453e consuming the original incoming204678d3 return word; returned stack-frame descriptions grant no writer or caller continuation.

The virtual stdcall4/stdcall8 policy is explicit compatibility, not captured native Windows callee code or host HANDLE numbers. Old provider omissions still require missing endpoints. Resolver/fallback/exception branches remain source-only until independently owned when reached. These receipts do not complete caller TEST/JGE, CRT/module startup, native NPC activation, console I/O or the campaign.

The manifest pins this final producer, actually loaded helpers, nine unchanged prior dependency JSON documents,27 reused C/ASM receipts and original PE/catalog/ASM/symbols/C corpus. No outside design/draft dependency, output self hash or dependency cycle is introduced. All four outputs regenerate deterministically.
