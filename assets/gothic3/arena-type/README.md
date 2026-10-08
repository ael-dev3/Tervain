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
Game.dll. Repeating the producer must preserve source bytes. This package is
source evidence for the next runtime owner; it does not execute the getter,
construct the Arena type, register a template, traverse CRT initializers, or
activate a live NPC.
