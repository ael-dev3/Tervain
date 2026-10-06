"""Freeze current Hero NPC/Inventory/ScriptRoutine factory/read source.

Only offline Git/file metadata is inspected. Native code, tests, builds,
browser, deployments, playthroughs and remote actions are never executed.
"""
from __future__ import annotations
import hashlib
import json
import subprocess
from freeze_session_checkpoint import ROOT, file_path, read, record, require, verify
from freeze_lifecycle_checkpoint import verify_receipt_records
from freeze_construction_checkpoint import audit

BASE = 'eb97f57b3ff2b7838862078276740526f3dc962a'
BASE_RECEIPT = 'assets/gothic3/construction-reading-checkpoint.json'
BASE_RECEIPT_SHA256 = '39b4c20b185442fd69c6a03667f91d84b2004ff5ae41b18b272c53f58d525cfb'
OUTPUT = 'assets/gothic3/character-reading-checkpoint.json'
NAMESPACES = ('npc-reading','inventory-reading','routine-reading')
UPDATED = {'.gitattributes','docs/engineering/gothic3-rebuilding-process.md'}


def historical_records(paths):
    paths = sorted(set(paths))
    request = ''.join(BASE+':'+path+'\n' for path in paths).encode('utf8')
    raw = subprocess.run(['git','cat-file','--batch'],input=request,cwd=ROOT,check=True,capture_output=True).stdout
    records, offset = {}, 0
    for path in paths:
        end = raw.index(b'\n',offset); header = raw[offset:end].split()
        require(len(header)==3 and header[1]==b'blob','Historical file absent: '+path)
        size = int(header[2]); data = raw[end+1:end+1+size]; offset = end+1+size
        require(len(data)==size and raw[offset:offset+1]==b'\n','Historical blob truncated: '+path)
        offset += 1
        records[path] = {'path':path,'bytes':size,'sha256':hashlib.sha256(data).hexdigest()}
    require(offset==len(raw),'Historical blob batch has extra bytes')
    return records


def main():
    subprocess.run(['git','merge-base','--is-ancestor',BASE,'HEAD'],cwd=ROOT,check=True,capture_output=True)
    raw = subprocess.check_output(['git','show',BASE+':'+BASE_RECEIPT],cwd=ROOT)
    require(hashlib.sha256(raw).hexdigest()==BASE_RECEIPT_SHA256,'Historical construction receipt differs')
    verify(BASE_RECEIPT,{'sha256':BASE_RECEIPT_SHA256})
    baseline = json.loads(raw)
    old = historical_records({row['path'] for row in baseline['files']}|UPDATED)
    retained = 0
    for row in baseline['files']:
        require(old[row['path']]==row,'Historical receipt/blob mismatch: '+row['path'])
        if row['path'] not in UPDATED: verify(row['path'],row); retained += 1
    files = {row['path'] for row in baseline['files']}|UPDATED|{BASE_RECEIPT}
    audits, receipts = {}, {}
    for namespace in NAMESPACES:
        audits[namespace] = audit(namespace)
        implementation = 'src/gothic3/'+namespace+'.ts'
        producer = 'tools/gothic3/research_'+namespace.replace('-','_')+'.py'
        files.update((implementation,producer))
        for category in ['assets','public']:
            directory = file_path(category+'/gothic3/'+namespace)
            require(directory.is_dir(),'Namespace absent: '+str(directory))
            files.update(path.relative_to(ROOT).as_posix() for path in directory.rglob('*') if path.is_file())
        receipt_path = 'assets/gothic3/'+namespace+'/implementation-receipt.json'
        pins = verify_receipt_records(read(receipt_path))
        require(implementation in pins and producer in pins,'Current source/producer not pinned: '+namespace)
        files.update(pins); receipts[receipt_path] = record(receipt_path)
    files.add('tools/gothic3/freeze_character_checkpoint.py')
    require(OUTPUT not in files,'Checkpoint cannot hash itself')
    records = [record(path) for path in sorted(files)]
    result = {'schema':'gothic3-runtime-character-reading-checkpoint-v1','baseCommit':BASE,
        'scope':'current-PC_Hero-NPC-Inventory-ScriptRoutine-factories-and-readers',
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
        'remaining':['actual-CString-ownership-and-selected-GUID-service-integration',
            'embedded-SPU-construction-and-real-script-actor-owner-services',
            'all19-concrete-Hero-factories-connected-to-the-original-entity-reader',
            'template-patching-and-original-child-layer-context-graph',
            'world-cache-physics-PVS-and-processing-activation',
            'live-input-story-combat-inventory-and-original-save-load-restoration',
            'deployed-complete-original-game-progression-through-endings'],
        'files':records,'publicBytes':sum(row['bytes'] for row in records if row['path'].startswith('public/'))}
    file_path(OUTPUT).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
    print(json.dumps({'files':len(records),'baselineRetained':retained,'audits':audits,
        'publicBytes':result['publicBytes'],'sha256':record(OUTPUT)['sha256']}))


if __name__=='__main__': main()
