# Property-registration output entry

The package also captures the complete formatter and LocaleUpdate instructions,
plus `write_char` (`100b5289`), `write_multi_char` (`100b52bc`) and
`write_string` (`100b52e0`). Original PE bytes retain the classification/transition
region at `100ede50` and the eight-entry dispatch table at `100b5cc9`.
Each table has its own SHA-256. Generated exports freeze all bodies and tables
after exact JSON admission. Independent source and runtime regeneration is
byte-identical; four focused checks and typechecking pass. Capturing these
bodies does not execute the unfinished formatter output loop.

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
Without completed SharedBase CRT thread prerequisites, the PTD call stays
pending. A local combined startup check now completes the existing SharedBase
helper first, admits its restored stack for Game I/O, and reaches Status with
the production memory pools. Its diagnostic LocaleUpdate uses the canonical
installed PTD and existing recovered locale implementation. The receiver holds
the actual PTD, locale and multibyte pointers; its cleanup flag is one and the
PTD thread-locale flag has bit two set. Formatting stops at `100b53b0`.
No formatter return or diagnostic dispatch is synthesized. Nine focused checks
and typechecking validate this local integration; production ordering remains
pending.
