# Original Attribute and Stat reading

This bounded detached reconstruction pins the real gCAttribute and gCStat
factory/descriptor paths, their 24/32-byte tag-0xc4 allocations, 16-byte
tag-0x190 wrapper clones, inherited fields and exact registration order.
Tag is an owned CString; integer reflected defaults are 0xffffffff.
Native virtual ApplyDefaults then writes Tag empty, Modifier 0 and Value 100;
the Stat override also writes BaseMaximum 100 and MaximumModifier 0 before
forwarding to the Attribute implementation. The actual accessor metadata
base for Attribute is NULL after the bCObjectRefBase sentinel comparison;
Stat resolves the real registered Attribute root.
The selected factories retain one physical object and propagate descriptor
callbacks through its actual wrapper and native references. Frontend use
requires actual allocation, CString, accessor, reference and terminal lifetime
services at the captured boundaries. Successful construction is detached and
does not establish world residency or complete progression.

The Stat CRT bootstrap 20526910 is absent from functions.csv and the full
assembly study. Its complete original PE extent 20526910–2052695a (75 bytes)
is checked separately, with exact root/vtable/type/init/atexit byte slices.
It is explicitly a PE-only proof, with no invented CSV or decompiled body.
Every cataloged body uses complete inclusive original ranges, including
discontiguous ranges, and every instruction is checked against original PE
bytes. Captured source entry counts are not implemented feature counts.

Reproduce with `python -B tools/gothic3/research_attribute_reading.py --study
$study --capture-only` while runtime work is active. Omit --capture-only only
after the runtime source is frozen; that receipt pins current runtime,
producer/imported helpers/dependencies and all owned outputs, excluding
receipts themselves. No native code, tests, build, browser or remotes run.
