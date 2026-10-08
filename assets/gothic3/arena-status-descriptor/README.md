# Original Arena Status descriptor

This source-only package recovers the six original Game.dll vtable slots at 20659aec plus Create and the storage-reset routine. Every captured instruction is checked against the original PE image.

The 36-byte cold descriptor at 207b5038 is zero initialized. The source literal at 20657534 is Status. The initializer later writes the Arena owner at offset 24, field offset 20 at offset 28 and NULL default storage at offset 32.

Virtual slot +0x10 reads the owner at offset 24. Virtual slot +0x0c reaches the separate cached type-name routine at 2006e520: cache 207b4f58, guard 207b4f60, prior pointer 207b5020, RTTI 20797e58 and cleanup entry 200064f1. This must retain its own actual CString and cleanup ownership.

Create invokes the SharedBase destruction method, resets the actual storage slot and unregisters the descriptor from its actual owner. The non-NULL reset path has further clear, free and delete dependencies; it is not implemented by this source capture.

No full CRT traversal, live NPC activation or campaign completion is established here.

The local NativeGameArenaStatusClassName owner now retains the physical cache and prior-result slots and invokes the actual Game type-info owner. Its cold execution reaches the existing demangler boundary: Unowned getZName template grammar. Guard bits 1 and 2 remain set, with no CString or cleanup callback claimed. The template grammar must be reconstructed before name creation and property lookup can complete.

Subsequent local implementation now executes the original template-name prefix: consumes the prefix, constructs and installs all three local Replicators, parses and records the identifier, and begins the argument list. The Status path stops with its actual cursor at W4 on the unimplemented primary-data-type operation. Local tables and the argument-list flag remain retained because the original normal restoration tail has not executed. No completed template name is claimed.

The next local implementation completes the selected W4 enum template argument and normal template-name return. It restores the three original replicator pointers, clears the argument-list flag, consumes the enclosing delimiters, constructs bTPropertyContainer<enum gEArenaStatus> through actual DName nodes and registers the original Status CString cleanup. Other underlying enum types, operator template names, nested template arguments and additional primary types still require their source branches. No full CRT initializer traversal or campaign completion is claimed.
