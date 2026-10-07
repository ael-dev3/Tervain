# Original Shared GUIDNull source

Offline capture of three original bodies: 74 instructions and 223 bytes. The GUIDNull initializer 100e1470 is existing ASM-only evidence (9 instructions, 45 bytes); no catalog/C gap is called recovered. __cinit and __initterm_e are contextual evidence.

The original reconstructed __initterm_e C declaration is void, while original assembly returns the callback result in EAX and __cinit tests that result. The unchanged C excerpt retains this discrepancy; assembly supplies the return and short-circuit behavior for any future owner.

Both original initializer tables retain all physical slots: C++ 214/856 bytes and C 135/540 bytes. GUIDNull occupies C++ index 132, slot 100e5210, nonzero ordinal 4 with three earlier nonzero callbacks. No callback or complete traversal is executed by this producer.

The initializer loads the first three source DWORDs, stores destination+0, loads source+12, then stores destination+4, +8 and +12. The source 100ebb28 is a file-backed 16-byte constant. Destination 101ab150 is a mutable 16-byte cold loader-zero-filled range; cold zeros do not establish live initialized state or a 20-byte bCGuid object. This initializer has no native guard, allocation, imported call, atexit registration or destructor call.

Three focused IsNull/Equals/destructor receipts are reused by pinned dependency/source references (79 instructions, 193 bytes), without duplicate bodies or excerpts. SetGuid-to-IsNull and IsNull-to-Equals native callsites remain explicit. The selected slot is a slice of its table; the focused cold payload and this receipt describe the same future canonical address.

Admission still requires a canonical Shared image registry tied to the actual RuntimePlatform, successful selected initializer execution and retained lifetime/mask checks before supplying host.guidNullPayload. Both literal-first and registry-first acquisition must resolve the same backings. Future larger image ranges require segmented resolution or an explicit unsupported overlap boundary; separately allocated TypedArray fragments cannot be enlarged/adopted into a single contiguous backing without changing identity. Mutable payloads must not be reseeded. Earlier C/C++ callbacks, whole Shared/Game CRT traversal, factory/root/accessor owners and native module creation remain outside this package.
