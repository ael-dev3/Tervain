# Original SPU scheduler and WAIT

This is an offline port of the installed 32-bit build's bounded scheduling
operations. It does not execute Gothic 3, complete every instruction, supply
compiled NPC scripts, or establish a complete game session.

## Reproduce

From the repository root, with Python 3.10+:

```text
python -B tools/gothic3/research_spu_instructions.py --study <LOCAL_DESKTOP_STUDY>
```

The producer reads the immutable study's original Game, Engine and SharedBase
PEs, checks their full hashes, and compares every selected assembly instruction
with its original bytes. `native-evidence.json` retains C and assembly excerpts,
navigation locations and hashes. Assembly establishes the time operands where
the C export incorrectly contains `unaff_ESI`. The producer imports the existing
clock collector and combat PE reader; the implementation receipt pins those
helper versions too.

## Runtime API and integration

`NativeInstructionScheduler.fromOriginalFactory` constructs the original SPU
stack (five allocated slots, one live frame) on a real
`NativeScriptProcessingUnit`. Its `spu` field is that same mutable object. The
scoped scheduler binding shares the existing revision, ordered trace and
partial-failure blocking behavior. It is not a second task/state copy.
Script bodies can start WAIT or call setters/FullStop inside ProcessScript;
these legal nested operations reuse the live capability and journal. Recursive
ProcessScript, expired capabilities and cross-instance capabilities are rejected.

The factory explicitly leaves WAIT target and callback timers unknown: these
bytes were not initialized by the inspected constructor/Invalidate. A WAIT
descriptor or callback setter supplies their actual first values. The default
frame's 1000 milliseconds is a different field.

The caller supplies one shared `NativeSPUFrameSchedule` for all actors, an
explicit nearest-even x87 precision profile (24, 53 or 64), a live entity-proxy
registry, and source-backed routine/property handlers. The profile is frozen;
none is a captured running game's FPU state. `newFrame(uint32Timestamp)` ports
the global budget reset. The loader-zero helper describes original PE
zero-filled static bytes before subsequent writes, not a captured session.

`wait({entity, milliseconds}, false)` consumes the original eight-byte descriptor
semantically (entity identity and unsigned32 milliseconds). It does not retain
the descriptor. `wait(null, false)` polls, and `wait(null, true)` aborts.
`abortHandler(pointer)` supplies the existing SPU's FullStop/AIStopWait host
adapter for pointer `2002d3b2`. No other abort body is silently supplied.

`process({processingEnabled, scaledSeconds})` takes explicit application gate
and stored float32 frame seconds. It does not derive frame time from the world
clock, clamp large/negative deltas, or automatically apply the world's factor12.
Scaled seconds are stored float32 before multiplying by1000; each subsequent
x87 operation is rounded to the selected precision, and each native float32
store includes nearest-even subnormal rounding. Nonfinite exception domains
remain unsupported.

`setTaskCallback` and `setLocalCallback` accept `string | null`. Null means the
original null-storage CString sentinel. An allocated empty string is represented
by `''`, and still writes the setter's timer (1000 task, 100 local); native
IsEmpty then suppresses its callback invocation. Clearing does not reset that
timer. `setLocalTimeScale` stores float32; only Process applies the native
epsilon comparison.

The concrete descriptor-proxy registry copies the first16 PropertyID bytes and
clears its final DWORD, releases the old internal, then queries/adds a reference.
It retains the original 20-byte source entity IDs. A fresh internal has one live
owner reference before Query adds the proxy reference. This bounded profile
requires known reference counts including external aliases, and live owners;
unknown references, destruction/allocator callbacks and reference overflow are
rejected. It does not implement every engine proxy, entity lifetime or resolve
Self/Other lookup caches. The existing routine host supplies live Self lookup;
its ownership/reference seed must be maintained separately when those aliases
change. This registry must not be described as complete engine lifetime recovery.

## Source branches

| Operation | Original entry / body | Preserved behavior |
| --- | --- | --- |
| WAIT | 2002d3b2 / 20367ad0 | Abort tests native bool1; target>elapsed is pending; clears +78, +108, then callback on completion/abort. |
| ProcessScript | 200047e1 / 2036e9e0 | Application gate; ordered timer stores; task synchronization; active pointer reread; frame dispatch; time publication; channel update. |
| New frame | 200190ce / 20367a80 | Shared unsigned task count/20+1 budget, source-ordered counter resets. |
| Task callback | 2002fa31 / 2036b5d0 | 1000ms budget threshold, forced call at2000ms, otherwise accumulation against captured PS.TaskTime. |
| Time publication | 2001154f / 20367ec0; 20030521 / 20367f10 | FDIV1000, float32 operand captured before EnterEx; retained original PS receiver. |
| AI function | 20029ad7 / 2034cea0 | Registered handler AL==1 removes live top frame; other AL returns0. |
| Frame removal | 20030f80 / 20353d10 | Destroy captured slot; reread count/data; memmove; initialize last slot; decrement live count. |
| Daily fallback | 20025536 / 2036b6a0 | Empty Routine checks NPC_PS selector0x1e before ContinueRoutine. |

## Intentional correction to the historical SPU API

`NativeRoutineEntity.npcPresent` is now required and authoritative. The former
`navigationPresent` name had represented the wrong property-set gate; it is
optional deprecated metadata and never dispatches behavior. The installed
`gCNPC_PS::GetPropertySetType` entry20010a1e points to202f8ec0:
`b81e000000` (`MOV EAX,0x1e`), then `c3` (`RET`). The fallback pushes0x1e at
2036b75e, so this identification does not rely on a community enum.

The fallback preserves the captured initial ScriptRoutine PS while rereading
live Self at the later native checks and before CallScript. Source-native unsafe
None/dangling profiles are explicit unsupported cases. Repeated frame-object
identities in a seed are rejected because distinct native 24-byte addresses
cannot share one mutable JavaScript slot.

The old session checkpoint at864422d remains historical evidence for its old
source. Its receipts were not regenerated to claim that this new runtime is
unchanged. `implementation-receipt.json` identifies this implementation.

## Remaining scheduler dependencies

- Original registered state/function/callback/routine bodies, including their
  own frame construction, instruction starts, script callbacks and side effects.
- Seven remaining instruction bodies: goto, output, animation, combat move,
  prepare aim, play aim and HUD wait; their abort paths too.
- Nonnull audio-channel update and its engine/audio/entity dependencies.
- Complete actor/PS construction and restore, registry ownership, Native
  EntityAdmin/application gates and original global per-frame dispatch ordering.
- Full native entity/proxy destruction, allocator callbacks, lookup caches and
  external reference lifetimes outside the explicitly selected live-owner model.

Unknown registered handlers do not become successful no-ops. The native
missing-registration error-dialog path can returntrue without popping a frame;
the browser port explicitly rejects that path instead. A supported empty-frame
path still calls daily-routine detection and needs valid Self; it is not idle by
default. Source-backed callbacks may execute ordered writes before failing;
those prefixes remain visible and block subsequent use of that SPU.
