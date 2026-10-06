# Original Focus construction and Hero reading

This namespace reconstructs the bounded fresh `gCFocus_PS` factory and the
original `PC_Hero` packet 12 over one 408-byte allocation with 80 reflected
fields. Its native selector is 59 and version 44. Physical byte masks preserve
unknown heap addresses, enum globals, vector constructor bits and padding.
The base object, fields, embedded CurrentEntity proxy and candidate pointer
retain their actual store and capability identities. These are source
components; the browser application does not invoke this reader yet.

The concrete constructor, virtual Create/Attach, descriptor defaults,
PostInitialize, Invalidate and current packet read preserve source ordering.
Each temporary enum retains the real 8-byte reused stack slot through its
base/typed vtable writes, scalar copy and base destruction. Focus Enter uses
the inherited second owner.Modified read. Focus Exit overrides OnNotifyExit
with literal 1, so only its outer owner read occurs. CurrentEntity's descriptor
default resolves its member and does not clear it. Its proxy ID/internal
slots alias the same allocation, with GUID16 equality and cache-DWORD rules.

The three module-global enum values require current masked host words, never
the original PE's file initializers as assumed live defaults. Candidate Free
requires the actual captured allocator service before clearing its header.
Process checks DrawFocusName byte for strict 1 before the actual scene search;
FindFocusEntity needs live scene/picking/interaction services. PostProcess
clears the same look vector before inherited empty processing. Terminal
destruction, entity residency and complete focus selection remain unresolved.
Unknown services stop at their call site with their applied prefix retained.

The offline producer checks immutable Game/Engine/SharedBase hashes and all
selected instruction bytes, vtable slots, registrar order, descriptor stores,
readonly literal words, ordered store plans and the original 1,140-byte Hero
packet. Audited supporting bodies may be captured without being implemented.
Assembly capture selects complete inclusive catalog body ranges by global VA,
including discontiguous ranges and excluding adjacent functions. Each range
has exact instruction-byte coverage and an original PE byte hash. Historical
receipts retain their originally recorded source and collection method.
No original native code is loaded or executed. No tests, build, browser,
deployment or playthrough is run by the producer. An implementation receipt
pins current source, imported Python helpers and all owned namespace output.

Reproduce at this recorded source revision:

```powershell
python -B tools/gothic3/research_focus_reading.py --study $study
```
