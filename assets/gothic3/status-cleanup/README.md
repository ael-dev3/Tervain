# Arena Status cleanup callback

The source preparation tool captures all eleven instructions at Game
`205499a0`, verifies the matching DLL SHA-256 and compares disassembly against
PE bytes. The runtime exit table admits this exact callback as data for the
original Status initializer's `_atexit` call at `204b1e44`.

The callback restores descriptor vtables, invokes Destroy, releases the
default-value object, unregisters the descriptor and enters the base destructor.
Registration does not claim these shutdown operations have executed.

```powershell
python tools/gothic3/prepare_status_cleanup_source.py --study '<study directory>' --output assets/gothic3/status-cleanup/source.json
```
