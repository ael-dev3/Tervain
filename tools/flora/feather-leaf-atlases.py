"""Feather the tree leaf atlases toward their tile borders (A110).

The crowns' leaf atlases are 8 x 8 views of 256 px, and many leaf clumps are cut off by their view's border; on a card
that border is a straight edge in the crown's outline. This fades each view's alpha over its last few pixels so the
clumps thin out at the border instead of ending in a ruled line. A border that leaf cards cross (a card spanning two
views) is left as it is, so no card loses leaves (tools/flora/leaf-atlas-joins.mjs finds them).

Each atlas is feathered once: docs/engineering/leaf-atlas-feather.json records the source and feathered image hashes,
and an atlas already feathered is passed over.

Usage: python tools/flora/feather-leaf-atlases.py [--dry] [--width 18] [ids...]
Afterwards: node tools/model-files.mjs (size/hash table). The tree receipts and the model ledger are updated here.
"""
import io, json, hashlib, struct, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / 'public/models/flora/meshy-012'
TILE = 256
DEFAULT = ['fir-spire', 'oak-elder', 'palm-date', 'palm-fan', 'palm-lean', 'tree-0208', 'tree-1459', 'tree-1505', 'tree-1521',
           'tree-1527', 'tree-1537', 'tree-3106', 'tree-4815', 'tree-4949', 'verdant-sentinel']
RECORD = ROOT / 'docs/engineering/leaf-atlas-feather.json'
pad4 = lambda n: (n + 3) & ~3


def read_glb(data):
    jl = struct.unpack_from('<I', data, 12)[0]
    js = json.loads(data[20:20 + jl])
    bl = struct.unpack_from('<I', data, 20 + jl)[0]
    return js, bytearray(data[28 + jl:28 + jl + bl])


def write_glb(js, bin_):
    j = json.dumps(js, separators=(',', ':')).encode()
    j += b' ' * (pad4(len(j)) - len(j))
    bin_ = bytes(bin_) + b'\0' * (pad4(len(bin_)) - len(bin_))
    total = 12 + 8 + len(j) + 8 + len(bin_)
    return struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(j), 0x4E4F534A) + j + struct.pack('<II', len(bin_), 0x004E4942) + bin_


def leaf_image(js):
    for m in js['materials']:
        if m.get('alphaMode') == 'MASK' and 'baseColorTexture' in m.get('pbrMetallicRoughness', {}):
            t = js['textures'][m['pbrMetallicRoughness']['baseColorTexture']['index']]
            return t.get('extensions', {}).get('EXT_texture_webp', {}).get('source', t.get('source'))
    raise SystemExit('no masked leaf material')


def feather(png_bytes, width, joins):
    im = Image.open(io.BytesIO(png_bytes)).convert('RGBA')
    a = np.asarray(im).copy()
    h, w = a.shape[:2]
    v = {tuple(x) for x in joins.get('v', [])}; hz = {tuple(x) for x in joins.get('h', [])}
    x = np.arange(w); y = np.arange(h)
    tx, ty = x // TILE, y // TILE
    lx, ly = x % TILE, y % TILE
    big = 1e9
    # Distance to each side of the pixel's view, or none where cards cross that side into the next view.
    m = np.ones((h, w), np.float32)
    for row in range(0, h, TILE):
        for col in range(0, w, TILE):
            cx, cy = col // TILE, row // TILE
            dl = lx[col:col + TILE].astype(np.float32) if (cx - 1, cy) not in v else np.full(TILE, big, np.float32)
            dr = (TILE - 1 - lx[col:col + TILE]).astype(np.float32) if (cx, cy) not in v else np.full(TILE, big, np.float32)
            dt = ly[row:row + TILE].astype(np.float32) if (cx, cy - 1) not in hz else np.full(TILE, big, np.float32)
            db = (TILE - 1 - ly[row:row + TILE]).astype(np.float32) if (cx, cy) not in hz else np.full(TILE, big, np.float32)
            d = np.minimum(np.minimum(dl, dr)[None, :], np.minimum(dt, db)[:, None])
            t = np.clip((d - 1) / max(1, width - 1), 0, 1)
            m[row:row + TILE, col:col + TILE] = t * t * (3 - 2 * t)
    a[:, :, 3] = np.round(a[:, :, 3].astype(np.float32) * m).astype(np.uint8)
    out = io.BytesIO()
    # Quality 100 keeps the colours within 47.6 dB of the source atlas (measured on the oak); the alpha is exact.
    Image.fromarray(a).save(out, 'WEBP', quality=100, alpha_quality=100, method=6)
    return out.getvalue()


def splice(js, bin_, view_index, payload):
    bv = js['bufferViews'][view_index]
    start = bv.get('byteOffset', 0)
    starts = sorted({v.get('byteOffset', 0) for v in js['bufferViews'] if v.get('buffer', 0) == 0} |
                    {v['extensions']['EXT_meshopt_compression'].get('byteOffset', 0) for v in js['bufferViews']
                     if 'EXT_meshopt_compression' in v.get('extensions', {}) and v['extensions']['EXT_meshopt_compression'].get('buffer', 0) == 0})
    following = [s for s in starts if s > start]
    gap = (following[0] if following else len(bin_)) - start
    new_gap = pad4(len(payload))
    delta = new_gap - gap
    bin_[start:start + gap] = payload + b'\0' * (new_gap - len(payload))
    for v in js['bufferViews']:
        if v.get('buffer', 0) == 0 and v.get('byteOffset', 0) > start: v['byteOffset'] += delta
        ext = v.get('extensions', {}).get('EXT_meshopt_compression')
        if ext and ext.get('buffer', 0) == 0 and ext.get('byteOffset', 0) > start: ext['byteOffset'] += delta
    bv['byteLength'] = len(payload)
    js['buffers'][0]['byteLength'] = len(bin_)
    return bin_


def main():
    args = sys.argv[1:]
    dry = '--dry' in args
    width = int(args[args.index('--width') + 1]) if '--width' in args else 18
    ids = [a for a in args if not a.startswith('--') and not a.isdigit()] or DEFAULT
    record = json.loads(RECORD.read_text(encoding='utf-8')) if RECORD.exists() else {'width': width, 'atlases': {}}
    joins = json.loads(subprocess.run(['node', str(ROOT / 'tools/flora/leaf-atlas-joins.mjs'), *ids], capture_output=True, text=True, check=True, cwd=ROOT).stdout)
    receipts = ROOT / 'docs/engineering/meshy-tree-assets.json'
    ledger = ROOT / 'public/model-licenses.json'
    rtext, ltext = receipts.read_text(encoding='utf-8'), ledger.read_text(encoding='utf-8')
    for id_ in ids:
        path = DIR / f'{id_}-near.glb'
        data = path.read_bytes()
        js, bin_ = read_glb(data)
        img = leaf_image(js)
        bv = js['bufferViews'][js['images'][img]['bufferView']]
        old_img = bytes(bin_[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])
        if record['atlases'].get(id_, {}).get('feathered') == hashlib.sha256(old_img).hexdigest():
            print(f'{id_:18} already feathered'); continue
        new_img = feather(old_img, width, joins[id_])
        out = write_glb(js, splice(js, bin_, js['images'][img]['bufferView'], new_img))
        # Verify: the image round-trips and every other view's bytes are where the JSON now says.
        js2, bin2 = read_glb(out)
        bv2 = js2['bufferViews'][js2['images'][img]['bufferView']]
        assert bytes(bin2[bv2.get('byteOffset', 0):bv2.get('byteOffset', 0) + bv2['byteLength']]) == new_img
        sha_old, sha_new = hashlib.sha256(data).hexdigest(), hashlib.sha256(out).hexdigest()
        isha_old, isha_new = hashlib.sha256(old_img).hexdigest(), hashlib.sha256(new_img).hexdigest()
        print(f'{id_:18} atlas {len(old_img):>8} -> {len(new_img):>8}  file {len(data):>8} -> {len(out):>8}')
        if dry: continue
        path.write_bytes(out)
        record['atlases'][id_] = {'source': isha_old, 'feathered': isha_new, 'joinedBorders': len(joins[id_]['v']) + len(joins[id_]['h'])}
        for text_name in ('r', 'l'):
            text = rtext if text_name == 'r' else ltext
            text = text.replace(f'"bytes": {len(data)},\n', f'"bytes": {len(out)},\n') if f'"sha256": "{sha_old}"' in text else text
            text = text.replace(sha_old, sha_new)
            text = text.replace(f'"bytes": {len(old_img)},', f'"bytes": {len(new_img)},').replace(isha_old, isha_new)
            if text_name == 'r': rtext = text
            else: ltext = text
    if not dry:
        receipts.write_text(rtext, encoding='utf-8'); ledger.write_text(ltext, encoding='utf-8')
        RECORD.write_text(json.dumps(record, indent=2) + chr(10), encoding='utf-8')


main()
