# Original Game physical calloc and first I/O block source

Reproduce from the repository root, replacing STUDY with the original readonly study:

    python -B scripts/gothic3_game_io_allocation_source.py --study "STUDY" --repo . --output assets/gothic3/game-io-allocation

This four-output supplement reuses the exact full calloc wrapper, callocImpl, SEH prolog/epilog and ioInit C/ASM receipts: five contextual bodies, 337 original rows and 995 instruction bytes. No source listing is duplicated or manufactured. Original PE bytes, body extents, catalog/C ENTRY identities, original ASM line numbers and reused source hashes are checked. Prior Game CRT, continuation, io-startup and io-writer packages remain read-only and unchanged.

callocEH4Scope206e8f98 is the original readonly 28-byte scope. The cleanup entry20477d21 preserves five PE-only bytes and genuine original C/catalog/ASM gaps; it is noncallable. Original scope metadata does not implement handler, SBH cleanup, EH dispatch or cookie checking. The normal source epilog has no invented cookie-check call. Separate unexecuted cataloged cleanup20477d26 remains prior source context.

ioBlocks207d2a20/256B and ioHandleCount207d29c4/4B preserve original .data virtual/raw section geometry and loader-zero-fill provenance. Their fileOffset is NULL and fileBackedBytes is zero: these are loader initial bytes, not invented file-backed zero bytes or captured current Windows values. A fresh canonical Game image can initialize them once; later execution must use that same current aliased backing and pointer bookkeeping. No source package grants live stores or reseeding.

The static selected normal ledger follows the physical wrapper/nested calloc/HeapAlloc/epilog/RET path, then real caller cleanup, first-block publication, 32 record iterations, current startup WORD skip and first standard-input argument. It adds 496 source operations to the preceding 35, reaching 531 before unexecuted GetStdHandle204744b4/IAT207d7bbc. This is a static expected mode1/non-NULL/current-cbReserved2-zero path, not observed execution or authority to force branch values. Every runtime branch, allocation/global/pointer operation and field read still needs current words, masks, flags, canonical allocation/heap/image aliases and private lifetime proof.

Nested EBP=outerEBP-0x9c, inner returned ESP=innerEBP-0x2c, deepest selected depth224B. The same root retains outer FS and caller return204678d3. HeapAlloc normal stdcall12 / actual-capability-or-owned-NULL behavior is explicitly declared virtual compatibility, not a captured Windows callee or current register state. Unknown outcomes retain actual effects without cleanup/unwind/RET/replay. A facade allocation cannot substitute for the physical nested frame and returns.

Record source widths, per-iteration current block pointer reread, unsigned same-allocation comparisons, seven writes per56B record and source flags81 on the first standard record remain explicit. Known zero section bytes do not initialize a critical section. No GetStdHandle result, handle type, section, IO final return, full CRT/module startup, NPC activation or campaign completion is supplied by these receipts.

The manifest pins the final producer, every actually loaded local helper, twelve prior dependency documents, ten reused C/ASM artifacts and original PE/ASM/catalog/symbols/C inputs. The entire original C ENTRY corpus is retained as a hash ledger to prove the cleanup gap. There are no external draft dependencies, output self hashes or dependency cycles. All four outputs regenerate deterministically.
