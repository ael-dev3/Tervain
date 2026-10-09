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
        0x100aa234: 'versionQuerySprintf',
        0x100b5355: 'formattedOutputEngine',
        0x100a74b6: 'outputLocale',
        0x100a99b3: 'outputIsLeadByte',
        0x100b5289: 'outputByte',
        0x100cdfb0: 'outputUnsignedDivide',
        0x100b52bc: 'outputPad',
        0x100b52e0: 'outputString',
        0x10002112: 'versionMemoryFree',
        0x10002e46: 'versionFreeDispatcher',
        0x10005b37: 'poolDescriptorLookup',
        0x100acd00: 'versionStrtok',
        0x100a7942: 'versionAtoi',
        0x100b46df: 'versionStrtol',
        0x100b44b4: 'versionIntegerScanner',
        0x100aedd1: 'versionErrno',
        0x100ae1d2: 'versionInvalidParameter',
        0x100b2b0b: 'versionCharClass',
        0x100088b4: 'dllLogMessage',
        0x10005560: 'dllLogSubmit',
        0x100a7f27: 'dllLogVsprintf',
        0x10006b7c: 'dllMessageCreate',
        0x100010e1: 'dllMessageNewHolder',
        0x10007441: 'dllMessageHolderAllocate',
        0x10006c1c: 'dllMessageErrorGet',
        0x10008b11: 'dllMessageSpyGet',
        0x100089e5: 'dllMessageSpyCreate',
        0x10001334: 'dllMessageSpieGet',0x10008887:'dllMessageSpieCreate',
        0x100acc93:'dllSpieFopen',0x100acbcf:'dllSpieOpenFile',
        0x100bbf27:'dllSpieInitDescriptorSection',0x100bbf17:'dllSpieFallbackDescriptorSection',
        0x100d0d8d:'dllSpieAllocateDescriptor',0x100d0e60:'dllSpieDescriptorUnlockInit',0x100d0f23:'dllSpieDescriptorUnlockTable',
        0x100d1a2d:'dllSpieSharedOpen',0x100d1931:'dllSpieOpenDispatch',0x100d1122:'dllSpieOpenCore',0x100d44db:'dllSpieFileModeGet',0x100aa49d:'dllSpiePlatformGet',
        0x100bfd6f:'dllSpieAcquireStream',0x100bfacf:'dllSpieOpenStream',0x100bf012:'dllSpieLockFile',0x100bfe96:'dllSpieStreamUnlock',
        0x10007cac:'dllMessageRegister',0x1000631b:'dllMessageReserve',
        0x10004133:'dllErrorBufferMalloc',0x100052fe:'dllErrorBufferHeapAllocate',0x10007644:'dllLargePoolDispatch',0x10007aa9:'dllLargePoolInitialize',
        0x10001db1:'dllErrorCreate',0x100032c4:'dllErrorInvalidate',0x10001c21:'dllMessageRemove',
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
    result['versionImportThunks'] = []
    imports_by_iat = {int(item['iatVA'], 16): item for item in pe.imports()}
    for address, iat, name in [(0x100d55e2, 0x102f98f0, 'GetFileVersionInfoSizeA'),
            (0x100d55dc, 0x102f98ec, 'GetFileVersionInfoA'),
            (0x100d55d6, 0x102f98f4, 'VerQueryValueA')]:
        raw = pe.bytes(address, 6)
        receipt = imports_by_iat[iat]
        if raw != b'\xff\x25' + struct.pack('<I', iat) or receipt['name'] != name or receipt['module'] != 'VERSION.dll':
            raise ValueError('Original VERSION import thunk differs')
        result['versionImportThunks'].append({'address': f'{address:08x}', 'bytes': raw.hex(),
            'instruction': f'JMP dword ptr [0x{iat:08x}]', 'import': receipt})
    result['coldImages'] = []
    for label, address, size in [
        ('dllSpieDescriptorSectionScope',0x100f8d18,28),
        ('dllSpieDescriptorScope',0x100f8fc0,28),
        ('dllSpieSharedOpenScope',0x100f9048,28),('dllSpieDefaultFileMode',0x102f7048,4),
        ('dllSpieStreamScope',0x100f8e20,28),('dllSpieCommitMode',0x102f6f88,4),('dllSpieOpenedFileCount',0x102f6ad4,4),
        ('dllSpieState',0x10197dc0,28),('dllSpieGuard',0x10197de4,4),('dllSpieOpenFileScope',0x100f8730,28),
        ('dllSpyShutdownSource',0x100e2890,41),
        ('dllSpyState',0x101ab11c,32),('dllSpyGuard',0x101ab144,4),
        ('dllErrorShutdownSource',0x100e2770,22),
        ('dllErrorBufferScope',0x100f8338,12),('dllLargePoolBins',0x10144214,0x4004),('dllLargePoolRegionFirst',0x10148218,4),('dllLargePoolRegionCount',0x102fb04c,4),
        ('dllErrorState',0x10142a58,44),('dllErrorGuard',0x10142a8c,4),
        ('dllMessageState', 0x10197d6c, 32),
        ('dllMessageGuard', 0x10197d94, 4),
        ('versionLocaleChanged', 0x102f692c, 4),
        ('versionInitialLocalePair', 0x10141470, 8),
        ('versionMemoryFreeScope', 0x100f82e8, 12),
        ('optionalCrtHook', 0x100ed680, 4),
        ('dllInitializerObject', 0x102f48ec, 4),
        ('dllInitializerGuard', 0x102f48f0, 4),
        ('versionQueryOutput', 0x101ab190, 256),
        ('formatStateTables', 0x100ede50, 160),
        ('formatDispatchTable', 0x100b5cc9, 32),
        ('outputCtypeTable', 0x100f2e38, 512),
        ('moduleName', 0x100ebb14, 15),
        ('versionFormat', 0x100eba68, 80),
        ('separator', 0x100ebab8, 76),
    ]:
        raw, section = image_bytes(pe, address, size)
        result['coldImages'].append({'label': label, 'address': f'{address:08x}',
            'size': size, 'bytes': raw.hex(), 'section': section})
    for label, address in [('dllSpieFilename',0x100e8088),('dllSpieFileMode',0x100e8094),('dllSpyWindowTitle',0x100e8114),('dllLogSourceFile', 0x100e7df8), ('procedureName', 0x100e8210), ('translationQuery', 0x100e81ec),
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
    for entry in source['versionImportThunks']:
        retain(entry['address'], entry['bytes'], entry['instruction'])
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
