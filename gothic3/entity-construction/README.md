# Original custom entity construction

`NativeOriginalEntityFactory` retains the installed successful-allocation path:
`new(0x1c0,0x170)` → RefBase → Node → Entity → Dynamic → Game constructor →
virtual Create → optional SceneAdmin registration. The allocator's second
argument is preserved without assigning it an inferred meaning. The original
NULL allocation branch subsequently dereferences NULL; no clean native failure
return is invented.

One entity and its stable embedded arrays survive through construction and
later ReadV83. Deferred flag initialization preserves its position after the
frustum timestamp and around the identity/box/sphere/name operations. The
timestamp at entity+130 lives solely in `propertyOwner.modifiedWord`, shared
with existing reads and notification callbacks. Frustum timestamp+15c is a
different field. Uninitialized flags retain masks; padding and no-store math
constructors do not acquire invented zero values.

Node.PropertyID construction clears 20 bytes before CreateRandom. Its temporary
GUID constructor initializes only validity, not the 16 GUID bytes. Original
Generate calls CoCreateGuid, ignores HRESULT and sets validity; the reader then
copies 16 actual bytes and clears the cached DWORD. `browserEntityGuidService`
is an explicit replacement external platform service using browser UUIDs and
native GUID field byte order. It does not reproduce the installed OS algorithm.
The timer uses the existing selected monotonic-u32-millisecond profile, without
claiming captured QueryPerformanceCounter frequency, quantization or origin.

The same current SceneAdmin is captured once for the constructor's wrapping
DWORD+134 increment. The factory makes a separate getter for its NULL check and
another fresh getter if registration is taken. No counter is seeded or reset.
Create sets original validity/frustum/comparator state; registration uses the
generated constructor ID, later replaced by the original Node.Read sequence.

`connectConstructorMatrixIdentity` shares Control's actual SharedBase lazy
identity cache through indexed getters over its current physical bytes.
`connectConstructedControlSetEntity` maps the actual incoming owner to its
retained data and executes the existing DisableProcessing(false) setter.
Missing matrix/CRT/singleton/registration services retain the attempted prefix
and block replay. Heap diagnostics expose only known-field copies and never
return a partially constructed entity/owner capability.

The offline producer checks original PE instructions, dispatch/import bindings,
and read-only float constants. The current evidence has 67 entries, 584
instructions and 2,180 original instruction bytes. Reproduce it with:

```powershell
python -B tools/gothic3/research_entity_construction.py --study <LOCAL_GOTHIC3_STUDY>
```

This source is not connected to the live browser entry. Construction is not
world residency. All 19 property readers, template patching, child/context graph
loading, physics/PVS/processing activation and complete browser gameplay remain
integration work. The producer runs no native code, tests, build, browser,
deployment or playthrough. `gameplayReady` remains false.
