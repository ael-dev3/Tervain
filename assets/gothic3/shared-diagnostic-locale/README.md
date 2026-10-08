# Original SharedBase diagnostic locale dependencies

Recovered from SharedBase.dll and checked instruction by instruction against the original PE. The package captures LocaleUpdate100a74b6, getPerThreadData100ae542, updateThreadLocale100b1b32 and updateThreadMultibyte100b1387. These methods are source evidence and have not been connected to live SharedBase CRT thread storage.

The formatter passes NULL locale. LocaleUpdate obtains actual SharedBase per-thread data, copies both thread locale pointers, compares them with globals10141468 and10141288 and conditionally updates them when the thread ownership mask permits. It then sets bit2 at thread offset0x70 only if absent and records whether its return cleanup must clear it. A supplied locale follows a separate pointer-copy branch.

getPerThreadData calls100ae4cb and invokes amsg_exit with code0x10 on NULL. This is not an unconditional successful thread getter. Locale globals, the lower thread getter, locking and reference-count dependencies still require retained owners. Game CRT thread data must not stand in for SharedBase data.
