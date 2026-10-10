"""Capture original Engine command-line argument setup and first dependencies."""
import argparse
import hashlib
import json
from pathlib import Path
from read_dialogue_native_evidence import EXPECTED_INPUTS, PE, audit_module


def capture(study):
    EXPECTED_INPUTS['Engine.dll'] = 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'
    evidence = audit_module(study, 'Engine_dll', 'Engine.dll', {
        0x3068e76f: 'engineArgumentSetup',
        0x3068e5d7: 'engineArgumentParser',
        0x306846bd: 'engineArgumentLeadByteWrapper',
        0x306844ff: 'engineArgumentByteClassification',
        0x30685007: 'engineArgumentMultibyteDependency',
        0x30684e6d: 'engineArgumentMultibyteSetup',
        0x30684b3a: 'engineArgumentMultibyteHelper30684b3a',
        0x30684bde: 'engineArgumentMultibyteHelper30684bde',
        0x30684c58: 'engineArgumentMultibyteHelper30684c58',
        0x3067c9c1: 'engineArgumentMallocCrt',
        0x30672ec7: 'engineArgumentMallocLower',
        0x3067e12b: 'engineMultibyteGetPtdWrapper',
        0x30684bd5: 'engineMultibyteLocaleUnlock',
        0x30684fce: 'engineMultibyteGlobalUnlock',
        0x30673389: 'engineCodepageLocaleUpdate',
        0x30671690: 'engineMbcMemset',
        0x306849b0: 'engineMbcCaseTables',
        0x306916a2: 'engineMbcCharacterTypesWrapper',
        0x306914ea: 'engineMbcCharacterTypesBody',
        0x3068de60: 'engineConversionStackAlignment',
        0x30674820: 'engineConversionStackProbe',
        0x30675d66: 'engineConversionBufferCleanup',
        0x3067746c: 'engineConversionCookieCheck',
        0x3067c91e: 'engineCaseMappingWrapper',
        0x3067c57c: 'engineCaseMappingBody',
    })
    pe = PE((study / '00_Original_Runtime/Engine.dll').read_bytes())
    caller = pe.bytes(0x30677276, 5)
    if caller.hex() != 'e8f4740100':
        raise ValueError('Original Engine argument caller differs')
    get_acp = next(row for row in pe.imports() if row['iatVA'] == '0x30afc734')
    if get_acp['module'].lower() != 'kernel32.dll' or get_acp['name'] != 'GetACP' or get_acp['ordinal'] is not None:
        raise ValueError('Original Engine GetACP import differs')
    filename_import = next(row for row in pe.imports() if row['iatVA'] == '0x30afc82c')
    if filename_import['module'].lower() != 'kernel32.dll' or filename_import['name'] != 'GetModuleFileNameA' or filename_import['ordinal'] is not None:
        raise ValueError('Original Engine filename import differs')
    mbc_imports = {}
    for name, address in [('IsValidCodePage', '0x30afc73c'), ('GetCPInfo', '0x30afc688'), ('InterlockedDecrement', '0x30afc6f4'), ('InterlockedIncrement', '0x30afc6f8')]:
        row = next(row for row in pe.imports() if row['iatVA'] == address)
        if row['module'].lower() != 'kernel32.dll' or row['name'] != name or row['ordinal'] is not None:
            raise ValueError('Original Engine MBC import differs')
        mbc_imports[name] = row
    classification_imports = {}
    for name, address in [('GetStringTypeW', '0x30afc778'), ('GetLastError', '0x30afc86c'), ('MultiByteToWideChar', '0x30afc6e8'), ('GetStringTypeA', '0x30afc774'), ('LCMapStringW', '0x30afc690'), ('WideCharToMultiByte', '0x30afc6fc')]:
        row = next(row for row in pe.imports() if row['iatVA'] == address)
        if row['module'].lower() != 'kernel32.dll' or row['name'] != name or row['ordinal'] is not None:
            raise ValueError('Original Engine classification import differs')
        classification_imports[name] = row
    images = []
    for address, size, label in [(0x30af7e84, 4, 'multibyteReady'),
                                 (0x30af7800, 260, 'moduleFilename'),
                                 (0x30af7904, 1, 'moduleFilenameSentinel'),
                                 (0x30af91f8, 4, 'commandLinePointer'),
                                 (0x30af7128, 4, 'programNamePointer'),
                                 (0x30af710c, 4, 'argumentCount'),
                                 (0x30af7110, 4, 'argumentVector'),
                                 (0x30956ba0, 28, 'multibyteSetupSehScope'),
                                 (0x30956b80, 28, 'multibyteLocaleSehScope'),
                                 (0x30ad50f0, 4, 'multibyteLocaleFlags'),
                                 (0x30ad4ff8, 4, 'currentMultibytePointer'),
                                 (0x30af76fc, 4, 'codepageAutomatic'),
                                 (0x30ad5000, 240, 'multibyteCodepageTable'),
                                 (0x30af7c34, 4, 'classificationApiSelector'),
                                 (0x30892f38, 2, 'classificationWideProbe'),
                                 (0x30af70ec, 4, 'mappingApiSelector'),
                                 (0x30af770c, 4, 'globalMbcCodepage'),
                                 (0x30af7710, 4, 'globalMbcSingleByte'),
                                 (0x30af7714, 4, 'globalMbcLocale'),
                                 (0x30af7700, 10, 'globalMbcWideTypes'),
                                 (0x30ad4df0, 257, 'globalMbcCharacterTypes'),
                                 (0x30ad4ef8, 256, 'globalMbcCaseBytes')]:
        rva = address - pe.base
        section = next(s for s in pe.sections if s[1] <= rva and rva + size <= s[1] + max(s[0], s[2]))
        backed = max(0, min(size, section[1] + section[2] - rva))
        raw = (pe.bytes(address, backed) if backed else b'') + bytes(size - backed)
        images.append(dict(label=label, address=f'{address:08x}', bytes=size,
                           raw=raw.hex(), fileBackedBytes=backed, loaderZeroFillBytes=size-backed,
                           sha256=hashlib.sha256(raw).hexdigest()))
    return dict(schema='gothic3.engine-argv-source.v1', source=evidence,
                images=images, staticMbcHeader=dict(address='30ad4bd0', bytes=16, raw=pe.bytes(0x30ad4bd0,16).hex()), codepageImport=get_acp, filenameImport=filename_import, mbcImports=mbc_imports, classificationImports=classification_imports, caller=dict(call='30677276', target='3068e76f',
                raw=caller.hex(), sha256=hashlib.sha256(caller).hexdigest()),
                runtimeConnected=False,
                notes=['Original module filename and two-pass command-line argument setup.',
                       'Multibyte setup has additional thread, locale, allocation and lock dependencies.',
                       'Capture alone does not establish execution, allocation or returned argv.'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--typescript', type=Path)
    args = parser.parse_args()
    receipt = capture(args.study)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8', newline='\n')
    if args.typescript:
        expected = json.dumps(args.output.read_text(encoding='utf-8'))
        generated = """/** Generated original Engine argument source admission. */
import source from '../../assets/gothic3/engine-argv/research.json';
import sourceText from '../../assets/gothic3/engine-argv/research.json?raw';
const expectedText = EXPECTED;
function freeze(value:unknown):void {if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}}
freeze(source);
export function admitEngineArgvSource():void {if(sourceText!==expectedText)throw new Error('Original Engine argument source differs');}
export function engineArgvInstruction(entry:string,pc:string){admitEngineArgvSource();const method=source.source.methods.find(method=>method.bodyVA==='0x'+entry);const row=method?.instructions.find(row=>row.va===pc);if(!row)throw new Error('Original Engine argument method instruction required');return row;}
export function engineArgvMbcImport(kind:'IsValidCodePage'|'GetCPInfo'|'InterlockedDecrement'|'InterlockedIncrement'){admitEngineArgvSource();return source.mbcImports[kind];}
export function engineArgvClassificationImport(kind:'GetStringTypeW'|'GetLastError'|'MultiByteToWideChar'|'GetStringTypeA'|'LCMapStringW'|'WideCharToMultiByte'){admitEngineArgvSource();return source.classificationImports[kind];}
export function engineArgvStaticMbcHeader(){admitEngineArgvSource();return source.staticMbcHeader;}
export function engineArgvFilenameImport(){admitEngineArgvSource();return source.filenameImport;}
export function engineArgvGetACPImport(){admitEngineArgvSource();return source.codepageImport;}
export function engineArgvImage(label:string){admitEngineArgvSource();const image=source.images.find(image=>image.label===label);if(!image)throw new Error('Original Engine argument image required');return image;}
""".replace('EXPECTED', expected)
        args.typescript.write_text(generated, encoding='utf-8', newline='\n')
