"""Capture the pinned Engine CRT initializer and its immediate dependencies."""
import argparse
import hashlib
import json
import struct
from pathlib import Path
from read_dialogue_native_evidence import EXPECTED_INPUTS, PE, audit_module


def capture(study):
    EXPECTED_INPUTS['Engine.dll'] = 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'
    source = audit_module(study, 'Engine_dll', 'Engine.dll', {
        0x3067d1c7: 'engineCinit',
        0x3068aa20: 'engineReadonlyPointer',
        0x3068a9a0: 'engineValidateImage',
        0x3068a9d0: 'engineFindSection',
        0x30671672: 'engineFpInit',
        0x30671602: 'engineFloatConversionInit',
        0x3067f611: 'engineDivideDispatch',
        0x3067f5ac: 'enginePrecisionInit',
        0x3067f58d: 'engineEncodeFloatPointers',
        0x3067d012: 'engineErrorInitializerWalker',
        0x30671596: 'engineExitRegistration',
    })
    pe = PE((study / '00_Original_Runtime/Engine.dll').read_bytes())
    caller = pe.bytes(0x30677284, 27)
    if caller.hex() != '85c07c176a00e8385f000085c059750bff05d070af30e9ac000000':
        raise ValueError('Original Engine initializer caller differs')
    tables = []
    for label, begin, end in [
        ('errorInitializers', 0x30816928, 0x30816c48),
        ('cppInitializers', 0x307bb000, 0x30816824),
    ]:
        raw = pe.bytes(begin, end - begin)
        entries = []
        for offset in range(0, len(raw), 4):
            target = int.from_bytes(raw[offset:offset+4], 'little')
            if target:
                entries.append(dict(slot=f'{begin+offset:08x}', target=f'{target:08x}'))
        tables.append(dict(label=label, begin=f'{begin:08x}', end=f'{end:08x}',
            slots=len(raw)//4, nonzeroEntries=entries, omittedSlotsAreZero=True,
            sha256=hashlib.sha256(raw).hexdigest()))
    fp = pe.bytes(0x30892ac0, 4)
    if int.from_bytes(fp, 'little') != 0x30671672:
        raise ValueError('Original Engine floating-point initializer differs')
    nt = struct.unpack_from('<I', pe.data, 0x3c)[0]
    section_count = struct.unpack_from('<H', pe.data, nt+6)[0]
    optional_size = struct.unpack_from('<H', pe.data, nt+20)[0]
    headers = pe.data[:nt+24+optional_size+section_count*40]
    images = []
    for label, address, size in [
        ('floatingPointCallback', 0x30892ac0, 4),
        ('floatConversionPointers', 0x30ad4900, 40),
        ('divideAdjustment', 0x30af70a8, 4),
        ('dynamicTlsCallback', 0x30af7e88, 4),
    ]:
        rva = address-pe.base
        section = next(s for s in pe.sections if s[1] <= rva and rva+size <= s[1]+max(s[0],s[2]))
        backed = max(0,min(size,section[1]+section[2]-rva))
        raw = (pe.bytes(address,backed) if backed else b'')+bytes(size-backed)
        images.append(dict(label=label,address=f'{address:08x}',bytes=size,raw=raw.hex(),
            fileBackedBytes=backed,loaderZeroFillBytes=size-backed,sha256=hashlib.sha256(raw).hexdigest()))
    strings = []
    for label,address in [('divideModule',0x30893dbc),('divideExport',0x30893da0)]:
        raw = bytearray()
        for offset in range(256):
            byte = pe.bytes(address+offset,1)
            raw.extend(byte)
            if byte == b'\0':
                break
        else:
            raise ValueError('Unterminated original Engine divide dispatch string')
        strings.append(dict(label=label,address=f'{address:08x}',raw=raw.hex(),
            text=raw[:-1].decode('ascii'),sha256=hashlib.sha256(raw).hexdigest()))
    return dict(schema='gothic3.engine-cinit-source.v1', source=source,
        caller=dict(resultTest='30677284', failureBranch='30677286',
            failureTarget='3067729f', call='3067728a', target='3067d1c7',
            returnAddress='3067728f', raw=caller.hex(), sha256=hashlib.sha256(caller).hexdigest()),
        floatingPointCallback=dict(slot='30892ac0', target='30671672', raw=fp.hex()),
        initializerTables=tables, images=images, strings=strings,
        originalHeaders=dict(address=f'{pe.base:08x}',bytes=len(headers),raw=headers.hex(),sha256=hashlib.sha256(headers).hexdigest()),
        runtimeConnected=False,
        notes=['Source capture does not establish initializer execution.',
            'Callback table slots are original addresses, not browser memory pointers.',
            'Engine initialization requires its own retained owner and caller authority.',
            'Nonzero C++ callbacks still need their behavior implemented before campaign activation.'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--typescript', type=Path)
    args = parser.parse_args()
    receipt = capture(args.study)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(receipt, indent=2) + '\n'
    args.output.write_text(text, encoding='utf-8', newline='\n')
    if args.typescript:
        generated = """/** Generated original Engine CRT initializer source admission. */
import source from '../../assets/gothic3/engine-cinit/research.json';
import sourceText from '../../assets/gothic3/engine-cinit/research.json?raw';
const expectedText = EXPECTED;
function freeze(value:unknown):void {if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}}
freeze(source);
export function admitEngineCinitSource():void {if(sourceText!==expectedText)throw new Error('Original Engine initializer source differs');}
export function engineCinitInstruction(entry:string,pc:string){admitEngineCinitSource();const method=source.source.methods.find(method=>method.bodyVA==='0x'+entry);const row=method?.instructions.find(row=>row.va===pc);if(!row)throw new Error('Original Engine initializer instruction required');return row;}
export function engineCinitCaller(){admitEngineCinitSource();return source.caller;}
export function engineCinitFloatingPointCallback(){admitEngineCinitSource();return source.floatingPointCallback;}
export function engineCinitHeaders(){admitEngineCinitSource();return source.originalHeaders;}
export function engineCinitImage(label:string){admitEngineCinitSource();const image=source.images.find(image=>image.label===label);if(!image)throw new Error('Original Engine initializer image required');return image;}
export function engineCinitString(label:string){admitEngineCinitSource();const string=source.strings.find(string=>string.label===label);if(!string)throw new Error('Original Engine initializer string required');return string;}
export function engineCinitTable(label:string){admitEngineCinitSource();const table=source.initializerTables.find(table=>table.label===label);if(!table)throw new Error('Original Engine initializer table required');return table;}
export function engineCinitTableTarget(label:string,slot:string):string|null {
 const table=engineCinitTable(label);
 if(!/^[0-9a-f]{8}$/.test(slot))throw new Error('Original Engine initializer slot required');
 const address=parseInt(slot,16),begin=parseInt(table.begin,16),end=parseInt(table.end,16);
 if(address<begin||address>=end||(address-begin)%4!==0)throw new Error('Original Engine initializer slot outside table');
 return table.nonzeroEntries.find(entry=>entry.slot===slot)?.target??null;
}
""".replace('EXPECTED', json.dumps(text))
        args.typescript.write_text(generated, encoding='utf-8', newline='\n')
