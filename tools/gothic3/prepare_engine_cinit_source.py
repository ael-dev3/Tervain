"""Capture the pinned Engine CRT initializer and its immediate dependencies."""
import argparse
import hashlib
import json
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
    return dict(schema='gothic3.engine-cinit-source.v1', source=source,
        caller=dict(resultTest='30677284', failureBranch='30677286',
            failureTarget='3067729f', call='3067728a', target='3067d1c7',
            returnAddress='3067728f', raw=caller.hex(), sha256=hashlib.sha256(caller).hexdigest()),
        floatingPointCallback=dict(slot='30892ac0', target='30671672', raw=fp.hex()),
        initializerTables=tables, runtimeConnected=False,
        notes=['Source capture does not establish initializer execution.',
            'Callback table slots are original addresses, not browser memory pointers.',
            'Engine initialization requires its own retained owner and caller authority.',
            'Nonzero C++ callbacks still need their behavior implemented before campaign activation.'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    receipt = capture(args.study)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8', newline='\n')
