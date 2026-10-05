# Original Interaction construction and current Hero read

This namespace implements the examined installed `gCInteraction_PS` factory,
defaults and current `PC_Hero` property-set read. It does not activate a world,
resolve interaction targets, dispatch a replacement game, or certify a complete
interaction/focus implementation. Earlier checkpoints remain historical.

## Reproduction

From the repository root, with Python3.10+ and the immutable local study:

```powershell
python tools/gothic3/research_interaction_reading.py --study '<LOCAL_DESKTOP_STUDY>'
```

The producer reads original PE files and extracted world data as data. It checks
the three original module hashes, selected instruction bytes and complete body
range hashes, actual vtables and descriptor stores, forwarding chains, literal
type/version/allocation values and the exact original world packet. It decodes
the world string table independently. It writes only this namespace. The final
implementation receipt pins the producer, runtime, shared helpers, source
excerpts, evidence, schema, current original packet metadata and public mirrors;
the receipt excludes itself. No native code, game process, tests, browser,
workflow, build, commit or remote operation is invoked by this producer.

## Actual source profile

- Native allocation224 bytes/tag196, selector49, `GetVersion`84. The Hero's ninth
  zero-based property-set packet also has version84. Packet236 bytes, wrapper83,
  property version30,14 descriptors; native Read only consumes its ushort and
  returns1. The current packet has no further native tail data.
- Fresh successful allocation/root clone and current buffered indexed archive
  stream. Shared reflection owns the actual wrapper/creator/iterator/reference
  effects. Repeated reads, cloning an existing nonroot wrapper, allocation
  failure/fatal recovery, last-reference destruction and native threading are
  outside this profile.
- One retained `NativeLivePropertySet` shares the actual `values`, physical byte
  masks, enum instances, three EntityProxy objects, TemplateProxy, four CString
  slots and an additional non-reflected PropertySetProxy. Numeric pointer
  addresses are not fabricated. Unknown padding, math-constructor bytes and
  pointers remain unknown until their source assignment.
- Constructor enum reads use the caller's actual current mutable module DWORDs:
  FocusPriority207b61a8, UseType207cef3c, FocusNameType207b61ac. Masked copies retain
  unknown bits. A static PE global is not promoted to a running module value.
- PostInitialize retains the one reused8-byte stack temporary across its two
  enum lifetimes. The base constructor, typed vtable/value, virtual scalar copy,
  typed destructor and base destructor follow the original order. Numeric
  temporary pointer addresses stay unknown; the vtable capability is recorded.
- Public byte mutators, physical CString/proxy pointer assignments and PS
  owner/wrapper assignments enforce the same retained allocation and controller
  guards. The embedded proxy ID is read from its physical20 bytes rather than a
  separate cached string. Direct raw storage remains a low-level physical
  operation and does not implicitly notify a property or resolve an entity.
- Reference word+8 and the flag value/mask byte+10 alias the same raw physical
  header; owner+12 and wrapper+4 retain pointer capabilities and mirror
  NULL/unknown address masks. The reference alias is installed after shared
  retainNative validates constructor word1, then constructor writes initialize
  the physical header. Guarded scalar writes preserve the partial flag mask.
- Descriptor defaults run in source order. EntityProxy default only validates
  its receiver; it does not clear its ID. PostInitialize sets FocusNameType0,
  assigns the literal `Head_Head_End`, clears both vectors, sets UseType0, and
  clears Owner/User through the Entity*-NULL proxy overload. UsedByPlayer is
  initialized by its bool descriptor, not guessed from constructor padding.
- The base PS owner at+c is separate from the reflected Owner/User/AnchorPoint
  entity proxies. Full Notify reads the current owner.Modified twice with an
  owner reread; Modified is a pure DWORD130 read. Interaction's OnNotifyExit
  override only forwards to the inherited Engine body. Property payload receiver
  is resolved after Enter, then independently before Exit; unsupported native
  wrapper replacement stops at those boundaries.
- Vector reads perform one raw12-byte read, preserving original IEEE bits.
  EntityProxy reads retain equal first16-byte IDs and release unequal cached
  references after ID assignment; absent clears release first then all20 ID
  bytes. TemplateProxy absent reads retain old ID/cache. Current Hero proxies
  are absent, so current reading never resolves an entity or allocates an ID.
- Native Read accepts its version word without testing it. The executable
  reader is for the examined fresh/current packet, not a proof of all archives
  with other descriptor versions/stream types. Source bool domain here is
  canonical0/1; successful complete buffered primitive reads are selected.

## CString ownership and required services

`NativeInteractionCStringSlot` is the actual mutable pointer slot. A nonNULL
buffer carries its identity, text/header length, uint16 reference count and
freed state; an allocated empty buffer is distinct from NULL. Constructor
slots are uninitialized until their native NULL store. The shared byte masks
reflect NULL and capability-backed nonNULL pointers.

The host must implement `assignCString` using the real char*-literal assignment
path and `readCString` using the indexed archive virtual CString reader,
including actual source-buffer sharing/refcounts and old destination release.
PostInit and Hero read both use the nonempty `Head_Head_End`. Merely assigning a
JavaScript string, copying the catalog text or returning success without
ownership effects does not satisfy the host contract. The reader checks the
post-assignment literal text and each successful indexed read's two-byte cursor
advance/source-table text. Header lengths/refcounts remain native values, not
inferred from Unicode byte lengths. Current names are ASCII.

`freeCString` is required only on an actual last-reference Clear; its decrement
is already applied before Free. `deleteTemplateId` is required when replacing
an existing owned ID. Failure retains the ordered prefix and blocks replay.

## APIs and later callbacks

`OriginalInteractionReader(controller, host)` registers its concrete factory.
`readOriginalHeroInteraction(reader)` loads the pinned existing reflection
packet and returns the same accessor/properties/input. `properties(wrapper)`
requires actual attachment; `retainedProperties(wrapper)` exposes a stopped
constructor prefix without promoting it to resident/read-complete state.

`properties.values` has source-backed readonly field accessors. Its proxy
objects and CString slots are retained physical capabilities; subsequent native
interaction/focus services must use these objects. `base.isProcessable()` is
false. Inherited `process`, `preProcess`, `postProcess` and `postRead` are real
literal empty bodies, so they execute without invented host effects.

OnAdded/Removed captures the base owner, performs the real template RTTI check,
then registers/deregisters the same PS with the actual NavigationAdmin when the
cast is NULL; NULL owner also takes that branch. The inherited tail is empty.
The host must provide real navigation state/services; no fake registry is
installed here. Native registration/removal return values are ignored, including
removal that returned0 after already modifying the primary list.

Entering processing range obtains the actual InteractionAdmin and adds this PS
before its owner/application/script queries. Exiting captures its owner and
performs the gated script first, destroys any fallback CString temporary, then
obtains the current InteractionAdmin and removes this PS. The application gate
is strict AL==1. ScriptAdmin NULL skips the call; script return values are
ignored. The real ScriptAdmin virtual+bc receives name, captured owner, NULL
other and int0. Empty custom names construct/destroy the actual native fallback
CString; actual admin lookup, application RTTI/gate, script/SPU dispatch and
temporary ownership are explicit host boundaries. Returning unknown never
silently runs the remaining callback tail.

No owner/context/scene registration, processing ROI, navigation membership,
savegame migration, complete focus/render behavior or world residency follows
from successful construction/read alone. Source receipts establish the examined
implementation and input identity, not end-to-end original-game equivalence.
