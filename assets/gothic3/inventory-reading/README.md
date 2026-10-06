# Original Inventory construction and current Hero read

This module constructs and reads one detached original `gCInventory_PS` and its
two actual nested `gCInventorySlot` objects. It uses the shared reflective
controller, the actual retained wrapper/native reference words and property-set
owner slot. It does not activate items, equipment, stats, rendering or world
membership. Later startup item assurances are a separate state transition.

## Source and reproduction

The immutable installed Game, Engine and SharedBase PE hashes are recorded in
`native-evidence.json`. Every selected exported study instruction is compared
with the original PE bytes, and each complete function body range has a SHA256.
The producer closes exact five-byte JMP forwarding chains during the same run.
The original modules are only read as files; no target native code is executed.

From the repository root, with Python 3.10+:

```powershell
python tools/gothic3/research_inventory_reading.py --study '<LOCAL_DESKTOP_STUDY>'
```

`--capture-only` regenerates source/data evidence without issuing the current
implementation receipt. The ordinary command freezes the runtime, producer,
shared dependencies and all owned outputs, excluding the receipt itself.
Typecheck was run separately. No tests, game execution, browser run, build,
remote action or publication is asserted by this namespace.

## Actual source packet

PC_Hero property-set index7 is a411-byte packet at world-source offset1187178,
relative Hero range[3266,3677). Its class is `gCInventory_PS`; outer/native
version9, reflected object version83 and property-table version30 are distinct.
The complete world, packet SHA256 and payload offsets are recorded separately.

The packet contains GeneratedPlunder=false, GeneratedTrade=false, five empty
TreasureSet strings, stack-list version1/count0, slot-list version1/count19,
17 NULL accessors and two actual reflected slots, followed by five absent
EntityProxy records. The slot enum values are16 (Head) and17 (Body). These are
source slots with template/item IDs; loading them does not spawn or equip those
items. The initialized-player startup projection with121 item assurances is not
used as the source Inventory storage.

## Concrete factory and storage

- Installed getters return Inventory type31/version9. Inventory native allocation
  is232 bytes. Nested Slot native allocation is60 bytes and its inherited native
  GetVersion returns1; it is not a property set.
- One `OriginalInventoryProperties` owns its physical byte-mask view, five
  CString slots, one stack-list header, one slot-list header/backing allocation,
  listener storage and five cached entity proxies. Native references/owner and
  other pointer capabilities have one actual store; numeric pointer addresses
  are not invented in the byte view. Bytes not represented or written by the
  selected source remain unknown, including Inventory patch flag+e4 until Read.
- The slot-list constructor first allocates27 pointer cells and sets count19.
  Inventory's `ClearDefaultItems` calls the actual list at+40, reducing count to0
  while retaining that allocation. The current read grows count back to19 and
  reuses the backing storage. Resize preserves the native oldCount-based memset
  extent; successful growth selects a moving allocation profile explicitly.
- Slot constructor reads the supplied current Game default DWORD207b5f2c before
  assigning a captured temporary zero. Descriptor defaults read that current
  global again, then native PostInitialize assigns zero again. No zero global
  is inferred from a missing host field.
- Slot metadata's actual parent typename is `bCObjectRefBase`. SharedBase's base
  iterator lookup treats that exact typename as the NULL end sentinel. The
  runtime normalizes this proved sentinel to `baseClassName:null`, without
  registering an invented base root.
- Clone, Create, Attach, temporary wrapper clearing around initial native
  ReleaseVirtualReference, descriptor iteration and creator destruction use
  the shared controller. Before storing a read Slot pointer, native AddReference
  forwards to its actual wrapper; temporary accessor destruction occurs after
  the pointer write. Slots keep the actual nested object identity.
- Clear's implemented last-cell branch requires the same saved-index/live-count
  relationship after ReleaseReference. A destructor that changes the list count
  stops before the unsupported conditional memmove/decrement tail; it is not
  interpreted as an unconditional pop. The current fresh NULL-slot path has no
  release callback.

## Current read semantics

Descriptor header/version/size is consumed without seeking. Each payload
receiver is reread after Enter, and a fresh exact native receiver is required
before Exit. Inventory inherits two pure owner.Modified reads per notification;
non-PS Slot notifications have no entity owner. Normal reflective propagation
does not run an invented item/stack notification callback.

The indexed ArchiveFile string reader is `Engine:305dd530`, which invokes
CString assignment/SetText (`SharedBase:10015430`/`10014640`). Each current
TreasureSet destination is the physically NULL constructor slot, retained by
the NULL Clear default branch. A decoded source string with length0 may have a
NULL pointer or an allocated-empty buffer. In either case, SetText's empty
source/fresh-NULL destination branch writes NULL without allocation, data
refcount changes or Free. The runtime supports precisely that branch. It does
not claim that the archive string-table pointer itself is NULL; a nonempty
string stops after its payload index before an unproved assignment.

EntityProxy owns an embedded20-byte ID and cached internal reference. A present
record compares only16 GUID bytes; an unequal ID is assigned before cached
ReleaseReference, then the internal slot clears. Equal IDs retain the cache.
An absent record releases then clears the cached pointer and destroys all20 ID
bytes. Every callback is checked before the following physical write.

TemplateProxy instead owns a nullable pointer to a separately allocated20-byte
PropertyID. An absent record retains that pointer/cache. A present record
destroys/deletes an old owned ID if present, resets both pointers, allocates20
bytes with original tag147, then copies16 GUID bytes and clears the cache DWORD.
The current two fresh slots require no old-allocation deletion service. Native
slot acceptance tests ID-pointer presence, not whether the GUID is nonzero.

Inventory native Read clears patch flag+e4 before reading its version. Current
V9 reads the two lists and five proxies in original order; those helper returns
are ignored. OnPostRead with the resulting flag0 has no services. A nonzero
patch flag captures owner dispatch, clears the flag first, then needs the actual
owner name/warning or MessageAdmin service before resetting the captured owner's
timestamp DWORD130. Unsupported services retain their already-applied prefix.

## Runtime API and remaining boundaries

`OriginalInventoryReader(controller, host)` registers `factory` and
`slotFactory`. Host supplies an explicit live `slotDefault:NativeMaskedWord`.
`readOriginalHeroInventory(reader)` reads the hash-verified original source;
`properties(wrapper)` returns the attached same-store allocation and
`retainedProperties(wrapper)` permits inspection of a stopped constructor
prefix. `properties.slots.slot(index)` returns its actual live Slot pointer;
`originalInventorySlotIds(slot)` returns IDs without resolving entities.

The current Hero0-stack branch is implemented. A nonempty stack list still
needs its actual InventoryStack constructor/reader, reference lifetime and
stack-list listener methods. Other explicit boundaries are nonempty CString
ownership, last-reference object destruction/deallocation, Inventory readers
V3..V8, diagnostics on unusual versions/missing slots, and actual entity/item
materialization, patching, mutations and equipment effects. Signed corrupt or
unbounded allocation inputs are outside the selected safe finite profile; no
native clamp or synthetic success is invented. A failed controller retains its
ordered prefix and stops subsequent mutation rather than replaying it.
