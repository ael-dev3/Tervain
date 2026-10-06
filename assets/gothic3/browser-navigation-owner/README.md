# Navigation application and notification source receipts

This package pins selected original Game, Engine and SharedBase functions for
Navigation attachment. All 1,403 instructions across 31 method receipts match
the original PE files, including complete selected body extents. The producer
uses saved function catalogs to locate reconstructed C and assembly; it
executes no native code and captures no live process state.

## Reproduce

```powershell
python -B tools/gothic3/prepare_browser_navigation_owner_source.py --study '<LOCAL_DESKTOP_STUDY>'
```

The study must contain the original three DLLs and their saved function
catalogs, assembly and reconstructed C. Runtime rules identify entry aliases,
concrete bodies, hashes and cold module storage. The source manifest pins
generated files and producer dependencies.

Generated C excerpts remove trailing line whitespace and use LF line endings
with a final newline. Each method records that normalization and the resulting
excerpt hash; the catalog still identifies and hashes its original source file.

## Runtime scope

The browser application owner preserves the original session cache guard and
pointer, strict initialization test, repeated getter calls and live session
mode read. Browser module lookup and mode storage are explicit platform
substitutions; the surrounding native application and session are not rebuilt
by this component.

The Navigation override preserves the false notification branch between two
owner reads. Area transitions need actual proxy, CString, property set,
contact and ScriptAdmin services. A loaded source area definition cannot
supply those capabilities. Constructed area admission and caller-owned live
lookup remain prerequisites. Unsupported calls retain their applied writes
and temporary lifetimes.

See [checkpoint 79](../../../docs/engineering/gothic3-rebuilding-process.md#79-preserve-navigation-attachment-notifications-and-live-area-ownership)
for integration limits and checks.
