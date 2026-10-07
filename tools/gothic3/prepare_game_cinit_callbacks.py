"""Capture the complete original Game initializer tables and callback listings.

Requires the frozen study plus supplemental Ghidra exports recovered in a
separate project copy. This source package does not execute callbacks or grant
runtime access. Decompiled text is reconstructed pseudocode, not original C++.
"""
import argparse
import csv
import hashlib
import json
import re
import struct
from pathlib import Path

from read_dialogue_native_evidence import PE

GAME = 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f'
CATALOG = '7683e99c3c22688b26c77eafc830f43abab471b9e9d3ca241e3157007c714018'
TABLES = {'c': (0x20655514, 0x20655730), 'cpp': (0x2056c000, 0x20655410)}
SHA = lambda data: hashlib.sha256(data).hexdigest()


def capture(study, recovery, output):
    image = (study / '00_Original_Runtime/Game.dll').read_bytes()
    catalog_path = study / '01_Decompiled_Code/Game_dll/functions.csv'
    catalog_bytes = catalog_path.read_bytes()
    if SHA(image) != GAME or SHA(catalog_bytes) != CATALOG:
        raise ValueError('Original image/catalog differs from the frozen source')
    pe = PE(image)
    catalog = {row['address']: row for row in csv.DictReader(catalog_bytes.decode('utf-8-sig').splitlines())}
    recovered = {row['address']: row for row in csv.DictReader((recovery / 'retry_functions.csv').read_text().splitlines())}
    coverage = json.loads((recovery / 'retry_coverage.json').read_text())
    if coverage['sha256'] != GAME or not coverage['complete_selected_functions']:
        raise ValueError('Supplemental recovery has no matching complete export')
    if len(recovered) != 1394 or any(row['status'] != 'decompiled' for row in recovered.values()):
        raise ValueError('Supplemental callback coverage changed')
    tables, targets = {}, set()
    for label, (begin, end) in TABLES.items():
        raw = pe.bytes(begin, end - begin)
        entries = [{'slot': f'{begin + i * 4:08x}', 'target': f'{value:08x}'}
                   for i, (value,) in enumerate(struct.iter_unpack('<I', raw)) if value]
        targets.update(row['target'] for row in entries)
        tables[label] = {'begin': f'{begin:08x}', 'end': f'{end:08x}',
                         'slots': len(raw) // 4, 'bytes': len(raw), 'sha256': SHA(raw),
                         'nonzeroEntries': entries, 'omittedSlotsAreZero': True}
    if len(targets) != 2473 or not set(recovered).issubset(targets):
        raise ValueError('Initializer table target set changed')
    output.mkdir(parents=True, exist_ok=True)
    sources = output / 'sources/Game'
    sources.mkdir(parents=True, exist_ok=True)
    cache, methods, file_manifest = {}, {}, []
    imports = {row['iatVA']: row for row in pe.imports()}
    call_sites = []

    def emit(relative, data):
        path = output / relative
        path.write_bytes(data)
        file_manifest.append({'path': relative, 'bytes': len(data), 'sha256': SHA(data)})

    for address in sorted(targets):
        assembly = (recovery / 'assembly' / (address + '.asm.txt')).read_bytes()
        rows, instruction_bytes = [], b''
        last_end = None
        for line in assembly.decode().splitlines():
            va, raw, text = line.split(' | ', 2)
            data, pc = bytes.fromhex(raw), int(va, 16)
            if pe.bytes(pc, len(data)) != data or not data or (last_end is not None and pc < last_end):
                raise ValueError('Original instruction byte or ordering mismatch: ' + address + ':' + va)
            last_end = pc + len(data)
            rows.append({'va': va, 'bytes': raw, 'instruction': text})
            instruction_bytes += data
            if text.startswith('CALL '):
                operand = text[5:]
                call = {'callback': address, 'pc': va, 'bytes': raw, 'operand': operand,
                        'runtimeOwnerAdmitted': False}
                if re.fullmatch(r'0x[0-9a-f]+', operand):
                    target = int(operand, 16)
                    call.update(kind='direct', target=f'{target:08x}')
                    thunk = pe.bytes(target, 6)
                    if thunk[:2] == b'\xff\x25':
                        iat = f'0x{struct.unpack_from("<I", thunk, 2)[0]:08x}'
                        if iat in imports:
                            call.update(kind='direct-import-thunk', thunkBytes=thunk.hex(), imported=imports[iat])
                else:
                    match = re.fullmatch(r'dword ptr \[(0x[0-9a-f]+)\]', operand)
                    if match and match[1] in imports:
                        call.update(kind='iat-import', imported=imports[match[1]])
                    else:
                        call.update(kind='indirect-unresolved')
                call_sites.append(call)
        if not rows or rows[0]['va'] != address:
            raise ValueError('No exact callback instruction entry: ' + address)
        if address in recovered:
            row = recovered[address]
            c = (recovery / row['pseudocode_file']).read_bytes()
            origin = {'kind': 'supplemental-ghidra-recovery', 'ghidraVersion': coverage['ghidra_version'],
                      'functionCreatedInSeparateProject': True, 'catalogGap': True,
                      'functionMetadata': row}
        else:
            row = catalog[address]
            if row['status'] != 'decompiled':
                raise ValueError('Frozen catalog has no successful callback output: ' + address)
            path = study / '01_Decompiled_Code/Game_dll' / row['pseudocode_file']
            if str(path) not in cache:
                cache[str(path)] = path.read_text(encoding='utf-8-sig')
            text = cache[str(path)]
            start = text.index('/* ENTRY ' + address + ' |')
            end = text.find('/* ENTRY ', start + 1)
            c = (text[start:end if end >= 0 else len(text)].rstrip() + '\n').encode()
            origin = {'kind': 'frozen-study', 'catalogGap': False,
                      'sourcePath': '01_Decompiled_Code/Game_dll/' + row['pseudocode_file'],
                      'sourceSha256': SHA(path.read_bytes()), 'functionMetadata': row}
        if len(instruction_bytes) != int(row['body_bytes']):
            raise ValueError('Function extent contains unlisted bytes: ' + address)
        asm_ref, c_ref = 'sources/Game/' + address + '.asm.txt', 'sources/Game/' + address + '.c.txt'
        emit(asm_ref, assembly)
        emit(c_ref, c)
        methods[address] = {'entry': address, 'bodyRanges': row['body_ranges'],
                            'instructionCount': len(rows), 'instructionBytes': len(instruction_bytes),
                            'instructionBytesSha256': SHA(instruction_bytes), 'assembly': asm_ref,
                            'assemblySha256': SHA(assembly), 'c': c_ref, 'cSha256': SHA(c),
                            'origin': origin, 'sourceOnly': True, 'executionAdmitted': False}
    # Preserve source admission independently of any future live graph selection.
    emit('callback-index.json', (json.dumps({'schema': 'gothic3-game-cinit-callback-source-v1',
        'inputs': {'Game': GAME, 'functionsCsv': CATALOG}, 'tables': tables, 'callbacks': methods,
        'counts': {'callbacks': len(methods), 'supplementalRecovered': len(recovered),
                   'instructions': sum(m['instructionCount'] for m in methods.values()),
                   'instructionBytes': sum(m['instructionBytes'] for m in methods.values())},
        'sourceOnly': True, 'executionAdmitted': False,
        'wholeCrtTraversalCompleted': False, 'fullCampaignCompleted': False}, indent=2) + '\n').encode())
    emit('recovery-coverage.json', (recovery / 'retry_coverage.json').read_bytes())
    emit('call-dependencies.json', (json.dumps({'schema': 'gothic3-game-cinit-callback-dependencies-v1',
        'imageSha256': GAME, 'sourceOnly': True, 'calls': call_sites}, indent=2) + '\n').encode())
    (output / 'source-manifest.json').write_text(json.dumps({'schema': 'gothic3-game-cinit-callback-manifest-v1',
        'producerSha256': SHA(Path(__file__).read_bytes()), 'files': file_manifest}, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'callbacks': len(methods), 'supplementalRecovered': len(recovered),
                      'files': len(file_manifest), 'output': str(output)}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--recovery', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    capture(args.study, args.recovery, args.output)
