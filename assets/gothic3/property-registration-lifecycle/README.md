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
