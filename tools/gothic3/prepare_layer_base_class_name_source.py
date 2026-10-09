"""Recover Game's first C++ class-name initializer without executing it."""
import argparse
import hashlib
import json
import re
import struct
from pathlib import Path

from read_dialogue_native_evidence import PE, audit_module, EXPECTED_INPUTS
from prepare_runtime_admin_source import image_bytes


def capture(study, callbacks):
    original = (study / '00_Original_Runtime/Game.dll').read_bytes()
    if hashlib.sha256(original).hexdigest() != EXPECTED_INPUTS['Game.dll']:
        raise ValueError('Original Game module differs')
    pe = PE(original)
    module = audit_module(study, 'Game_dll', 'Game.dll', {0x2000e8d6: 'layerBaseClassName'})
    # This callback was recovered in a separate Ghidra project. Keep that
    # provenance, and independently check every instruction against Game.dll.
    index = json.loads((callbacks / 'callback-index.json').read_text(encoding='utf-8'))
    if index['inputs']['Game'] != EXPECTED_INPUTS['Game.dll']:
        raise ValueError('Callback package belongs to a different Game module')
    initializer = index['callbacks']['204b11b0']
    expected_refs = {
        'assembly': ('sources/Game/204b11b0.asm.txt',
                     'afa0d66a727f9a7b5b27a016fdb518e4ba1346db15be1973fd6dec079111bc1d'),
        'c': ('sources/Game/204b11b0.c.txt',
              '249a7b1bc92cbc0ff28a2a06dad23b6aa24dba17c75e553f9b93a397e0cfba35'),
    }
    listings = {}
    for kind, (reference, digest) in expected_refs.items():
        data = (callbacks / reference).read_bytes()
        if (initializer[kind] != reference or initializer[kind + 'Sha256'] != digest
                or hashlib.sha256(data).hexdigest() != digest):
            raise ValueError('Recovered LayerBase initializer listing differs')
        listings[kind] = data
    initializer_rows = []
    for line in listings['assembly'].splitlines():
        match = re.fullmatch(rb'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)', line)
        if not match:
            raise ValueError('Malformed LayerBase initializer instruction')
        address, raw = int(match[1], 16), bytes.fromhex(match[2].decode())
        if pe.bytes(address, len(raw)) != raw:
            raise ValueError('LayerBase initializer differs from original PE')
        initializer_rows.append(dict(va=f'{address:08x}', bytes=raw.hex(),
                                     instruction=match[3].decode(), fileOffset=pe.offset(address, len(raw)),
                                     rva=f'{address - 0x20000000:08x}', assemblyLine=len(initializer_rows) + 1))
    if [(row['va'], row['bytes'], row['instruction']) for row in initializer_rows] != [
        ('204b11b0', 'e821d7b5ff', 'CALL 0x2000e8d6'),
        ('204b11b5', 'a360477b20', 'MOV [0x207b4760],EAX'),
        ('204b11ba', 'c3', 'RET')]:
        raise ValueError('Complete LayerBase initializer extent differs')
    if (initializer['origin']['kind'] != 'supplemental-ghidra-recovery'
            or initializer['origin']['catalogGap'] is not True
            or initializer['instructionCount'] != 3 or initializer['instructionBytes'] != 11
            or initializer['instructionBytesSha256'] !=
            '9ef3a3702a68d5acc912a540b56a92930392f736c54362248a9ef0c2b76a29ff'):
        raise ValueError('LayerBase initializer recovery receipt differs')
    module['methods'].append(dict(label='layerBaseClassNameInitializer', entryVA='0x204b11b0',
        bodyVA='0x204b11b0', bodyRanges=initializer['bodyRanges'], instructions=initializer_rows,
        entryChain=[], bodyInstructionBytesSha256=initializer['instructionBytesSha256'],
        recoveryOrigin=initializer['origin'], functionCatalogEntryPresent=False,
        sourceRefs={kind: dict(path=reference, sha256=digest)
                    for kind, (reference, digest) in expected_refs.items()}, verifiedAgainstOriginalPE=True))
    # The destructor body is absent from the function catalog. Preserve an
    # explicit ASM/PE recovery, including its real forwarding entry.
    entry, body, end = 0x20034649, 0x20549180, 0x2054918a
    forwarding = pe.bytes(entry, 5)
    if forwarding[0] != 0xe9 or entry + 5 + struct.unpack('<i', forwarding[1:])[0] != body:
        raise ValueError('Original LayerBase destructor forwarding entry differs')
    rows = []
    assembly = study / '01_Decompiled_Code/Game_dll/full_disassembly.asm'
    with assembly.open('rb') as stream:
        for number, line in enumerate(stream, 1):
            match = re.fullmatch(rb'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)', line.rstrip(b'\r\n'))
            if not match or not body <= int(match[1], 16) <= end:
                continue
            address = int(match[1], 16)
            raw = bytes.fromhex(match[2].decode())
            if pe.bytes(address, len(raw)) != raw:
                raise ValueError('Original LayerBase destructor PE bytes differ')
            rows.append(dict(va=f'{address:08x}', bytes=raw.hex(), instruction=match[3].decode(),
                             assemblyLine=number, fileOffset=pe.offset(address, len(raw))))
    if [(row['va'], row['instruction']) for row in rows] != [
        ('20549180', 'MOV ECX,0x207b4580'), ('20549185', 'JMP dword ptr [0x207d8834]')]:
        raise ValueError('Complete LayerBase destructor extent differs')
    module['methods'].append(dict(label='layerBaseClassNameDestructor', entryVA=f'0x{entry:08x}',
        bodyVA=f'0x{body:08x}', bodyRanges=f'{body:08x}-{end:08x}', instructions=rows,
        entryChain=[dict(va=f'{entry:08x}', bytes=forwarding.hex(), targetVA=f'{body:08x}')],
        bodyInstructionBytesSha256=hashlib.sha256(b''.join(bytes.fromhex(row['bytes']) for row in rows)).hexdigest(),
        recoveryOrigin='explicit-original-disassembly-extent', functionCatalogEntryPresent=False,
        verifiedAgainstOriginalPE=True))
    descriptor, _ = image_bytes(pe, 0x20796004, 512)
    terminator = descriptor.index(0, 8)
    descriptor_size = (terminator + 4) // 4 * 4
    if struct.unpack_from('<I', descriptor)[0] != 0x206b6374:
        raise ValueError('Original Game type_info vtable differs')
    images = []
    for label, address, size in [('layerBaseClassName', 0x207b4580, 12),
                                 ('layerBaseInitializerResult', 0x207b4760, 4),
                                 ('layerBaseInitializerSlot', 0x2056c104, 4),
                                 ('layerBaseTypeInfoDescriptor', 0x20796004, descriptor_size)]:
        raw, _ = image_bytes(pe, address, size)
        images.append(dict(label=label, address=f'{address:08x}', bytes=size, raw=raw.hex(),
                           sha256=hashlib.sha256(raw).hexdigest(), liveValueCaptured=False))
    if images[2]['raw'] != 'b0114b20':
        raise ValueError('Original first C++ callback slot differs')
    imports = [row for row in pe.imports() if row['iatVA'] in {'0x207d8830', '0x207d8834'}]
    if len(imports) != 2 or any(row['module'] != 'SharedBase.dll' for row in imports):
        raise ValueError('Original class-name imports differ')
    return dict(schema='gothic3-layer-base-class-name-evidence-v1', module=module, images=images,
                decoratedName=descriptor[8:terminator].decode('ascii'), imports=imports,
                producerSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                sourceOnly=True, executionAdmitted=False, wholeCrtTraversalCompleted=False,
                fullCampaignCompleted=False)


def write_runtime(result, output):
    # The frozen receipt is independent of the imported package at runtime.
    # Regeneration requires the same PE and recovered-listing checks above.
    template = '''/** Generated original Game LayerBase source admission; no initializer execution. */
import sourceText from '../../assets/gothic3/layer-base-class-name/source.json?raw';
import type { NativeCrtSourceRules, NativeCrtImageReceipt } from './native-game-crt-profile';
import type { NativeGameIoInstruction } from './native-game-crt-io-source';
const expected = __EXPECTED__ as const;
const source: typeof expected = JSON.parse(sourceText);
function equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => Object.hasOwn(right, key) && equal(left[key], right[key]));
}
function freeze(value: unknown): void {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
}
freeze(source);
export function admitGameLayerBaseSource(): void {
  if (!equal(source, expected)) throw new Error('Original Game LayerBase class-name source differs');
}
admitGameLayerBaseSource();
const coldGlobals: Record<string, NativeCrtImageReceipt> = {};
const constBytes: Record<string, NativeCrtImageReceipt> = {};
export const gameLayerBaseImagePins: Record<string, readonly ['coldGlobals' | 'constBytes', string, number, string, string]> = {};
for (const image of source.images) {
  const kind = image.label === 'layerBaseInitializerSlot' ? 'constBytes' : 'coldGlobals';
  const receipt = { ...image, module: 'Game', knownMask: 'ff'.repeat(image.bytes),
    scope: kind === 'constBytes' ? 'original-file-backed-constant' : 'cold-original-image' };
  (kind === 'constBytes' ? constBytes : coldGlobals)[image.label] = receipt;
  gameLayerBaseImagePins[image.label] = [kind, image.address, image.bytes, image.raw, image.sha256];
}
export const gameLayerBaseSourceRules: NativeCrtSourceRules = {
  schema: source.schema, inputs: { Game: source.module.inputSha256 },
  methods: Object.fromEntries(source.module.methods.map(method => [method.label, {
    ...method, module: 'Game', entry: method.entryVA.slice(2), body: method.bodyVA.slice(2),
  }])), coldGlobals, constBytes, imports: { Game: source.imports },
};
freeze(gameLayerBaseSourceRules);
freeze(gameLayerBaseImagePins);
export function gameLayerBaseImageReceipt(label: string): NativeCrtImageReceipt {
  admitGameLayerBaseSource();
  const pin = gameLayerBaseImagePins[label];
  if (!pin) throw new Error('Unknown original Game LayerBase image label');
  return gameLayerBaseSourceRules[pin[0]][label]!;
}
/** Only the three independently verified initializer rows are interpreted. */
export function gameLayerBaseInitializerInstruction(address: string): NativeGameIoInstruction {
  admitGameLayerBaseSource();
  const initializer = source.module.methods.find(method => method.label === 'layerBaseClassNameInitializer')!;
  const row = initializer.instructions.find(point => point.va === address);
  if (!row) throw new Error('Unowned original LayerBase initializer instruction: ' + address);
  return row;
}
'''
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(template.replace('__EXPECTED__', json.dumps(result, indent=2)),
                      encoding='utf-8', newline='\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--callbacks', type=Path,
                        default=Path(__file__).resolve().parents[2] / 'assets/gothic3/game-cinit-callbacks')
    parser.add_argument('--runtime-output', type=Path)
    args = parser.parse_args()
    result = capture(args.study, args.callbacks)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8', newline='\n')
    if args.runtime_output:
        write_runtime(result, args.runtime_output)
    print('Captured original LayerBase initializer, getter, destructor and physical images; no execution granted')
