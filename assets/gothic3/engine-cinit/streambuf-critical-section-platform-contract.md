# Allocated streambuf critical-section platform contract

The captured `30670963` member constructor allocates 24 bytes through
`306728e3`, retains the allocation at receiver offset 4, and invokes the
`3067133d` wrapper at `30670970`. The wrapper calls the captured
`KERNEL32.dll!InitializeCriticalSection` import at `30671341` and returns
through `30671347`.

`initializeEngineCinitStreambufSection` admits only this actual pending call
chain, its retained Engine CRT owner, the actual stack argument, and the
canonical live 24-byte heap allocation. Registration uses the existing physical
critical-section service; no numerical address is assigned to the allocation.
Initialization leaves all internal byte masks unknown. Duplicate registration
and use by a different owner fail. The four image-backed shared critical
sections keep their separate admission and registration.

Validation: TypeScript checking and one focused runtime check passed locally.
The check reaches the original pending caller, initializes its storage, enters
and leaves it with the retained owner, rejects another owner and duplicate
initialization, and confirms the shared-array service rejects this heap argument.

## Connected member-constructor continuation

The normal startup path now invokes that admitted platform operation, consumes
its actual stdcall return with four argument bytes, returns through the wrapper,
and executes the captured `30670975`–`3067097a` cleanup and return. It restores
ESI and returns the retained member receiver in EAX to `305ee69a`. Startup stops
there before the next four-byte allocation. The enclosing streambuf and filebuf
constructors and destruction remain unfinished.

TypeScript checking passed. Nine focused checks passed together, covering the
normal caller, five interrupted/forged shared-array initialization cases,
allocated-lock admission, the null-allocation new-handler branch, and the earlier
enum checkpoint. A separate nonzero shared-reference branch check also passed.
The earlier failed run exposed five incorrectly changed interruption-PC test
expectations; those expectations were restored to the original pending import,
and all five were rerun successfully. These are focused checks, not a full suite
or campaign verification. This continuation has not been published.


## Four-byte allocation continuation

The captured streambuf instructions `305ee69a`–`305ee6b2` now execute their
four-byte allocation request, exception-state store, factory return, cdecl
argument cleanup, and nonnull pointer branch. The allocation factory is shared
with the existing 24-byte member path, with each actual stack size and caller
return checked independently. The frame retains the canonical four-byte logical
view separately from the lock allocation, preserving the allocator's physical
capacity and unknown initial bytes. It is not yet written to receiver offset
`0x38`; that store occurs later in the original routine.

The normal boundary is now the actual pending call to `30670832`, made at
`305ee6b2` with return address `305ee6b7`. That helper's body is not implemented.
If the four-byte malloc returns null, the original factory instead remains in
its new-handler call at `306824b9`; no helper call or fabricated factory return
is made. The earlier initialized lock remains live.

TypeScript checking and six focused checks passed locally: normal allocation,
nonzero shared-reference bypass, earlier enum checkpoint, both allocation-null
paths, and allocated lock admission. The normal test proves separate allocation
identities, exact logical extent, unknown byte masks, both factory returns, and
the pending helper caller. Full startup and campaign verification remain absent.


## Locale initializer source capture

The source preparation now captures `30670832` (46 instructions) and its
`30679b5b` EH3 prologue (17 instructions) from the pinned Engine DLL. The bundle
contains 359 methods. Comparison before adoption proved all earlier 357 method
records and all other source metadata, images, imports, initializer tables and
SharedBase records unchanged.

The initializer reads the global locale pointer at `30af6dd8`, enters a locking
path through `30670503` when that pointer is null, and can allocate 52 bytes
through the existing factory before calling `30670790`. It later releases the
lock through `30670524` and uses `30679c33` for exception-frame cleanup. These
dependencies require their own admitted storage, ownership and original caller
state before continuation. No global locale pointer or successful helper return
has been synthesized.

TypeScript checking and 150 source/image checks passed locally. The new test
pins selected instruction bytes, including the original FS exception-chain
stores. Its first run caught an extra zero byte in a test expectation; the
expectation was corrected to the six-byte original instruction and the full
source/image checks passed on rerun. Capturing these routines is evidence
preparation; the runtime boundary remains `30670832` and its body is not yet
executed. This checkpoint is local and does not establish campaign completion.


## Connected locale EH3 prefix

The runtime now executes `30670832`–`30670839` and all 17 captured instructions
of `30679b5b`. It uses the actual eight-byte local extent, saved registers,
previous EBP, retained Engine security cookie, and FS exception-chain head.
The cookie XOR preserves symbolic stack-pointer provenance and masks. The
prologue moves its actual caller return word onto the new stack, initializes
the exception state to `-1`, installs the nested chain, and returns through
`30679b8d` to `3067083e`.

Six focused runtime checks and TypeScript checking passed. The normal test
checks the actual locale caller's position against EBP (`position - 4`), ESP
(`position - 40`), and the nested FS head (`position - 16`), plus the original
prologue return word. Allocation failures still stop before entering this
prefix, and the earlier property and lock checks remain intact.

Startup now stops before the load from `30af6dd8` at `3067083e`. The locale
pointer image, locale locking, object construction, exception epilogue and final
filebuf continuation remain unfinished. No locale object or successful outer
constructor return is fabricated. These changes remain local and do not prove
complete engine startup, hosted playability, or campaign completion.


## Locale global-pointer branch

The original `30af6dd8` global pointer is now a retained four-byte image with
zero file-backed bytes and four loader-zero-fill bytes. Source regeneration
proved all previous methods, metadata and image records unchanged before adding
that image. The runtime executes the captured load, TEST, ESI assignment and
branch from `3067083e`. The original cold zero pointer leads to `30670849`–
`3067084d`, which push the actual zero argument, derive the stack receiver from
EBP minus 16, and call `30670503` with return address `30670852`.

Startup now stops at that actual pending locale lock-constructor call. A known
nonzero pointer follows the captured branch to `306708c4`, whose epilogue is
still unsupported; it does not fabricate a helper return or constructor result.
Unknown pointer bits remain unsupported. No locale object has been created or
published.

TypeScript checking, all 151 source/image checks and six focused runtime checks
passed locally. The normal check pins the zero global pointer, original pending
lock return word, ECX receiver and adjusted ESP, while the nested FS head and
EBP checks remain intact. Full runtime-suite, hosted rendering and campaign
completion are not established by these checks.


## Locale lock prefix and original import

Source capture adds the locale lock constructor `30670503`, destructor
`30670524`, and enter/leave wrappers `30671353` and `3067135e`. There are now
363 Engine methods. Comparison proved all earlier methods and evidence records
unchanged; the only added import is the captured
`KERNEL32.dll!EnterCriticalSection` at IAT `30afc6dc`.

The runtime executes the constructor prefix: load the actual stack argument,
mask the index to 0–3, save the receiver in ESI, write the index into the original
stack object, multiply by 24, and derive the retained shared-array pointer. Its
browser pointer carries actual image identity rather than known numeric address
bits. The original wrapper pushes that actual argument and calls the original
import. The boundary is now `30671357`, with return address `3067135d`.

The lower enter operation is not connected yet; no section depth or successful
constructor return is claimed. Destruction and release are captured evidence,
not executed cleanup. TypeScript checking, 152 source/image checks and six
focused runtime checks passed. The first runtime run exposed a test assumption
that the public snapshot exposed image pointers; the public snapshot intentionally
omits them. The corrected test checks unknown numeric bits, the actual saved
lock index and its masks, pending return words, receiver and stack positions.
All six runtime checks passed on rerun. This work remains local and does not
establish full startup or campaign completion.


## Connected locale enter and constructor return

`enterEngineCinitLocaleSection` admits only the actual pending `30671357` call,
its `30670518` wrapper caller and `3067084d` constructor caller. It verifies the
original return word, stack receiver at EBP minus 16, stored lock index, actual
stack argument and same-CRT shared-array identity. The selected offset must
match the saved index multiplied by 24. The private platform registry must
contain that exact initialized section and owner. Each call can enter once.
No fresh capability or numerical heap pointer is synthesized.

The normal path increments that section's depth, consumes the original stdcall
return, returns through the wrapper, and executes the lock constructor cleanup
and `RET 4`. The locale then rereads its global pointer and updates the original
exception state. With the original zero pointer, startup now stops at
`30670860`, before the 52-byte locale-object allocation. The entered section
remains held for the still-unfinished construction and cleanup path.

TypeScript checking and seven focused runtime checks passed. Normal startup
proves section depths `[1,0,0,0]`, returned original calls, restored stack
position and zero exception state. A separate interrupted-enter check verifies
the pending caller, depth transition 0 to 1, and duplicate rejection. The
nonzero-reference fixture has no admitted shared-section registrations and
correctly stays pending at `30671357`; it cannot invent a lock. Allocation-null
and earlier enum checks remain intact. These focused checks do not establish
complete startup or a campaign; this checkpoint remains local.


## Locale-object allocation and constructor caller

The original `30670860`–`30670876` continuation now requests 52 bytes through
`306728e3`, retains its canonical logical view in the frame, and returns through
`30670867`. It consumes the cdecl argument, loads the actual allocated receiver
into ECX, stores that receiver in the original exception frame, tests the
nonnull result, writes exception-state byte 1, and calls `30670790` with its
actual zero argument and return address `3067087b`.

The 52-byte allocation has a separate identity from the streambuf's four-byte
allocation and lock member. Its bytes remain unknown and it is not published as
a constructed locale. The normal boundary is `30670790`, whose constructor body
is still unsupported. On a null result, the original factory instead retains
its `306824b9` new-handler call; the 52-byte factory caller does not return and
no constructor call is made. The actual locale lock remains held for that
unfinished path.

TypeScript checking and eight focused runtime checks passed locally. The normal
check proves three factory returns, separate live allocations, exact logical
size, unknown masks, exception-state byte and the actual pending constructor.
The added failure check proves retained earlier allocations, held lock, pending
new-handler and absence of a constructed object. Full-suite/build, hosted
rendering, and campaign completion are not established by these focused checks.


## Locale-object constructor prefix

The captured source adds `30670790`, its `30679c33` EH3 epilogue, and the name
constructor entry `3001fe1f` (body `303ed620`). There are now 366 Engine methods.
Comparison proved all prior methods, imports, metadata and images unchanged
before adding the four-byte vtable image at `30892a0c` and two-byte `"*"` literal
at `30826a90`. Both inputs are file-backed and protected as readonly evidence.

The runtime shares the captured EH3 implementation between the initializer's
eight-byte local frame and the object's four-byte local frame. It initializes
the actual retained 52-byte allocation: reference count 1 at offset 4; zeros
at offsets 8, 12 and 16; the actual zero argument byte at offset 20; and an
opaque vtable pointer at offset 0. Numeric pointer bits remain unknown. Other
bytes, including the name member, remain unknown until supported construction.
The original name argument and receiver at object offset 24 lead to the pending
`306707ca` call to `3001fe1f`, returning through `306707cf`.

TypeScript checking and 153 source/image checks passed. The initial focused
runtime run passed seven checks and failed one incorrect stack-position test
expectation. That expectation has been corrected from object caller position
minus 48 to minus 44, matching the original four-byte local frame and name call.
The corrected runtime rerun passed all eight focused checks, with TypeScript
checking passing again. The normal check proves the nested exception-frame
positions, initialized reference count and zero fields, flag byte, exact known
and unknown masks, and pending original name-constructor return word. This is
focused continuation evidence, not complete startup or published gameplay. The
name constructor, exception cleanup, outer locale publication and filebuf
completion remain unfinished.


## Locale name-constructor prefix

The runtime now follows the captured `3001fe1f` jump to `303ed620`. It validates
the actual literal stack argument and retained object receiver at offset 24,
saves the original ESI/EDI, and initializes small-string capacity 15 at object
offset 48, length zero at offset 44, and the empty inline byte at offset 28.
The captured loop reads the original `"*"` and terminator, preserving the
literal's image identity as it advances. The subtraction of offsets in that
same image yields the actual length one without inventing numeric pointers.

The original call at `303ed64f` now carries the actual literal pointer, length
and object-member receiver into `30042974`, with return address `303ed654`.
Assignment remains unsupported and no completed string or constructor return
is claimed. The locale lock and both exception frames remain retained.

TypeScript checking and eight focused runtime checks passed locally. The normal
check verifies capacity, current zero length, inline zero byte, exact changed
masks, length-one result, pending assignment return word and adjusted stack.
Earlier allocation failures, lock admission and enum checks passed alongside it.
The normal boundary is now `30042974`. The assignment, name/object constructor
returns, exception cleanup and outer locale publication are still unfinished.
This is local continuation evidence, not a hosted campaign verification.


## Locale string-assignment source and prefix

Capture adds `30042974`, which jumps to `303ed0f0`; the bundle now has 367
Engine methods. Comparison proved all earlier methods, imports, metadata,
images and other evidence records unchanged.

The runtime follows that entry, saves EBX/EBP/ESI, validates the actual string
member receiver at object offset 24, loads capacity 15, and follows the original
inline-storage branch. EBX and EAX retain the actual allocation pointer at
offset 28. The source argument loaded into EBP retains the original literal's
image identity. The next instruction is `303ed10a`, comparing that image
pointer against the heap-backed inline destination.

Numeric ordering between the original image and the browser-owned allocation
has not been proved. The runtime therefore stops before that comparison rather
than inventing addresses or branch flags. The captured routine includes overlap
handling, growth, copying through `30674b44`, length update and termination;
none of those paths is claimed executed by this prefix. Resolving the pointer
comparison or a rigorously proved equivalent control-flow join is the next task.

TypeScript checking, 154 source/image checks and eight focused runtime checks
passed locally. The normal check verifies original pending return words,
capacity, unchanged member contents and masks, opaque pointer bits, and saved
stack position; earlier failure paths remain intact. Assignment, constructor
returns, cleanup, outer locale publication and filebuf startup remain incomplete.
This checkpoint remains local and does not prove a hosted playable campaign.


## Empty-destination overlap join

The runtime now admits a translated join from `303ed10a` to `303ed13f` only
for the actual zero-length destination, inline member pointers, literal source
and canonical live 52-byte allocation. The literal and heap storage must have
distinct buffers. All relevant captured comparison and branch rows are admitted.
No numeric pointer ordering is assigned.

Proof: let S be the unsigned source address and D the inline destination address.
If S < D, `303ed10c` jumps directly to `303ed13f`. Otherwise capacity 15 selects
inline storage again; the destination end is D + 0 = D, without overflow.
`303ed120` therefore jumps to the same join because D <= S. Neither path calls
another routine or writes memory. EAX, ECX, EBX, EBP, ESI, EDI and the stack agree
at the join. EDX and comparison flags can differ, so the translated continuation
marks them unknown. It records an explicit translated-join trace, rather than
claiming one original numeric branch was executed. Nonzero destination lengths
remain unsupported at `303ed10a`.

TypeScript checking and two focused normal-continuation/enum checks passed.
The earlier eight-check result belongs to the preceding checkpoint; it is not
a full rerun of this change. The normal boundary is now `303ed13f`, before the
length/growth checks and copy call. String assignment, constructor returns,
cleanup and campaign integration remain unfinished; this checkpoint is local.


## Assignment length checks and original copy caller

The runtime continues from the translated join through the captured length and
capacity checks. The actual length one passes the maximum-size comparison and
fits capacity fifteen. The nonzero-length path reselects inline storage, then
pushes the original four arguments: length, literal source, capacity, and actual
heap-backed destination. `303ed191` now calls `30674b44`, with return address
`303ed196`.

The original excessive-length, growth, zero-length and non-inline branches remain
explicit unsupported boundaries. No copy success, string length update or
terminator is fabricated. The normal boundary is `30674b44`; its body and the
subsequent string/locale returns and cleanup still require implementation.

TypeScript checking and two focused normal-continuation/enum checks passed.
The normal check verifies the pending copy caller, retained length one, capacity,
unchanged initialized string storage and exact stack position. These are focused
checks and do not establish a full-suite result, deployment, or campaign
completion. This checkpoint remains local.


## Secure-copy validation and byte-copy caller

Source capture adds the original `memcpy_s` at `30674b44` and its byte-copy
routine at `30671cf0`; the bundle now contains 369 Engine methods. Comparison
proved all previous methods, imports, metadata, images and other evidence
unchanged. The byte-copy routine has 247 captured instructions; its complete
body is evidence, not yet an executed implementation.

The runtime enters the secure-copy frame, loads the actual count one, saves its
registers, proves the actual nonnull destination and source owners, and checks
capacity fifteen against the count. The destination is canonical live heap
storage at locale-object offset 28. The source is the retained readonly literal.
It then pushes count, source and destination to the actual `30674b87` call,
returning through `30674b8c`. Startup now stops at `30671cf0`.

The zero-count and insufficient-capacity continuations remain explicit pending
boundaries. No byte-copy success, error-handler completion or outer return is
fabricated. TypeScript checking, all 154 source/image checks and two focused
normal-continuation/enum checks passed locally. The normal check pins the saved
secure-copy EBP, adjusted ESP, zero EDI and actual pending copy return word,
while initialized string storage remains unchanged. Copying and subsequent
string/locale cleanup remain unfinished; the checkpoint has not been published
and does not establish complete campaign playability.


## One-byte copy contract and assignment return

The actual pending `30671cf0` call now admits a translated one-byte memcpy
contract. It verifies the original stack destination, literal source and count
one, the canonical live destination owner, readonly source identity and disjoint
buffers. It copies only the proved byte and returns the actual destination,
preserving callee-saved registers while marking volatile registers and flags
unknown. The trace explicitly identifies this translated contract; none of the
247 native alignment/dispatch instructions is counted as executed by it. Other
counts remain pending rather than claiming a generic memcpy implementation.

The captured `memcpy_s` then consumes its three cdecl arguments, sets success
zero and restores EDI/ESI/EBP through its actual return to `303ed196`. Assignment
consumes its four arguments, updates length to one, writes the terminating zero,
restores its saved registers and returns through `RET 8` to `303ed654`.
The name member now contains `"*"` in inline storage, with capacity fifteen and
proved initialized masks for copied text and terminator.

TypeScript checking and two focused normal-continuation/enum checks passed.
The normal test verifies copied byte 42, length one, exact masks, returned copy
and assignment calls, restored EBP and adjusted ESP. The normal boundary is
`303ed654`, before the name constructor's own register cleanup and return.
Exception cleanup, outer locale publication, filebuf completion and full
campaign integration remain unfinished. This local checkpoint has not been
deployed and does not establish full browser playability.


## Name/object constructor returns and EH3 restoration

The runtime now executes the original name-constructor register cleanup and
`RET 4` from `303ed654`–`303ed658` to `306707cf`. The object constructor returns
its actual allocated receiver in EAX and calls the captured EH3 epilogue at
`306707d1`. All eleven epilogue instructions execute: restore the saved FS head,
retain the actual return word in ECX, discard the cookie stack slot, restore the
saved registers, reset ESP to EBP, restore EBP, and return through `306707d6`.
The object's own `RET 4` then returns to its original locale caller `3067087b`.

TypeScript checking and two focused normal-continuation/enum checks passed.
The normal test checks both constructor returns, epilogue return word, restored
enclosing locale EBP/ESP and FS chain, name length one, copied byte and proved
zero terminator. The admitted normal object-construction path has returned;
exception-handler execution and destructor behavior are still unsupported.

The normal boundary is `3067087b`, before outer locale publication. The shared
locale lock remains held in its original enclosing construction scope. Locale
publication, lock release, outer epilogue, filebuf completion and campaign
integration remain unfinished. This checkpoint is local and does not establish
full startup or a hosted browser playthrough.


## Outer locale publication and shutdown-registration caller

Capture adds `30670642` (global locale setter), `30670612` (shutdown callback)
and `30671369` (standard at-exit wrapper), for 372 Engine methods. The new
registration flag at `30af6dfc` is one loader-zero-fill byte. Comparison proved
all earlier methods, imports, metadata and image records unchanged.

The runtime resumes at `3067087b`, retains the constructed object in ESI, pushes
that actual object, sets the original exception-state byte to zero, and calls
the setter at `30670886`. The setter observes its actual cold zero flag, pushes
the original shutdown callback, sets the flag to one, and invokes `30671369`
through `30670657`, with return address `3067065c`.

The normal boundary is now `30671369`. The flag's store has executed, but the
shutdown callback is not yet registered, and the global locale pointer has not
been written. The existing 66 callbacks and held locale lock remain intact.
The already-set-flag path stops at `3067065d`; it does not fabricate publication.

TypeScript checking, all 155 source/image checks and two focused
normal-continuation/enum checks passed locally. The normal test pins flag one,
zero global pointer, pending setter/registration return words, exception state
and exact stack position. At-exit registration, publication, lock release,
filebuf completion and full campaign integration remain unfinished. This
checkpoint remains local and does not establish deployed browser playability.
