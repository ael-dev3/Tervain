# Original Arena property registration dependencies

Recovered from the original SharedBase.dll, with every instruction verified against the PE image by the producer. This package is source evidence; it does not execute the Game initializer.

The first Game initializer at 204b1dd0 constructs the Status descriptor at 207b5038, obtains the Arena type, invokes Create and registers the property.

GetPropertyTemplateIndex (100042e6 -> 10087e80) invokes the descriptor virtual slot +0x10 and both type class-name virtual slots before CString comparison at 10002eb9. Even an empty property array cannot skip these calls.

Registration (10006feb -> 10088130) uses the actual index result, grows the pointer array through 100013ed, stores the descriptor and invokes its name slot +0x0c, type-name getter 10006e83 and Message.Debug 10005e8e. Duplicate registration follows the warning branch 10007ca7.

Unregistration (1000206d -> 10087f80) shares the same lookup dependency. Its absent-index return is available only after the lookup calls complete.

Remaining owners include the Game descriptor virtual dispatch, CString comparison, array growth and diagnostic calls. Full CRT initialization, NPC activation and campaign completion remain unfinished.

The diagnostic dependencies are now recovered: Debug100498f0 always loads static TLS through FS:0x2c and index102f6480, formats at thread offset0x108 using vsprintf100a7f27 and its core100a7eab, then obtains MessageAdmin and calls OnMessage10049510. The source PE TLS directory at100f5e70 describes template10301000..103016d4 and callbacks100e5780. Captured template bytes do not establish a loader-assigned TLS slot or an active thread block. OnMessage checks the signed filter field at+0x1c, then uses the critical section and dispatches three priority levels when admitted. Formatter100b5355, static TLS ownership and full OnMessage dispatch remain implementation dependencies.

The original output formatter100b5355 is now captured and byte-verified: 769 instructions and 2420 instruction bytes. Its complete source includes locale-dependent scanning and formatting branches. The existing x86 thread model owns FS:0 exception state but does not yet provide the static TLS vector at FS:0x2c required by Debug. Both that thread storage and the formatter remain required before diagnostic return; neither is replaced by a synthesized log string or a skipped call.

The PE image supplies a zero-filled initial TLS index at `102f6480` and a NULL first callback-table entry at `100e5780`. The producer captures both four-byte values. The initial index is image state; a loader must assign its module slot. The NULL terminator establishes that this original TLS directory contains no callback entries. DLL attach and CRT initialization remain separate requirements.
