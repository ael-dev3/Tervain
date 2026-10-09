# Original class-name CString pool

The source producer `tools/gothic3/prepare_class_name_heap_source.py` verifies
the matching SharedBase and Engine input hashes, original dispatch table,
fourteen alias/body pairs (573 instructions), pool geometry operands, descriptor
callbacks, cold globals and stride/capacity constants against the original PE.

Requests 49..56 use stride 56, capacity `0x7fb6`, region size `0x1c0000`,
bitmap offset `0x1befe0`, bitmap length `0xff8` and final mask `0x3fffff`.
The payload size is `0x1befd0`. MemoryAdmin admits this pool through the frozen
`nativeClassNameHeapExtension` identity and its existing pool algorithms.
This adds the physical allocator path required by pointer-template CString
results; it does not establish full engine startup or campaign completion.

Requests 57..64 now also use their original pool: stride 64, capacity `0x7fbf`,
region size `0x200000`, bitmap offset `0x1fefd0`, bitmap length `0xff8`, final
mask `0x7fffffff` and payload size `0x1fefc0`. Dispatch is
`10006dac -> 10048410`. All captured instruction bytes, constant operands,
descriptor callbacks and cold globals are verified independently against the PE.
With primitive template parsing enabled, startup returns from 146 class-name
initializers and reaches `204b1cf0 -> 2000bf78`. That descriptor contains a
scoped struct template argument; it remains unsupported.
