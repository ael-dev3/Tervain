# Original Game template demangler routines

Recovered from the original Game.dll with every ASM instruction checked against the PE image. This package captures getTemplateName, getTemplateArgumentList, getZName and getECSUDataType for the Status container RTTI path.

getTemplateName recognizes the question-mark/dollar prefix, consumes it, constructs three local 60-byte Replicator objects and temporarily replaces the three module replicator pointers. It parses the identifier through getZName, builds the argument list and angle brackets, conditionally adds a space before a nested closing bracket, then restores the original replicator pointers.

getTemplateArgumentList sets its module flag, handles name references, constants and primary data types, records multi-byte arguments and clears the flag on its ordinary exit. Status uses the primary enum type path.

The TypeScript demangler has not implemented these routines yet. The Status name owner currently stops at the template grammar; no completed name or cleanup registration is claimed.
