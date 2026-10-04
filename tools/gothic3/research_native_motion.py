# SPDX-License-Identifier: GPL-3.0-only
"""Retain reproducible local native-motion evidence without running Engine.dll.

Reads the completed original runtime/decompilation study and frozen animated
source JSON, verifies original PE constants and exact instruction ranges, and
records source-file hashes. Writes only animated/native-motion-evidence.json.
"""
import argparse
import hashlib
import json
import math
import struct
from pathlib import Path


REPO=Path(__file__).resolve().parents[2]
ENGINE_SHA='d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'
def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def f32(v): return struct.unpack('<f',struct.pack('<f',v))[0]


def read_constant(data,address):
    pe=struct.unpack_from('<I',data,60)[0]
    if data[pe:pe+4]!=b'PE\0\0': raise ValueError('invalid PE signature')
    count,optional=struct.unpack_from('<H',data,pe+6)[0],struct.unpack_from('<H',data,pe+20)[0]
    if struct.unpack_from('<H',data,pe+24)[0]!=0x10b: raise ValueError('expected original 32-bit Engine PE')
    image_base=struct.unpack_from('<I',data,pe+24+28)[0];target=address-image_base
    for i in range(count):
        offset=pe+24+optional+i*40
        virtual_size,rva,size,file_offset=struct.unpack_from('<4I',data,offset+8)
        if rva<=target<rva+max(size,virtual_size):
            relative=target-rva
            if relative+8>size: raise ValueError('constant lies outside initialized section bytes')
            raw_offset=file_offset+relative;raw=data[raw_offset:raw_offset+8]
            return {'address':f'{address:08x}','section':data[offset:offset+8].rstrip(b'\0').decode('ascii'),
                    'fileOffset':raw_offset,'rawBytes':raw.hex(),'double':struct.unpack('<d',raw)[0]}
    raise ValueError('constant address absent from original PE')


def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--study',type=Path,required=True)
    args=ap.parse_args();study=args.study.resolve();out=REPO/'public/gothic3/animated'
    dll=study/'00_Original_Runtime/Engine.dll'
    if sha(dll)!=ENGINE_SHA: raise ValueError('native Engine build does not match source evidence profile')
    data=dll.read_bytes();packing=read_constant(data,0x30822a70);decode=read_constant(data,0x30822a80)
    if packing['double']!=32767 or decode['double']!=f32(1/32767): raise ValueError('native quaternion constants differ')
    functions=[
        {'entry':'300f0090','end':'300f00f8','file':'functions_00084.c','line':9193,
         'meaning':'Pack original raw quaternion components using double32767 and CRT truncation into signed16 shorts.'},
        {'entry':'30672060','end':'3067210a','file':'functions_00168.c','line':8581,
         'meaning':'Truncate floating point to integer; SSE branch explicitly uses CVTTSD2SI, fallback corrects round-to-nearest toward zero.'},
        {'entry':'3064ebd0','end':'3064ecab','file':'functions_00166.c','line':17051,
         'meaning':'Native MotionPart default constructor installs the quaternion-specific LinearQuaternionInterpolator vtable.'},
        {'entry':'3064e8d0','end':'3064e996','file':'functions_00166.c','line':16862,
         'meaning':'Decode signed16 components with widened float32 reciprocal constant, then call3064e790.'},
        {'entry':'3064e790','end':'3064e869','file':'functions_00166.c','line':16840,
         'meaning':'Choose shortest quaternion sign by endpoint dot product and blend four components linearly, no slerp.'},
        {'entry':'30663630','end':'30663c60','file':'functions_00167.c','line':15182,
         'meaning':'Motion-layer blend obtains part pose, blends with underlying/bind pose using30663190, calls30663330 normalization.'},
        {'entry':'30663190','end':'30663286','file':'functions_00167.c','line':14997,
         'meaning':'Shortest-sign component interpolation of layer quaternion, before explicit normalization.'},
        {'entry':'30663330','end':'306633e6','file':'functions_00167.c','line':15072,
         'meaning':'Normalize quaternion: square length, sqrt, reciprocal and multiply components, storing float values.'},
        {'entry':'30651810','end':'306519a2','file':'functions_00167.c','line':1757,
         'meaning':'Write normalized motion-layer pose into node P/Q/S fields and call30642aa0 local-matrix construction.'},
        {'entry':'30642aa0','end':'30642d84','file':'functions_00166.c','line':6912,
         'meaning':'Construct node local matrix from rotation, scaling and translation, then propagate hierarchy.'},
    ]
    asm=study/'01_Decompiled_Code/Engine_dll/full_disassembly.asm'
    ranges=[(int(f['entry'],16),int(f['end'],16)) for f in functions]
    for f in functions: f['instructions']=[]
    for line_number,line in enumerate(asm.open(encoding='utf8'),1):
        if len(line)<11 or line[8:11]!=' | ': continue
        try:address=int(line[:8],16)
        except ValueError: continue
        for f,(lo,hi) in zip(functions,ranges):
            if lo<=address<=hi: f['instructions'].append({'line':line_number,'text':line.rstrip()})
    for f in functions:
        if not f['instructions'] or not f['instructions'][0]['text'].startswith(f['entry']):
            raise ValueError('native instruction range not found')
        p=study/'01_Decompiled_Code/Engine_dll/pseudocode'/f['file']
        source=p.read_text(encoding='utf8')
        if f'/* ENTRY {f["entry"]} |' not in source: raise ValueError('native function source identity not found')
        # Keep exact authoritative generated source line, rather than relying on
        # notes typed during research. Addresses identify the original functions.
        f['line']=next(i for i,l in enumerate(source.splitlines(),1) if l.startswith(f'/* ENTRY {f["entry"]} |'))
        f['sourceSHA256']=sha(p)
        f['file']='01_Decompiled_Code/Engine_dll/pseudocode/'+f['file']
    raw_path=out/'hero-native.json';raw=json.loads(raw_path.read_text(encoding='utf8'))
    rig={n['name'] for n in raw['sharedCleanedRig']};qkeys=0;components=0;negative_edges=0;pack_bytes=bytearray();first_times=set();max_pose_error=0
    for motion in raw['motions']:
        for part in motion['decoded']['parts']:
            if part['name'] not in rig: continue
            max_pose_error=max(max_pose_error,abs(sum(v*v for v in part['pose']['rotation'])-1))
            for track in part['tracks']:
                if track['keys']: first_times.add(track['keys'][0]['time'])
                if track['type']!='R': continue
                previous=None
                for key in track['keys']:
                    packed=[math.trunc(v*packing['double']) for v in key['value']]
                    if any(v < -32768 or v > 32767 for v in packed): raise ValueError('native short packing overflow')
                    unpacked=[f32(v*decode['double']) for v in packed]
                    if previous and sum(a*b for a,b in zip(previous,unpacked))<0: negative_edges+=1
                    pack_bytes.extend(struct.pack('<4hf',*packed,key['time']))
                    previous=unpacked;qkeys+=1;components+=4
    profile={'version':1,'engineSHA256':ENGINE_SHA,'originalEnginePath':'00_Original_Runtime/Engine.dll',
        'manifestSHA256':sha(out/'manifest.json'),'nativeJSONSHA256':sha(raw_path),'glbSHA256':sha(out/'hero.glb'),
        'runtimeAdapter':'src/gothic3/native-motion.ts','runtimeAdapterSHA256':sha(REPO/'src/gothic3/native-motion.ts'),
        'packingConstant':packing,'decompressionConstant':decode,'functions':functions,'assemblySHA256':sha(asm),
        'nativeDataAudit':{'matchedQuaternionKeys':qkeys,'matchedQuaternionComponents':components,
            'negativeEndpointDotEdges':negative_edges,'allMatchedFirstKeyTimes':sorted(first_times),
            'maxMatchedPoseSquaredQuaternionLengthError':max_pose_error,
            'packedNativeQuaternionKeyBytesSHA256':hashlib.sha256(pack_bytes).hexdigest(),
            'packedNativeQuaternionKeyBytes':len(pack_bytes)},
        'runtimeSemantics':'signed16-packed original keys, shortest-sign component lerp, final motion-layer quaternion normalization; native P/S linear tracks and original pose fallback',
        'limitations':['This implements one full-weight native clip with inspector repetition. Native multi-layer masks, fades/additive blend, repositioning and frame-effect dispatch require separate systems.',
            'TypeScript rounds documented stored steps to float32. It does not emulate x87 extended precision instruction by instruction.',
            'The frozen GLB retains portable standard quaternion slerp channels. The runtime adapter reads the independently SHA-verified original raw JSON keys instead.'],
        'originalEngineExecuted':False,'sourceFilesModified':False}
    p=out/'native-motion-evidence.json';p.write_text(json.dumps(profile,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
    print(json.dumps({'path':str(p),'sha256':sha(p),'bytes':p.stat().st_size,'nativeDataAudit':profile['nativeDataAudit']},indent=2))


if __name__=='__main__':main()
