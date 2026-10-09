"""Normalize verified original class-name patterns without granting native calls."""
import argparse
import hashlib
import json
from pathlib import Path

from prepare_game_class_name_patterns import capture
from read_dialogue_native_evidence import PE
from prepare_runtime_admin_source import image_bytes

ALIASES = {
    '204b11b0': 'layerBase', '204b11c0': 'objectRef',
    '204b15f0': 'scriptAdmin', '204b1840': 'navigation',
    '204b2110': 'arena', '204b2120': 'arenaStatus',
}


def prepare(study, callbacks, repo):
    batch = capture(study, callbacks)
    original = (study/'00_Original_Runtime/Game.dll').read_bytes()
    if hashlib.sha256(original).hexdigest() != batch['inputs']['Game']:
        raise ValueError('Original Game image changed during alias recovery')
    pe = PE(original)
    legacy_images = {}
    for package in ['game-crt/runtime-rules.json', 'layer-base-class-name/source.json',
                    'object-ref-class-name/source.json', 'arena-class-name/source.json',
                    'arena-status-descriptor/source.json']:
        data = json.loads((repo/'assets/gothic3'/package).read_text())
        for group in ['coldGlobals', 'constBytes']:
            legacy_images.update(data.get(group, {}))
        legacy_images.update({image['label']: image for image in data.get('images', [])})
        if package == 'arena-status-descriptor/source.json':
            for key, label in [('typeNameCache','arenaStatusClassName'),('priorNameResult','arenaStatusInitializerResult'),
                               ('typeInfoDescriptor','arenaStatusTypeInfoDescriptor')]:
                legacy_images[label] = dict(data[key], bytes=len(data[key]['raw'])//2)
    specs, methods, images = [], {}, {}
    for row in batch['classes']:
        entry = row['initializer']
        alias = ALIASES.get(entry)
        prefix = 'gameClass' + entry
        labels = dict(cache=alias+'ClassName' if alias else prefix+'Cache',
            result=alias+'InitializerResult' if alias else prefix+'Result',
            descriptor=alias+'TypeInfoDescriptor' if alias else prefix+'Descriptor',
            getter=alias+'ClassName' if alias else prefix+'Getter',
            destructor=alias+'ClassNameDestructor' if alias else prefix+'Destructor',
            initializer=prefix+'Initializer')
        getter = row['getterSource']
        destructor = row['destructor']
        for kind, source_key in [('cache','fields'),('result','result'),('descriptor','descriptor')]:
            original = batch['images'][row['images'][source_key]]
            label = labels[kind]
            if alias:
                old = legacy_images[label]
                overlap = min(old['bytes'], original['bytes']) * 2
                raw, _ = image_bytes(pe, int(old['address'],16), old['bytes'])
                if old['address'] != original['address'] or original['raw'][:overlap] != old['raw'][:overlap] or raw.hex() != old['raw']:
                    raise ValueError('Existing canonical image differs: '+label)
            else:
                images[label] = dict(original, module='Game', scope='cold-original-image')
        initializer = dict(module='Game', entry=entry, body=entry, entryChain=[],
            bodyInstructionBytesSha256=row['initializerSource']['instructionBytesSha256'],
            instructions=row['initializerInstructions'], recoveryOrigin=row['initializerSource'])
        methods[labels['initializer']] = initializer
        if not alias:
            methods[labels['getter']] = dict(getter, module='Game', entry=getter['entryVA'][2:], body=getter['bodyVA'][2:])
            methods[labels['destructor']] = dict(destructor, module='Game')
        specs.append(dict(initializer=entry, getter=row['getter'], slots=row['slots'],
            labels=labels, legacyOwner=alias, typeTarget=alias or prefix,
            decoratedName=row['decoratedName'], getterBody=getter['bodyVA'][2:],
            getterHash=getter['bodyInstructionBytesSha256'], getterChain=getter['entryChain'],
            destructorEntry=destructor['entry'], destructorBody=destructor['body'],
            destructorHash=destructor['bodyInstructionBytesSha256'], destructorChain=destructor['entryChain'],
            instructions=row['initializerInstructions']))
    return dict(schema='gothic3-game-class-name-family-v1',inputs=batch['inputs'],
        specs=specs,methods=methods,coldGlobals=images,constBytes={},imports={'Game':batch['imports']},
        producerSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        sourceOnly=True,executionAdmitted=False,wholeCrtTraversalCompleted=False,fullCampaignCompleted=False)


def write_runtime(data, output):
    template = '''/** Generated original class-name family. Frozen source proof does not grant a runtime CALL. */
import sourceText from '../../assets/gothic3/game-class-name-family/source.json?raw';
import type { NativeCrtSourceRules, NativeCrtImageReceipt, NativeCrtMethodReceipt } from './native-game-crt-profile';
import type { NativeGameIoInstruction } from './native-game-crt-io-source';
export interface GameClassNameSpec {
  readonly initializer: string; readonly getter: string; readonly slots: readonly string[];
  readonly labels: Readonly<{ cache: string; result: string; descriptor: string; getter: string; destructor: string; initializer: string }>;
  readonly legacyOwner: 'layerBase' | 'objectRef' | 'navigation' | 'scriptAdmin' | 'arena' | 'arenaStatus' | null;
  readonly typeTarget: string; readonly decoratedName: string;
  readonly getterBody: string; readonly getterHash: string;
  readonly getterChain: readonly { readonly va: string; readonly bytes: string; readonly targetVA: string }[];
  readonly destructorEntry: string; readonly destructorBody: string; readonly destructorHash: string;
  readonly destructorChain: readonly { readonly va: string; readonly bytes: string; readonly targetVA: string }[];
  readonly instructions: readonly NativeGameIoInstruction[];
}
interface Package extends NativeCrtSourceRules { readonly specs: readonly GameClassNameSpec[]; }
const expected: unknown = JSON.parse(__EXPECTED__);
const source: Package = JSON.parse(sourceText);
function equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>, keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => Object.hasOwn(right,key) && equal(left[key],right[key]));
}
function freeze(value: unknown): void {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
}
freeze(source); freeze(expected);
let sourceAdmitted = false;
export function admitGameClassNameFamilySource(): void {
  // Only immutable source equality is retained. Controller, heap, stack and
  // current physical image ownership must still be proved on each operation.
  if (!sourceAdmitted) {
    if (!equal(source,expected)) throw new Error('Original Game class-name family source differs');
    sourceAdmitted = true;
  }
}
admitGameClassNameFamilySource();
export const gameClassNameFamilyRules: NativeCrtSourceRules = source;
const specs = new Map(source.specs.map(spec => [spec.initializer,spec]));
export const gameClassNameFamilySpecs: readonly GameClassNameSpec[] = source.specs;
export function gameClassNameSpec(initializer: string): GameClassNameSpec | null {
  admitGameClassNameFamilySource(); return specs.get(initializer) ?? null;
}
export function isGameClassNameSpec(spec: GameClassNameSpec): boolean { return specs.get(spec.initializer) === spec; }
export const gameClassNameFamilyImagePins: Readonly<Record<string, readonly ['coldGlobals',string,number,string,string]>> =
  Object.fromEntries(Object.entries(source.coldGlobals).map(([label,image]) =>
    [label,['coldGlobals',image.address,image.bytes,image.raw,image.sha256!]]));
freeze(gameClassNameFamilyImagePins);
export function gameClassNameFamilyImageReceipt(label: string): NativeCrtImageReceipt {
  const image = source.coldGlobals[label]; if (!image) throw new Error('Unknown original Game class-name family image');
  return image;
}
export function gameClassNameFamilyInstruction(initializer: string, pc: string): NativeGameIoInstruction {
  const row = gameClassNameSpec(initializer)?.instructions.find(row => row.va === pc);
  if (!row) throw new Error('Unowned original Game class-name initializer row: '+pc);
  return row;
}
export function gameClassNameDestructorMatches(label: string, method: NativeCrtMethodReceipt | undefined): boolean {
  const spec = source.specs.find(spec => !spec.legacyOwner && spec.labels.destructor === label);
  return !!spec && !!method && method === source.methods[label] && method.module === 'Game' &&
    method.entry === spec.destructorEntry && method.body === spec.destructorBody &&
    method.bodyInstructionBytesSha256 === spec.destructorHash;
}
'''
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(template.replace('__EXPECTED__',json.dumps(json.dumps(data,separators=(',',':')))),encoding='utf-8',newline='\n')


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study',type=Path,required=True)
    parser.add_argument('--callbacks',type=Path,default=Path(__file__).resolve().parents[2]/'assets/gothic3/game-cinit-callbacks')
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--runtime-output',type=Path,required=True)
    args=parser.parse_args()
    data=prepare(args.study,args.callbacks,Path(__file__).resolve().parents[2])
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8',newline='\n')
    write_runtime(data,args.runtime_output)
    print('Captured',len(data['specs']),'original class-name specifications with six existing owner aliases')
