# Installed routine and first-state ports

This bundle reconstructs bounded original Script_Game bodies. It is a dependency
of the full-game rebuild, not a complete player controller or a completed game.
No installed DLL or game was executed to produce this evidence.

## Reproduction

From the repository root, with Python 3.10+ and the immutable decompilation study:

```powershell
python -B tools/gothic3/research_routine_scripts.py --study '<LOCAL_DESKTOP_STUDY>'
```

The producer validates original PE hashes and each copied instruction's bytes.
It exports all 857 original compiler registrations, including their actual PUSHed
incremental-link trampoline and destination. Decompiled C can print a different
canonical pointer name; the original initializer bytes are authoritative.
The producer does not execute a typecheck, build, test, or native target.

`implementation-receipt.json` pins this runtime, its producer, helper producers,
the deliberately changed shared SPU, and every file in these asset/public
namespaces. Its own hash is excluded. Previous dispatch and instructions receipts
remain historical evidence for checkpoint `2637d1e`.

## Runtime API and shared objects

`NativeRoutineScripts(host, globals)` provides `routine`, `script`, `body`,
`destroyFrameObject`, and `deleteFrameObject` adapters. Bind it once to the
`NativeInstructionScheduler` whose SPU uses those same adapters. No separate SPU
copy is created. `changeActionFunction` is a bounded compiled-call entry point
and requires an existing caller frame.

Actors contain actual captured `OriginalEntityPropertySet` instances. Their
value stores are shared with the rest of the runtime. Property setters preserve
enter notification, scalar write, and exit notification. Unknown hooks or engine
operations stop at their original call boundary and expose the applied prefix.
The common SPU failure/journal prevents continuing an incomplete transition as
though it had succeeded. Nested supported instruction/setter calls use the same
live scheduler capability; stale or cross-SPU access is rejected.

`NativeRoutineScriptGlobals.fromOriginalLoader()` uses original PE loader-zero
bytes. Lazy label masks, labels, and counters are module globals shared by all
SPUs. Their signed32 increments and source write order are preserved. This is a
fresh loader profile, not a captured native session.

`NativeWeaponSelection.fromOriginalConstructor()` initializes selected indices
to -1. Its 63 ordered native constructor triples retain duplicates and use the
first matching pair: `(0,0,2)` precedes `(0,0,8)`.

## Implemented branches

| Original body | Implemented scope |
| --- | --- |
| Rtn_Player / 100a13b0 | AIMode0, Ransacked false, ghost gate, ordered ResetAll and fight-category task selection. |
| ContinueRoutine / 100c8100 | Navigation/application/attitude gates and AIMode9/8 Dead/StandUp tasks. The normal branch retains its reset prefix and stops before its unported tail. |
| ZS_Attack_Wait / 10020310 | Action47, real shared-SPU WAIT100ms, then SetState ZS_Attack_Loop. The next state is unported. |
| _AI_ChangeAction / 100497d0 | Paths without ground-bias/animation calls, including initial Hero Action24 to0. |
| _AI_StandUp / 1005f140 | AIMode0 and AniState2 return path. |
| ZS_StandUp / 100c8640 | Actual child function frame, destruction/pop, AIMode0, then ContinueRoutine. |
| _AI_TransferItem / 1005f9d0 | Initial index -1 branch. Item transfer and animation branches remain unported. |
| _AI_HoldInventoryItems / 100583f0 | Initial desired -1/-1, empty hand slots, two actual TransferItem(-1) function frames, and native slot equality gates. |
| PS_Normal / 1009ad30 | Initial Action24/AniState2/Species0, empty desired/held hand slots, no triggered tutorial, and None destination branch; ends by selecting PS_Normal_Loop. |

The installed Hero's original ScriptRoutine routine is `Rtn_Player`. Empty NPC
ScriptRoutine routines and Navigation.Routine `Start` are different properties.
The startup-input receipt preserves the source inputs; it does not assert that
all startup callbacks or the original gameplay loop have already run.

ResetAll preserves its fresh player comparisons, both held-item queries before
the checks, right-hand receiver for the bow effect, and the same PlayerMemory
store for IsConsumingItem. Frozen/effect/species branches remain unsupported.
Engine operations still require concrete host implementations: camera/focus,
navigation constraints, action queue/control flag, collision/strip/animation,
and runtime effects are not substituted with invented scalar/UI changes.
Tutorial true branches stop before their unported disable/localization/HUD call.
GetAttitudeToPlayer and populated item/template lookups remain host dependencies.

## Frames, arguments, and lifetime

The scoped `pushFrame` extension follows Script_Game Add1001d9e0 and
SetCount1001d8b0. Capacity grows by
`requested + clamp(signed capacity >> 3, 4, 1024)`. Only newly allocated slots
receive constructor1001cd70 defaults. An existing spare slot is not reset by Add.
Function calls write their native script/begin/object/callback fields; parent
callback absence is rejected. Strict native AL==1 triggers the actual frame pop.

The selected finite allocator profile is successful moving Realloc, capped at
65536 slots. It invalidates old outer frame addresses while copying live and
spare values. Native in-place and failed allocations are outside this profile.
Captured-address validation conservatively blocks callbacks that invalidate a
frame that the native caller subsequently rereads.

Script Entity wrappers are nonowning, 168-byte objects: copy/CopyFrom copy 42
DWORDs, PS AttachTo stores plain pointers, and Entity destruction is a plain RET.
There are no invented AddRef/ReleaseRef callbacks. Argument objects capture the
same PS pointer identities and share their live values. Their concrete scalar
deleting destructors run before DeleteObject. Allocation/string operations use
a successful synchronous profile, so no unproved allocator callback or observer
is inserted between the original assignments.

All captured argument field reads/writes and supported function returns require
the same registered, undestroyed allocation. If a reentrant callback frees it,
execution stops with its applied prefix. Native reads of freed memory are outside
the selected profile; retaining a JavaScript object does not make them supported.

These Script wrappers are distinct from Engine entity proxies, whose reference
semantics are modeled separately by the instruction module. Complete native
address-space/allocator behavior and arbitrary PS discovery are not claimed.

## Remaining dependencies

PS_Normal_Loop, melee/ranged/magic/ghost states, the normal ContinueRoutine
enclave/HP/healing/routine/party tail, native animations, populated equipment
transfers, and gameplay input handlers remain unported. The installed loop is
an input/interaction dispatcher; it is not represented by an idle-success body.
Unresolved paths block explicitly after their known ordered prefix.
