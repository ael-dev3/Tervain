# Original campaign ending evidence

This capture identifies original ending records and native `EndGame` behavior. It does not execute an ending or establish that a browser campaign can reach one.

## Sources verified

The generator verifies 12 ending-related INI info records against the installed study's Infos archive manifests and original extracted bytes. It also checks their source hashes and commands against both repository info catalogs. Archive selection follows `Infos.pak`, `Infos.p00`, then `Infos.p01`; deletion entries require a separate review.

`BPANKRATZ31835`, owned by `PC_Hero`, requires `Epilog_EndGameInfo`. Its command at index 11 is `EndGame`; index 12 records `ClearGameEvent` for that event. The evidence does not assume the latter command runs after application termination.

| Branch event | Original source records producing it |
| --- | --- |
| `Epilog_Adanos` | `FILLER35`, `SKALVERAM3174` for owner `Adanos_Gate`, quest `Adanos_OpenGate` |
| `Epilog_Beliar` | `SKALVERAM3199` for owner `Beliar_Tester`, quest `Beliar_Contact` |
| `Epilog_Innos` | `SKALVERAM3210` for owner `Innos_Tester`, quest `Innos_Contact` |

The receipt retains each record's actual conditions, commands and source line references, including the four first epilog infos that set `Epilog_EndGameInfo`. Three additional branch-event records use owner `sh`. Their catalog presence does not demonstrate an ordinary reachable campaign route.

The native command lookup maps `EndGame` to opcode 49. The original Script_Game.dll hash is `2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1`. Its dispatcher starts at `100dbb80`; the ending case spans `100ddcc7` through `100ddd2c` exclusive. All 27 instructions (101 bytes) are checked against the original PE. The matching decompiled case calls `PlayVideo` with `G3_Credits.bik`, then `G3_Credits2.bik`, and calls `eCMessageHandler::Terminate` with true. The two resource-name literals are checked against the PE as well.

## Reproduce

```powershell
python tools/gothic3/prepare_campaign_ending_evidence.py --study 'C:/path/to/Gothic3_Decompiled_Study_2026-10-04'
```

Use `--output` to regenerate into a separate file and compare it byte-for-byte with `source-evidence.json`.

## Remaining implementation and proof

Live info activation, availability checks, actor/world state, quest prerequisites, asynchronous speech and wait completion, epilog pictures/subtitles/music, video playback and final application state still need integration and verification. The generator supplies no successful runtime result and forces no events or quests. Referenced quest definitions are evidence for dependencies; they do not prove the quests were played.

Full completion requires a new game played through a source-backed ending, with a campaign save restored in a fresh browser session on the deployed revision. See [campaign completion criteria](../../../docs/engineering/gothic3-campaign-completion.md).
