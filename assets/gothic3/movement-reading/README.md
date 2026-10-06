# Original CharacterMovement construction and reading

This namespace reconstructs the installed build's detached `gCCharacterMovement_PS` factory, current reflective/native reading and `OnPostRead`. It does not add an entity property set, register an entity, enter processing range, create collision shapes or activate the original world. Those operations remain separate native lifecycle paths.

## Runtime API

`new OriginalMovementReader(controller, host)` registers the concrete factory and fresh empty MovementBase inherited metadata with the same `NativeReflectionController` used by original entity reading. `controller.readAccessor(input)` then constructs and reads this actual family; the entity reader can consume its own trailing sentinel and execute its normal Add/PostRead sequence.

- `reader.allocation(wrapper)` requires the actual attached wrapper/base/value identities.
- `reader.retainedAllocation(wrapper)` exposes a stopped constructor prefix for inspection without certifying attachment or a complete read.
- Each allocation retains one `NativeCharacterMovement`, one `NativeMovementBytes`, one physical `NativeLivePropertySet` whose `values` is that movement, and exact proxy/pointer identities. Hero scripts use that same movement object. The native property-set selector is **21**: vtable `20687e8c+0x60`, `20033596→20223240` returns `0x15`.
- `readOriginalHeroMovement(reader)` loads the existing hash-verified original packet and reads it through the same factory. It leaves `DEADC0DE` for the original outer caller; it never invokes Add, PostRead or world activation.
- The physical base's `callbacks.postRead` executes the original inherited empty callback, animation reset, effect reset and two owning-movement pointer stores. Added/removed callbacks inherit original empty Engine bodies.

## Source-backed construction

Allocation helper `20235d30` pushes `0x3dc` (988 bytes) before the original constructor. Constructor `20026fa3→2022a4d0` invokes MovementBase, five entity proxies, math/CString/animation/effect member constructors and `Invalidate`. `Create` follows the base validity-bit chain. Default initialization assigns each bool/float descriptor zero, then `PostInitializeProperties` (`20223090`) applies its exact ordered constants.

The scalar store is initially unknown, despite JavaScript allocating zero-filled backing storage. Source math default constructors write no components; Vector Clear writes three zeros, Quaternion Clear writes `(0,0,0,1)`, Matrix Clear writes sixteen zeros. Bytes `+99` and `+fc` have only their constructor-set bits known. Base reference/owner/wrapper/flags and nonnumeric pointers are physical object metadata/identity sidecars; source PE addresses are never browser memory addresses. Consequently the peer native raw-byte coverage counts are not asserted as browser scalar-byte coverage.

The narrow shared `movement-state.ts` change adds per-bit known masks while retaining whole-byte seed compatibility. `fc` bit2 reads/OR writes no longer require or invent its other bits. Previous movement/instructions/checkpoint receipts remain historical at `4252aa9a`; the new implementation receipt pins the current shared file.

Fresh builtin MovementBase metadata declares zero fields and derives from `eCEntityPropertySet`. Native unknown/type-mismatched reflected-property readers can append an obsolete descriptor later. This implementation rejects those branches and supports a fresh metadata table, not a claim that the native root count is permanently zero.

## Actual host boundaries

Animation reset requires the captured real Application instance and its live unsigned DWORD `+510` total time. It samples that value twice during fresh construction and once again on PostRead. No world-clock date, browser wall time, frame delta or timer tick is substituted. The original has no null guard before the time getter; a null receiver stops after the already-applied reset prefix.

Effect reset requires temporary CString construction/destruction, actual ModuleAdmin singleton initialization or an explicitly captured initialized singleton, forward first-match `FindModule("gCEffectModule")`, and the original RTTI cast result. The stored module pointer is reread after string destruction. `OriginalMovementEffectModule` implements the installed module's captured virtual `+bc` as its actual retained system-pointer `+14` read. Supplying this capability does not establish module registration or infer a loaded pointer from a fresh module's constructor defaults.

The host also supplies concrete movement services and an optional physical-owner movement view. Owner lookup rereads the same base PS owner pointer; it never searches an entity by serialized ID. Other movement operations retain their existing collision/physics/animation dependencies. Synchronous stable allocations and no public reader mutation reentry are the selected profile. Failed callbacks retain their attempted/applied prefix and block replay on the same reflection controller.

Fresh NULL animation/proxy/array/CString ownership branches are concrete. Existing nonNULL animation-state release/delete, shape array element release/free and CString pool/header ownership remain explicit dependencies. No destructor or cleanup is silently treated as a successful no-op.

## Original Hero packet

Original `PC_Hero` movement is property-set index 3, outer/native version **76**, object version **83**, property table version **30**, with **35 serialized descriptors**. The 36th descriptor, `TreatWaterAsSolid`, is absent and retains its source factory default; it is not invented as a serialized field. The original world file and complete 505-byte packet (including the outer sentinel) are independently hashed and byte-compared in the producer.

The installed virtual `GetVersion` is **77**, independently proven by `20026fd0→20223220` (`MOV AX,0x4d; RET`). It is distinct from this serialized packet's 76 and the reader's >=76 current-tail threshold. The concrete factory reports the installed getter 77.

The native current Read consumes its own uint16 version and returns 1 for versions >=76, without executing the legacy tail or `Invalidate`. Version <76 stops after consuming its version, preserving the unsupported migration boundary. Reflective field readers consume their own version/declared size without seeking, notify Enter before resolving the destination, write the exact bool/float payload into shared bytes, then notify Exit. Propagated Enter performs the inherited inner owner read; propagated Exit returns immediately from the Movement override. Every owner Modified call is its existing pure DWORD read, not an invented dirty write.

## Reproduction

With Python 3.10+ from repository root:

```powershell
python -B tools/gothic3/research_movement_reading.py --study '<LOCAL_GOTHIC3_STUDY>'
```

The study must contain `00_Original_Runtime/{Game,Engine,SharedBase}.dll`, their completed C/ASM/function indexes, and the unpacked source world archive. The producer reads existing repository reflection schemas/serialized candidates, pins original module hashes, closes only five-byte PE-proven JMP aliases, verifies every captured instruction byte and complete PE body-range hashes, validates source packet bytes, and emits current output/source pins. Curated operation programs are human source interpretations whose instruction membership/order/bytes are audited; this is not an x86 emulator or automated semantic equivalence proof. No installed DLL is loaded or executed. No tests are run.

`--capture-only` emits source/rules/packet evidence while an implementation is being prepared, without issuing a current implementation receipt. The normal command emits `implementation-receipt.json`; old receipts are not overwritten.
