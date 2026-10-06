# Original RigidBody factory and Hero reading

This namespace reconstructs the installed `eCRigidBody_PS` factory and its current serialized Hero read. It does not create a physics actor, insert an entity into a scene, or declare the detached property set resident in the world.

## Runtime API

`OriginalRigidBodyReader(controller, host)` registers the thirteen leaf descriptors and the inherited `eCRigidBodyBase_PS.PhysicsEnabled` descriptor with the same `NativeReflectionController` used by the other original readers. Its `factory` implements concrete Clone/Create/default initialization, wrapper reading, and the original version getter. The source literals are property-set selector **13**, getter **65**, base getter **2**, and allocation size **248 bytes**.

`readOriginalHeroRigidBody(reader)` loads the already hash-verified original reflection document and reads Hero property-set index **1**. It leaves the outer sentinel for its caller. `properties(wrapper)` returns the exact attached physical store; `retainedProperties(wrapper)` permits inspecting a stopped constructor prefix without certifying attachment or reading. `properties.rigidBody()` returns the existing `NativeOriginalRigidBody` facade after attachment. Its BodyFlag payload and StartVelocity accessors read/write the same physical store, not a copied simulation state.

The native base reference/owner/wrapper fields use the shared physical `NativeLivePropertySet`; JS pointer capabilities and native vtable identities are tracked separately from numeric byte addresses. Uninitialized data bytes are not treated as zero. The default vector/quaternion constructors perform no component writes. Before descriptor defaults initialize StartVelocity, the facade preserves its explicit `null` (unknown) state. The facade is instantiated only after the actual enum-constructor read has supplied the real flag payload.

## Source order and current packet

The factory runs the original base/leaf constructors, Invalidate, inherited Create, fresh attachment, descriptor defaults, and PostInitialize in source order. Descriptor defaults are distinct from PostInitialize: notably PhysicsEnabled first receives false, then native PostInitialize writes true. BodyFlag first reads the current module default; PostInitialize later invokes the captured container assignment on an explicit zero-valued stack temporary.

Hero has fourteen serialized properties: thirteen leaf fields and PhysicsEnabled. Its original packet is version65; the native tail reads bools +80/+82 at version40, bool +83 at41, vectors +84/+90 at51, two raw28-byte poses at55 (first +b8, then +9c), and bool +81 at65. The leaf reader does not call the base reader, reset the object, or invoke PostRead. The modern wrapper consumes declared lengths without seeking to them. Vector stream reads write each component before reading the next.

Propagated reflective notifications retain the original outer/inner owner.Modified pure reads; custom Exit returns immediately when propagated=true. Local StartVelocity Exit, used by the existing movement facade, requires the original temporary CString construction/comparison/destruction services and preserves both comparison groups. Other local mass/flag notification handlers remain unsupported.

OnAdded is concrete and conditional: actual RTTI casts the first owner from eCEntity to eCTemplateEntity; a non-NULL same-owner template cast returns without transform copying. Otherwise the method rereads owner for position and again for a temporary rotation, writes pose+9c/+a8, invokes the source quaternion destructor (literal RET), copies into +b8/+c4, and tail-calls the inherited no-op. Required world-position/rotation services must describe the actual owner; a class-name string is not substituted for a cast. OnRemoved and OnPostRead resolve to literal RET bodies. IsProcessable returns false.

## Explicit host boundaries and profile

- `bodyFlagDefault()` supplies the **current** module DWORD at30aebf38 on each source read. The PE's cold zero-fill value0 is separately proven from its section header; it is not a captured running value or permission to assume a live default.
- The shared reflection controller retains the actual panic-state/reference/creator services and stops with its ordered prefix when a required service is unavailable.
- OnAdded needs actual template RTTI and, for non-template owners, world transform reads. No source quaternion cleanup effect is invented.
- The movement facade requires actual owner processing-range bits, original GetBuffer lookup/creation/lifetime, and NxActor services on their corresponding branches. It does not allocate a replacement physics buffer. Actor+f4 is explicitly NULL after Invalidate; no release/deletion is inferred from that overwrite.
- The selected profile uses successful allocations and complete finite binary32 scalar/vector I/O. Arbitrary short-read behavior, NaN/SNaN/x87 exception behavior, obsolete property compatibility, repeat wrapper reads, native memory addresses, and last-reference deletion are not reconstructed here. Supported callbacks must not reenter this reader; an attempted reentry stops immediately before later writes.
- BodyFlag uses the exact type spelling observed in this same original Hero packet. Raw native RTTI and its getter are pinned separately. Native UnMangle was not executed, so other type aliases are not certified.

## Evidence and reproduction

`construction-program.json` is the reviewed, curated interpretation of selected source instructions. The producer validates its instruction operands and every original PE byte; it is not an x86 emulator or an automatic source translator. The original CRT pointer array at307eaa6c pins the thirteen field registrars in order. PhysicsEnabled's registrar3075d680 is genuinely absent from the completed study's C/ASM/function index: its complete125-byte original PE body is preserved as **ASM-only**, with its own boundary and hash, without fabricated C output.

Run from the repository root with Python3.10+ and the completed, immutable local study:

```powershell
python tools/gothic3/research_rigidbody_reading.py --study '<LOCAL_DESKTOP_STUDY>'
```

`--capture-only` regenerates source/rules/packet receipts without freezing an implementation receipt. A final run pins the current runtime, producer, source-helper dependencies, shared reflection/movement modules, all local source evidence, and public outputs. The producer reads original PE bytes and exported study text only; it never loads or executes the game or DLLs. No tests, native execution, browser checks, build, remote changes, or Actions runs are claimed by this namespace.
