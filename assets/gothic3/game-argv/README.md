# Original Game argv, MBC and NLS source

This supplement captures 32 cataloged original bodies: 1,850 assembly rows and
5,225 instruction bytes. Twenty-three bodies reuse unchanged prior C/ASM files;
nine newly extracted bodies contain 645 rows and 1,739 bytes. The original
exception handler identity is contextual source only (125 rows, 406 bytes).

The selected source chain follows caller TEST/JGE and CALL204678de, cold MBC
initialization with ACP1252, the W NLS probes and query/fill paths, both command
line parser passes, allocator calls and actual argv return. Its next boundary
is the unexecuted CALL204678e7 to setenvp. Conditional source closure and the
172-site call inventory are not a completed runtime operation ledger.

The update-MBC EH4 scope points to 2046b8ca. Only its original PE bytes 8b75e4
are captured: no catalog entry, original C entry or ASM body covers these three
bytes. MOV ESI,[EBP-1c] is a decode inference, never an original listing or
callable owner. The normal helper 2046b8cd remains cataloged original source.

Cold file bytes and loader-zero cells are initialization receipts, never live
values or permission to reseed a current image. Existing cookie, heap, TLS,
lock, locale, MBC object and command-line ranges retain their canonical roots;
the MBC refcount is a contained view. CPtable is writable original .data. Two
EH4 scopes and the UTF16 NUL probe are readonly original constants. Source
metadata grants no heap, frame, module, NLS, Windows or exception authority.

Reproduce from the original readonly study and this checkout:

    python scripts/gothic3_game_argv_source.py --study <original-study> --repo . --output assets/gothic3/game-argv

The manifest pins this final producer, its actually loaded repository helpers,
nine unchanged focused dependency JSON documents, reused source files and the
original PE/catalog/ASM/symbols/130-file C corpus. No external draft dependency,
output self hash or dependency cycle is introduced. Alternate source branches
are preserved as context; no complete alternate or native Windows closure is
claimed. All 22 package files regenerate deterministically.
