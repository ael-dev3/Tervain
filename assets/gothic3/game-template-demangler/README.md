# Original Game template demangler routines

Recovered from the original Game.dll with every ASM instruction checked against the PE image. This package captures getTemplateName, getTemplateArgumentList, getZName and getECSUDataType for the Status container RTTI path.

getTemplateName recognizes the question-mark/dollar prefix, consumes it, constructs three local 60-byte Replicator objects and temporarily replaces the three module replicator pointers. It parses the identifier through getZName, builds the argument list and angle brackets, conditionally adds a space before a nested closing bracket, then restores the original replicator pointers.

getTemplateArgumentList sets its module flag, handles name references, constants and primary data types, records multi-byte arguments and clears the flag on its ordinary exit. Status uses the primary enum type path.

The TypeScript demangler has not implemented these routines yet. The Status name owner currently stops at the template grammar; no completed name or cleanup registration is claimed.

Subsequent local implementation now executes the original template-name prefix: consumes the prefix, constructs and installs all three local Replicators, parses and records the identifier, and begins the argument list. The Status path stops with its actual cursor at W4 on the unimplemented primary-data-type operation. Local tables and the argument-list flag remain retained because the original normal restoration tail has not executed. No completed template name is claimed.

The next local implementation completes the selected W4 enum template argument and normal template-name return. It restores the three original replicator pointers, clears the argument-list flag, consumes the enclosing delimiters, constructs bTPropertyContainer<enum gEArenaStatus> through actual DName nodes and registers the original Status CString cleanup. Other underlying enum types, operator template names, nested template arguments and additional primary types still require their source branches. No full CRT initializer traversal or campaign completion is claimed.
