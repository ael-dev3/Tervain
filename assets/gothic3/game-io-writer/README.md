# Original Game startup-info writer caller

Reproduce from the repository root, replacing STUDY with the original readonly study directory:

    python -B scripts/gothic3_game_io_writer_source.py --study "STUDY" --repo . --output assets/gothic3/game-io-writer

This offline supplement preserves CALL 20474314 through IAT 207d7c1c (KERNEL32.dll!GetStartupInfoA), normal return PC 2047431a, and the five following original instructions at 2047431a/21/23/25/26. The six-row selection contains 19 original instruction bytes. The next CALL at 20474327 targets 204683ce and remains unexecuted. No allocation or I/O block publication is admitted.

The original ioInit body (186 rows / 562 bytes) and callocCrt wrapper (26 rows / 72 bytes) reuse exact existing C/ASM sourceRefs in game-attach-continuation and game-crt. These 212 rows / 634 bytes remain source context; full bodies being captured does not implement their branches. Original PE bytes, ASM line numbers, catalog records, C ENTRY identity, source hashes and text-section geometry are checked. Existing Game CRT, continuation and io-startup packages are read-only dependencies and are not regenerated. ioInit's existing 14-byte C/catalog/ASM gap is not reconstructed here.

The caller passes its actual 68-byte STARTUPINFOA frame at EBP-0x64. Its argument leaves ESP=EBP-0x78; CALL pushes return 2047431a at EBP-0x7c. Normal stdcall4 cleanup returns ESP to EBP-0x74. Later cbReserved2 WORD/+0x32 and lpReserved2 DWORD/+0x34 consumers are contextual original rows, not currently executed reads. The caller does not zero this buffer. No current output bytes, masks, numerical stack addresses or native Windows state are captured.

The void/stdcall4 normal-return and volatile/callee-saved rules are explicitly declared virtual compatibility ABI. They are consistent with this original caller, not a capture of the Windows callee. A source receipt cannot grant an import, private frame alias, current output write, exception dispatch, return-slot consumption, cleanup, replay or lifetime retirement. An unknown writer or escaped host error does not authorize normal return. The incoming ioInit caller return 204678d3 remains live. Nested callocImpl's SEH frame/scope and all later I/O/CRT work require separate ownership.

All four outputs are deterministic. The source manifest pins this final producer, every actually loaded local helper, all nine dependency documents, four reused source artifacts and original PE/ASM/catalog/C inputs. No external draft, output self hash or cyclic source dependency is used.
