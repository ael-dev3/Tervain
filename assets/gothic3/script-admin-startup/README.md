# Original ScriptAdmin static-startup source

Offline capture of 98 original bodies, 2552 instructions and 7146 instruction bytes. Every selected body extent and byte is checked against the immutable original PE. The Shared singleton cleanup is existing ASM-only evidence; no C or ASM gap is called recovered.

Game CRT owns the original callbacks, their real table order and canonical Game image ranges. This package captures the Game wrapper/type/clone graph, Shared accessor/template/factory graph and selected native constructor/processing/map continuation. Vtable bytes, decimal slot offsets, import/export thunk chains and class-name aliases are explicit receipts.

The selected factory constructor/destructor access a 24-byte prefix. The factory start is 36 bytes before its guard; the remaining 12 bytes are unclassified. Neither extent establishes the complete factory sizeof. The canonical type/factory/guard capture remains 64 bytes.

GUID SetData calls reuse three existing NPC/RuntimeAdmin bodies (101 instructions, 365 bytes). Their actual CALL sites and seven JMP alias hops are captured separately: Malloc 10003cd8 -> 10020b00 -> 10007441 -> 1003d410; GetInstance 10002aae -> 10020bf0; Free 10002112 -> 10020af0 -> 10005b69 -> 1003cb50. The reused bodies do not increase the 98 focused-body or 2552 instruction totals.

These receipts do not execute or implement DLL startup. Earlier callbacks, actual allocations, string storage, descriptor/base-type owners, cleanup paths and platform services remain required. GUID text conversion has exact source receipts and import identities; no Win32/OLE call is executed.
