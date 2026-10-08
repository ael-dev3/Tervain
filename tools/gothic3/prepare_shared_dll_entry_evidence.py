"""Read-only capture of the SharedBase DLL entry dependency chain."""
import argparse
import hashlib
import json
import struct
from pathlib import Path
import read_dialogue_native_evidence as native
from prepare_runtime_admin_source import image_bytes

SHA = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'

def version_resources(pe):
    resource_rva, resource_size = struct.unpack_from('<II', pe.data, pe.optional + 112)
    root = pe.base + resource_rva
    result = []
    def walk(offset, path, ancestors):
        if offset in ancestors or len(path) > 3:
            raise ValueError('Invalid resource directory hierarchy')
        header = pe.bytes(root + offset, 16)
        named, numeric = struct.unpack_from('<HH', header, 12)
        for index in range(named + numeric):
            name, target = struct.unpack('<II', pe.bytes(root + offset + 16 + index * 8, 8))
            identifier = name if not name & 0x80000000 else f'name-offset:{name & 0x7fffffff}'
            current = path + [identifier]
            if current[0] != 16:
                continue
            if target & 0x80000000:
                walk(target & 0x7fffffff, current, ancestors | {offset})
            else:
                data_rva, size, code_page, reserved = struct.unpack('<IIII', pe.bytes(root + target, 16))
                raw = pe.bytes(pe.base + data_rva, size)
                result.append({'path': current, 'dataRva': data_rva, 'size': size,
                    'codePage': code_page, 'reserved': reserved,
                    'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': raw.hex(),
                    'blocks': version_blocks(raw)})
    if resource_rva:
        walk(0, [], set())
    return {'directoryRva': resource_rva, 'directorySize': resource_size, 'entries': result}

def version_blocks(raw):
    def parse(start, limit):
        length, value_length, kind = struct.unpack_from('<HHH', raw, start)
        end = start + length
        if length < 6 or end > limit:
            raise ValueError('Invalid version resource block')
        cursor = start + 6
        key_start = cursor
        while cursor + 2 <= end and raw[cursor:cursor + 2] != b'\0\0':
            cursor += 2
        if cursor + 2 > end:
            raise ValueError('Unterminated version resource key')
        key = raw[key_start:cursor].decode('utf-16-le')
        cursor = (cursor + 2 + 3) & ~3
        value_size = value_length * 2 if kind == 1 else value_length
        if cursor + value_size > end:
            raise ValueError('Invalid version resource value')
        value = raw[cursor:cursor + value_size]
        block = {'offset': start, 'length': length, 'key': key, 'type': kind,
            'valueLength': value_length, 'valueBytes': value.hex(), 'children': []}
        if kind == 1:
            block['text'] = value.decode('utf-16-le').rstrip('\0')
        cursor = (cursor + value_size + 3) & ~3
        while cursor + 6 <= end:
            child = parse(cursor, end)
            block['children'].append(child)
            cursor = (cursor + child['length'] + 3) & ~3
        return block
    return parse(0, len(raw))

def capture(study, output):
    binary = (study / '00_Original_Runtime/SharedBase.dll').read_bytes()
    if hashlib.sha256(binary).hexdigest() != SHA:
        raise ValueError('Unsupported SharedBase module')
    native.EXPECTED_INPUTS['SharedBase.dll'] = SHA
    result = native.audit_module(study, 'SharedBase_dll', 'SharedBase.dll', {
        0x100adc25: 'dllCrtStartupCaller',
        0x10008a76: 'sharedDllMain',
        0x10006645: 'sharedDllMainInitializer',
        0x10008058: 'dllVersionQuery',
        0x1000840e: 'dllLogSeparator',
        0x1000871f: 'dllLogVersion',
        0x10002883: 'dllVersionResourceFallback',
        0x1000781a: 'dllVersionResourceValues',
        0x10002d42: 'dllVersionResourceLanguage',
    })
    pe = native.PE(binary)
    export_rva, export_size = struct.unpack_from('<II', binary, pe.optional + 96)
    header = struct.unpack('<IIHHIIIIIII', pe.bytes(pe.base + export_rva, 40))
    _, _, _, _, _, ordinal_base, _, name_count, function_table, name_table, ordinal_table = header
    matches = []
    names = []
    for index in range(name_count):
        name_rva = struct.unpack('<I', pe.bytes(pe.base + name_table + index * 4, 4))[0]
        name = pe.string(pe.base + name_rva)
        names.append(name)
        if name == 'DllGetVersion':
            ordinal = struct.unpack('<H', pe.bytes(pe.base + ordinal_table + index * 2, 2))[0]
            function_rva = struct.unpack('<I', pe.bytes(pe.base + function_table + ordinal * 4, 4))[0]
            matches.append({'ordinal': ordinal_base + ordinal, 'address': f'{pe.base + function_rva:08x}'})
    result['versionExportLookup'] = {'name': 'DllGetVersion', 'exportDirectoryRva': export_rva,
        'exportDirectorySize': export_size, 'namedExportCount': name_count,
        'namesSha256': hashlib.sha256('\n'.join(names).encode('ascii')).hexdigest(), 'matches': matches}
    result['versionResources'] = version_resources(pe)
    result['coldImages'] = []
    for label, address, size in [
        ('optionalCrtHook', 0x100ed680, 4),
        ('dllInitializerObject', 0x102f48ec, 4),
        ('dllInitializerGuard', 0x102f48f0, 4),
        ('moduleName', 0x100ebb14, 15),
        ('versionFormat', 0x100eba68, 80),
        ('separator', 0x100ebab8, 76),
    ]:
        raw, section = image_bytes(pe, address, size)
        result['coldImages'].append({'label': label, 'address': f'{address:08x}',
            'size': size, 'bytes': raw.hex(), 'section': section})
    for label, address in [('procedureName', 0x100e8210), ('translationQuery', 0x100e81ec),
            ('translatedVersionQuery', 0x100e81b4), ('localeVersionQuery', 0x100e8188),
            ('versionDelimiter', 0x100e820c)]:
        value = pe.string(address)
        raw = pe.bytes(address, len(value.encode('ascii')) + 1)
        result['coldImages'].append({'label': label, 'address': f'{address:08x}',
            'size': len(raw), 'bytes': raw.hex(), 'text': value})
    result['scope'] = 'Captured evidence only; these DLL entry bodies are not yet executed by the browser.'
    output.mkdir(parents=True, exist_ok=True)
    (output / 'source.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8', newline='\n')

def emit_runtime(output, destination):
    source = json.loads((output / 'source.json').read_text(encoding='utf-8'))
    rows = {}
    def retain(address, raw, instruction):
        row = [address, raw, instruction]
        if address in rows and rows[address] != row:
            raise ValueError('Conflicting original instruction at ' + address)
        rows[address] = row
    for method in source['methods']:
        for entry in method['entryChain']:
            retain(entry['va'], entry['bytes'], 'JMP 0x' + entry['targetVA'])
        for entry in method['instructions']:
            retain(entry['va'], entry['bytes'], entry['instruction'])
    destination.write_text('/** Captured original DLL entry syntax; execution requires runtime ownership. */\n'
        + 'export interface SharedDllEntryInstruction {readonly address:string;readonly bytes:string;readonly instruction:string;}\n'
        + 'const rows:readonly (readonly string[])[] = ' + json.dumps([rows[k] for k in sorted(rows)], indent=2) + ';\n'
        + 'const instructions=new Map<string,SharedDllEntryInstruction>(rows.map(([address,bytes,instruction])=>\n'
        + ' [address!,Object.freeze({address:address!,bytes:bytes!,instruction:instruction!})]));\n'
        + 'export function sharedDllEntryInstruction(address:string):SharedDllEntryInstruction {\n'
        + " const row=instructions.get(address);if(!row)throw new Error('Unowned SharedBase DLL entry instruction '+address);return row;\n}\n",
        encoding='utf-8', newline='\n')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--runtime-output', type=Path)
    args = parser.parse_args()
    capture(args.study, args.output)
    if args.runtime_output:
        emit_runtime(args.output, args.runtime_output)
