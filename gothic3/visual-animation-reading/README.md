# Original VisualAnimation construction and reading

This namespace reconstructs the examined fresh `eCVisualAnimation_PS` factory and the current original `PC_Hero` property-set packet 18. It creates a retained 424-byte property set through the existing reflection controller and owns the same physical values, masked header, proxy, embedded factory and motion stores. It does not activate an entity, create a physics world or assert that the original animation/rendering system is connected to browser play.

## Implemented scope

- Installed property selector 100, getter version 64, native vtable `30820394`, wrapper vtable `3081fa84`, 31 own reflective fields and original processable return 1.
- Original constructor order, source-defined masked header and uninitialized bytes, three enum containers, fresh Invalidate, Create, Attach, descriptor defaults and ordered PostInitialize. The integer descriptor default is `FFFFFFFF`; PostInitialize subsequently writes MaterialSwitch 0. Enum defaults require the current mutable source-module globals. One reused eight-byte temporary preserves the native enum assignment/destructor order.
- The cloth wrapper at parent offset `80` is the same wrapper allocated by the shared embedded-wrapper API. Its flags/native/type capabilities alias parent offsets `84/88/8c`; its retained 128-byte SpringAndDamper object implements constructor/Create/Attach, nine own and four Effector fields, defaults/PostInitialize, current reflective Read and native `62/39/1` tail. The descriptor resolves this existing wrapper rather than cloning it.
- Fresh factory Create allocates its actual 44-byte LoD through a required allocator, runs the original constructor and virtual Create/Destroy path, then reserves motion count 8 with capacity 16 and 192 bytes through actual Realloc. LoD byte `+10` writes leave padding `+11..13` unknown. The embedded factory has no invented vtable at `+94`.
- Current Hero reflective payloads and native version-64 Read: Factory version 5, LoD version 4, main Skeleton, two parts, one facial part, seven motion records, zero attachments, raw Box24, and base-PS version 2. The base Read updates only enabled bit 0. The original packet including sentinel is 740 bytes and its native tail is 99 bytes.
- Factory/LoD/motion cleanup retains the original order. DestroyActorInstance still releases main/part resources when its actor is NULL. Shrinking motion count destroys and reconstructs the tail in the same retained allocation/record identities before setting the count. Realloc preserves known old bytes and constructs new regions only after its pointer store.
- Reflective Enter resolves owner twice through the inherited notification path. The descriptor re-fetches native receivers after Enter and before Exit. Propagated Exit skips the local name/cache prefix, captures main MaterialSwitch before its LoD getter and re-reads material/facial state for the facial write. Inherited Added/Removed/PostRead bodies are concrete RETs.

## Required services and selected profile

`OriginalVisualAnimationReader` exports the two registered factories, actual properties, property notifications and process dispatch. `readOriginalHeroVisualAnimation` reads the verified original packet through the same reflection controller. Every allocation remains detached (`worldResident: false`).

`NativeVisualReadingHost` must supply actual current enum globals, indexed CString buffer/header/refcount Read, CString Free, successful LoD allocation, Realloc/Free and LoD virtual release/destructor/deallocation where source execution reaches those calls. The allocator returns retained storage, not a success label. NULL versus an allocated empty CString are distinct; equal JavaScript text alone does not prove string ownership. A motion catalogue entry is not a retained resource: live motion objects need the actual virtual release capability.

Nonempty actor filenames require the real original archive/proprietary/native lookup and owned filename assignment; an inspector mesh or rig does not stand in for an engine actor. Populated SetActor(NULL), actor destruction/recreation, local NotifyExit cache services, nonzero attachments and live OnProcess require the corresponding real services. The current zero-attachment/NULL-array branch is concrete; the nonzero branch stops at the original allocation/Read service unless supplied. An additional nonNULL factory array during the selected actor-NULL cleanup path remains an explicit Free/ownership boundary. LoD virtual ReleaseReference delegates the actual destructor(arg0) and DeleteObject before ending its allocation lifetime.

The examined input profile is indexed GENOMFLE streams, canonical bool bytes 0/1, current native versions, distinct fresh LoD allocation identities with unknown initial masks, and stable captured storage/header across external callbacks. Unsupported versions, unavailable services, pointer/mask divergence, relocation of captured cleanup pointers and arbitrary public reentry stop with earlier effects/cursor retained. Only source-internal Visual-to-Cloth constructor/read nesting is permitted. These are stated implementation limits, not native clamping/default guesses or rollback.

## Evidence and reproduction

Run from the repository root with Python 3.10+:

```powershell
python tools/gothic3/research_visual_animation_reading.py --study '<LOCAL_DESKTOP_STUDY>'
```

The study must retain the original Engine/SharedBase/Game PE files, completed CSV/C/global assembly exports and the winning original `Projects_compiled.p00` world file. The producer never executes native programs, tests, a browser, a build or remote operations. It uses the frozen exact-body `bounded_native_capture.collect` helper, closes pure-JMP forwarding chains immediately, compares every instruction with the original PE and checks full inclusive body-range coverage. Native vtables/descriptors/literals, PostInitialize data constants, original packet/field bytes and an independently decoded indexed string table are checked offline.

`native-evidence.json` holds exact selected support/body evidence and scope. Its captured-body count is an evidence inventory, not a claim that every captured native function has been translated. `runtime-rules.json` carries field/source/packet metadata. Source excerpts and JSON are mirrored under `public/gothic3/visual-animation-reading/`; `implementation-receipt.json` pins current runtime, producer, imported producer helpers, shared source dependencies and outputs (it excludes itself). The preceding source checkpoints remain historical. Typecheck is separate from producer byte/hash checks; no gameplay/browser/build validation is asserted by this namespace.
