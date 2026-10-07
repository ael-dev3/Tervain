# Original Game ioInit / SEH source

Reproduce from the repository root, replacing STUDY with the readonly original study directory:

    python -B scripts/gothic3_game_io_startup_source.py --study "STUDY" --repo . --output assets/gothic3/game-io-startup

This offline source package contains 13 cataloged bodies, 516 original instruction rows and 1,610 instruction bytes. Three bodies reuse exact sourceRefs in game-attach-continuation: ioInit, sehProlog4 and sehEpilog4 (218 rows / 651 bytes). Ten additional original C/ASM pairs contain 298 rows / 959 bytes. Original PE bytes, catalog/C paths and hashes, ASM line numbers and body extents are checked. Reconstructed C is explanatory, including Ghidra's SEH injection warnings; original x86 rows are authoritative.

The two readonly EH4 scopes are 206e8e90 and 206e8e70, each 28 bytes. Separate 14 PE-only bytes at 20474528–20474536 preserve genuine original C ENTRY/catalog/ASM gaps. No recovered C or original ASM is fabricated. Manual opcode interpretations are explicitly labeled inference and grant no runtime admission.

instructionPoints preserves native caller/prolog/epilog and ioInit PUSH/CALL/RET PCs. frameLayout is source context: EBP=S-4, returned prolog ESP=EBP-0x74, FS registration=EBP-0x10, STARTUPINFOA=EBP-0x64/68B. The prolog returns to 2047430b; the epilog returns to 2047453e; final ioInit RET must still consume the caller slot 204678d3. Local-frame retirement cannot retire that incoming slot early. Current cookie/stack/XOR relations and published FS state need actual owners; unknown interruption is not a native exception or permission to unwind/replay.

I/O cells, old cookie/cache aliases, all exception closure bodies, dynamic module/procedure context and imports remain source context until a connected consumer is implemented. Cold loader bytes do not establish current live values or API output. Capturing ioInit or its handler does not complete IO, EH dispatch, module attach, or CRT table traversal. Additional exception edges include local-unwind handler 2047643c, callee 2046f8b0, callback 207d2b54, NLG globals 207b2c40, RtlUnwind and report-GS-failure context/callee 2047e694.

The manifest pins this final producer, every actually loaded local helper, prior Game CRT/continuation dependencies, reused C/ASM artifacts, original PE/ASM/catalog/symbols and the entire C ENTRY corpus used to prove the genuine gaps. No external draft files or output self hash are dependencies. Earlier packages are read-only and are not regenerated.
