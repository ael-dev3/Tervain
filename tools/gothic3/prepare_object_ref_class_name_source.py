"""Recover the original second C++ initializer through the verified batch producer."""
import argparse
import hashlib
import json
from pathlib import Path

from prepare_game_class_name_patterns import capture as capture_patterns
from prepare_layer_base_class_name_source import write_runtime
from read_dialogue_native_evidence import PE
from prepare_runtime_admin_source import image_bytes


def capture(study, callbacks):
    batch = capture_patterns(study, callbacks)
    row = next(item for item in batch['classes'] if item['initializer'] == '204b11c0')
    getter = dict(row['getterSource'], label='objectRefClassName')
    initializer = dict(label='objectRefClassNameInitializer', entryVA='0x204b11c0',
        bodyVA='0x204b11c0', entryChain=[], instructions=row['initializerInstructions'],
        bodyRanges=row['initializerSource']['bodyRanges'],
        bodyInstructionBytesSha256=row['initializerSource']['instructionBytesSha256'],
        recoveryOrigin=row['initializerSource']['origin'], sourceRefs=row['initializerSource'],
        functionCatalogEntryPresent=False, verifiedAgainstOriginalPE=True)
    cleanup = dict(row['destructor'], label='objectRefClassNameDestructor',
        entryVA='0x'+row['destructor']['entry'], bodyVA='0x'+row['destructor']['body'])
    if row['getter'] != '2002c9f8' or row['decoratedName'] != '.?AVbCObjectRefBase@@' or row['slots'] != ['2056c108']:
        raise ValueError('Original second initializer identity differs')
    images = [dict(batch['images'][row['images'][key]], label=label) for key, label in
        [('fields','objectRefClassName'),('result','objectRefInitializerResult'),
         ('descriptor','objectRefTypeInfoDescriptor')]]
    pe = PE((study/'00_Original_Runtime/Game.dll').read_bytes())
    raw, _ = image_bytes(pe, 0x2056c108, 4)
    if raw.hex() != 'c0114b20':
        raise ValueError('Original second initializer table slot differs')
    images.append(dict(label='objectRefInitializerSlot',address='2056c108',bytes=4,
        raw=raw.hex(),sha256=hashlib.sha256(raw).hexdigest(),liveValueCaptured=False))
    return dict(schema='gothic3-object-ref-class-name-evidence-v1',
        module=dict(module='Game.dll',inputSha256=batch['inputs']['Game'],
            functionsCsvSha256=batch['inputs']['functionsCsv'],assemblySha256=batch['inputs']['fullAssembly'],
            methods=[getter,initializer,cleanup]),images=images,decoratedName=row['decoratedName'],
        imports=batch['imports'],producerSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        sourceOnly=True,executionAdmitted=False,wholeCrtTraversalCompleted=False,fullCampaignCompleted=False)


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study',type=Path,required=True)
    parser.add_argument('--callbacks',type=Path,default=Path(__file__).resolve().parents[2]/'assets/gothic3/game-cinit-callbacks')
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--runtime-output',type=Path,required=True)
    args=parser.parse_args()
    result=capture(args.study,args.callbacks)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8',newline='\n')
    write_runtime(result,args.runtime_output,'objectRef','ObjectRef','object-ref-class-name')
