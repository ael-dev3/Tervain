"""Recover original Arena Status descriptor virtual methods and cold image data."""
import argparse
import hashlib
import json
import struct
from pathlib import Path
import read_dialogue_native_evidence as native
from prepare_runtime_admin_source import image_bytes, source_excerpt
from prepare_arena_type_source import GAME_SHA

def capture(study, output):
    raw = (study / '00_Original_Runtime/Game.dll').read_bytes()
    assert hashlib.sha256(raw).hexdigest() == GAME_SHA
    pe = native.PE(raw)
    slots = {offset: struct.unpack('<I', pe.bytes(0x20659aec + offset, 4))[0]
             for offset in range(0, 24, 4)}
    targets = {address: f'statusVirtualSlot{offset:02x}' for offset, address in slots.items()}
    targets.update({0x2002ad8d: 'createStatus', 0x20070e90: 'resetStatusStorage', 0x204b1dd0: 'statusInitializer'})
    audit = native.audit_module(study, 'Game_dll', 'Game.dll', targets)
    output.mkdir(parents=True, exist_ok=True)
    methods = {}
    for method in audit['methods']:
        body = method['bodyVA'][2:]
        asm = ('\n'.join(row['va'] + ' | ' + row['bytes'] + ' | ' + row['instruction']
                         for row in method['instructions']) + '\n').encode('utf-8')
        c = source_excerpt(study, method).encode('utf-8')
        (output / (body + '.asm.txt')).write_bytes(asm)
        (output / (body + '.c.txt')).write_bytes(c)
        methods[method['label']] = {key: method[key] for key in
            ['entryVA', 'bodyVA', 'bodyRanges', 'instructionCount', 'bodyByteCount',
             'bodyInstructionBytesSha256', 'entryChain']}
        methods[method['label']].update(assemblySha256=hashlib.sha256(asm).hexdigest(),
                                       cSha256=hashlib.sha256(c).hexdigest())
    cold, section = image_bytes(pe, 0x207b5038, 36)
    assert cold == bytes(36)
    assert pe.bytes(0x20657534, 7) == b'Status\0'
    decorated = b'.?AV?$bTPropertyContainer@W4gEArenaStatus@@@@\0'
    descriptor, descriptor_section = image_bytes(pe, 0x20797e58, 8 + len(decorated))
    assert descriptor[:8] == bytes.fromhex('74636b2000000000')
    assert descriptor[8:] == decorated
    cache, cache_section = image_bytes(pe, 0x207b4f58, 12)
    prior, prior_section = image_bytes(pe, 0x207b5020, 4)
    assert cache == bytes(12) and prior == bytes(4)
    cleanup_thunk = pe.bytes(0x200064f1, 5)
    assert cleanup_thunk[0] == 0xe9
    assert 0x200064f1 + 5 + struct.unpack('<i', cleanup_thunk[1:])[0] == 0x20549920
    cleanup = pe.bytes(0x20549920, 11)
    assert cleanup == bytes.fromhex('b9584f7b20ff2534887d20')
    import_slots = {'0x207d8794','0x207d87d8','0x207d87dc','0x207d86dc','0x207d87cc','0x207d890c','0x207d8834'}
    imports = [row for row in pe.imports() if row['iatVA'] in import_slots]
    assert len(imports) == len(import_slots)
    assert all(row['module'] == 'SharedBase.dll' and row['ordinal'] is None for row in imports)
    result = dict(schema='gothic3-arena-status-descriptor-v1', gameSha256=GAME_SHA,
                  methods=methods, vtableAddress='20659aec', vtableRaw=pe.bytes(0x20659aec,24).hex(),
                  slots={f'{offset:02x}': f'{address:08x}' for offset, address in slots.items()},
                  coldDescriptor=dict(address='207b5038', raw=cold.hex(), section=section),
                  nameLiteral=dict(address='20657534', raw='53746174757300'),
                  typeNameCache=dict(address='207b4f58', raw=cache.hex(), section=cache_section),
                  priorNameResult=dict(address='207b5020', raw=prior.hex(), section=prior_section),
                  typeInfoDescriptor=dict(address='20797e58', raw=descriptor.hex(),
                                          section=descriptor_section, decoratedName=decorated[:-1].decode()),
                  typeNameCleanup=dict(entry='200064f1', entryBytes=cleanup_thunk.hex(),
                                       body='20549920', bodyBytes=cleanup.hex(),
                                       bodyInstructionBytesSha256=hashlib.sha256(cleanup).hexdigest(),
                                       destination='207b4f58', sharedCStringDestructorIat='207d8834',
                                       recovery='Exact original PE bytes: MOV ECX,cache; JMP [CString destructor IAT]'),
                  imports=dict(Game=imports), sourceOnly=True, wholeCrtTraversalCompleted=False)
    (output / 'source.json').write_bytes((json.dumps(result, indent=2) + '\n').encode('utf-8'))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    capture(args.study, args.output)
