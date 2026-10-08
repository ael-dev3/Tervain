# Original Game Arena class-name cache

The producer reads the owner's offline study and preserved Game.dll. It verifies
both entry chains to `2006e480`, the complete getter instruction bytes, the cold
12-byte cache at `207b4f4c`, the prior-result slot at `207b5024`, the RTTI descriptor
at `20798010`, the vtable slot at `2065915c`, and initializer slot at `2056c628`.

The virtual entry `2001d278` follows three forwarding jumps. The direct getter is
`20031fca`. Cleanup entry `2000951b` forwards to `20549960`, which sets ECX to the
cache and tail-jumps to SharedBase's CString destructor import. The selected
initializer `204b2110` has no analyzed assembly in the offline study; its three
instructions are explicitly recovered and checked against the original PE.

```powershell
python tools/gothic3/prepare_arena_class_name_source.py --study $env:LOCAL_GOTHIC3_STUDY --output assets/gothic3/arena-class-name
```

`NativeGameArenaClassName` uses canonical Game image storage, Game's actual RTTI
name/demangler owner and the same platform's SharedBase CString heap. It preserves
the two guard writes, prior-pointer copy, CString construction, Game exit-table
registration, later initializer publication and selected cleanup. Cold access
copies the original NULL prior result; it does not seed the later initializer's
result. An unresolved dependency retains the applied prefix and stops replay.

Capturing these files executes no native code. The runtime owner supports these
selected bodies; it does not traverse all initializers, dispatch a live property
vtable call, construct the Arena type singleton, register a live NPC, or complete
the campaign. Game exit registration stores an admitted callback capability;
full original exit-table traversal remains unfinished.
