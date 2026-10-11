# Component-name allocator research

This independently captures the original SharedBase 28- and 32-byte pools,
including dispatch, bitmap allocation, initialization, free, realloc, shutdown
and statistics (570 instructions). The original binary hashes, table ranges,
constant words, cold globals and operand proofs are in `runtime-rules.json`.

These pools already exist in the runtime: the base rules admit 28-byte slots,
and `nativeNpcHeapExtension` admits 32-byte slots. This research package is not
an additional admitted extension. Startup fixtures requiring component names
use that existing NPC extension, which also supplies the 20-byte pool.

Regenerate with `tools/gothic3/prepare_component_heap_source.py --study <study>
--output <output.json>`. Compare an independent output before accepting changes.
