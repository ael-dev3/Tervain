"""Export installed Gothic 3 quest state before OnGameStartUp, without executing the game.

Source offsets are guarded by the exact original World_MCP archive member hash.
This exporter preserves INI provenance separately from native initialized state.
"""
from pathlib import Path
import argparse
import csv
import hashlib
import json
import re
import struct

from read_native_gameplay_evidence import pe_bytes

WORLD_PATH = "G3_World_01/SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}/SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}.lrentdat"
WORLD_SHA = "28f7273b3d54415b84445651a3dfa962c1ff158e9183deba81ba47e4d5d57938"
TAIL_OFFSET, TAIL_END = 234485, 256637
NATIVE_HASHES = {
    "Game": "b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f",
    "Script_Game": "2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1",
    "Script": "9375605676faaae44a50d48539a7b3995bed471e099ef573666221a044cd4e08",
    "Engine": "d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3",
    "SharedBase": "5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214",
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def file_hash(path):
    h = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(1024 * 1024):
            h.update(chunk)
    return h.hexdigest()


def hx(value):
    return f"0x{value:08x}"


def read_packets(path):
    assert file_hash(path) == WORLD_SHA, "Unreviewed original World_MCP source"
    with path.open("rb") as source:
        header = source.read(14)
        assert header[:8] == b"GENOMFLE"
        table_offset = struct.unpack_from("<I", header, 10)[0] + 4
        source.seek(table_offset)
        assert source.read(1) == b"\x01"
        strings = []
        for _ in range(struct.unpack("<I", source.read(4))[0]):
            strings.append(source.read(struct.unpack("<H", source.read(2))[0]).decode("cp1252"))
        assert source.tell() == path.stat().st_size
        source.seek(TAIL_OFFSET - 2)
        assert source.read(2) == b"\x02\x00", "Unreviewed manager class version"
        raw = source.read(TAIL_END - TAIL_OFFSET)
    position = 0

    def take(fmt):
        nonlocal position
        values = struct.unpack_from("<" + fmt, raw, position)
        position += struct.calcsize("<" + fmt)
        return values[0] if len(values) == 1 else values

    count = take("I")
    packets = []
    for packet_index in range(count):
        begin = position
        name_index, version = take("HH")
        assert version == 3, "Unreviewed quest runtime packet version"
        status = take("I")
        assert 0 <= status <= 7
        years, days, hours = take("III")
        assert take("B") == 1, "Unreviewed counter array serialization"
        counters = [take("i") for _ in range(take("I"))]
        assert take("B") == 1, "Unreviewed log pair array serialization"
        log_pairs = []
        for _ in range(take("I")):
            log_version, speaker_index, text_index = take("HHH")
            assert log_version == 1
            log_pairs.append({"version": log_version, "speakerKey": strings[speaker_index],
                              "textKey": strings[text_index], "speakerStringIndex": speaker_index,
                              "textStringIndex": text_index})
        packets.append({"id": strings[name_index], "status": status, "counters": counters,
                        "startedAt": {"years": years, "days": days, "hours": hours},
                        "logPairs": log_pairs, "packetIndex": packet_index,
                        "packetVersion": version, "nameStringIndex": name_index,
                        "packetOffset": TAIL_OFFSET + begin, "packetLength": position - begin,
                        "packetSha256": digest(raw[begin:position])})
    assert position == len(raw), "Unconsumed quest-manager runtime bytes"
    assert len({p["id"] for p in packets}) == count
    return packets, {"archive": "Projects_compiled.p00", "path": WORLD_PATH, "sha256": WORLD_SHA,
                     "entityKey": "world-2419:1", "entityName": "World_MCP",
                     "propertySet": "gCQuestManager_PS", "classVersion": 2,
                     "classVersionOffset": TAIL_OFFSET - 2, "runtimeTailOffset": TAIL_OFFSET,
                     "runtimeTailBytes": len(raw), "runtimeTailSha256": digest(raw),
                     "runtimePacketCount": count, "stringTableOffset": table_offset,
                     "stringTableEntryCount": len(strings), "sourceBytes": path.stat().st_size}


def native_evidence(study):
    specs = {
        "Game": ("Game_dll", "Game.dll", [
            (0x200364e9, "Quest constructor"), (0x20030fad, "Invalidate sets status0 and activation0"),
            (0x2002f9eb, "Reset also zeroes existing counters"),
            (0x2000bcf8, "ResetQuests iterates all quests"),
            (0x2002089c, "LoadQuestsFromInis creates fresh quest and reads its INI"),
            (0x20349f40, "QueryNewObject factory helper for gCQuest_PS"),
            (0x20030733, "Root property object clone initializes non-root with argument0"),
            (0x20344bb0, "Property initializer iterates typed default setters"),
            (0x2001d65b, "Status property's default setter invokes enum container default"),
            (0x20022ff7, "QuestStatus enum container default uses registered default value"),
            (0x2002b161, "QuestStatus container assignment copies numeric value"),
            (0x20025969, "Register enum default global from supplied default argument"),
            (0x20024965, "INI Read parses static fields/counters, not runtime Status"),
            (0x20024c67, "Manager Read loads INIs before runtime overlays"),
            (0x2001f447, "ReadRuntimeData reads status/time/counters/log pairs"),
            (0x201237e0, "Read counter array prefix/count/int values"),
            (0x20343360, "Read log pair array prefix/count/pair version/two localization strings"),
            (0x20007306, "RunQuest accepts Open0 then delegates status1"),
            (0x2001a519, "SetStatus Running captures current native clock"),
            (0x20195660, "Main-menu NewGame calls RestartWorld before Session Start0"),
            (0x2001d63d, "RestartWorld reloads/activates original dynamic layers"),
            (0x200087ab, "Session Start0 invokes OnInit then OnGameStartUp"),
            (0x20024785, "GetDeliveryCounter member offset"),
            (0x20026ac1, "GetStatus member offset"),
        ]),
        "Script_Game": ("scripts__Script_Game_dll", "scripts/Script_Game.dll", [
            (0x10002c07, "Registered OnGameStartUp callback; explicitly RunQuest Xardas_FindXardas"),
            (0x10002964, "Registered OnInit callback; other helper calls preserved as unported"),
            (0x10171250, "Register OnInit name and callback entry"),
        ]),
        "Script": ("Script_dll", "Script.dll", [(0x1000470f, "PSQuestManager RunQuest wrapper forwards to Game")]),
        "Engine": ("Engine_dll", "Engine.dll", [(0x3004089f, "Localization string stream operator delegates Read"),
                                                 (0x300126d4, "Localization string Read reads its bCString ID")]),
        "SharedBase": ("SharedBase_dll", "SharedBase.dll", [
            (0x10007036, "QueryNewObject finds registered root factory"),
            (0x10007ec8, "CloneObjectInstance invokes root clone"),
            (0x100056e6, "Clone virtual dispatch +0x38"),
        ]),
    }
    modules, methods, sources, data_evidence = [], [], set(), []
    for module, (folder, binary, entries) in specs.items():
        dll = study / "00_Original_Runtime" / binary
        data = dll.read_bytes()
        assert digest(data) == NATIVE_HASHES[module], "Unreviewed native module build: " + module
        nt = struct.unpack_from("<I", data, 0x3c)[0]
        base = struct.unpack_from("<I", data, nt + 52)[0]
        root = study / "01_Decompiled_Code" / folder
        catalog = root / "functions.csv"
        rows = {int(r["address"], 16): r for r in csv.DictReader(catalog.open(encoding="utf-8-sig"))
                if re.fullmatch(r"[0-9a-fA-F]{8}", r["address"])}
        selected = []
        for entry, meaning in entries:
            first = pe_bytes(data, entry, 5)
            body = entry + 5 + struct.unpack("<i", first[1:])[0] if first[0] == 0xe9 else entry
            row = rows[body]
            ranges = [tuple(int(part, 16) for part in item.split("-")) for item in row["body_ranges"].split(";")]
            sources.add(root / row["pseudocode_file"])
            selected.append({"id": module + ":" + hx(body), "meaning": meaning,
                             "entryVA": hx(entry), "bodyVA": hx(body), "bodyRVA": hx(body - base),
                             "entryBytes": first.hex(), "source": {"path": "01_Decompiled_Code/" + folder + "/" + row["pseudocode_file"], "line": int(row["pseudocode_line"])},
                             "bodyRanges": [{"startVA": hx(a), "endVAInclusive": hx(z),
                                             "sha256": digest(pe_bytes(data, a, z - a + 1))} for a, z in ranges],
                             "instructions": [], "_ranges": ranges})
        if module == "Game":
            selected.append({"id": "Game:0x2051c410", "meaning": "Native CRT enum registration: Open0 and default0 supplied to status enum register method",
                             "entryVA": "0x2051c410", "bodyVA": "0x2051c410", "bodyRVA": hx(0x2051c410 - base),
                             "source": {"path": "01_Decompiled_Code/Game_dll/full_disassembly.asm", "line": 1241132},
                             "bodyRanges": [{"startVA": "0x2051c410", "endVAInclusive": "0x2051c442", "sha256": digest(pe_bytes(data, 0x2051c410, 51))}],
                             "instructions": [], "_ranges": [(0x2051c410, 0x2051c442)]})
            for address, meaning in ((0x206996e4, "QuestStatus vtable +0x18 default dispatch"),
                                     (0x206996e8, "QuestStatus vtable +0x1c numeric assignment dispatch")):
                raw_pointer = pe_bytes(data, address, 4)
                data_evidence.append({"module": module, "va": hx(address), "meaning": meaning,
                                      "bytes": raw_pointer.hex(), "pointerVA": hx(struct.unpack("<I", raw_pointer)[0])})
        string_addresses = {"Game": [(0x2069abfc, "Native status0 enum registration label")],
                            "Script_Game": [(0x10213030, "Startup RunQuest name")]}.get(module, [])
        for address, meaning in string_addresses:
            raw_string = bytearray()
            while (byte := pe_bytes(data, address + len(raw_string), 1)) != b"\0":
                raw_string.extend(byte)
            data_evidence.append({"module": module, "va": hx(address), "meaning": meaning,
                                  "bytes": (raw_string + b"\0").hex(), "ascii": raw_string.decode("ascii")})
        asm = root / "full_disassembly.asm"
        sources.update((catalog, asm))
        for line_number, line in enumerate(asm.open(encoding="utf-8"), 1):
            match = re.match(r"([0-9a-f]{8}) \| ([0-9a-f]+) \| (.*)", line)
            if not match:
                continue
            address = int(match[1], 16)
            for method in selected:
                if any(a <= address <= z for a, z in method["_ranges"]):
                    native = bytes.fromhex(match[2])
                    assert pe_bytes(data, address, len(native)) == native, (module, hx(address))
                    method["instructions"].append({"va": hx(address), "bytes": match[2],
                                                   "assembly": match[3].strip(), "assemblyLine": line_number,
                                                   "sourcePEMatch": True})
        for method in selected:
            method.pop("_ranges")
            assert method["instructions"]
            method["allRecordedInstructionsMatchPE"] = True
        methods.extend(selected)
        modules.append({"path": "00_Original_Runtime/" + binary, "sha256": digest(data),
                        "bytes": len(data), "imageBase": hx(base)})
    return {"scope": "Offline source PE byte proof; no native code execution", "modules": modules, "dataEvidence": data_evidence,
            "methods": methods, "sourceReceipts": [{"path": path.relative_to(study).as_posix(),
                                                       "bytes": path.stat().st_size, "sha256": file_hash(path)} for path in sorted(sources)],
            "allRecordedInstructionsMatchPE": True,
            "instructionCount": sum(len(m["instructions"]) for m in methods)}


def assemble(study, definitions):
    packets, runtime_source = read_packets(study / "02_Unpacked_Data/Archives/Projects_compiled.p00" / WORLD_PATH)
    overlay = {packet["id"]: packet for packet in packets}
    quests = []
    assert len({definition["id"] for definition in definitions}) == len(definitions)
    for definition in definitions:
        source = definition["source"]
        original = study / "02_Unpacked_Data/Archives" / source["archive"] / source["path"]
        assert file_hash(original) == source["sha256"], definition["id"]
        fields = definition["rawFields"]
        counters = [int(value) for value in fields.get("DeliveryCounter", "").split(";") if value != ""]
        targets = [value for value in fields.get("DeliveryEntities", "").split(";") if value != ""]
        assert len(counters) == len(targets), "Unreviewed source counter/target mismatch"
        packet = overlay.get(definition["id"])
        if packet:
            # Native ReadRuntimeData copies min(runtime-count, static-count).
            for index, value in enumerate(packet["counters"][:len(counters)]):
                counters[index] = value
            status, started_at, log_pairs = packet["status"], packet["startedAt"], packet["logPairs"]
            initialization = {key: packet[key] for key in ("packetIndex", "packetVersion", "nameStringIndex", "packetOffset", "packetLength", "packetSha256")}
            initialization.update({"kind": "compiled-runtime-overlay", "sourceId": "world-2419:1", "sourceSha256": WORLD_SHA})
        else:
            status, started_at, log_pairs = 0, {"years": 0, "days": 0, "hours": 0}, []
            initialization = {"kind": "fresh-factory-and-INI", "statusEvidence": "native enum default0 and Invalidate",
                              "counterEvidence": "INI DeliveryCounter", "activationEvidence": "native Invalidate zeros activation fields"}
        quests.append({"id": definition["id"], "status": status, "counters": counters,
                       "startedAt": started_at, "logKeys": [p["textKey"] for p in log_pairs if p["textKey"]],
                       "logPairs": log_pairs, "definitionSource": source, "initialization": initialization})
    assert set(overlay) <= {q["id"] for q in quests}
    return {"schema": "gothic3-initial-quests-v1", "scope": "original-world-state-before-OnGameStartUp",
            "questCount": len(quests), "runtimePacketCount": len(packets), "quests": quests,
            "runtimeSource": runtime_source,
            "sourceAbsencePolicy": "Original INI absence remains in definition rawFields. Runtime Status0 derives from native initialization/compiled runtime, not an invented INI Status.",
            "enumLabelPolicy": "Raw numeric status values are authoritative; do not dispatch using unverified community enum labels.",
            "startup": {"explicitQuestRuns": ["Xardas_FindXardas"], "applied": False,
                        "order": ["main-menu NewGame: RestartWorld", "quest manager Read: fresh INIs then compiled runtime overlays",
                                  "Session Start0: OnInit", "Session Start0: OnGameStartUp", "OnGameStartUp: RunQuest Xardas_FindXardas"],
                        "evidenceLimit": "Direct NewGame RestartWorld-before-Start and Start OnInit-before-OnGameStartUp calls are byte-proven. The generic context/property-object virtual descent from RestartWorld to the per-class QuestManager Read is not expanded by this receipt.",
                        "unimplemented": ["Remaining native OnInit and OnGameStartUp callbacks and entity mutations must be applied separately in original order."]},
            "nativeMethods": {"constructor": "Game.dll:0x200364e9->0x20339360", "invalidate": "Game.dll:0x20030fad->0x20334fe0",
                              "iniRead": "Game.dll:0x20024965->0x20338ad0", "managerRead": "Game.dll:0x20024c67->0x20348760",
                              "runtimeRead": "Game.dll:0x2001f447->0x20339600", "sessionStart": "Game.dll:0x200087ab->0x20376690",
                              "startup": "scripts/Script_Game.dll:0x10002c07->0x100cfb70"}}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--study", type=Path, required=True)
    parser.add_argument("--definitions", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--receipt", type=Path)
    parser.add_argument("--output-receipt", type=Path)
    parser.add_argument("--research", type=Path)
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[2]
    definitions_path = args.definitions or repo / "public/gothic3/gameplay/quests.json"
    output = args.output or repo / "public/gothic3/dialogue/initial-quests.json"
    receipt_path = args.receipt or repo / "assets/gothic3/dialogue/initial-quests-receipt.json"
    output_receipt_path = args.output_receipt or repo / "assets/gothic3/dialogue/initial-quests-output.json"
    definitions = json.loads(definitions_path.read_text(encoding="utf-8"))
    seed = assemble(args.study, definitions)
    assert seed["questCount"] == 641 and seed["runtimePacketCount"] == 637
    assert all(q["status"] == 0 and not any(q["counters"]) for q in seed["quests"])
    assert all(q["startedAt"] == {"years": 0, "days": 0, "hours": 0} for q in seed["quests"])
    native = native_evidence(args.study)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(seed, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    receipt = {"schema": "gothic3-initial-quests-receipt-v1", "output": {"path": "initial-quests.json", "bytes": output.stat().st_size, "sha256": file_hash(output)},
               "generator": {"path": "tools/gothic3/read_initial_quests.py", "sha256": file_hash(Path(__file__))},
               "definitionInput": {"path": "public/gothic3/gameplay/quests.json", "sha256": file_hash(definitions_path), "questCount": len(definitions)},
               "runtimeSource": seed["runtimeSource"], "nativeEvidence": native,
               "audit": {"allDefinitionInputsMatchOriginalStudy": True, "allRuntimeTailBytesConsumed": True,
                         "questCount": 641, "compiledPacketCount": 637, "allInitialStatuses": 0,
                         "definitionStatusAbsentCount": sum("Status" not in q["rawFields"] for q in definitions),
                         "allInitialCountersZero": True, "allInitialActivationTimesZero": True,
                         "factoryOnlyQuestIds": [q["id"] for q in seed["quests"] if q["initialization"]["kind"] == "fresh-factory-and-INI"],
                         "initialLogQuestIds": [q["id"] for q in seed["quests"] if q["logPairs"]], "nativeExecution": False}}
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    output_receipt = {"schema": "gothic3-initial-quests-output-v1", "output": receipt["output"],
                      "questCount": seed["questCount"], "runtimePacketCount": seed["runtimePacketCount"],
                      "details": {"path": "assets/gothic3/dialogue/initial-quests-receipt.json", "sha256": file_hash(receipt_path)}}
    output_receipt_path.parent.mkdir(parents=True, exist_ok=True)
    output_receipt_path.write_text(json.dumps(output_receipt, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    if args.research:
        args.research.mkdir(parents=True, exist_ok=True)
        (args.research / "quest_defaults_evidence.json").write_text(json.dumps({"receipt": receipt, "quests": seed["quests"]}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(output), "receipt": receipt["output"], "nativeInstructionCount": native["instructionCount"], "audit": receipt["audit"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
