"""Offline instruction audit of installed Gothic 3 dialogue code. Executes no game code."""
import argparse
from bisect import bisect_right
import csv
import hashlib
import json
from pathlib import Path
import re
import struct


TARGETS = {
    'Script_dll': ('Script.dll', {
        0x10003c29:'GetEntity1',0x1000510f:'GetEntity2',0x10002199:'GiveStackWrapper',
        0x10004557:'GiveTemplateWrapper',0x10003d96:'EndWrapper',0x100022a7:'SetGameEvent',
        0x100022de:'ClearGameEvent',0x10003c65:'AssureItems',
        0x10003517:'PartyMemberTypeWrapper',0x100019bf:'PartyLeaderWrapper'}),
    'Game_dll': ('Game.dll', {
        0x2000cec8:'FindEntityFromString',0x2000893b:'GetCurrentSelf',0x200335a5:'GetCurrentOther',
        0x20004615:'IsAvailable',0x20020fc7:'AreConditionsFulfilled',0x2002218d:'Execute',
        0x20007306:'RunQuest',0x2001e72c:'SucceedQuest',0x20028358:'CloseQuest',0x2001a519:'QuestSetStatus',
        0x20035175:'OnDelivery',0x20007d1f:'OnEndInfo',0x20033e01:'GiveStack',0x2002504a:'GiveTemplate',
        0x200203a6:'QuestIsInFinalState',0x20008008:'AreFinishedQuestsFinished',
        0x200175d0:'AreChildInfosAvailable',0x200016c2:'InfoScriptExecute',0x200344e1:'OnCommandCompleted',
        0x2001e6a5:'StartInfoManager',0x2000b0c8:'SortInfos',0x2002f95f:'SortInfosCbk',
        0x200014f1:'GetAvailableInfo',0x20011bcb:'GetAvailableInfoCount',0x200179b3:'GetInfoList',
        0x2000f80d:'GetChildInfos',0x20035512:'OnInfoScriptFinished',0x2002a1cb:'GetDistOwnerToNamedEntity',
        0x20008a99:'IsOwnerPlayer',0x2001b748:'RemoveDuplicatedInfos',0x20027ec1:'GetChildInfoList',
        0x2044f300:'OwnerLookup',0x20451740:'OwnerCollection',0x20022688:'EntityIsPlayer',
        0x200336a4:'BuildMapInfosByOwners',0x200282b3:'OnEndInfoManager'}),
    'scripts__Script_Game_dll': ('scripts/Script_Game.dll', {
        0x100dbb80:'CommandDispatcher',0x100628c0:'GiveXP',0x100627e0:'XPThreshold',
        0x100e3ec0:'CRT_X87FloatToInt64',0x100db360:'CommandNameToOpcode'})}

EXPECTED_INPUTS = {
    'Game.dll': 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f',
    'Script.dll': '9375605676faaae44a50d48539a7b3995bed471e099ef573666221a044cd4e08',
    'scripts/Script_Game.dll': '2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1',
}


def sha(data): return hashlib.sha256(data).hexdigest()


class PE:
    def __init__(self, data):
        self.data=data
        nt=struct.unpack_from('<I',data,0x3c)[0]
        if data[nt:nt+4]!=b'PE\0\0':raise ValueError('Not PE')
        self.optional=nt+24
        if struct.unpack_from('<H',data,self.optional)[0]!=0x10b:raise ValueError('Not PE32')
        self.base=struct.unpack_from('<I',data,self.optional+28)[0]
        count=struct.unpack_from('<H',data,nt+6)[0]
        size=struct.unpack_from('<H',data,nt+20)[0]
        self.sections=[struct.unpack_from('<IIII',data,self.optional+size+n*40+8) for n in range(count)]

    def offset(self, va, length=1):
        rva=va-self.base
        for virtual_size,start,raw_size,offset in self.sections:
            if start<=rva and rva+length<=start+raw_size:return offset+rva-start
        raise ValueError(f'Unbacked PE address: {va:x}+{length}')

    def bytes(self,va,length):
        at=self.offset(va,length)
        return self.data[at:at+length]

    def string(self,va):
        at=self.offset(va)
        return self.data[at:self.data.index(b'\0',at)].decode('ascii')

    def imports(self):
        rva,size=struct.unpack_from('<II',self.data,self.optional+96+8)
        result=[]
        if not rva:return result
        for n in range(size//20):
            lookup,stamp,forward,name,iat=struct.unpack('<IIIII',self.bytes(self.base+rva+n*20,20))
            if not any((lookup,stamp,forward,name,iat)):break
            dll=self.string(self.base+name)
            lookup=lookup or iat
            for m in range(100000):
                value=struct.unpack('<I',self.bytes(self.base+lookup+m*4,4))[0]
                if not value:break
                result.append({'iatVA':f'0x{self.base+iat+m*4:08x}','module':dll,
                    'name':self.string(self.base+value+2) if value&0x80000000==0 else None,
                    'ordinal':value&0xffff if value&0x80000000 else None})
        return result


def merged_ranges(ranges):
    result=[]
    for start,end in sorted(ranges):
        if result and start<=result[-1][1]+1:result[-1][1]=max(result[-1][1],end)
        else:result.append([start,end])
    return result


def audit_module(study,directory,binary,targets):
    base=study/'01_Decompiled_Code'/directory
    data=(study/'00_Original_Runtime'/binary).read_bytes()
    if sha(data) != EXPECTED_INPUTS[binary]:
        raise ValueError('Unsupported native module build: '+binary)
    pe=PE(data)
    csv_bytes=(base/'functions.csv').read_bytes()
    functions={row['address']:row for row in csv.DictReader(csv_bytes.decode().splitlines())}
    methods=[]
    for va,label in targets.items():
        current=va
        chain=[]
        for depth in range(12):
            raw=pe.bytes(current,5)
            if raw[0]!=0xe9:break
            target=current+5+struct.unpack('<i',raw[1:])[0]
            chain.append({'va':f'{current:08x}','bytes':raw.hex(),'targetVA':f'{target:08x}'})
            current=target
        else:raise ValueError('Unbounded thunk chain')
        record=functions[f'{current:08x}']
        ranges=[(int(a,16),int(b,16)) for a,b in re.findall(r'([0-9a-f]{8})-([0-9a-f]{8})',record['body_ranges'])]
        source_path=base/record['pseudocode_file']
        source=source_path.read_bytes()
        text=source.decode('utf-8')
        source_at=text.index(f'/* ENTRY {current:08x} |')
        methods.append({'label':label,'entryVA':f'0x{va:08x}','bodyVA':f'0x{current:08x}',
            'entryChain':chain,'bodyRanges':record['body_ranges'],'ranges':ranges,'instructions':[],
            'reconstructedC':{'path':f'01_Decompiled_Code/{directory}/'+record['pseudocode_file'],
                'sha256':sha(source),'line':text.count('\n',0,source_at)+1,'status':record['status']}})
    intervals=merged_ranges([r for method in methods for r in method['ranges']])
    starts=[r[0] for r in intervals]
    asm_path=base/'full_disassembly.asm'
    assembly_hash=hashlib.sha256()
    pattern=re.compile(rb'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)')
    seen=set()
    with asm_path.open('rb') as stream:
        for number,line in enumerate(stream,1):
            assembly_hash.update(line)
            match=pattern.fullmatch(line.rstrip(b'\r\n'))
            if not match:continue
            va=int(match[1],16)
            slot=bisect_right(starts,va)-1
            if slot<0 or va>intervals[slot][1] or va in seen:continue
            raw=bytes.fromhex(match[2].decode())
            if pe.bytes(va,len(raw))!=raw:raise ValueError(f'Assembly/PE disagreement at {va:x}')
            seen.add(va)
            for method in methods:
                if any(start<=va<=end for start,end in method['ranges']):
                    method['instructions'].append({'va':f'{va:08x}','rva':f'{va-pe.base:x}',
                        'fileOffset':pe.offset(va,len(raw)),'bytes':raw.hex(),
                        'instruction':match[3].decode('utf-8'),'assemblyLine':number})
    for method in methods:
        del method['ranges']
        method['instructions'].sort(key=lambda x:x['va'])
        if not method['instructions']:raise ValueError('No instructions: '+method['label'])
        raw=b''.join(bytes.fromhex(row['bytes']) for row in method['instructions'])
        method.update(instructionCount=len(method['instructions']),bodyByteCount=len(raw),bodyInstructionBytesSha256=sha(raw))
    constants=[]
    selections={
        'Game_dll':[(0x2065b1c4,'float','distanceDefaultMultiplier'),(0x2065cf5c,'float','distanceNpcTargetMultiplier'),(0x206afae8,'float','missingEntityDistance')],
        'scripts__Script_Game_dll':[(0x1020a358,'double','xpThresholdHalf'),(0x102091e8,'double','xpThresholdBase'),(0x102144fc,'string','booleanTrueMarker')]}
    for va,kind,label in selections.get(directory,[]):
        if kind=='string':value=pe.string(va);raw=pe.bytes(va,len(value)+1)
        else:raw=pe.bytes(va,4 if kind=='float' else 8);value=struct.unpack('<f' if kind=='float' else '<d',raw)[0]
        constants.append({'label':label,'va':f'0x{va:08x}','kind':kind,'value':value,'bytes':raw.hex(),'fileOffset':pe.offset(va,len(raw))})
    iat_used=set()
    for method in methods:
        for row in method['instructions']:
            iat_used.update('0x'+value for value in re.findall(r'\[0x([0-9a-f]{8})\]',row['instruction']))
    return {'module':binary,'inputSha256':sha(data),'functionsCsvSha256':sha(csv_bytes),
        'assemblySha256':assembly_hash.hexdigest(),'methods':methods,'constants':constants,
        'imports':[row for row in pe.imports() if row['iatVA'] in iat_used],'verifiedAgainstOriginalPE':True}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study',required=True,type=Path)
    parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[2]/'assets/gothic3/dialogue/native-evidence.json')
    args=parser.parse_args()
    modules=[]
    for directory,(binary,targets) in TARGETS.items():
        modules.append(audit_module(args.study,directory,binary,targets))
        print(directory,len(targets),flush=True)
    data={'schema':'gothic3-dialogue-native-evidence-v1','scope':'Offline original-PE instruction audit. C references are reconstructed decompiler output, not original source.',
        'sourceRoot':'<LOCAL_DESKTOP_STUDY>','modules':modules,
        'audit':{'methodCount':sum(len(x['methods']) for x in modules),
            'instructionCount':sum(m['instructionCount'] for x in modules for m in x['methods']),
            'byteMismatchCount':0,'executedGameCode':False},
        'reproduce':'python tools/gothic3/read_dialogue_native_evidence.py --study <LOCAL_DESKTOP_STUDY>'}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(data,separators=(',',':'))+'\n',encoding='utf-8')
    print(json.dumps({'path':args.output.name,'bytes':args.output.stat().st_size,'sha256':sha(args.output.read_bytes()),'audit':data['audit']}))


if __name__=='__main__':main()
