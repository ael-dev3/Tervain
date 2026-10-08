# Original Arena class-name holder pool

The original CString for `gCArena_PS` requests 19 bytes including its holder
header and terminator. SharedBase's dispatch table selects the 20-byte pool for
requests 17 through 20. The producer checks the original dispatch entries,
forwarding thunks, allocation/free/reallocation/shutdown/statistics bodies,
constants, bitmap geometry and cold globals against preserved DLL bytes.

The pool uses stride 20, capacity 65,535, region size `0x142000`, payload size
`0x13ffec`, bitmap offset `0x13fffc`, bitmap size `0x2000`, and final bitmap mask
`0x7fffffff`. These offsets come from original operands. Allocation starts at
region offset 16; padding and bitmap locations must not be rounded differently.

```powershell
python tools/gothic3/prepare_arena_heap_source.py --study $env:LOCAL_GOTHIC3_STUDY --output assets/gothic3/arena-heap
```

`nativeArenaHeapExtension` selects these rules for a fresh MemoryAdmin owner.
It supplies the admitted pool to existing allocator algorithms; it does not
execute the Windows allocator or imply live Game property registration.
