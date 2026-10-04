#!/usr/bin/env python3
"""Assemble the supported new-game effects from original serialized data.

This reads the lossless local exports and the verified native startup call list.
It does not execute the game or claim that unported native callbacks ran. The two
small hosted documents retain source offsets, source hashes and native evidence.
"""
from __future__ import annotations

import argparse
import copy
import gzip
import hashlib
import json
import re
from pathlib import Path
from typing import Any


SETTERS = {
    "SetHitPointsMax": ("HP", "BaseMaximum"),
    "SetHitPoints": ("HP", "Value"),
    "SetManaPointsMax": ("MP", "BaseMaximum"),
    "SetManaPoints": ("MP", "Value"),
    "SetStaminaPointsMax": ("SP", "BaseMaximum"),
    "SetStaminaPoints": ("SP", "Value"),
    "SetStrength": ("STR", "Value"),
    "SetDexterity": ("DEX", "Value"),
    "SetIntelligence": ("INT", "Value"),
    "SetSmithing": ("SMT", "Value"),
    "SetTheft": ("THF", "Value"),
    "SetAlchemy": ("ALC", "Value"),
    "SetProtectionBlades": ("PROT_BLADE", "Value"),
    "SetProtectionImpact": ("PROT_IMPACT", "Value"),
    "SetProtectionMissile": ("PROT_MISSILE", "Value"),
    "SetProtectionFire": ("PROT_FIRE", "Value"),
    "SetProtectionIce": ("PROT_ICE", "Value"),
    "SetProtectionLightning": ("PROT_LIGHTNING", "Value"),
}

# These are original native bodies, not reconstructed implementations.
NATIVE_METHODS = {
    "assureItems": ("Script_dll", "functions_00004.c", "10003c65"),
    "assureItemsEx": ("Script_dll", "functions_00005.c", "10004890"),
    "templateCreate": ("Script_dll", "functions_00006.c", "10004c6e"),
    "registerTemplateName": ("Engine_dll", "functions_00034.c", "30020cc0"),
    "templateByName": ("Engine_dll", "functions_00068.c", "3004147f"),
    "attributeSetValue": ("Game_dll", "functions_00055.c", "20035026"),
    "attributeSetBaseValue": ("Game_dll", "functions_00025.c", "2001808e"),
    "statSetMaximum": ("Game_dll", "functions_00049.c", "2002ee33"),
    "memorySetValue": ("Game_dll", "functions_00037.c", "20023cd6"),
    "memorySetBaseValue": ("Game_dll", "functions_00029.c", "2001c0a3"),
    "memorySetMaximum": ("Game_dll", "functions_00048.c", "2002e064"),
    "stackDefaults": ("Game_dll", "functions_00011.c", "2000af88"),
    "stackConstructor": ("Game_dll", "functions_00051.c", "2003147b"),
    "stackSetLearned": ("Game_dll", "functions_00021.c", "20014849"),
    "inventoryCreateItems": ("Game_dll", "functions_00022.c", "2001563b"),
    "inventoryCreateItemsInternal": ("Game_dll", "functions_00083.c", "201cfc00"),
    "inventoryNewStack": ("Game_dll", "functions_00083.c", "201c92b0"),
    "clockRead": ("Game_dll", "functions_00037.c", "20023e7a"),
    "clockSetFromProperties": ("Game_dll", "functions_00007.c", "20007090"),
    "clockProcess": ("Game_dll", "functions_00039.c", "20025a13"),
}
MODULES = {"Game_dll": "Game.dll", "Engine_dll": "Engine.dll", "Script_dll": "Script.dll", "scripts__Script_Game_dll": "scripts/Script_Game.dll"}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_json(path: Path) -> Any:
    data = path.read_bytes()
    if path.suffix == ".gz":
        data = gzip.decompress(data)
    return json.loads(data)


def read_index(gameplay: Path, family: str, collection: str) -> list[dict]:
    path = gameplay / family / "index.json.gz"
    if not path.exists():
        path = path.with_suffix("")
    data = read_json(path)
    if isinstance(data, list):
        return data
    if "chunks" in data:
        result = []
        for chunk in data["chunks"]:
            part = read_json(gameplay / chunk["url"])
            result.extend(part if isinstance(part, list) else part[collection])
        return result
    return data[collection]


def values(record: dict) -> dict:
    """Keep the final named values; exact duplicate records stay in evidence."""
    return {prop["name"]: copy.deepcopy(prop.get("value")) for prop in record["properties"]}


def property_evidence(record: dict) -> list[dict]:
    return [{"name": p["name"], "type": p["type"], "value": p.get("value"),
             "sourceOffset": p.get("serialization", {}).get("sourceOffset"),
             "byteLength": p.get("byteLength"), "raw": p.get("raw"),
             "status": p.get("status")} for p in record["properties"]]


def property_set(entity: dict, name: str) -> dict:
    records = [p for p in entity["propertySets"] if p["name"] == name]
    if len(records) != 1:
        raise ValueError(f"{entity['name']}: expected one {name}, got {len(records)}")
    return records[0]


class NativeEvidence:
    def __init__(self, study: Path):
        self.base = study / "01_Decompiled_Code"
        self.files: dict[Path, str] = {}
        self.records: dict[str, dict] = {}

    def method(self, key: str, module: str, filename: str, va: str) -> str:
        path = self.base / module / "pseudocode" / filename
        if path not in self.files:
            self.files[path] = path.read_text(encoding="utf-8")
        text = self.files[path]
        pattern = re.compile(r"/\* ENTRY " + re.escape(va.removeprefix("0x")) + r" \|[^\n]+", re.I)
        found = pattern.search(text)
        if not found:
            raise ValueError(f"Missing native evidence {module}/{filename} at {va}")
        end = text.find("/* ENTRY ", found.end())
        body = text[found.start(): end if end >= 0 else len(text)].rstrip()
        coverage = read_json(self.base / module / "coverage.json")
        self.records[key] = {
            "module": MODULES[module], "inputSha256": coverage.get("sha256"),
            "entryVA": "0x" + va.removeprefix("0x").lower(),
            "decompiledFile": f"01_Decompiled_Code/{module}/pseudocode/{filename}",
            "sourceLine": text[:found.start()].count("\n") + 1,
            "fileSha256": sha256(path.read_bytes()),
            "bodySha256": sha256(body.encode("utf-8")),
            "bodyLineCount": body.count("\n") + 1,
        }
        return body

    def known(self, key: str) -> str:
        return self.method(key, *NATIVE_METHODS[key])

    def memory_setter(self, name: str, tag: str, field: str) -> str:
        # Locate the exported setter rather than infer the tag from its name.
        module = "Script_dll"
        for path in sorted((self.base / module / "pseudocode").glob("functions_*.c")):
            if path not in self.files:
                self.files[path] = path.read_text(encoding="utf-8")
            found = re.search(r"/\* ENTRY ([0-9a-f]+) \| PSPlayerMemory::" + re.escape(name) + r" \|", self.files[path], re.I)
            if found:
                key = "memory." + name
                body = self.method(key, module, path.name, found.group(1))
                operation = "SetMaximum" if field == "BaseMaximum" else "SetBaseValue"
                if f'"{tag}"' not in body or f"gCPlayerMemory_PS::{operation}" not in body:
                    raise ValueError(f"Native setter {name} does not establish {tag}/{operation}")
                return key
        raise ValueError(f"Native PSPlayerMemory::{name} not found")


class Templates:
    def __init__(self, gameplay: Path, raw: Path):
        self.gameplay, self.raw = gameplay, raw
        self.index = read_index(gameplay, "templates", "headers")
        self.files = {f["index"]: f for f in read_json(gameplay / "templates/files.json")}
        self.cache: dict[int, dict] = {}
        self.definitions: dict[str, dict] = {}

    def entity(self, entry: dict) -> dict:
        number = entry["file"]
        if number not in self.cache:
            self.cache[number] = read_json(self.raw / "templates" / f"{number:04}.json")
        return self.cache[number]["entities"][entry["header"]]

    def resolve(self, *, name: str | None = None, guid: str | None = None) -> dict:
        candidates = [e for e in self.index if (e["name"] == name if name is not None else e["guid"] == guid)]
        selected, rejected = [], []
        for entry in candidates:
            entity = self.entity(entry)
            header = entity["templateHeader"]
            reason = "deleted" if header.get("deleted") else "helperParent" if header.get("helperParent") else "instanceReference" if header.get("refTemplate") else None
            if reason:
                rejected.append({"file": entry["file"], "header": entry["header"], "guid": entry["guid"], "reason": reason})
            else:
                selected.append((entry, entity))
        if len(selected) != 1:
            raise ValueError(f"Ambiguous live template {name or guid}: {len(selected)} definition headers")
        entry, entity = selected[0]
        identity = entity["guid"]
        if identity not in self.definitions:
            header = entity["templateHeader"]
            item = next((c for c in entity["propertySets"] if c["name"] == "gCItem_PS"), None)
            interaction = next((c for c in entity["propertySets"] if c["name"] == "gCInteraction_PS"), None)
            item_values = values(item) if item else {}
            self.definitions[identity] = {
                "name": entity["name"], "guid": identity, "file": entry["file"],
                "header": entry["header"], "dataChunk": self.files[entry["file"]]["url"],
                "source": entity["source"], "sourceOffset": entity["sourceOffset"],
                "deleted": header.get("deleted"), "helperParent": header.get("helperParent"),
                "refTemplate": header.get("refTemplate"),
                "inheritance": {"status": "not-flattened", "reason": "No inferred inheritance or template patching is applied."},
                "item": {key: value for key, value in item_values.items() if key in (
                    "Amount", "Quality", "GoldValue", "MissionItem", "Permanent", "Category", "Texture",
                    "ItemWorld", "ItemInventory", "ArmorSet", "Spell", "Skill")},
                "useType": values(interaction).get("UseType") if interaction else None,
                "propertySetNames": [c["name"] for c in entity["propertySets"]],
                "resolution": {"status": "unique-live-definition", "rejectedCandidates": rejected,
                               "evidenceRefs": ["registerTemplateName", "templateByName", "templateCreate"]},
            }
        return self.definitions[identity]


def read_first_named_entity(path: Path, name: str) -> dict | None:
    """Stream a source document; never materialize the multi-GB SysDyn export."""
    decoder = json.JSONDecoder()
    with path.open(encoding="utf-8") as stream:
        buf = stream.read(65536)
        marker = buf.find('"entities"')
        if marker < 0:
            raise ValueError(f"No entities array in {path.name}")
        offset = buf.index("[", marker) + 1
        while True:
            while True:
                while offset < len(buf) and buf[offset].isspace():
                    offset += 1
                if offset < len(buf) and buf[offset] == "]":
                    return None
                try:
                    entity, offset = decoder.raw_decode(buf, offset)
                    break
                except json.JSONDecodeError:
                    chunk = stream.read(65536)
                    if not chunk:
                        raise ValueError(f"Truncated JSON entities array in {path.name}")
                    buf += chunk
            if entity["name"] == name:
                return entity
            while offset < len(buf) and buf[offset].isspace():
                offset += 1
            if offset < len(buf) and buf[offset] == ",":
                offset += 1
            # Discard already decoded entities, keeping memory bounded.
            buf, offset = buf[offset:], 0


def assemble_initial_player(raw: Path, gameplay: Path, study: Path) -> tuple[dict, dict]:
    native = NativeEvidence(study)
    bodies = {key: native.known(key) for key in NATIVE_METHODS}
    if "IsDeleted" not in bodies["registerTemplateName"] or "if (!bVar2)" not in bodies["registerTemplateName"]:
        raise ValueError("Native template name registration guard changed")
    if "offset_0x18 = 0;" not in bodies["stackDefaults"] or "offset_0x18 = *param_1;" not in bodies["stackSetLearned"]:
        raise ValueError("Native Learned default/field mapping changed")
    people_path = raw / "initial/ardea-people.json"
    people = read_json(people_path)
    people = people if isinstance(people, list) else people["entities"]
    heroes = [e for e in people if e["name"] == "PC_Hero"]
    if len(heroes) != 1:
        raise ValueError(f"Expected one PC_Hero, got {len(heroes)}")
    hero = heroes[0]
    memory_record = property_set(hero, "gCPlayerMemory_PS")
    inventory_record = property_set(hero, "gCInventory_PS")
    damage_record = property_set(hero, "gCDamageReceiver_PS")
    memory_serialized = values(memory_record)
    memory = copy.deepcopy(memory_serialized)
    attribute_records = memory_record["tail"]["value"]["attributes"]
    serialized_attributes = {a["key"]: {"class": a["record"]["name"], "values": values(a["record"]),
        "sourceOffset": a["sourceOffset"], "propertyEvidence": property_evidence(a["record"])} for a in attribute_records}
    attributes = copy.deepcopy(serialized_attributes)
    startup_path = gameplay / "initial/native-startup.json"
    startup = read_json(startup_path)
    events = []
    calls = [call for call in startup["attributeSetterCalls"] if call["function"] in SETTERS]
    if len(calls) != len(SETTERS) or {call["function"] for call in calls} != set(SETTERS):
        raise ValueError("Expected the 18 proven startup attribute setters")
    for number, call in enumerate(calls):
        name, desired = call["function"], call["value"]
        tag, field = SETTERS[name]
        body = native.method("startup." + name, "scripts__Script_Game_dll", "functions_00003.c", call["bodyVA"])
        if "PSPlayerMemory::" + name not in body:
            raise ValueError(f"Startup helper {name} does not call the matching player-memory setter")
        setter_evidence = native.memory_setter(name, tag, field)
        target = attributes[tag]["values"]
        modifier_name = "MaximumModifier" if field == "BaseMaximum" else "Modifier"
        before = target[field]
        target[field] = desired - target[modifier_name] if field == "BaseMaximum" else desired
        event = {"index": number, "kind": "setPlayerStat", "tag": tag, "field": field,
                 "requestedValue": desired, "nativeOperation": "SetMaximum" if field == "BaseMaximum" else "SetBaseValue",
                 "serializedBaseValue": before,
                 "baseValue": target[field], "modifier": target[modifier_name],
                 "call": call, "evidenceRefs": ["startup." + name, setter_evidence,
                    "statSetMaximum" if field == "BaseMaximum" else "attributeSetBaseValue"]}
        events.append(event)
        attributes[tag].setdefault("startupEventIndices", []).append(number)
    for name, data in (("Chapter", startup["chapter"]), ("LPAttribs", startup["learningPointsAttributes"])):
        memory[name] = data["value"]
        events.append({"index": len(events), "kind": "setPlayerMemory", "property": name,
                       "serializedValue": memory_serialized[name], "value": data["value"], "instructionEvidence": data})
    templates = Templates(gameplay, raw)
    inventory_serialized = inventory_record["tail"]["value"]
    if inventory_serialized["stacks"]:
        raise ValueError("This assembler only supports the proven empty serialized PC_Hero stack list")
    stacks, assurances = [], startup["inventoryAssureCalls"]
    if len(assurances) != 121 or len({c["template"] for c in assurances}) != 121:
        raise ValueError("Expected 121 distinct native startup inventory assurances")
    for number, call in enumerate(assurances):
        definition = templates.resolve(name=call["template"])
        quick_slot = call["key"] if call["key"] >= 0 else None
        stacks.append({"index": number, "templateName": call["template"], "templateGuid20": definition["guid"],
                       "amount": call["amount"], "quality": call["quality"], "quickSlot": quick_slot,
                       "hotKeyUnsigned": call["key"] if call["key"] >= 0 else 0xffffffff,
                       "learned": True if call["finalBoolean"] else None,
                       "learnedStatus": "native-set-true" if call["finalBoolean"] else "creation-callbacks-unresolved",
                       "nativeNewStackDefaultLearned": False,
                       "learnedOperation": "setTrue" if call["finalBoolean"] else "preserve",
                       "equipmentSlot": None, "equipmentStatus": "not-equipped-by-this-callback",
                       "startupOperation": copy.deepcopy(call),
                       "evidenceRefs": ["assureItems", "assureItemsEx", "stackDefaults", "stackSetLearned"]})
    equipment = []
    for slot in inventory_serialized["slots"]:
        if slot["empty"]:
            continue
        record = slot["record"]
        original = values(record)
        definition = templates.resolve(guid=original["Template"]["rawGuid20"])
        equipment.append({"slotIndex": slot["index"], "slot": original["Slot"],
                          "templateName": definition["name"], "templateGuid20": definition["guid"],
                          "itemGuid20": original["Item"]["rawGuid20"],
                          "status": "serialized-equipped-slot", "sourceOffset": record["serialization"]["sourceOffset"],
                          "propertyEvidence": property_evidence(record)})
    for quest in startup["explicitQuestRuns"]:
        events.append({"index": len(events), "kind": "runQuest", "quest": quest,
                       "status": "native-command-recorded", "source": startup["source"], "bodyVA": startup["bodyVA"]})
    stat_values = {key: attribute["values"] for key, attribute in attributes.items()}
    stats = {name: {"current": stat_values[tag]["Value"] + stat_values[tag]["Modifier"],
                    "max": stat_values[tag]["BaseMaximum"] + stat_values[tag]["MaximumModifier"], "nativeTag": tag}
             for name, tag in (("hitPoints", "HP"), ("manaPoints", "MP"), ("staminaPoints", "SP"))}
    stats["attributes"] = attributes
    result = {
        "schemaVersion": 1, "schema": "gothic3-initialized-player-v1",
        "status": "serialized-player-plus-supported-native-startup-effects",
        "player": {key: hero[key] for key in ("name", "guid", "key", "creator", "source", "sourceOffset", "worldMatrix", "localMatrix")},
        "stats": stats, "memory": memory,
        "inventory": {"status": "native-assurance-result-with-unresolved-creation-callbacks", "stacks": stacks,
                      "equipment": equipment, "serializedStackCount": 0, "assuranceCount": len(assurances),
                      "semantics": startup.get("inventoryAssureSemantics"),
                      "equipmentProof": "Only the original Head and Body slots are retained; AssureItemsEx has no equip call."},
        "templateDefinitions": templates.definitions,
        "serialized": {"memory": memory_serialized, "memoryPropertyEvidence": property_evidence(memory_record),
                       "attributes": serialized_attributes, "inventoryProperties": values(inventory_record),
                       "inventoryPropertyEvidence": property_evidence(inventory_record),
                       "inventoryTailSourceOffset": inventory_record["tail"]["sourceOffset"],
                       "emptySlotIndices": [s["index"] for s in inventory_serialized["slots"] if s["empty"]],
                       "cachedTreasureSetEntities": inventory_serialized["cachedTreasureSetEntities"],
                       "damageReceiver": values(damage_record), "damageReceiverPropertyEvidence": property_evidence(damage_record),
                       "npc": values(property_set(hero, "gCNPC_PS"))},
        "events": events,
        "nativeStartup": {key: copy.deepcopy(value) for key, value in startup.items() if key not in ("attributeSetterCalls", "inventoryAssureCalls")},
        "unsupportedCallbacks": [{"call": call, "status": "unimplemented", "reason": "Recorded native startup callback; its effects have not been reproduced by this assembler."} for call in startup["otherCalls"]] + [
            {"call": "Inventory stack creation and property notifications", "status": "unimplemented",
             "reason": "Amounts, quality and hotkeys follow the explicit assurances. Constructor Learned=false is proven; false AssureItemsEx preserves Learned. Final Learned remains null where other native creation callbacks have not been reproduced."}],
        "evidence": {"native": native.records, "inputDocuments": [
            {"path": "local-raw/initial/ardea-people.json", "sha256": sha256(people_path.read_bytes())},
            {"path": "initial/native-startup.json", "sha256": sha256(startup_path.read_bytes())}]},
        "limitations": ["This is a source-derived seed, not a captured native running-game state.",
                        "Original damage-receiver values are retained: a valid PC_Hero player-memory property set takes the native setter branch.",
                        "No template inheritance, template patching, skill effects, item-use scripts or unspecified notifications are synthesized.",
                        "Original enum numeric values are authoritative. Community symbolic names are advisory where the native binary version has not independently established them.",
                        "A recorded RunQuest command is not an invented completed quest or a substitute for the native quest event reducer."],
        "audit": {"nativeStatSetters": len(calls), "serializedAttributeCount": len(attributes), "resolvedStartupTemplates": len(stacks),
                  "templateDefinitionCount": len(templates.definitions), "serializedEquipmentSlots": len(equipment),
                  "nativeLearnedTrue": sum(s["learned"] is True for s in stacks), "unresolvedLearned": sum(s["learned"] is None for s in stacks)},
    }
    clock = assemble_world_clock(raw, gameplay, native, hero["source"])
    return result, clock


def assemble_world_clock(raw: Path, gameplay: Path, native: NativeEvidence, world_source: dict) -> dict:
    index = read_index(gameplay, "world", "entities")
    sources = [e for e in index if e["name"] == "World_MCP" and "gCClock_PS" in e.get("classes", e.get("propertySets", []))]
    records = []
    for entry in sources:
        entity = read_first_named_entity(raw / "world" / f"{entry['file']:04}.json", "World_MCP")
        if entity is None:
            raise ValueError(f"Clock index record {entry['key']} is missing from raw export")
        clock = property_set(entity, "gCClock_PS")
        records.append({"entityKey": entity["key"], "name": entity["name"], "guid": entity["guid"],
                        "source": entity["source"], "sourceOffset": entity["sourceOffset"],
                        "propertySetSourceOffset": clock["serialization"]["sourceOffset"],
                        "serialized": values(clock), "propertyEvidence": property_evidence(clock)})
    chosen = [r for r in records if r["source"]["sha256"] == world_source["sha256"]]
    if len(chosen) != 1:
        raise ValueError("Could not resolve the clock in the PC_Hero world source")
    record = chosen[0]
    fields = record["serialized"]
    return {"schemaVersion": 1, "schema": "gothic3-world-clock-v1", "status": "source-derived-world-load-clock",
            "selectedEntityKey": record["entityKey"], "source": record["source"],
            "calendar": {name.lower(): fields[name] for name in ("Year", "Day", "Hour", "Minute", "Second")},
            "secondsOfDay": fields["Hour"] * 3600 + fields["Minute"] * 60 + fields["Second"],
            "factor": fields["Factor"], "adjustment": {"secondsPerDay": 86400, "daysPerYear": 365},
            "elapsedRuntimeSeconds": None, "records": records,
            "evidence": {key: native.records[key] for key in ("clockRead", "clockSetFromProperties", "clockProcess")},
            "limitations": ["Year and Day retain their serialized zero values; no display-calendar offset is invented.",
                            "Clock Read invokes the property notification path, which sets time from these serialized fields and adjusts Factor, 86400 seconds/day, 365 days/year.",
                            "Elapsed time and pause/resume state require the runtime clock implementation and are not captured here.",
                            "Weather, ambient sound and music notifications in OnProcess are not executed by this assembler."]}


def main() -> None:
    repo = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--study", type=Path, required=True, help="Read-only completed original Desktop study")
    parser.add_argument("--raw", type=Path, default=repo.parent / "gothic3_gameplay_raw")
    parser.add_argument("--gameplay", type=Path, default=repo / "public/gothic3/gameplay")
    parser.add_argument("--output", type=Path, help="Defaults to GAMEPLAY/initial; writes only the two assembled documents")
    args = parser.parse_args()
    player, clock = assemble_initial_player(args.raw, args.gameplay, args.study)
    destination = args.output or args.gameplay / "initial"
    destination.mkdir(parents=True, exist_ok=True)
    for filename, data in (("initialized-player.json", player), ("world-clock.json", clock)):
        path = destination / filename
        text = json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n"
        path.write_text(text, encoding="utf-8")
        print(json.dumps({"file": filename, "bytes": len(text.encode('utf-8')), "sha256": sha256(text.encode('utf-8'))}))
    print(json.dumps({"audit": player["audit"], "worldClock": clock["calendar"], "factor": clock["factor"]}))


if __name__ == "__main__":
    main()
