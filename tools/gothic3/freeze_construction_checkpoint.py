"""Freeze original entity construction and Hero Control/Sensor readers.

Local Git/file/source metadata audit only; no native execution, tests, browser,
build, deployment, playthrough or remote actions. Older receipts are historical.
"""
from __future__ import annotations

import hashlib
import json
import subprocess

from freeze_session_checkpoint import ROOT, file_path, read, record, require, verify
from freeze_lifecycle_checkpoint import verify_receipt_records

BASE = 'cce28354472f8716a65edc8e855003ee74830f6f'
BASE_RECEIPT = 'assets/gothic3/physics-reading-checkpoint.json'
BASE_RECEIPT_SHA256 = '47ea248f9e5d3a11268babcb58b85c49f7c3cf3ae25b95ddb7e99f538680e506'
OUTPUT = 'assets/gothic3/construction-reading-checkpoint.json'
NAMESPACES = ('entity-construction', 'control-reading', 'sensor-reading')
UPDATED = {'.gitattributes', 'docs/engineering/gothic3-rebuilding-process.md',
           'src/gothic3/entity-lifecycle.ts', 'src/gothic3/movement-state.ts'}


def historical_records(paths):
    paths = sorted(set(paths))
    request = ''.join(BASE+':'+path+'\n' for path in paths).encode('utf8')
    raw = subprocess.run(['git','cat-file','--batch'],input=request,cwd=ROOT,
                         check=True,capture_output=True).stdout
    records, offset = {}, 0
    for path in paths:
        end = raw.index(b'\n',offset); header = raw[offset:end].split()
        require(len(header)==3 and header[1]==b'blob','Historical blob missing: '+path)
        size = int(header[2]); data = raw[end+1:end+1+size]; offset = end+1+size
        require(len(data)==size and raw[offset:offset+1]==b'\n','Incomplete Git blob: '+path)
        offset += 1
        records[path] = {'path':path,'bytes':size,'sha256':hashlib.sha256(data).hexdigest()}
    require(offset==len(raw),'Extra Git batch output')
    return records


def audit(namespace):
    evidence = read('assets/gothic3/'+namespace+'/native-evidence.json')
    functions = evidence['functions']; manual = evidence.get('asmOnlyFunctions',[])
    ids = [item['id'] for item in functions]
    manual_ids = [item['module']+':'+item['entry'] for item in manual]
    require(len(ids+manual_ids)==len(set(ids+manual_ids)) and
            set(ids+manual_ids)==set(evidence['instructions']),
            'Function/instruction identity mismatch: '+namespace)
    for function in functions:
        rows = evidence['instructions'][function['id']]
        require(len(rows)==function['instructionCount'] and
                sum(len(bytes.fromhex(row['bytes'])) for row in rows)==function['instructionBytes'],
                'Instruction count/extent differs: '+function['id'])
        for key in ['cExcerpt','assemblyExcerpt']:
            verify('assets/gothic3/'+namespace+'/'+function[key], {'sha256':function[key+'Sha256']})
        require(function.get('allInstructionBytesMatchOriginalPE',
                             function.get('allInstructionBytesMatch')) is True,
                'Original PE instruction audit absent: '+function['id'])
    for function,identity in zip(manual,manual_ids,strict=True):
        require(namespace=='control-reading' and identity=='SharedBase:100e2910',
                'Unexpected assembly-only evidence: '+identity)
        rows = evidence['instructions'][identity]
        require(rows==function['instructions'] and len(rows)==1 and
                rows[0]['address']=='100e2910' and rows[0]['bytes']=='c3',
                'Actual Matrix destructor RET evidence differs')
        raw = bytes.fromhex(rows[0]['bytes'])
        require(int(function['entry'],16)+len(raw)==int(function['endVAExclusive'],16) and
                hashlib.sha256(raw).hexdigest()==function['originalPEBodySha256'] and
                function.get('allInstructionBytesMatchOriginalPE') is True,
                'Assembly-only original PE metadata differs: '+identity)
        verify('assets/gothic3/'+namespace+'/'+function['assemblyExcerpt'],
               {'sha256':function['assemblyExcerptSha256']})
    declarations = [value[key] for value in (evidence,evidence.get('audit',{}))
                    for key in ['nativeCodeExecuted','nativeExecution','executedNativeCode'] if key in value]
    require(declarations and all(item is False for item in declarations),'Native execution scope differs')
    rows = [row for values in evidence['instructions'].values() for row in values]
    return {'entries':len(ids+manual_ids),'decompiledEntries':len(functions),
            'assemblyOnlyEntries':manual_ids,'instructions':len(rows),
            'originalInstructionBytes':sum(len(bytes.fromhex(row['bytes'])) for row in rows),
            'sourceExcerptHashesVerifiedByThisTool':True,
            'uniqueFunctionAndInstructionMetadataVerifiedByThisTool':True,
            'originalPEByteComparisonPerformedByThisTool':False}


def main():
    subprocess.run(['git','merge-base','--is-ancestor',BASE,'HEAD'],cwd=ROOT,check=True,capture_output=True)
    raw = subprocess.check_output(['git','show',BASE+':'+BASE_RECEIPT],cwd=ROOT)
    require(hashlib.sha256(raw).hexdigest()==BASE_RECEIPT_SHA256,'Historical physics receipt differs')
    verify(BASE_RECEIPT,{'sha256':BASE_RECEIPT_SHA256})
    baseline = json.loads(raw)
    old = historical_records({item['path'] for item in baseline['files']}|UPDATED)
    retained = 0
    for item in baseline['files']:
        require(old[item['path']]==item,'Historical receipt/Git mismatch: '+item['path'])
        if item['path'] not in UPDATED: verify(item['path'],item); retained += 1
    files = {item['path'] for item in baseline['files']}|UPDATED|{BASE_RECEIPT}
    audits, receipts = {}, {}
    for namespace in NAMESPACES:
        audits[namespace] = audit(namespace)
        implementation = 'src/gothic3/'+namespace+'.ts'
        producer = 'tools/gothic3/research_'+namespace.replace('-','_')+'.py'
        files.update((implementation,producer))
        for category in ['assets','public']:
            directory = file_path(category+'/gothic3/'+namespace)
            require(directory.is_dir(),'Namespace missing: '+str(directory))
            files.update(path.relative_to(ROOT).as_posix() for path in directory.rglob('*') if path.is_file())
        receipt_path = 'assets/gothic3/'+namespace+'/implementation-receipt.json'
        pins = verify_receipt_records(read(receipt_path))
        require(implementation in pins and producer in pins,'Current source/producer not pinned: '+namespace)
        files.update(pins); receipts[receipt_path] = record(receipt_path)
    files.add('tools/gothic3/freeze_construction_checkpoint.py')
    require(OUTPUT not in files,'Checkpoint cannot hash itself')
    records = [record(path) for path in sorted(files)]
    result = {'schema':'gothic3-runtime-construction-reading-checkpoint-v1','baseCommit':BASE,
        'scope':'original-gCEntity-construction-and-PC_Hero-Control-Sensor-factories',
        'gameplayReady':False,'baseline':{'receiptPath':BASE_RECEIPT,'receiptSha256':BASE_RECEIPT_SHA256,
            'retainedFilesVerified':retained,
            'intentionalChanges':[{'before':old[path],'after':record(path)} for path in sorted(UPDATED)],
            'historicalReceiptsRemainAtTheirRecordedCommits':True},
        'auditsFromOfflineResearch':audits,'currentReceipts':receipts,
        'checksPerformedByThisTool':['historical Git blobs and base ancestry','unchanged baseline bytes',
            'current implementation/producer/dependency pins','C/assembly excerpt hashes',
            'function/instruction identity and byte-count metadata','current file list/bytes/SHA256'],
        'validationNotPerformedByThisTool':['fresh PE byte comparison','typecheck','production build','tests',
            'native execution','browser review','deployment','playthrough'],
        'nativeCodeExecutedByThisTool':False,'testsExecutedByThisTool':False,
        'publicationIntent':{'kind':'source-only-checkpoint','branch':'codex/gothic3-gameplay-initialization',
                             'remoteActionsPerformedByThisTool':False},
        'remaining':['live-original-module-SceneAdmin-entity-construction-and-reader-integration',
            'all19-concrete-Hero-property-factories-and-real-owner-callbacks',
            'template-patching-and-original-child-layer-context-graph',
            'world-cache-physics-PVS-and-processing-activation',
            'live-input-script-story-combat-inventory-and-save-load-restoration',
            'deployed-complete-original-game-progression-through-endings'],
        'files':records,'publicBytes':sum(item['bytes'] for item in records if item['path'].startswith('public/'))}
    file_path(OUTPUT).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
    print(json.dumps({'files':len(records),'baselineRetained':retained,'audits':audits,
                      'publicBytes':result['publicBytes'],'sha256':record(OUTPUT)['sha256']}))


if __name__=='__main__':
    main()
