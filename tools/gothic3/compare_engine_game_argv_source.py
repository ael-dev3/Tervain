"""Compare captured Engine and Game argv instruction structure, without granting execution authority."""
import argparse
import hashlib
import json
import re
from pathlib import Path


def compare(engine_path, game_path):
    engine_raw = engine_path.read_bytes()
    game_raw = game_path.read_bytes()
    engine = json.loads(engine_raw)['source']['methods']
    game = json.loads(game_raw)['originalModuleAudit']['methods']
    rows = []
    for engine_label, game_label in [('engineArgumentSetup', 'setArgv'),
                                    ('engineArgumentParser', 'parseCommandLine'),
                                    ('engineArgumentMultibyteDependency', 'initMbcTable')]:
        e = next(method for method in engine if method['label'] == engine_label)
        g = next(method for method in game if method['label'] == game_label)
        mapping = {}
        mismatches = []
        delta = int(e['bodyVA'], 16) - int(g['bodyVA'], 16)
        for er, gr in zip(e['instructions'], g['instructions']):
            et, gt = er['instruction'], gr['instruction']
            eh, gh = re.findall(r'0x[0-9a-f]+', et), re.findall(r'0x[0-9a-f]+', gt)
            same = (re.sub(r'0x[0-9a-f]+', '#', et) == re.sub(r'0x[0-9a-f]+', '#', gt)
                    and len(eh) == len(gh) and int(er['va'], 16) - int(gr['va'], 16) == delta)
            if same:
                for ev, gv in zip(eh, gh):
                    if ev == gv:
                        continue
                    if not (0x30000000 <= int(ev, 16) < 0x31000000 and
                            0x20000000 <= int(gv, 16) < 0x21000000) or (gv in mapping and mapping[gv] != ev):
                        same = False
                        break
                    mapping[gv] = ev
            if not same:
                mismatches.append(dict(enginePc=er['va'], gamePc=gr['va'], engine=et, game=gt))
        rows.append(dict(engine=engine_label, game=game_label,
                         engineInstructions=len(e['instructions']), gameInstructions=len(g['instructions']),
                         sameLength=len(e['instructions']) == len(g['instructions']),
                         addressDelta=f'{delta:x}', addressMap=mapping, mismatches=mismatches))
    return dict(schema='gothic3.engine-game-argv-comparison.v1',
                engineReceiptSha256=hashlib.sha256(engine_raw).hexdigest(),
                gameReceiptSha256=hashlib.sha256(game_raw).hexdigest(), comparisons=rows,
                notes=['Comparison preserves constants and instruction offsets; only module address operands may differ.',
                       'Equivalent structure does not grant Game execution capabilities to Engine or prove dependency equivalence.'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--engine', type=Path, required=True)
    parser.add_argument('--game', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = compare(args.engine, args.game)
    args.output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8', newline='\n')
    for row in result['comparisons']:
        print(row['engine'], row['engineInstructions'], row['gameInstructions'], 'mismatches', len(row['mismatches']))
