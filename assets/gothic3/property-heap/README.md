# Original property-wrapper heap pool

The producer verifies the original SharedBase and Engine input hashes, every
captured instruction byte and forwarding entry, cold fields, stride/capacity
DWORDs, dispatch-table range and geometry operands. Several callback bodies have
no recovered C; their assembly ranges are retained and verified directly.

```sh
python tools/gothic3/prepare_property_heap_source.py --study PATH_TO_STUDY --output assets/gothic3/property-heap
```

A fresh MemoryAdmin can select `nativePropertyHeapExtension`. It admits the
original 0..4-byte request bucket, stride 4, region 0x42000, 0xfffc slots,
bitmap offset 0x40000 and the actual callback/global identities. Existing generic
allocator owners execute allocation, freeing and moving reallocations using
this verified geometry. No caller-supplied pool constants are admitted.

Focused tests exercise all five request sizes, slot reuse, pointer preservation
through a 4-to-12-byte move, and property table clear with the actual 4-byte tagged
wrapper allocation. This does not connect RegisterTemplate's class-name virtual
call, the singleton image/guard or full Game startup.
