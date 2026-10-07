# Original property object constructors

Captured from the pinned local SharedBase.dll, with forwarding entries and every
instruction checked against original bytes. Reproduce with:

```sh
python tools/gothic3/prepare_property_object_constructors.py --study PATH_TO_STUDY --output assets/gothic3/property-object-constructors
```

The object-type constructor initializes its CString and empty template array,
then changes only bit 0 at offset 20. The named factory constructor writes a
WORD at offset 16, preserves bytes 18-19, and copies the name holder at offset 20
with its original WORD reference increment, including allocated-empty strings.

The TypeScript support does not execute Game singleton initialization, register
property templates, or establish live native call frames.
