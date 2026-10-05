# Original CharacterControl construction and reading

This namespace implements the installed `gCCharacterControl_PS` concrete
factory and the current serialized `PC_Hero` property set at index 4. The
original allocation is 176 bytes; its installed getter returns version 2 and
property selector 22. These are PE literal proofs, not enum or packet guesses.

## Runtime API and physical identity

`OriginalControlReader(controller, host)` registers the concrete factory in the
shared `NativeReflectionController`. `readOriginalHeroControl(reader)` uses the
existing hash-verified source transport and exact packet at source offsets
1186203–1186426, including the final four-byte sentinel. The source packet has
outer/native version 2, object version 83, and property version 30.

- `reader.properties(wrapper)` exposes the actual attached object.
- `reader.retainedProperties(wrapper)` exposes a retained construction prefix
  after an unsupported observer. It does not imply completed reading.
- `properties.base` is the exact `NativeLivePropertySet` held by the reflection
  allocation and entity lifecycle. Owner, reference, wrapper and masked base
  flags are physical capability stores; numeric pointer addresses are not
  invented in the byte view.
- `properties.storage` retains the same scalar/vector/matrix bytes and known
  masks. Unwritten allocation bytes stay unknown. The wished movement property
  aliases its signed DWORD at +0xac. `pressedEvent()` reads the same +24/+25
  bytes used by the Hero script interface.
- `reader.matrixIdentity()` returns the same retained SharedBase global cache
  used by the constructor. It is suitable for the entity constructor's earlier
  `Matrix.GetIdentity` call, without a second cache or identity literal store.

## Source order and required services

Fresh successful, non-root allocation follows the source base constructor,
embedded enum-container constructors, no-write vector/matrix constructors,
Invalidate, inherited Create, Attach and initial-reference balance. The five
descriptor defaults follow the original PE CRT pointer order. PostInitialize
uses the actual two temporary container assignments; Duration is initialized
by its descriptor, not PostInitialize.

The normal current object/property-table read consumes each descriptor header
without seeking to its declared size, preserves the propagated owner-read
notifications, then reads the native tail. Versions below 2 skip that tail;
versions at least 2 read four floats, six DWORDs, two booleans, another float,
one raw 12-byte vector and one raw 64-byte matrix stream operation. There is
no inferred base Read or reset. Numeric float APIs use the finite binary32
profile; unproved nonfinite or alternate object/raw/obsolete-property paths
stop at the shared controller's explicit boundary.

`NativeControlReadingHost` requires one shared `OriginalControlModuleState`.
It can be seeded from supplied live globals/cache with explicit masks, or via
`fromColdOriginalImage()`, whose zeros are independently verified PE loader
zero-fill. Cold-image state is not a captured running game's post-CRT state.
The first `GetIdentity` guard transition sets the guard, copies sixteen raw
DWORDs in order, and requires the actual `_atexit(100e2910)` registration
observer. `registerMatrixDestructor('100e2910')` returns its signed native
result; the original ignores that result. An unavailable observer retains the
already-written prefix and blocks automatic replay. If the guard is already
set, the same supplied cache and masks are returned without registration.

The virtual `SetEntity` override assigns the original owner store first, then
calls `host.disableProcessing(capturedIncomingOwner, false)` for a non-null
incoming owner. Null only assigns the owner. This is the captured argument,
not an owner reread. The source default OnAdded/OnRemoved/OnPostRead hooks are
empty, and the installed IsProcessable returns false. Actual OnPreProcess,
ProcessMovements, OnPostProcess, hardware input, physics and world activation
are not implemented by this reader.

## Reproduction and evidence

From the repository root with Python 3.10+ and the completed local study:

```powershell
python tools/gothic3/research_control_reading.py --study '<LOCAL_DESKTOP_STUDY>'
```

`--capture-only` refreshes source/data receipts without freezing implementation
pins. The producer checks the three original runtime hashes, every selected
instruction and complete function body range, exact forwarding-thunk closure,
five descriptor tables/default/read/member dispatches, source packet, constants
and cold section-header ranges. The curated ordered construction program is a
source interpretation, not an x86 emulator.

SharedBase `100e2910` is a verified literal RET followed by 15 padding INT3
bytes and is absent from the study function catalog. Its assembly-only evidence
is separate from the decompiled C entries. No C source is invented for it.
`native-evidence.json`, source excerpts and the current implementation receipt
pin the reconstruction and its dependencies. No native module, game, browser,
tests, build or remote workflow is run by this producer.
