# Original class-name CString pool

The source producer `tools/gothic3/prepare_class_name_heap_source.py` verifies
the matching SharedBase and Engine input hashes, original dispatch table,
seven alias/body pairs (288 instructions), pool geometry operands, descriptor
callbacks, cold globals and stride/capacity constants against the original PE.

Requests 49..56 use stride 56, capacity `0x7fb6`, region size `0x1c0000`,
bitmap offset `0x1befe0`, bitmap length `0xff8` and final mask `0x3fffff`.
The payload size is `0x1befd0`. MemoryAdmin admits this pool through the frozen
`nativeClassNameHeapExtension` identity and its existing pool algorithms.
This adds the physical allocator path required by pointer-template CString
results; it does not establish full engine startup or campaign completion.
