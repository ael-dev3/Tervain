"""Capture original Game __cinit math dependencies. No runtime grant is issued."""
import argparse
import hashlib
import json
import struct
import re
from pathlib import Path

from read_dialogue_native_evidence import PE, audit_module, EXPECTED_INPUTS
from prepare_runtime_admin_source import image_bytes

TARGETS = {
    0x204665f4: 'cinit', 0x204738b0: 'isNonwritableInCurrentImage',
    0x20473830: 'validateImageBase', 0x20473860: 'findPESection',
    0x20463917: 'fpMath', 0x204638a7: 'floatConversionInit',
    0x204696f6: 'pentiumDivideDispatch', 0x204696ba: 'pentiumDivideTest',
    0x20469691: 'setDefaultPrecision', 0x2047df48: 'controlFpSecure',
    0x20469672: 'encodeFloatPointers',
    0x2048c74b: 'control87', 0x2046a282: 'errno',
    0x2046a20a: 'invalidParameterDispatch', 0x20467d64: 'encodePointer',
    0x2046a0d6: 'invokeWatson',
    0x2048bdff: 'hardwareControlWord', 0x2048bf68: 'hardwareSse2ControlWord',
    0x204864ec: 'setSse2FloatingPointStatus',
    # The first callback is independently admitted by the existing Game CRT
    # package. Its missing catalog entry must not be fabricated here.
    0x2046643f: 'errorInitializerWalker',
    0x2047e627: 'querySse2Availability', 0x2047e5d7: 'probeSse2Execution',
}


def supplemental_callbacks(pe):
    package = Path(__file__).resolve().parents[2] / 'assets/gothic3/game-cinit-callbacks'
    index = json.loads((package / 'callback-index.json').read_text(encoding='utf8'))
    methods = []
    for address, label in [('20469f3a', 'initializeConversionSse2'),
                           ('2047470c', 'initializeStdioTable'),
                           ('2047e687', 'initializeFloatingPointSse2')]:
        receipt = index['callbacks'][address]
        data = (package / receipt['assembly']).read_bytes()
        if hashlib.sha256(data).hexdigest() != receipt['assemblySha256']:
            raise ValueError('Supplemental callback assembly differs')
        if hashlib.sha256((package / receipt['c']).read_bytes()).hexdigest() != receipt['cSha256']:
            raise ValueError('Supplemental callback C receipt differs')
        rows = []
        for number, line in enumerate(data.decode('utf8').splitlines(), 1):
            match = re.fullmatch(r'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)', line)
            if not match:
                raise ValueError('Supplemental callback assembly row differs')
            va, code, instruction = match.groups()
            raw = bytes.fromhex(code)
            if pe.bytes(int(va, 16), len(raw)) != raw:
                raise ValueError('Supplemental callback original PE bytes differ')
            rows.append(dict(va=va, rva=f'{int(va,16)-pe.base:x}', bytes=code,
                             instruction=instruction, fileOffset=pe.offset(int(va,16),len(raw)),
                             assemblyLine=number, assemblySource=receipt['assembly'],
                             assemblyOrigin='supplemental-ghidra-recovery'))
        joined = b''.join(bytes.fromhex(row['bytes']) for row in rows)
        if len(rows) != receipt['instructionCount'] or hashlib.sha256(joined).hexdigest() != receipt['instructionBytesSha256']:
            raise ValueError('Supplemental callback instruction extent differs')
        methods.append(dict(label=label, entryVA='0x'+address, bodyVA='0x'+address,
                            bodyRanges=receipt['bodyRanges'], entryChain=[], instructions=rows,
                            bodyInstructionBytesSha256=receipt['instructionBytesSha256'],
                            supplementalReceipt=receipt, verifiedAgainstOriginalPE=True))
    return methods


def capture(study):
    data = (study / '00_Original_Runtime/Game.dll').read_bytes()
    if hashlib.sha256(data).hexdigest() != EXPECTED_INPUTS['Game.dll']:
        raise ValueError('Original Game DLL differs')
    pe = PE(data)
    evidence = audit_module(study, 'Game_dll', 'Game.dll', TARGETS)
    evidence['methods'].extend(supplemental_callbacks(pe))
    # The shutdown walker lacks a function-catalog entry. Recover its explicit
    # contiguous extent from the retained disassembly and verify every PE byte.
    # This receipt does not claim a decompiled C function or a catalog entry.
    assembly = study / '01_Decompiled_Code/Game_dll/full_disassembly.asm'
    rows = []
    with assembly.open('rb') as stream:
        for number, line in enumerate(stream, 1):
            match = re.fullmatch(rb'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)', line.rstrip(b'\r\n'))
            if not match:
                continue
            va, code, instruction = (part.decode('utf8') for part in match.groups())
            address = int(va, 16)
            if 0x20473801 <= address <= 0x20473824:
                raw = bytes.fromhex(code)
                if pe.bytes(address, len(raw)) != raw:
                    raise ValueError('Shutdown walker PE bytes differ')
                rows.append(dict(va=va, rva=f'{address-pe.base:x}', bytes=code,
                                 instruction=instruction, assemblyLine=number,
                                 fileOffset=pe.offset(address, len(raw))))
    cursor = 0x20473801
    for row in rows:
        if int(row['va'], 16) != cursor:
            raise ValueError('Shutdown walker extent is not contiguous')
        cursor += len(row['bytes']) // 2
        if row['instruction'].startswith(('JZ ', 'JNC ', 'JC ')) and row['instruction'][3:].strip() not in {'0x20473822', '0x2047381b', '0x20473813'}:
            raise ValueError('Shutdown walker branch extent differs')
    if len(rows) != 17 or cursor != 0x20473825 or rows[-1]['instruction'] != 'RET':
        raise ValueError('Shutdown walker complete bounded extent differs')
    evidence['methods'].append(dict(label='staticFiniWalker', entryVA='0x20473801',
        bodyVA='0x20473801', bodyRanges='20473801-20473824', entryChain=[], instructions=rows,
        bodyInstructionBytesSha256=hashlib.sha256(b''.join(bytes.fromhex(row['bytes']) for row in rows)).hexdigest(),
        recoveryOrigin='explicit-contiguous-original-disassembly-extent',
        functionCatalogEntryPresent=False, verifiedAgainstOriginalPE=True))
    nt = struct.unpack_from('<I', data, 0x3c)[0]
    section_count = struct.unpack_from('<H', data, nt + 6)[0]
    optional_size = struct.unpack_from('<H', data, nt + 20)[0]
    header_end = nt + 24 + optional_size + section_count * 40
    headers = data[:header_end]
    imports = {row['iatVA']: row for row in pe.imports()}
    observed_imports = [imports[key] for key in ('0x207d7b5c', '0x207d7c94')]
    literals = []
    for label, address, size in (
        ('mathCallback', 0x206b638c, 4), ('divideNumerator', 0x206b64f8, 8),
        ('divideDenominator', 0x206b6500, 8), ('divideExport', 0x206b6508, 28),
        ('divideModule', 0x206b6524, 9), ('floatPointerTable', 0x207b2330, 40),
        ('nonwritableEH4Scope', 0x206e8db0, 28),
        ('divideErratum', 0x207d0a24, 4), ('sse2Available', 0x207d2b50, 4),
        ('cInitializerTable', 0x20655514, 540),
        ('sse2ConversionAvailable', 0x207d2b40, 4), ('sse2ProbeEH4Scope', 0x206e9018, 28),
        ('stdioCount', 0x207d29c0, 4), ('stdioVector', 0x207d1664, 4),
        ('stdioFiles', 0x207b2e50, 640),
        ('staticFiniTable', 0x206e86e0, 256),
        ('cppInitializerTable', 0x2056c000, 955408),
    ):
        raw, _ = image_bytes(pe, address, size)
        literals.append({'label': label, 'address': f'{address:08x}', 'bytes': size,
                         'raw': raw.hex(), 'sha256': hashlib.sha256(raw).hexdigest()})
    return {
        'schema': 'gothic3-game-cinit-math-evidence-v1', 'module': evidence,
        'originalHeaders': {'address': f'{pe.base:08x}', 'bytes': len(headers),
                            'raw': headers.hex(), 'sha256': hashlib.sha256(headers).hexdigest()},
        'literals': literals, 'divideDispatchImports': observed_imports,
        'sourceOnly': True, 'runtimeOwnerAdmitted': False,
        'nextWork': ['Own the original PE header and section views on the existing Game image',
                     'Execute the section protection check and original callback frame',
                     'Own x87 control/status, stack and divide-test semantics',
                     'Execute pointer encoding and the original initializer tables'],
    }


def emit_runtime(result, path):
    selected = ['cinit', 'isNonwritableInCurrentImage', 'validateImageBase', 'findPESection',
                'fpMath', 'floatConversionInit', 'pentiumDivideDispatch', 'encodeFloatPointers',
                'errorInitializerWalker', 'initializeConversionSse2', 'initializeFloatingPointSse2',
                'querySse2Availability', 'probeSse2Execution', 'initializeStdioTable']
    methods = [{key: method[key] for key in ('label', 'entryVA', 'bodyRanges',
                'bodyInstructionBytesSha256', 'instructions')}
               for method in result['module']['methods'] if method['label'] in selected]
    if len(methods) != len(selected):
        raise ValueError('Selected cinit/PE method scope differs')
    images = {'cinitPEHeaders': result['originalHeaders']}
    for label, original in [('cinitMathCallback', 'mathCallback'),
                            ('cinitNonwritableEH4Scope', 'nonwritableEH4Scope'),
                            ('cinitFloatPointerTable', 'floatPointerTable'),
                            ('cinitDivideModule', 'divideModule'), ('cinitDivideExport', 'divideExport'),
                            ('cinitDivideErratum', 'divideErratum'), ('cinitSse2Available', 'sse2Available'),
                            ('cinitCInitializerTable', 'cInitializerTable'),
                            ('cinitSse2ConversionAvailable', 'sse2ConversionAvailable'),
                            ('cinitSse2ProbeEH4Scope', 'sse2ProbeEH4Scope'),
                            ('cinitStdioCount', 'stdioCount'), ('cinitStdioVector', 'stdioVector'),
                            ('cinitStdioFiles', 'stdioFiles'),
                            ('cinitCppInitializerTable', 'cppInitializerTable')]:
        images[label] = next(row for row in result['literals'] if row['label'] == original)
    cold = {'cinitFloatPointerTable', 'cinitDivideErratum', 'cinitSse2Available', 'cinitSse2ConversionAvailable',
            'cinitStdioCount', 'cinitStdioVector', 'cinitStdioFiles'}
    pins = {label: ['coldGlobals' if label in cold else 'constBytes', row['address'], row['bytes'], row['raw'], row['sha256']]
            for label, row in images.items()}
    compact = lambda value: json.dumps(value, separators=(',', ':'), ensure_ascii=False)
    text = '''/** Selected original Game cinit, PE-check and math callback source admission. */
import sourceText from '../../assets/gothic3/game-cinit-math-source/source.json?raw';
import type { NativeGameIoInstruction } from './native-game-crt-io-source';
import type { NativeCrtImageReceipt } from './native-game-crt-profile';
const methods = __METHODS__;
const staticFini = __FINI__;
export const gameCinitImagePins: Readonly<Record<string, readonly ['constBytes'|'coldGlobals', string, number, string, string]>> = __PINS__;
const source = JSON.parse(sourceText);
function freeze(value: unknown): void {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child); Object.freeze(value);
  }
}
freeze(methods); freeze(staticFini); freeze(gameCinitImagePins); freeze(source);
let admitted = false;
export function admitGameCinitSource(): void {
  if (admitted) return;
  if (source.schema !== 'gothic3-game-cinit-math-evidence-v1' || source.sourceOnly !== true ||
      source.runtimeOwnerAdmitted !== false || source.module.inputSha256 !== '__GAME__' ||
      source.module.verifiedAgainstOriginalPE !== true) throw new Error('Original Game cinit source scope differs');
  for (const method of methods) {
    const original = source.module.methods.find((row: { label: string }) => row.label === method.label);
    if (!original || Object.keys(method).some(key => JSON.stringify(original[key]) !== JSON.stringify(method[key as keyof typeof method])))
      throw new Error('Original Game cinit method differs: ' + method.label);
  }
  const originalFini = source.module.methods.find((row: { label: string }) => row.label === staticFini.label);
  if (!originalFini || JSON.stringify(originalFini) !== JSON.stringify(staticFini))
    throw new Error('Original Game static shutdown receipt differs');
  for (const [label, pin] of Object.entries(gameCinitImagePins)) {
    const names: Record<string,string> = {cinitMathCallback:'mathCallback',cinitNonwritableEH4Scope:'nonwritableEH4Scope',
      cinitFloatPointerTable:'floatPointerTable',cinitDivideModule:'divideModule',cinitDivideExport:'divideExport',
      cinitDivideErratum:'divideErratum',cinitSse2Available:'sse2Available',cinitCInitializerTable:'cInitializerTable',
      cinitSse2ConversionAvailable:'sse2ConversionAvailable',cinitSse2ProbeEH4Scope:'sse2ProbeEH4Scope',
      cinitStdioCount:'stdioCount',cinitStdioVector:'stdioVector',cinitStdioFiles:'stdioFiles',
      cinitCppInitializerTable:'cppInitializerTable'};
    const original = label === 'cinitPEHeaders' ? source.originalHeaders : source.literals.find((row: { label: string }) => row.label === names[label]);
    if (!original || original.address !== pin[1] || original.bytes !== pin[2] || original.raw !== pin[3] || original.sha256 !== pin[4])
      throw new Error('Original Game cinit image differs: ' + label);
  }
  admitted = true;
}
export function gameCinitInstruction(pc: string): NativeGameIoInstruction {
  admitGameCinitSource();
  for (const method of methods) {
    const point = method.instructions.find(row => row.va === pc);
    if (point) return point;
  }
  throw new Error('No admitted original Game cinit instruction: ' + pc);
}
/** Source callback data only: this does not admit shutdown traversal. */
export function gameCinitStaticFiniReceipt() {
  admitGameCinitSource();
  return Object.freeze({ module: 'Game' as const, entry: staticFini.entryVA.slice(2),
    body: staticFini.bodyVA.slice(2), bodyInstructionBytesSha256: staticFini.bodyInstructionBytesSha256 });
}
export function gameCinitImageReceipt(label: string): NativeCrtImageReceipt {
  admitGameCinitSource(); const pin = gameCinitImagePins[label];
  if (!pin) throw new Error('No admitted original Game cinit image: ' + label);
  return Object.freeze({ module: 'Game', address: pin[1], bytes: pin[2], raw: pin[3],
    knownMask: 'ff'.repeat(pin[2]), sha256: pin[4], scope: pin[0]==='coldGlobals'?'cold-original-image':'original-file-backed-constant', liveValueCaptured: false });
}
'''
    text = text.replace('__METHODS__', compact(methods)).replace('__PINS__', compact(pins))
    text = text.replace('__FINI__', compact(next(row for row in result['module']['methods'] if row['label'] == 'staticFiniWalker')))
    text = text.replace('__GAME__', EXPECTED_INPUTS['Game.dll'])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8', newline='\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--runtime-output', type=Path)
    args = parser.parse_args()
    result = capture(args.study)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n',
                           encoding='utf-8', newline='\n')
    if args.runtime_output:
        emit_runtime(result, args.runtime_output)
    print('Captured', len(result['module']['methods']), 'original methods; no execution granted')
