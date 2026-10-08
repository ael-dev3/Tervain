# Original Arena type singleton dependencies

`Game:2000d152` forwards to `2006ebf0`. Despite its destructor label in the
reconstructed C catalog, the original instructions implement a lazy getter:

1. Test guard bit 0 at `207b4fa0`, then OR that bit before construction.
2. Call the SharedBase property-object base constructor on `207b4f64` with true.
3. Write the original derived vtable `2065915c`.
4. Call the Arena class-name getter and construct the named factory at `207b4f7c`.
5. Get the SharedBase property singleton and call its original RegisterTemplate.
6. Register Game cleanup callback `20549930` and return `207b4f64`.

The 64-byte cold receipt includes the object and its guard. The captured getter
writes neither the tail at offsets 48 through 59 nor unrelated adjacent caches.
The source package also records all six original SharedBase import identities.

Cleanup `20549930` restores the derived vtable, calls the factory destructor,
and tail-jumps to the property-object base destructor. Its assembly is present
in the study; no recovered C body is claimed for that callback.

```powershell
python tools/gothic3/prepare_arena_type_source.py --study $env:LOCAL_GOTHIC3_STUDY --output assets/gothic3/arena-type
```

Every captured instruction and forwarding jump is checked against the preserved
Game.dll. Repeating the producer must preserve source bytes. Producing the package executes no native code.

`NativeGameArenaType` implements the selected original getter over canonical
Game storage. It preserves the guard, base construction, derived vtable, named
factory, SharedBase singleton getter and RegisterTemplate sequence. Registration
allocates the original 4-byte tagged wrapper, stores the actual type pointer,
loads the actual type vtable and class-name slot, invokes the admitted Arena
class-name owner and stores the wrapper in the same-heap type table. The later
Game exit registration retains the original cleanup capability.

Selected cleanup restores the derived vtable, destroys the factory and then
calls the base destructor. Those destructors preserve the source CString
reference counts, stale CString slots, conditional frees and array-clear order.
An array entry requiring an unowned live property virtual destructor stops at
that dependency with its applied prefix intact.

Focused checks cover registration identity, callback order, shared CString
lifetime, untouched padding/tail, warm guard behavior, a changed actual vtable,
unknown guard knowledge and a missing allocation pool. The existing NPC heap
extension and the dedicated Arena extension both supply the original 20-byte
pool; select one of those alternatives when configuring a fresh heap. Duplicate
overlapping extensions are rejected.

This selected runtime owner is not connected to the live Game CRT initializer
frame. Full initializer traversal, the first property callback's Create/reset/
unregister/register sequence, NPC activation and campaign progression remain
unfinished. Game exit-table traversal is separate from invoking a selected
registered cleanup body.
