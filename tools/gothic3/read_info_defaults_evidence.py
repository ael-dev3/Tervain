"""Offline source-PE audit of installed Gothic 3 info initialization. No game execution."""
from pathlib import Path
import argparse
import csv
import hashlib
import json
import re
import struct

EXPECTED_INPUTS = {
    'Game': 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f',
    'SharedBase': '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214',
}

def sha(data):
    return hashlib.sha256(data).hexdigest()


def hx(value):
    return f"0x{value:08x}"


class Module:
    def __init__(self, study, name, root_name=None, binary_name=None):
        self.name = name
        self.study = study
        self.root = study / "01_Decompiled_Code" / (root_name or (name + "_dll"))
        self.binary_path = study / "00_Original_Runtime" / (binary_name or (name + ".dll"))
        self.data = self.binary_path.read_bytes()
        if sha(self.data) != EXPECTED_INPUTS[name]:
            raise ValueError('Unsupported native module build: ' + name)
        nt = struct.unpack_from("<I", self.data, 0x3c)[0]
        if self.data[nt:nt + 4] != b"PE\0\0":
            raise ValueError('Not a PE module: ' + name)
        self.base = struct.unpack_from("<I", self.data, nt + 52)[0]
        optional_size = struct.unpack_from("<H", self.data, nt + 20)[0]
        self.sections = [struct.unpack_from("<IIII", self.data, nt + 24 + optional_size + i * 40 + 8)
                         for i in range(struct.unpack_from("<H", self.data, nt + 6)[0])]
        self.rows = {int(row["address"], 16): row for row in
                     csv.DictReader((self.root / "functions.csv").open(encoding="utf-8-sig"))
                     if re.fullmatch(r"[0-9a-fA-F]{8}", row["address"])}
        self.imports = {}
        descriptor = self.base + struct.unpack_from("<I", self.data, nt + 128)[0]
        while True:
            original, timestamp, forwarder, name_rva, iat = struct.unpack("<IIIII", self.read(descriptor, 20))
            if not any((original, timestamp, forwarder, name_rva, iat)):
                break
            library = self.string(self.base + name_rva)
            index = 0
            while (value := self.u32(self.base + (original or iat) + index * 4)):
                if not value & 0x80000000:
                    self.imports[self.base + iat + index * 4] = {
                        "library": library, "decoratedSymbol": self.string(self.base + value + 2)}
                index += 1
            descriptor += 20
        self.methods = {}
        self.source_files = set()

    def read(self, address, count):
        rva = address - self.base
        for virtual_size, virtual_address, raw_size, raw_offset in self.sections:
            if virtual_address <= rva and rva + count <= virtual_address + raw_size:
                offset = raw_offset + rva - virtual_address
                return self.data[offset:offset + count]
        raise ValueError(f"Non-source-backed PE range {self.name}:{hx(address)}+{count}")

    def u32(self, address):
        return struct.unpack("<I", self.read(address, 4))[0]

    def string(self, address):
        result = bytearray()
        while (byte := self.read(address + len(result), 1)) != b"\0":
            result.extend(byte)
        return result.decode("ascii")

    def target(self, entry):
        first = self.read(entry, 5)
        return entry + 5 + struct.unpack("<i", first[1:])[0] if first[0] == 0xe9 else entry

    def method(self, entry, meaning=None):
        body = self.target(entry)
        row = self.rows[body]
        method_id = self.name + ":" + hx(body)
        if method_id not in self.methods:
            ranges = [tuple(int(part, 16) for part in section.split("-"))
                      for section in row["body_ranges"].split(";")]
            self.source_files.add(self.root / row["pseudocode_file"])
            self.methods[method_id] = {
                "id": method_id, "va": hx(body), "rva": hx(body - self.base),
                "catalogName": row["qualified_name"],
                "meaning": meaning, "thunks": [],
                "source": {"path": "01_Decompiled_Code/" + self.root.name + "/" + row["pseudocode_file"],
                           "line": int(row["pseudocode_line"])},
                "bodyRanges": [{"startVA": hx(start), "endVAInclusive": hx(end),
                                "sourcePEBytesSha256": sha(self.read(start, end - start + 1)),
                                "byteCount": end - start + 1} for start, end in ranges],
                "instructions": [], "_ranges": ranges}
        record = self.methods[method_id]
        if meaning:
            record["meaning"] = meaning
        if entry != body and not any(item["va"] == hx(entry) for item in record["thunks"]):
            record["thunks"].append({"va": hx(entry), "rva": hx(entry - self.base),
                                     "sourcePEBytes": self.read(entry, 5).hex(), "targetVA": hx(body)})
        return method_id

    def audit(self):
        asm = self.root / "full_disassembly.asm"
        self.source_files.update((asm, self.root / "functions.csv"))
        pattern = re.compile(r"([0-9a-f]{8}) \| ([0-9a-f]+) \| (.*)")
        for line_no, line in enumerate(asm.open(encoding="utf-8"), 1):
            match = pattern.match(line)
            if not match:
                continue
            address = int(match[1], 16)
            relevant = [record for record in self.methods.values()
                        if any(start <= address <= end for start, end in record["_ranges"])]
            if not relevant:
                continue
            instruction_bytes = bytes.fromhex(match[2])
            if self.read(address, len(instruction_bytes)) != instruction_bytes:
                raise ValueError('Assembly/PE disagreement: ' + self.name + ':' + hx(address))
            for record in relevant:
                record["instructions"].append({"va": hx(address), "rva": hx(address - self.base),
                                               "bytes": match[2], "assembly": match[3].strip(),
                                               "assemblyLine": line_no, "sourcePEMatch": True})
        for record in self.methods.values():
            record.pop("_ranges")
            if not record["instructions"]:
                raise ValueError('No instruction evidence: ' + record['id'])
            record["instructionCount"] = len(record["instructions"])
            record["instructionBytesCount"] = sum(len(bytes.fromhex(i["bytes"])) for i in record["instructions"])
            record["allInstructionBytesMatchSourcePE"] = True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--study", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[2] / 'assets/gothic3/dialogue/info-defaults-evidence.json')
    args = parser.parse_args()
    game, shared = Module(args.study, "Game"), Module(args.study, "SharedBase")
    route = [
        (game, 0x20033e9c, "INI loader creates a fresh info before calling its INI Read"),
        (game, 0x20001f82, "QueryNewObject for gCInfo_PS; AddReference and return the instance"),
        (shared, 0x10007036, "Find class factory and invoke CloneObjectInstance"),
        (shared, 0x10007ec8, "Require registered root object and invoke Clone"),
        (shared, 0x100056e6, "Dispatch Clone through vtable slot +0x38"),
        (game, 0x20007d4c, "Clone root PO into fresh non-root PO and initialize with argument 0"),
        (game, 0x2002485c, "Initialize property object; non-root iteration calls every property's +0x14 default setter"),
        (game, 0x20023164, "Instantiate gCInfo_PS for non-root property object"),
        (game, 0x2001433a, "Raw gCInfo_PS constructor; embedded script PO reset uses ECX=this+0x98"),
        (game, 0x20005885, "Embedded gCInfoScript_PS property object initializer, not info flag defaults"),
        (game, 0x2003060c, "gCInfo_PS PostInitializeProperties delegates to base then returns success"),
        (shared, 0x100076f8, "Base PostInitializeProperties returns 1 without changing info fields"),
        (game, 0x20005d3f, "Info Invalidate only clears runtime info-manager pointer at +0xa8"),
        (game, 0x2053a580, "CRT registration of root gCInfo_PS property object; initialize with argument 1"),
        (game, 0x20017bb1, "INI Read assigns these fields only when their keys are encountered"),
        (shared, 0x10003d28, "bCString::Clear releases populated storage and clears its pointer"),
        (shared, 0x100058a3, "IsRoot reads flag bit 0 at +4"),
        (game, 0x2002324f, "IsPermanent derived predicate differs from stored GetPermanent"),
        (game, 0x2002218d, "Execute sets InfoGiven only after script success and when derived permanence exclusions all fail"),
        (game, 0x20008a99, "IsOwnerPlayer resolves owner by entity name, then asks gCEntity::IsPlayer"),
        (game, 0x20028024, "IsChildInfo returns Parent string length >0"),
        (game, 0x2000f80d, "GetChildInfos compares each child's Parent with the supplied parent's Name"),
        (game, 0x2001e024, "GetOwnerEntity resolves the Owner string by GetEntityByName"),
        (game, 0x20016612, "GetOwnerNPC resolves Owner name, requests NPC PS 0x1e and dynamic-casts"),
    ]
    chain = [module.method(entry, meaning) for module, entry, meaning in route]
    types = {}
    for name, vtable in (("bool", 0x206b01ec), ("long", 0x206b0384), ("bCString", 0x206b00dc)):
        slots = {}
        for offset, meaning in ((0x14, "default setter"), (0x64, "checked member pointer"), (0x2c, "instance pointer plus registered member offset")):
            target = game.u32(vtable + offset)
            slots[hx(offset)] = {"sourcePEPointerBytes": game.read(vtable + offset, 4).hex(),
                                 "targetThunkVA": hx(target), "method": game.method(target, meaning + ": " + name)}
        types[name] = {"vtableVA": hx(vtable), "slots": slots}
    fields_spec = [
        ("Owner", "bCString", "", 0x14, 0x2053a730, 0x207d0050, 0x2053c150, 0x207d03ac, 0x20007a5e),
        ("Parent", "bCString", "", 0x1c, 0x2053a880, 0x207d009c, 0x2053c1b0, 0x207d03b4, 0x20007905),
        ("InfoGiven", "bool", False, 0x18, 0x2053a7e0, 0x207d0078, 0x2053c180, 0x207d03b0, 0x20011d1f),
        ("GoldCost", "long", 0, 0x34, 0x2053ab20, 0x207d0134, 0x2053c270, 0x207d03c4, 0x200245d7),
        ("ClearChildren", "bool", False, 0x90, 0x2053b230, 0x207d02cc, 0x2053c4b0, 0x207d03f4, 0x20020c2f),
        ("Permanent", "bool", False, 0x91, 0x2053b2d0, 0x207d02f0, 0x2053c4e0, 0x207d03f8, 0x200181a1),
    ]
    fields = {}
    for name, kind, value, offset, registration, prop_address, key_initializer, key_global, getter in fields_spec:
        fields[name] = {"status": "proven-for-fresh-native-INI-instance", "valueWhenOmitted": value,
                        "nativeType": kind, "instanceMemberOffset": hx(offset),
                        "registeredPropertyObjectVA": hx(prop_address),
                        "registrationMethod": game.method(registration, "CRT property registration: " + name),
                        "getterMethod": game.method(getter, "Get " + name + " member reference"),
                        "iniKeyObjectVA": hx(key_global),
                        "iniKeyInitializerMethod": game.method(key_initializer, "INI key bCString initializer: " + name),
                        "defaultSetterMethod": types[kind]["slots"][hx(0x14)]["method"]}
    iat = {}
    for address in (0x207d886c, 0x207d88b4, 0x207d88f4, 0x207d86e8, 0x207d8728, 0x207d8734, 0x207d87cc):
        iat[hx(address)] = game.imports[address]
    for module in (game, shared):
        module.audit()
    result = {
        "schema": "gothic3-native-info-defaults-evidence-v1",
        "scope": "Fresh gCInfo_PS instances created by the installed LoadInfosFromInis path. Saved state and later script mutations can override these initial values.",
        "sourceAbsencePolicy": "Keep whether an INI key was explicitly present separate from the effective native initialized value. Source null/absence does not mean the native boolean is unknown on this proven fresh factory path.",
        "fields": fields,
        "creationRouteMethods": chain[:8],
        "typeDefaultDispatch": types,
        "importEvidence": iat,
        "derivedPermanent": {
            "method": "Game:" + hx(game.target(0x2002324f)),
            "formula": "InfoType==0 || InfoType==4 || ConditionType==9 || ConditionType==52 || PermanentByte==1 || ConditionType==51 || IsOwnerPlayer()",
            "rawNumericValuesAuthoritative": True,
            "storedPermanentGetterIsDifferent": True,
        },
        "infoGivenTransition": {
            "method": "Game:" + hx(game.target(0x2002218d)),
            "rule": "Only after gCInfoScript_PS::Execute succeeds and all derivedPermanent exclusions fail, store 1 at instance+0x18. Failure paths do not perform this store.",
            "excludedInfoTypes": [0, 4], "excludedConditionTypes": [9, 51, 52],
            "otherExclusions": ["Permanent byte exactly 1", "owner resolves to player"],
            "note": "Condition 19 is not in this native exclusion list; replacing 9 with 19 is a porting error. Given is set upon accepted script execution, not merely menu selection and not necessarily final asynchronous dialogue completion.",
        },
        "parentOwnerSemantics": {
            "Parent": "Empty initially. IsChildInfo is Parent.GetLength()>0. Native GetChildInfos matches child.Parent to parent.Name, not an entity GUID.",
            "Owner": "Empty initially. GetOwnerEntity/GetOwnerNPC resolve this string through eCSceneAdmin::GetEntityByName. No implicit current speaker/player owner assignment is established by the factory or INI reader.",
        },
        "constructorCorrection": "gCInfo_PS raw constructor's thunk 0x20005885 -> 0x2043e060 receives ECX=this+0x98 and initializes the embedded gCInfoScript_PS PO. Fresh info field defaults instead come from 0x20446480's property iteration.",
        "limitations": [
            "This is offline evidence; native binaries were never executed.",
            "Symbol names and decompiled types may be inaccurate. Field offsets, raw numeric tests, source PE bytes and dispatch pointers carry the proof.",
            "The 108 omitted Permanent count belongs to the importer's source catalog; this receipt does not recount INIs.",
            "Availability, scene name resolution, script command completion, save/load and native dialogue UI remain separate behavior; this file proves initial fields and the given/permanence predicates only.",
        ],
        "inputModules": [{"path": str(module.binary_path.relative_to(args.study)).replace("\\", "/"),
                          "imageBase": hx(module.base), "byteCount": len(module.data), "sha256": sha(module.data)}
                         for module in (game, shared)],
        "sourceReceipts": [{"path": str(path.relative_to(args.study)).replace("\\", "/"),
                            "byteCount": path.stat().st_size, "sha256": sha(path.read_bytes())}
                           for path in sorted(game.source_files | shared.source_files)],
        "methodEvidence": list(game.methods.values()) + list(shared.methods.values()),
    }
    result["integrityAudit"] = {"methodCount": len(result["methodEvidence"]),
                                "instructionCount": sum(m["instructionCount"] for m in result["methodEvidence"]),
                                "allRecordedInstructionBytesMatchSourcePE": True,
                                "nativeExecution": False}
    output = args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(output), "bytes": output.stat().st_size, "sha256": sha(output.read_bytes()),
                      "audit": result["integrityAudit"], "modules": result["inputModules"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
