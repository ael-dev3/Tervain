# Original Arena Status descriptor

This source-only package recovers the six original Game.dll vtable slots at 20659aec plus Create and the storage-reset routine. Every captured instruction is checked against the original PE image.

The 36-byte cold descriptor at 207b5038 is zero initialized. The source literal at 20657534 is Status. The initializer later writes the Arena owner at offset 24, field offset 20 at offset 28 and NULL default storage at offset 32.

Virtual slot +0x10 reads the owner at offset 24. Virtual slot +0x0c reaches the separate cached type-name routine at 2006e520: cache 207b4f58, guard 207b4f60, prior pointer 207b5020, RTTI 20797e58 and cleanup entry 200064f1. This must retain its own actual CString and cleanup ownership.

Create invokes the SharedBase destruction method, resets the actual storage slot and unregisters the descriptor from its actual owner. The non-NULL reset path has further clear, free and delete dependencies; it is not implemented by this source capture.

No full CRT traversal, live NPC activation or campaign completion is established here.
