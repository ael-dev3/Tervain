"""Capture original Game memcpy closure as a source-only external supplement."""
import argparse
import csv
import hashlib
import json
import re
import struct
from pathlib import Path

PINS = {
    'Game.dll': 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f',
    'assembly': 'fd23430904ab84b03e395bc4a705f5a475cc5816094603350a68e1bc2798f4dc',
    'catalog': '7683e99c3c22688b26c77eafc830f43abab471b9e9d3ca241e3157007c714018',
    'symbols': '4e92a5cb597f91d1c2eb661f171a1bb097175094dc32778bd6058676afea3eac',
}
OWN = {'20469fe9': 'vecMemcpy', '20469f62': 'sseCopy128'}
CONTEXT = {'memcpy': '20463ed0', 'crtGetEnvironmentStringsA': '20476835',
    'crtAttach': '204677e4', 'cinit': '204665f4', 'cInit2047e687': '2047e687'}
TABLES = [
    ('forwardAlignment', 0x20463f58, 0x20463f68, [1, 2, 3], [0x20463f45]),
    ('forwardDwords', 0x20463fd8, 0x20463ff8, list(range(8)), [0x20463f54]),
    ('forwardTail', 0x20464044, 0x20464054, list(range(4)),
        [0x20463f2c, 0x20463f4c, 0x20463f8a, 0x20463fb0, 0x20463fce, 0x2046403b]),
    ('backwardAlignment', 0x204640e4, 0x204640f4, [1, 2, 3], [0x204640d9]),
    ('backwardDwords', 0x20464174, 0x20464194, list(range(8)), [0x204640be]),
    ('backwardTail', 0x204641e0, 0x204641f0, list(range(4)),
        [0x204640b3, 0x204640e0, 0x2046410e, 0x20464138, 0x2046416a, 0x204641d7]),
]
SHA = lambda raw: hashlib.sha256(raw).hexdigest()


class OriginalImage:
    def __init__(self, raw):
        self.raw = raw
        assert raw[:2] == b'MZ'
        nt = struct.unpack_from('<I', raw, 0x3c)[0]
        assert raw[nt:nt + 4] == b'PE\0\0'
        optional = nt + 24
        assert struct.unpack_from('<H', raw, optional)[0] == 0x10b
        self.base = struct.unpack_from('<I', raw, optional + 28)[0]
        table = optional + struct.unpack_from('<H', raw, nt + 20)[0]
        self.sections = []
        for index in range(struct.unpack_from('<H', raw, nt + 6)[0]):
            at = table + index * 40
            virtual_size, rva, raw_size, file_offset = struct.unpack_from('<IIII', raw, at + 8)
            flags = struct.unpack_from('<I', raw, at + 36)[0]
            self.sections.append(dict(name=raw[at:at + 8].rstrip(b'\0').decode('ascii'),
                address=f'{self.base + rva:08x}', rva=f'{rva:x}', virtualSize=virtual_size,
                rawSize=raw_size, rawOffset=file_offset, headerFileOffset=at,
                characteristics=f'{flags:08x}', readable=bool(flags & 0x40000000),
                writable=bool(flags & 0x80000000), executable=bool(flags & 0x20000000)))

    def span(self, address, count):
        for section in self.sections:
            delta = address - int(section['address'], 16)
            if delta < 0 or delta + count > section['virtualSize']:
                continue
            backed = min(count, max(0, section['rawSize'] - delta))
            at = section['rawOffset'] + delta
            raw = self.raw[at:at + backed] + bytes(count - backed)
            assert len(raw) == count
            return raw, dict(section=section, fileOffset=at if backed else None,
                fileBackedBytes=backed, loaderZeroFillBytes=count - backed)
        raise ValueError(f'Unmapped original Game span {address:08x}+{count}')


def file_record(root, relative, location):
    path = root / relative
    raw = path.read_bytes()
    return dict(location=location, path=Path(relative).as_posix(), bytes=len(raw), sha256=SHA(raw))


def snapshot(root):
    return [file_record(root, path.relative_to(root), 'existingGameCrt')
        for path in sorted(root.rglob('*')) if path.is_file()]


def capture(study, repo, output):
    old_game = repo / 'assets/gothic3/game-crt'
    assert output != old_game and old_game not in output.parents
    before = snapshot(old_game)
    original_dir = study / '01_Decompiled_Code/Game_dll'
    game = (study / '00_Original_Runtime/Game.dll').read_bytes()
    assert SHA(game) == PINS['Game.dll']
    pe = OriginalImage(game)
    catalog_raw = (original_dir / 'functions.csv').read_bytes()
    symbols_raw = (original_dir / 'symbols.csv').read_bytes()
    assert SHA(catalog_raw) == PINS['catalog'] and SHA(symbols_raw) == PINS['symbols']
    catalog = {row['address']: (number, row) for number, row in
        enumerate(csv.DictReader(catalog_raw.decode('utf-8-sig').splitlines()), 2)}
    symbols = list(enumerate(csv.DictReader(symbols_raw.decode('utf-8-sig').splitlines()), 2))
    contexts = {}
    for label, address in CONTEXT.items():
        asm_only = address == '2047e687'
        record = catalog.get(address)
        method = dict(label=label, entryVA='0x' + address, bodyVA='0x' + address, entryChain=[],
            bodyRanges='2047e687-2047e693' if asm_only else record[1]['body_ranges'],
            originalCatalog=None if asm_only else record[1], catalogCsvLine=None if asm_only else record[0],
            sourceCGap=asm_only, originalCatalogGap=asm_only, sourceASMGap=False,
            sourceScope='original-source-context-only', liveValueCaptured=False,
            runtimeOwnerImplemented=False, nativeOrBrowserCodeExecuted=False,
            originalSymbols=[dict(row, csvLine=number) for number, row in symbols if row['address'] == address])
        if not asm_only:
            source_path = '01_Decompiled_Code/Game_dll/' + record[1]['pseudocode_file']
            method['reconstructedC'] = dict(path=source_path, sha256=SHA((study/source_path).read_bytes()),
                line=int(record[1]['pseudocode_line']), status=record[1]['status'])
        else:
            assert address not in catalog
            assert not any(('/* ENTRY ' + address + ' |') in path.read_text(encoding='utf8')
                for path in (original_dir/'pseudocode').glob('*.c'))
        contexts[label] = method
    selections = []
    for address, label in OWN.items():
        catalog_line, record = catalog[address]
        selections.append(dict(label=label, entryVA='0x' + address, bodyVA='0x' + address,
            bodyRanges=record['body_ranges'], entryChain=[], originalCatalog=record,
            catalogCsvLine=catalog_line, sourceCGap=False, sourceASMGap=False, originalCatalogGap=False,
            originalSymbols=[dict(row, csvLine=number) for number, row in symbols if row['address'] == address]))
    all_methods = selections + list(contexts.values())
    ranges = {method['label']: [(int(a, 16), int(b, 16)) for a, b in
        re.findall(r'([0-9a-f]{8})-([0-9a-f]{8})', method['bodyRanges'])] for method in all_methods}
    rows = {method['label']: [] for method in all_methods}
    assembly_hash = hashlib.sha256()
    with (original_dir / 'full_disassembly.asm').open('rb') as stream:
        for number, line in enumerate(stream, 1):
            assembly_hash.update(line)
            match = re.fullmatch(rb'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)', line.rstrip(b'\r\n'))
            if not match:
                continue
            address = int(match[1], 16)
            for label, spans in ranges.items():
                if not any(begin <= address <= end for begin, end in spans):
                    continue
                raw = bytes.fromhex(match[2].decode())
                original, span = pe.span(address, len(raw))
                assert original == raw and span['fileBackedBytes'] == len(raw)
                assert any(begin <= address and address + len(raw) - 1 <= end for begin, end in spans)
                rows[label].append(dict(va=match[1].decode(), rva=f'{address - pe.base:x}',
                    fileOffset=span['fileOffset'], bytes=match[2].decode(),
                    instruction=match[3].decode(), assemblyLine=number))
    assert assembly_hash.hexdigest() == PINS['assembly']
    for label, method in contexts.items():
        raw = b''.join(bytes.fromhex(row['bytes']) for row in rows[label])
        method.update(instructions=rows[label], instructionCount=len(rows[label]), bodyByteCount=len(raw),
            bodyInstructionBytesSha256=SHA(raw))
    assert contexts['memcpy']['bodyInstructionBytesSha256'] == 'f838a57733ec436508f0b40ed0f262cc84bb134c359061028cf5786c6b33e8ac'
    assert contexts['cInit2047e687']['bodyInstructionBytesSha256'] == '280d4120525139b7c7b95fd84ef829e9c941b090b363fbe2064a98dd7b6db915'
    output.mkdir(parents=True, exist_ok=True)
    generated = []
    original_records = {relative: file_record(study, relative, 'originalStudy') for relative in
        ['00_Original_Runtime/Game.dll', '01_Decompiled_Code/Game_dll/functions.csv',
         '01_Decompiled_Code/Game_dll/symbols.csv', '01_Decompiled_Code/Game_dll/full_disassembly.asm']}
    for method in contexts.values():
        if 'reconstructedC' in method:
            relative = method['reconstructedC']['path']
            original_records[relative] = file_record(study, relative, 'originalStudy')

    def emit(relative, raw):
        path = output / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)
        generated.append(file_record(output, relative, 'output'))

    for method in selections:
        method['instructions'] = rows[method['label']]
        body = b''.join(bytes.fromhex(row['bytes']) for row in method['instructions'])
        method.update(instructionCount=len(method['instructions']), bodyByteCount=len(body),
            bodyInstructionBytesSha256=SHA(body), sourceScope='original-file-backed-code-source',
            liveValueCaptured=False, runtimeOwnerImplemented=False, nativeOrBrowserCodeExecuted=False)
        original_spans = []
        for begin, end in ranges[method['label']]:
            raw, span = pe.span(begin, end - begin + 1)
            assert span['fileBackedBytes'] == len(raw) and span['loaderZeroFillBytes'] == 0
            original_spans.append(dict(address=f'{begin:08x}', exclusiveEnd=f'{end + 1:08x}',
                bytes=len(raw), raw=raw.hex(), knownMask='ff' * len(raw), sha256=SHA(raw),
                originalPE=span, liveValueCaptured=False))
        assert SHA(b''.join(bytes.fromhex(span['raw']) for span in original_spans)) == SHA(body)
        method['originalPEBodySpans'] = original_spans
        source_path = '01_Decompiled_Code/Game_dll/' + method['originalCatalog']['pseudocode_file']
        source_raw = (study / source_path).read_bytes()
        text = source_raw.decode('utf8')
        marker = '/* ENTRY ' + method['bodyVA'][2:] + ' |'
        begin = text.index(marker)
        end = text.find('/* ENTRY ', begin + 1)
        excerpt = '\n'.join(line.rstrip() for line in text[begin:end if end >= 0 else len(text)].rstrip().splitlines()) + '\n'
        method['reconstructedC'] = dict(path=source_path, sha256=SHA(source_raw),
            line=text[:begin].count('\n') + 1, status=method['originalCatalog']['status'])
        assert method['reconstructedC']['line'] == int(method['originalCatalog']['pseudocode_line'])
        original_records[source_path] = file_record(study, source_path, 'originalStudy')
        assembly = '\n'.join(row['va'] + ' | ' + row['bytes'] + ' | ' + row['instruction']
            for row in method['instructions']) + '\n'
        asm_path = 'sources/Game/' + method['bodyVA'][2:] + '.asm.txt'
        c_path = 'sources/Game/' + method['bodyVA'][2:] + '.c.txt'
        emit(asm_path, assembly.encode('utf8'))
        emit(c_path, excerpt.encode('utf8'))
        method['sourceRefs'] = dict(assembly=asm_path, assemblySha256=SHA(assembly.encode('utf8')),
            c=c_path, cSha256=SHA(excerpt.encode('utf8')),
            cNormalization='rstrip-line-whitespace; LF line endings; final newline')
    scalar_rows = {row['va']: row for row in rows['memcpy']}
    tables = {}
    for label, begin, end, reached, dispatch in TABLES:
        raw, span = pe.span(begin, end - begin)
        assert span['fileBackedBytes'] == len(raw) and span['loaderZeroFillBytes'] == 0
        assert span['section']['readable'] and not span['section']['writable']
        words = []
        for index, value in enumerate(struct.unpack('<' + 'I' * (len(raw) // 4), raw)):
            record = dict(index=index, address=f'{begin + index * 4:08x}',
                raw=raw[index * 4:index * 4 + 4].hex(), decodedDword=f'{value:08x}',
                selectorIndexReachable=index in reached)
            if index in reached:
                target = f'{value:08x}'
                assert target in scalar_rows
                record.update(classification='actual-scalar-dispatch-target', target=target,
                    targetInstruction=scalar_rows[target])
            else:
                preceding = scalar_rows[f'{begin - 4:08x}']
                assert raw[:3] == bytes.fromhex(preceding['bytes'])[4:7] and raw[3] == 0x90
                record.update(classification='unreachable-index0-instruction-tail-and-NOP', target=None,
                    overlappedInstruction=preceding, instructionTailBytes=3,
                    paddingAddress=f'{begin + 3:08x}', paddingRaw='90')
            words.append(record)
        relative = 'constants/' + label + '.bin'
        emit(relative, raw)
        tables[label] = dict(module='Game', address=f'{begin:08x}', exclusiveEnd=f'{end:08x}',
            bytes=len(raw), words=len(words), raw=raw.hex(), knownMask='ff' * len(raw), sha256=SHA(raw),
            scope='original-file-backed-scalar-dispatch-storage', liveValueCaptured=False,
            originalPE=span, rawRef=relative, decodedWords=words,
            dispatchInstructions=[scalar_rows[f'{address:08x}'] for address in dispatch])
    assert sum(table['words'] for table in tables.values()) == 32
    assert sum(word['selectorIndexReachable'] for table in tables.values() for word in table['decodedWords']) == 30
    tables['forwardTail']['negativeIndexAlias'] = dict(operandBase='20464054',
        instruction=scalar_rows['20463f4c'], logicalIndices=[-4, -3, -2, -1], physicalIndices=[0, 1, 2, 3])
    tables['backwardDwords']['negativeIndexAlias'] = dict(operandBase='20464190',
        instruction=scalar_rows['204640be'], logicalIndices=[-7, -6, -5, -4, -3, -2, -1, 0],
        physicalIndices=list(range(8)))
    cold, flag_span = pe.span(0x207d2b50, 4)
    assert cold == bytes(4) and flag_span['loaderZeroFillBytes'] == 4
    assert struct.unpack('<I', pe.span(0x20655628, 4)[0])[0] == 0x2047e687
    writer = contexts['cInit2047e687']
    assert writer['sourceCGap'] and writer['originalCatalogGap'] and writer['sourceASMGap'] is False
    assert '2047e687' not in catalog
    selected_by_address = {method['bodyVA'][2:]: method for method in selections}
    calls = []
    for method in selections:
        for row in method['instructions']:
            direct = re.fullmatch(r'CALL 0x([0-9a-f]{8})', row['instruction'])
            if direct:
                raw = bytes.fromhex(row['bytes'])
                target = f"{int(row['va'], 16) + 5 + struct.unpack_from('<i', raw, 1)[0]:08x}"
                assert target == direct[1] and raw[0] == 0xe8
                calls.append(dict(caller=method['label'], row=row, target=target,
                    originalCatalog=catalog[target][1], originalBodyCaptured=target in selected_by_address))
    tail = scalar_rows['20463f12']
    assert bytes.fromhex(tail['bytes'])[0] == 0xe9
    assert 0x20463f12 + 5 + struct.unpack_from('<i', bytes.fromhex(tail['bytes']), 1)[0] == 0x20469fe9
    dependencies = {name: file_record(repo, 'assets/gothic3/game-crt/' + name, 'repo')
        for name in ['runtime-rules.json', 'native-evidence.json', 'source-manifest.json']}
    evidence = dict(schema='gothic3-game-memcpy-supplement-evidence-v1', module='Game', inputs=PINS,
        originalSourcePaths=dict(study=str(study), runtime='00_Original_Runtime/Game.dll',
            assembly='01_Decompiled_Code/Game_dll/full_disassembly.asm',
            catalog='01_Decompiled_Code/Game_dll/functions.csv', symbols='01_Decompiled_Code/Game_dll/symbols.csv'),
        methods=selections, contextualOriginalMethods=contexts, sourceDependencies=dict(gameCrt=dependencies),
        directCalls=calls, directCallCaptureScope='Original body source captured in this supplement; not runtime execution.',
        tailJump=dict(caller='memcpy', row=tail, target='20469fe9', originalBodyCaptured=True),
        scalarJumpTables=tables,
        cpuFlag=dict(module='Game', address='207d2b50', bytes=4, raw=cold.hex(), knownMask='ffffffff',
            sha256=SHA(cold), originalPE=flag_span, scope='cold-original-image', liveValueCaptured=False,
            readInstruction=scalar_rows['20463ef8'], originalWriterEntry='2047e687',
            writerInstruction=next(row for row in writer['instructions'] if row['va'] == '2047e68c'),
            originalCInitializerSlot=dict(address='20655628', index=69, ordinal=5, priorNonNull=4,
                raw='87e64720', target='2047e687', tableAddress='20655514', tableExclusiveEnd='20655730')),
        sourceOrderConstraints=dict(environmentCallPC='204678c4', environmentMemcpyPC='20476952',
            cinitCallPC='204678f2', writerPhase='fifth nonnull C initializer after environment/IO/argv/envp',
            freshCanonicalColdZeroRequiresPriorWriterClosure=True, currentLiveFlagValueCaptured=False,
            noSubstitutionOfColdMetadataForLiveRead=True),
        sourceFacts=dict(vectorImports=[], vectorGlobalReads=[], ownMethods=2,
            scalarStorageWords=32, actualScalarDispatchTargets=30, unreachableOverlappedWords=2,
            scalarStorageBytes=128, vectorOriginalCGap=False),
        implementationRequirements=[
            'Read the current canonical Game CPU DWORD before any forward >=256-byte scalar peel/store.',
            'A zero flag or unequal low-four pointer bits selects scalar copying; backward overlap bypasses CPU dispatch.',
            'Vector execution requires actual modulo16 and signed x86 placement proof; current modulo4 geometry is insufficient.',
            'REP paths require actual DF-forward state; preserve native STD/CLD state changes on backward-copy interruption.',
            '20469fe9 applies signed remainder calculations, byte alignment peel, recursion, bulk helper and byte tail.',
            '20469f62 performs four 16-byte loads then four stores, followed by another four loads/stores in each128-byte block.',
            'Preserve each native load/store width, order, unknown mask and already completed prefix at a blocked operation.',
            'Native pointers must retain canonical alias/allocation identity and lifetime; do not infer native alignment from JS storage.',
            'Scalar jump-table cells need actual canonical backing/read ownership, including negative-index aliases.',
            'Memcpy returns the original destination pointer; no host slice, arbitrary chunking, cold reseed or invented cleanup.',
        ], sourceOnly=True, runtimeOwnerImplemented=False, nativeOrBrowserCodeExecuted=False,
        wholeGameAttachOrCrtTraversalImplemented=False)
    emit('native-evidence.json', (json.dumps(evidence, separators=(',', ':')) + '\n').encode('utf8'))
    readme = '''# Game memcpy source supplement

Reproduce from the repository root (replace STUDY with the original decompiled-study directory):

    python -B scripts/gothic3_game_memcpy_supplement.py --study "STUDY" --repo . --output assets/gothic3/game-memcpy

This package captures original PE/catalog/C/ASM for 20469fe9 and 20469f62. The scalar memcpy, environment, attach, cinit and ASM-only CPU-flag writer are original source context. No runtime owner, current live values, native execution or full startup is claimed.

Six original readonly .text ranges contain 32 DWORDs /128 bytes. Thirty are actual scalar dispatch targets. Two unreachable selector-index0 words overlap an indirect JMP tail and NOP; retain their raw bytes and canonical code aliases. Forward short-copy dispatch uses negative indices at base 20464054; backward DWORD dispatch uses base 20464190. Every real target has an original scalar instruction receipt.

Forward copies >=256 bytes read current Game 207d2b50 before any peel/store. Fresh cold zero can select scalar execution only after proving prior writer/order history; original cold metadata is not a live read. Vector execution requires native modulo16, signed placement and direction-flag proof. Preserve the SSE helper's four 16-byte loads/four stores, then four loads/four stores per 128-byte block, with native masks, aliases, lifetimes and completed prefixes.

The producer is self-contained Python standard-library code. Its final repository path and the original source files and existing Game CRT dependency records are pinned in source-manifest.json. Regeneration does not modify the older Game CRT package.
'''
    emit('README.md', readme.encode('utf8'))
    assert snapshot(old_game) == before
    producer = Path(__file__).resolve()
    producer_record = dict(location='repo', path=producer.relative_to(repo).as_posix(),
        bytes=producer.stat().st_size, sha256=SHA(producer.read_bytes()))
    records = generated + [producer_record] + list(original_records.values()) + list(dependencies.values())
    manifest = dict(schema='gothic3-game-memcpy-supplement-source-manifest-v1', inputs=PINS,
        roots=dict(originalStudy=str(study)), producerPath=producer.relative_to(repo).as_posix(),
        usesOnlyPythonStandardLibrary=True, sourceOnly=True,
        manifestSelfReferenceExcluded=True,
        files=sorted(records, key=lambda record: (record['location'], record['path'])))
    (output / 'source-manifest.json').write_bytes((json.dumps(manifest, separators=(',', ':')) + '\n').encode('utf8'))
    print(json.dumps(dict(methods=[{key: method[key] for key in
        ['label', 'bodyVA', 'instructionCount', 'bodyByteCount', 'bodyInstructionBytesSha256']}
        for method in selections], scalarWords=32, actualTargets=30, unreachableOverlappedWords=2,
        generatedFilesIncludingManifest=len(generated) + 1, manifestRecords=len(records),
        preservedGameCrtFiles=len(before), producerSha256=producer_record['sha256'],
        evidenceSha256=SHA((output / 'native-evidence.json').read_bytes()),
        manifestSha256=SHA((output / 'source-manifest.json').read_bytes()))))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    parser.add_argument('--repo', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    arguments = parser.parse_args()
    capture(arguments.study.resolve(), arguments.repo.resolve(), arguments.output.resolve())
