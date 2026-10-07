# Supplemental Game initializer recovery

These Ghidra 12.1.4 headless scripts prepare exact callback sources from the
original Game initializer tables. They require the saved Game project whose
executable SHA-256 matches the original image.

1. Produce one address per line from the nonzero C and C++ table entries.
2. Run `InspectCinitCallbacks.java` against the canonical project using
   `-process Game.dll -readOnly -noanalysis`. Its arguments are the address
   file, a new CSV output path, and expected executable SHA-256.
3. Copy both `Game_dll.gpr` and the entire `Game_dll.rep` directory to a new
   project directory. Select entries with no exact function in the inspection.
4. Run `RecoverCinitCallbacks.java` in that copy using `-process Game.dll
   -noanalysis`. Arguments: missing address file, new accepted address file,
   new recovery CSV, expected image SHA-256. It refuses overlapping function
   entries, disassembles missing instruction entries and creates exact functions.
5. Run `ExportSelectedFunctions.java` on the accepted address file in the
   same copy. Arguments: new export directory, accepted address file, expected
   image SHA-256, timeout seconds per function, workers. The captured run used
   30 seconds and three workers. Preserve `retry_functions.csv`,
   `retry_coverage.json` and `pseudocode/`.
6. Run `ExportCinitAssembly.java` in that copy using `-readOnly -noanalysis`.
   Arguments: all callback addresses, new `assembly/` export directory,
   expected image SHA-256.
7. Run `prepare_game_cinit_callbacks.py` to check these exports independently
   against the original PE image and emit the portable source package.

The observed original target set contains 2,473 distinct addresses. The saved
canonical project had 1,079 exact functions, 1,161 instruction entries without
functions and 233 undisassembled entries. Recovery created all 1,394 missing
functions and successfully decompiled every one. These counts describe this
specific image and saved project; they are not runtime implementation claims.

Use new output paths: the Java exporters refuse to overwrite existing exports.
Do not run the function recovery script against the canonical project.
