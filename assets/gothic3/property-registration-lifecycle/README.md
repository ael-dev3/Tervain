# Property registration and lifecycle dependencies

Original SharedBase instruction bytes and forwarding entries are verified by:

```sh
python tools/gothic3/prepare_property_registration_lifecycle.py --study PATH_TO_STUDY --output assets/gothic3/property-registration-lifecycle
```

The captured singleton RegisterTemplate allocates a four-byte wrapper, calls the
actual type class-name virtual method, and writes a string-keyed table slot. The
slot lookup includes a native hash search, allocation, CString assignment and
bucket linking. These dependencies are not yet implemented as live registration.

UnregisterPropertyTemplate first resolves an exact template index, removes it,
and invokes the value-type name, property name and source message calls. Only
the array removal dependency is implemented here: original 10088610 uses
overlapping memmove, decrements count and leaves the stale tail and capacity.
The captured base property Destroy body is an actual no-op, but derived Create
still has reset and unregister calls; they cannot be skipped.

The find-slot dependency computes the original CString hash modulo the actual
bucket count, writes the bucket index, and scans the bucket chain using the
original CString equality. A zero bucket count reaches DIV-by-zero, not an
empty-table fallback. Hashing reads signed bytes through the first NUL, without
reading holder length or reference metadata. CString assignment calls SetText
and remains a separate dependency of node insertion.

`native-property-type-table.ts` implements the captured find and get-or-insert
dependencies over retained table and bucket views. It admits its own node owners,
uses actual CString fields, preserves collision chains and allocates with the
original tag. Table initialization, singleton construction, class-name virtual
execution and RegisterTemplate's wrapper/value store are still separate work.

The fresh type-table constructor is implemented through its own captured reserve
body: 43 logical buckets and capacity 51, with the original zero stores. Its
returned table can insert and find retained nodes. Constructor replay is rejected.
The captured singleton constructor still needs its clear/recreate/grow sequence
and the SharedBase getter's guard bit, canonical image fields and atexit call.

The table clear implementation walks retained nodes, deletes owned value
allocations, releases each key, deletes the node, frees bucket storage, and
recreates the original 43-bucket table. Unknown ownership stops the operation
without replay. Its current tests use the original 4-byte value allocation through the
source-admitted property heap extension. That pool is now implemented locally;
RegisterTemplate's class-name virtual call and wrapper/value-store integration
remain separate dependencies.
