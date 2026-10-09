# Property-registration output entry

The producer verifies the matching SharedBase binary and full formatter and
LocaleUpdate bodies, then captures the formatter's 25 entry instructions through
the pending call `100b53ab -> 100a74b6`. The generated source getter admits the
exact JSON bytes and freezes the selected evidence.

`NativeSharedMessageDebug` translates the entry's local frame separately from
the Game startup stack. The actual FILE, format and varargs inputs are retained.
Saved caller-register bits remain unknown. Cookie XOR EBP is an opaque retained
expression over the canonical cookie image and relative frame; no absolute
stack address is assigned. The locale object's 16 bytes remain uninitialized,
and LocaleUpdate has not executed. Formatting, termination, dispatch and return
remain incomplete.

Reproduce from the repository root with the matching local study directory:

```powershell
python tools/gothic3/prepare_registration_output_source.py --study 'C:/Users/heyas/OneDrive/Рабочий стол/Gothic3_Decompiled_Study_2026-10-04' --output assets/gothic3/registration-output/source.json --runtime-output src/gothic3/native-registration-output-source.ts
```

Eight focused checks across the startup and Status-property files pass. The
continuation has not received full-suite, production-browser or deployment
validation.
## Locale entry continuation

The source package now also retains the seven original LocaleUpdate entry
instructions through `100a74c5 -> 100ae542`. The translated callee retains the
actual formatter return capability, NULL locale argument and saved ESI value.
It writes zero to receiver byte 12. The other receiver bytes remain unknown.
The PTD call is pending: browser startup has not completed the SharedBase CRT
thread prerequisites. No PTD, locale pointers, formatter return or diagnostic
dispatch is synthesized.
