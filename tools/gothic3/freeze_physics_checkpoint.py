"""Freeze original Hero physics readers and the enclosing entity read bridge.

Checks local Git/file bytes and offline evidence; does not execute native code,
tests, a build, a browser, remote actions, or a playthrough. Older receipts stay
historical at their original commits.
"""
from __future__ import annotations

import hashlib
import json
import subprocess

from freeze_session_checkpoint import ROOT, file_path, read, record, require, verify
from freeze_lifecycle_checkpoint import verify_receipt_records

BASE = 'a81549c8e537070e7c41d505eb8cfef655ac33b7'
BASE_RECEIPT = 'assets/gothic3/actor-reading-checkpoint.json'
BASE_RECEIPT_SHA256 = '1dbc3356efd52010146b28dcfcaff319e67d7ff274993fc86598cffbda58102f'
OUTPUT = 'assets/gothic3/physics-reading-checkpoint.json'
NAMESPACES = ('entity-loading', 'rigidbody-reading', 'collision-reading')
UPDATED = {'.gitattributes', 'docs/engineering/gothic3-rebuilding-process.md',
           'src/gothic3/entity-reflection.ts', 'src/gothic3/navigation-reading.ts'}


def historical_records(paths):
    paths = sorted(set(paths))
    request = ''.join(BASE+':'+path+'\n' for path in paths).encode('utf8')
    raw = subprocess.run(['git','cat-file','--batch'],input=request,cwd=ROOT,
                         check=True,capture_output=True).stdout
    records, offset = {}, 0
    for path in paths:
        end = raw.index(b'\n',offset)
        header = raw[offset:end].split()
        require(len(header)==3 and header[1]==b'blob','Historical blob missing: '+path)
        length=int(header[2]);data=raw[end+1:end+1+length];offset=end+1+length
        require(len(data)==length and raw[offset:offset+1]==b'\n','Incomplete Git blob: '+path)
        offset+=1
        records[path]={'path':path,'bytes':length,'sha256':hashlib.sha256(data).hexdigest()}
    require(offset==len(raw),'Extra Git batch output')
    return records


def audit_namespace(namespace):
    evidence=read('assets/gothic3/'+namespace+'/native-evidence.json')
    functions=evidence['functions'];manual=evidence.get('asmOnlyFunctions',[])
    identities=[function['id'] for function in functions]
    manual_ids=[function['module']+':'+function['entry'] for function in manual]
    all_ids=identities+manual_ids
    require(len(all_ids)==len(set(all_ids)) and set(all_ids)==set(evidence['instructions']),
            'Function/instruction identities differ: '+namespace)
    assembly_only=[]
    for function in functions:
        rows=evidence['instructions'][function['id']]
        require(len(rows)==function['instructionCount'] and
                sum(len(bytes.fromhex(row['bytes'])) for row in rows)==function['instructionBytes'],
                'Instruction metadata differs: '+function['id'])
        verify('assets/gothic3/'+namespace+'/'+function['assemblyExcerpt'],
               {'sha256':function['assemblyExcerptSha256']})
        verify('assets/gothic3/'+namespace+'/'+function['cExcerpt'],
               {'sha256':function['cExcerptSha256']})
        require(function.get('allInstructionBytesMatchOriginalPE',
                             function.get('allInstructionBytesMatch')) is True,
                'Incomplete original PE instruction audit: '+function['id'])
    for function,identity in zip(manual,manual_ids,strict=True):
        # This inherited registrar is absent from the completed study C and
        # function catalog. Preserve the independent original PE ASM proof.
        require(namespace=='rigidbody-reading' and identity=='Engine:3075d680',
                'Unapproved assembly-only source evidence: '+identity)
        rows=evidence['instructions'][identity]
        require(rows==function['instructions'],'Manual instruction rows differ: '+identity)
        start=int(function['entry'],16);raw=b''
        for row in rows:
            require(int(row['address'],16)==start+len(raw),'Manual source extent differs: '+identity)
            raw+=bytes.fromhex(row['bytes'])
        require(start+len(raw)==int(function['endVAExclusive'],16) and
                hashlib.sha256(raw).hexdigest()==function['originalPEBodySha256'],
                'Manual source PE body length/hash differs: '+identity)
        require(function.get('allInstructionBytesMatchOriginalPE') is True,
                'Manual original PE comparison scope absent: '+identity)
        verify('assets/gothic3/'+namespace+'/'+function['assemblyExcerpt'],
               {'sha256':function['assemblyExcerptSha256']})
        assembly_only.append(identity)
    declarations=[source[key] for source in (evidence,evidence.get('audit',{}))
                  for key in ['nativeCodeExecuted','nativeExecution','executedNativeCode'] if key in source]
    require(declarations and all(value is False for value in declarations), 'Native execution scope differs')
    rows=[row for values in evidence['instructions'].values() for row in values]
    return {'entries':len(all_ids),'decompiledEntries':len(functions),'instructions':len(rows),
            'originalInstructionBytes':sum(len(bytes.fromhex(row['bytes'])) for row in rows),
            'assemblyOnlyEntries':assembly_only,'sourceExcerptHashesVerifiedByThisTool':True,
            'uniqueFunctionAndInstructionMetadataVerifiedByThisTool':True,
            'originalPEByteComparisonPerformedByThisTool':False}


def main():
    subprocess.run(['git','merge-base','--is-ancestor',BASE,'HEAD'],cwd=ROOT,
                   check=True,capture_output=True)
    raw=subprocess.check_output(['git','show',BASE+':'+BASE_RECEIPT],cwd=ROOT)
    require(hashlib.sha256(raw).hexdigest()==BASE_RECEIPT_SHA256,'Historical actor receipt differs')
    verify(BASE_RECEIPT,{'sha256':BASE_RECEIPT_SHA256})
    baseline=json.loads(raw)
    old=historical_records({item['path'] for item in baseline['files']}|UPDATED)
    retained=0
    for item in baseline['files']:
        require(old[item['path']]==item,'Historical receipt/Git mismatch: '+item['path'])
        if item['path'] not in UPDATED:
            verify(item['path'],item);retained+=1
    files={item['path'] for item in baseline['files']}|UPDATED|{BASE_RECEIPT}
    audits,receipts={},{}
    for namespace in NAMESPACES:
        audits[namespace]=audit_namespace(namespace)
        implementation='src/gothic3/'+namespace+'.ts'
        producer='tools/gothic3/research_'+namespace.replace('-','_')+'.py'
        files.update((implementation,producer))
        for category in ['assets','public']:
            directory=file_path(category+'/gothic3/'+namespace)
            require(directory.is_dir(),'Namespace directory missing: '+str(directory))
            files.update(path.relative_to(ROOT).as_posix() for path in directory.rglob('*') if path.is_file())
        candidates=[path for path in file_path('assets/gothic3/'+namespace).glob('*.json')
                    if path.name in ['implementation-receipt.json','output-receipt.json','final-audit.json']]
        require(candidates,'Current implementation receipt missing: '+namespace)
        pins=set()
        for path in candidates:
            relative=path.relative_to(ROOT).as_posix()
            pins.update(verify_receipt_records(read(relative)))
            receipts[relative]=record(relative)
        require(implementation in pins and producer in pins,'Current source/producer not pinned: '+namespace)
        files.update(pins)
    files.add('tools/gothic3/freeze_physics_checkpoint.py')
    require(OUTPUT not in files,'Checkpoint cannot hash itself')
    records=[record(path) for path in sorted(files)]
    result={'schema':'gothic3-runtime-physics-reading-checkpoint-v1','baseCommit':BASE,
            'scope':'original-Hero-RigidBody-CollisionShape-and-installed-entity-read-composition',
            'gameplayReady':False,
            'baseline':{'receiptPath':BASE_RECEIPT,'receiptSha256':BASE_RECEIPT_SHA256,
                        'retainedFilesVerified':retained,
                        'intentionalChanges':[{'before':old[path],'after':record(path)} for path in sorted(UPDATED)],
                        'historicalReceiptsRemainAtTheirRecordedCommits':True},
            'auditsFromOfflineResearch':audits,'currentReceipts':receipts,
            'checksPerformedByThisTool':['historical Git blobs and base ancestry','unchanged baseline bytes',
                'current implementation/producer receipt pins','C/assembly excerpt hashes',
                'function/instruction identity and length metadata','current file list/bytes/SHA256'],
            'validationNotPerformedByThisTool':['fresh PE byte comparison','typecheck','production build',
                'tests','native execution','browser review','deployment','playthrough'],
            'nativeCodeExecutedByThisTool':False,'testsExecutedByThisTool':False,
            'publicationIntent':{'kind':'source-only-checkpoint','branch':'codex/gothic3-gameplay-initialization',
                                'remoteActionsPerformedByThisTool':False},
            'remaining':['all19-concrete-Hero-property-readers-and-original-owner-callbacks',
                'actual-node-GUID-frustum-timestamp-and-scene-admin-construction-services',
                'template-lookup-and-patching-observers','child-graph-loading-and-original-layer-context',
                'world-cache-physics-PVS-and-processing-activation','actual-actor-layer-resource-ownership',
                'live-browser-input-script-quest-combat-inventory-save-restoration',
                'online-complete-original-game-progression-through-endings'],
            'files':records,'publicBytes':sum(item['bytes'] for item in records if item['path'].startswith('public/'))}
    file_path(OUTPUT).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
    print(json.dumps({'files':len(records),'baselineRetained':retained,'audits':audits,
                      'publicBytes':result['publicBytes'],'sha256':record(OUTPUT)['sha256']}))


if __name__=='__main__':
    main()
