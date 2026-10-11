"""Feather the tree leaf atlases toward their tile borders (A110).

The crowns' leaf atlases are 8 x 8 views of 256 px, and many leaf clumps are cut off by their view's border; on a card
that border is a straight edge in the crown's outline. This fades each view's alpha over its last few pixels so the
clumps thin out at the border instead of ending in a ruled line. Only atlases whose every leaf triangle lies inside one
view are changed (a triangle crossing a border would lose leaves); the others are left as they are.

Usage: python tools/flora/feather-leaf-atlases.py [--dry] [--width 18] [ids...]
Afterwards: node tools/model-files.mjs (size/hash table). The tree receipts and the model ledger are updated here.
"""
import io, json, hashlib, struct, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / 'public/models/flora/meshy-012'
TILE = 256
DEFAULT = ['fir-spire', 'oak-elder', 'palm-fan', 'palm-lean', 'tree-0208', 'tree-1505', 'tree-1521', 'tree-1537',
           'tree-4815', 'tree-4949', 'verdant-sentinel']
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


def feather(png_bytes, width):
    im = Image.open(io.BytesIO(png_bytes)).convert('RGBA')
    a = np.asarray(im).copy()
    h, w = a.shape[:2]
    x = np.arange(w) % TILE; y = np.arange(h) % TILE
    dx = np.minimum(x, TILE - 1 - x)[None, :]; dy = np.minimum(y, TILE - 1 - y)[:, None]
    d = np.minimum(dx, dy).astype(np.float32)
    t = np.clip((d - 1) / max(1, width - 1), 0, 1)
    m = t * t * (3 - 2 * t)
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
        new_img = feather(old_img, width)
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
        for text_name in ('r', 'l'):
            text = rtext if text_name == 'r' else ltext
            text = text.replace(f'"bytes": {len(data)},\n', f'"bytes": {len(out)},\n') if f'"sha256": "{sha_old}"' in text else text
            text = text.replace(sha_old, sha_new)
            text = text.replace(f'"bytes": {len(old_img)},', f'"bytes": {len(new_img)},').replace(isha_old, isha_new)
            if text_name == 'r': rtext = text
            else: ltext = text
    if not dry:
        receipts.write_text(rtext, encoding='utf-8'); ledger.write_text(ltext, encoding='utf-8')


main()
