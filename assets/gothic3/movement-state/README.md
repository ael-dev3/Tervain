# Installed character movement operations

This namespace implements examined operations on one retained CharacterMovement
property set. It does not drive the browser explorer or claim native physics is
connected to the rendered world. Original units are centimetres.

## Runtime API and shared storage

`NativeCharacterMovement` implements the existing `NativePlayerMovement`
interface. Construct it with a `NativeMovementBytes` byte array and known-byte
mask, the actual pointer caches, and a `NativeMovementServices` provider. Assign
that exact instance to the existing Hero actor's movement field. The same
`+100` mode, `+104` previous mode and `+17c` braking byte remain visible to Hero
scripts. Navigation/CharacterControl wishes and world transforms remain their
own original live stores. No wishes are copied into a renderer transform.

Loaded CharacterMovement fields must come from an actual source-backed object
reader. Absent bytes are unknown. This module does not manufacture a loaded
object from constructor defaults or from a partial serialized catalog record.
Supplied arrays and pointer-cache objects are retained. Their external mutation
requires a stable synchronous integration profile; a snapshot is not live
storage.

Implemented operations include the SetMovementMode ordering, speed and flag
helpers, dependent property-set lookup/cache writes, sensor goal stores,
SetCurrentVelocity, CalcNextSteps, SaveFrameStates, processing flags, the
ProcessMovements router and tails, and source-backed contact iterator effects.
Complex shape changes, collision, animation and movement integration stop at
their named native service boundaries. `controlledTranslationPrefix` executes
the actual timer/camera prefix and explicitly reports the remaining branch.

## Ordered effects and capabilities

Results distinguish complete, partial and unsupported operations. Applied and
attempted effects retain source order; failure never rolls state back. A
partial movement operation suspends later public mutations through `failure()`
to prevent replay of its prefix. This suspension is an integration safeguard,
not a native flag or native reset. Resuming an interrupted operation requires a
future continuation mechanism; clearing the safeguard is not exposed.

Public reentry is rejected immediately after each callback and before further
writes. Source helpers instead receive a scoped `NativeMovementExecution`
capability for legal same-object SetMovementMode, SetCurrentVelocity,
SetGoalPosition and StopMovement calls. The capability shares the outer journal
and sticky failure; stale, asynchronous and cross-instance use is unsupported.

The setter's callback does not bypass ScriptAdmin. The provider first captures
the actual ScriptAdmin receiver and vtable `+bc`, before the later owner reread.
Its `callScript` capability must perform the original game/processing gates,
embedded admin SPU Self/Other/IntParameter writes and RunScript lookup. The
ordinary installed OnMovementModeChanged body is offered only inside that
dispatch, after original registration selection and nonowning wrapper capture.
It requires the captured Self CharacterMovement pointer to be this same object.
Its explicit no-effect branch returns 1; exceptional branches require their
actual script effects. A complete dispatch return, including gate return 0, is
ignored by SetMovementMode as in the original. The incoming Hero SPU is not
substituted for the embedded admin SPU. Full ScriptAdmin integration remains a
required service.

## Physics buffer domain

`NativeOriginalRigidBody` retains the real flag word and StartVelocity value.
Flag-container assignment is a pure DWORD store, followed by the fresh native
buffer lookup. Offrange velocity uses the original Enter/store/Exit order.
`nativeRigidBodyLinearVelocity` never reads the pending buffer: it selects
StartVelocity, disabled-scene zero, or the reread actual NxActor velocity scaled
by 100.

`NativePendingPhysicsBuffer` implements locked commands 4, 11 and 12. Velocity
command 4 deduplicates and keeps its original queue position while updating the
latest payload. Flag commands do not deduplicate. Execute's inspection operands
walk commands FIFO but take each flag payload from its final array element.
This inspection does not execute or clear the queue. `clearAll` implements
active count/bit reset only when commands exist and retains the pending velocity.

A fresh buffer has a null actor, empty headers and three zero bitfield words;
its numeric payload is uninitialized. `fromConstructor` therefore uses an
unknown velocity. Successful JavaScript allocation is bounded to 65534 command
records. Native allocation failures, pointer addresses, retained backing
capacity, concurrent critical sections, unlocked NxActor calls and scene
scheduling remain outside this selected logical-storage profile.

## Arithmetic and unresolved consumers

Stored values use finite binary32. The selected host rounding mode is nearest
even. HasZeroMagnitude squares and adds exact rational inputs at each possible
x87 precision width (24, 53 and 64 bits), then tests the final float32 zero
result. It rejects precision-dependent decisions. Tiny nonzero vectors may
have zero squared magnitude. Slide dot products and selected timer/height
subtractions use a deliberately bounded exact-store domain; unsupported
extended rounding is reported rather than guessed. NaNs, infinities and
altered native FPU modes are outside this profile.

Remaining dependencies include reflected loaded-state materialization;
CreateDependantShapes/capsule and weapon-trigger construction; collision rays,
floor/water/ceiling and PutToGround; full acceleration, braking, rotation and
jump translation; full OnProcess/OnIntersect scene lifecycle; NxActor/scene and
critical-section integration; exceptional mode callbacks; and animation/effect
services. These are distinct from rendering mesh or skeleton data.

## Reproduction and evidence

From the repository root, using Python 3.10+ and the immutable local study:

```powershell
python -B tools/gothic3/research_movement_state.py --study <LOCAL_GOTHIC3_STUDY>
```

The producer verifies original PE hashes, every selected instruction byte,
function body ranges, switch tables, vtable targets, numeric constants and
callback registration bytes. Three callback records are assembly-only because
the study's function catalog omitted them; no original C source is claimed.
Decompiled C is a reconstruction used alongside assembly. The current receipt
pins this runtime, producer, helper dependencies, read-only shared dependencies,
source excerpts and public rules. Historical checkpoint receipts remain at
their recorded source versions. No native code, game, tests, browser or build
is executed by this producer.
