# Original SharedBase CRT startup evidence

This package captures 41 original functions covering CRT attach/startup, security-cookie initialization, heap selection/construction/destruction, thread startup/termination, encoded procedure initialization, locks, thread cleanup and locale reference increments. Every captured instruction is compared with the original SharedBase.dll bytes. It also captures 31 cold image ranges with section-backed versus loader-zero-fill evidence.

SharedBase owns these globals independently of Game and Engine. Its two dynamic thread indices begin at `ffffffff`; the four procedure slots begin as loader-filled zero bytes. The static TLS index from the PE TLS directory is a different field. Loading static TLS does not allocate either dynamic slot, initialize the heap, install FLS/TLS procedures or initialize CRT thread data.

`__mtinit` resolves four FLS procedures, falls back to the original TLS procedures if any is unavailable, allocates a getter-cache TLS index, initializes pointer encoding, initializes locks, allocates a PTD slot with its cleanup callback, allocates 0x214 bytes, installs that allocation and initializes its locale/thread fields. Failed branches run the original teardown where specified. None of these effects can be replaced with a successful metadata flag.

The formatter reads the SharedBase security cookie at `10140d6c`. Its cold value is `bb40e64e`, and the original cookie initializer derives a new value from the declared time/process/thread/tick/performance providers and stores its complement at `10140d70`. A cold-image read is not evidence that cookie initialization returned.

This is source evidence. No SharedBase CRT attach, heap, locks, dynamic PTD startup or formatter execution is claimed. The existing selected property diagnostic remains stopped at `100a7eff -> 100b5355`; live Game startup remains outside `__cinit`.

Reproduce with `python tools/gothic3/prepare_shared_crt_bootstrap.py --study <offline-study-directory> --output <output-directory>` using the preserved original installation study.

The local `NativeSharedCrtSecurityCookie` owner now implements the selected original cookie initializer with independent canonical SharedBase storage. It follows actual entropy providers, ignores the original performance-counter BOOL while requiring known output DWORDs, preserves the collision/high-word branches and complement writes, and retains failed prefixes without replay. Tests cover ordinary and warm calls, collision/zero adjustments, false counter results with written outputs, unknown counter outputs and missing providers. This helper is not yet connected to SharedBase DLL entry or the formatter call frame.

The local `NativeSharedCrtOwner` now owns the original OS fields and heap handle/selection independently. Its selected CRT process-attach prefix allocates the 148-byte version buffer from the actual process heap, calls the declared version provider, frees the temporary allocation in original order, writes original packed OS fields and creates a same-owner SharedBase heap with options 0/initial 4096/maximum 0. On the modern NT branch, source getters choose mode1 and heap initialization returns1; attach stops at `100adb09 -> 100ae6f0`. A failed version call returns0 after freeing its buffer. Missing providers preserve their completed prefix. Mode3 remains stopped at its original small-block heap initializer. DLL entry and the full CRT attach have not executed.

Subsequent local work follows `__mtinit` through actual Kernel32/FLS export lookup, fallback publication and getter-cache TLS allocation. The cache stores the actual unencoded lower getter capability. Fallback retains the source allocator wrapper at `100ae360`, whose nine original bytes call TlsAlloc and return with four-byte argument cleanup; it does not substitute an FLS allocator. The original PTD index remains `ffffffff` and the procedure slots remain unencoded when execution stops at `100ae7b4 -> 100aa7e6` (`__init_pointers`). Missing Kernel32 and later allocation failure paths still require original teardown/heap-termination owners. Full thread initialization, attach and formatter execution are not claimed. Canonical platform admission and heap registration reject forged structural substitutes.

The selected modern branch now completes `__init_pointers`: it follows the original pointer encoder's actual getter-cache TLS read and Kernel32 export lookup, shares one encoded-NULL capability across the five handler slots and four signal slots, executes the captured no-op helper, then encodes the admitted original terminate (`100b01d7`) and exit (`100aa7b7`) code identities into their original slots. It encodes all four thread-storage procedures after pointer initialization returns. Original code identities are retained pointers; terminate/exit execution is not implemented or claimed. Missing EncodePointer follows the original identity branch. The pre-Vista main-executable `.mixcrt` scan remains an explicit boundary. The modern thread-startup path now stops at `100ae7fc -> 100bb704` (`__mtinitlocks`), before lock and PTD initialization.

The lock dependency evidence now includes the original 36-entry lock table and fourteen 24-byte static sections. Static flags identify IDs 0, 1, 3, 4, 6, 7, 8, 10, 12, 13, 14, 16, 17 and 18. The source captures the critical-section resolver/fallback, thread-pointer decoder and lock deletion. The resolver decodes the same pointer slot initialized to encoded NULL at `102f6ac0`, queries the owned lower initializer where needed and stores its encoded result. Capturing this evidence does not initialize or acquire these locks.

Additional original PE receipts preserve the critical-section SEH filter at `100bbfad`, handler at `100bbfc4` and scope table at `100f8d18`. These 47 code bytes were omitted from the recovered function ranges and are captured separately. Literal byte comparisons retain the status check `c0000017`, the handler SetLastError(8) call and zero return storage, plus the original filter/handler scope references. No SEH execution or stack restoration is claimed from these receipts.

Local lock startup now publishes and initializes all fourteen static sections in source order using actual platform registrations, caches the encoded resolver result and follows the source no-spin fallback. The captured `c0000017` failure branch sets LastError to8, clears only the failed table entry and leaves earlier initialized sections retained before the still-unowned teardown. The successful branch returns1 and stops before FLS/PTD allocation at `100ae805`. Tests enter/leave the actual registered sections; that validates section ownership, not full thread or DLL attach. Original native SEH stack installation/restoration and broader failure teardown remain unfinished.

The original SharedBase calloc wrapper, calloc implementation and new-handler dispatcher are now captured, together with its separate allocation-retry delay and new-mode fields. Both fields begin at zero in the cold image. The selected mode1 path calls HeapAlloc with flag8 on the SharedBase heap; failure handling, multiplication bounds, retry timing and the mode3 small-block branch remain original dependencies rather than generic Game/Engine allocator behavior. Source capture does not allocate PTD storage or claim the FLS slot has been installed.

### Local PTD allocation continuation

The next local branch admits only the canonical SharedBase owner's privately
minted `100ae55a` FLS destructor and follows the decoded allocator at `100ae816`.
It stores the actual returned index at `10140b44` before the original
`__calloc_crt(1, 0x214)` call at `100ae829`. TLS fallback still ignores the FLS
destructor as the original wrapper does. Non-NULL PTD destruction remains
unimplemented; an address-only callback cannot establish ownership.

Following allocation, the original path decodes its setter while the cached
getter returns NULL, installs the same allocated PTD, then initializes exception
data, pointer procedures, multibyte data and locale references at `100ae40c`.
Only after that call returns does it store the actual thread ID and `-1` handle.
Those latter steps must be implemented before claiming `__mtinit` returns 1.

The local continuation now follows the selected modern-heap
`__calloc_crt(1, 0x214)` path through `HeapAlloc(SharedBaseHeap, 8, 532)`.
On success it retains all 532 zeroed known bytes and passes that same physical
PTD to the decoded setter. The source decoder performs its second TLS getter
lookup and actual PTD-getter call; an absent PTD falls through to the original
Kernel32 decoder lookup. Successful installation stops before `100ae40c`;
no thread ID, locale state or successful `__mtinit` return is claimed yet.
NULL allocation preserves the original cleanup boundary. Nonzero retry/new-mode
settings remain explicit missing calls rather than fabricated retries.

The subsequent local initializer now applies the source exception-table anchor,
flags and codec slots to that installed PTD, increments the independent
multibyte reference, acquires original static lock 12, stores the original
default locale and increments its root/time references, then releases lock 12.
The selected cold locale has no dynamic category/reference objects; nonzero
unsupported targets remain explicit boundaries. With an actual thread-ID
provider, it stores that ID and the original -1 handle and returns `__mtinit` 1.
Missing thread-ID service preserves the initialized PTD without replay.
Native SEH scope-stack installation is still unimplemented. The owning attach
call next needs original RTC initialization, command-line/environment ownership,
I/O and arguments, and SharedBase's own `__cinit` traversal. No whole attach,
live Game initializer integration or campaign completion is established here.

The local RTC continuation traverses the original 256-byte initializer table at
`100f7cec`: all 64 cold entries are NULL in the installed binary. It skips each
entry in source order and returns before the original command-line call at
`100adb21`. A non-NULL entry remains an explicit missing callback owner.

The command-line continuation invokes the actual canonical process-input endpoint
and stores its retained pointer in SharedBase `102f8564`. Missing process input
remains a boundary. It next stops at the original environment reader `100c0c60`,
whose wide/ANSI selection, allocation, conversion and release paths are captured.
