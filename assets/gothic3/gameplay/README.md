# Original Gothic 3 gameplay import

This is an offline compiler for the verified local build. It reads original resource bytes and reconstructed native pseudocode/instructions. It does not execute game binaries, and generated catalogs do not themselves implement combat, AI, quests, dialogue or endings.

## Reproduction

Use Python3.10+ and the completed local study folder. Its `02_Unpacked_Data/_metadata/effective_layers.json` and `00_Original_Runtime`, `01_Decompiled_Code` folders must be present.

```powershell
python tools/gothic3/export_gameplay.py --study '<LOCAL_DESKTOP_STUDY>'
python tools/gothic3/assemble_initial_player.py --study '<LOCAL_DESKTOP_STUDY>'
python tools/gothic3/repack_gameplay.py --refresh-receipts-only
```

Check the initial-player helper's help for its current arguments. Source files are read-only. The full raw world/template audit defaults to a workspace sibling `gothic3_gameplay_raw`, outside this repository. The compiler rejects a raw-audit destination inside the repository. The earlier one-time migration helper `repack_gameplay.py --study ...` repairs and repacks an existing uncompressed completed export; ordinary fresh reproduction uses `export_gameplay.py`.

## Hosted data

- `public/gothic3/gameplay/quests.json` and `infos.json` retain full INI records, including raw fields and parser issues. `runtime/quests.json` and `runtime/infos.json` contain the same normalized values without duplicate raw INI records.
- Localization preserves all five original languages as `{text,stageDirection}` pairs. Empty original text remains empty; no silent language fallback.
- Every selected source has an archive, logical path and SHA256. Selection follows the study's static effective-layer candidate index. Zero-byte patches and incompletely finalized originals are explicitly unsupported, rather than assumed to be empty playable worlds.
- World source descriptors reference ordered compressed entity chunks. Their small indices map native GUID/name/position to the exact data chunk. Geometry-only entity identities remain in the source indices. Positions and matrices retain native centimetres and native axes.
- World/template runtime property sets contain `{name,version,values,unknownProperties?,duplicateProperties?,tail?}`. Numeric enum values are preserved. Original type names, enum labels, serializer offsets and raw bytes remain in the local audit. All decoded gameplay properties are preserved; unresolved values remain null with explicit status. Visual/physics property sets belong to the separate scene/world import, not this gameplay transport.
- Gzip files have compressed and decompressed byte counts and SHA256 hashes. Every compressed JSON file is bounded to4MiB decompressed. The index descriptors themselves are gzip files containing chunk references, not enormous entity arrays.

## Native behavior evidence

`native-command-table.json` reconstructs all54 native dispatch entries and compares actual source command spellings case insensitively. The original `SuccessQuest` typo remains unrecognized; it is not silently converted to `SucceedQuest`. Empty positional command rows and source vector mismatches are retained.

`native-gameplay-evidence.json` contains native script registrations, function navigation, actual module/assembly/pseudocode hashes and verified startup instruction bytes. `entity-semantics.json` documents reviewed property serializers and their unknown cases. `native-semantics.json` documents quest transitions, reward callback context, info predicates and lifecycle effects; unsupported behavior remains explicit.

The initial-player seed applies the reviewed serialized PC_Hero fields and the proven startup operations. It does not claim a captured running game or equivalence with unported NPC/enclave notifications, world loading, template inheritance and subsequent callbacks. Script labels reconstructed from registration strings are original labels, not original source code.
