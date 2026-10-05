# Original Effect property set

This namespace reconstructs the examined fresh, detached `gCEffect_PS` factory,
four reflected fields and the installed Hero's packet 17. It does not activate
an entity, a scene, an effect renderer or a world.

## Physical state and source profile

The native allocation is 64 bytes; the installed getter returns version 1 and
property-set selector 96. Unknown math/padding and nonNULL numerical addresses
retain unknown bit masks. Owner, wrapper, reference word, flags, CString,
effect handle and runtime-map header use the same retained allocation. A
nonNULL pointer is a live capability rather than an invented numeric address.
Every public mutation is guarded; unsupported/reentrant operations retain the
applied prefix and block replay through the shared reflection controller.

The fresh runtime map captures `Realloc(NULL, 204)`, zeroes that returned
allocation, writes capacity 51, then bucket count 43 and zeroes those 43 heads
again. The memory-admin/allocation service is required at its original call.
The constructor does not presume a zero-filled heap or fabricate an empty
future service. Future node insertion and terminal map/effect destruction are
not implemented.

The defaults initialize Offset to zero, Probability to zero and Static to
false; PostInitialize performs the actual empty literal assignment, clears the
handle, sets Static false and copies the original float32 Probability 1.
The literal empty assignment has a concrete physically NULL destination
branch. A nonNULL destination requires actual CString Realloc(0) ownership.
Indexed reading always requires an actual table-buffer/reference-count
assignment service. The empty source text alone does not establish NULL versus
an allocated empty source buffer.

Current Hero read consumes the original 92-byte packet including its outer
header and sentinel. The native tail is the consumed/ignored ushort `1`.
Each descriptor refetches the native receiver after NotifyEnter and before
NotifyExit; replacement is rejected rather than silently writing the old PS.
Vector and float payloads copy raw IEEE bits. Canonical bool bytes are the
selected stream profile. Legacy/repeated reads are unsupported.

## Executable callbacks

Inherited Added, Removed, PostRead, PreProcess and PostProcess are actual empty
source bodies. Inherited property notifications make two ordered current-owner
Modified reads. IsProcessable and OnProcess use Static == 0; Enter/ExitROI use
Static == 1. Probability is not consulted in these examined callbacks.

CreateEffect first checks the live handle, known flags bits 1–3 and the actual
CString empty state. The Hero's empty name completes this branch without an
effect-system call. A nonempty name requires the real cached EffectModule,
physical module+14 system and SharedBase identity cache. It copies a retained
64-byte matrix temporary, assigns raw Offset into its translation and calls
captured system virtual 0 with `(same name slot, current owner, NULL, matrix,
true)`. GetEntity itself takes no arguments. The returned handle is stored
before warning/empty-name assignment. The temporary remains live if a required
service blocks before the native destructor.

ExitROI/CacheOut capture the module/system, then reread the current handle for
system virtual+4 `(handle, false)`; return is ignored and the handle clears
only after completion. A NULL system retains the handle. A NULL module would
be dereferenced by native GetSystem and is an explicit unsupported boundary.
These host services must execute actual effects; a fabricated successful
callback is not a source-backed implementation.

## API and reproduction

`OriginalEffectReader(controller, host)` registers the concrete factory.
`readOriginalHeroEffect(reader)` reads the installed original packet through
the shared accessor. `retainedProperties(wrapper)` exposes stopped constructor
prefixes. `OriginalEffectProperties` supplies the same physical values and
process/ROI/cacheout/CreateEffect/notification methods for later integration.

From the repository root, with Python 3.10+ and the immutable desktop study:

```powershell
python -B tools/gothic3/research_effect_reading.py --study '<LOCAL_DESKTOP_STUDY>'
```

The producer verifies original PE hashes, complete global instruction coverage
inside original CSV body ranges, each instruction's PE bytes, forwarding
closure, descriptor/vtable/import literals and the original world/string-table
packet. It emits two public JSON mirrors, source excerpts and a current file
receipt. It executes no game/native code, tests, build, browser or remote action.
The current receipt is generated only after the shared reflection source is
frozen; historical checkpoints are preserved.
