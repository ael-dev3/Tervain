# SPDX-License-Identifier: GPL-3.0-only
"""Decode native .xcmsh streams; format reference Baltram/rmtools GPL-3.0.

Reference implementation: mimicry/source/Mimicry/mi_xcmshreader.cpp.
Coordinates returned here remain the original Gothic 3 centimetres. The
preparation step performs the explicit handedness/unit/origin conversion.
"""
import struct
from pathlib import Path
from read_genome import Reader


def read_mesh(path):
    b = Path(path).read_bytes()
    r = Reader(b)
    if b[:8] == b'GENOMFLE':
        r.skip(10); dead = r.u32()
        st = Reader(b, offset=dead+4)
        assert st.u8() == 1
        r.strings = [st.take(st.u16()).decode('cp1252') for _ in range(st.u32())]
        assert st.pos == len(b)
        r.pos = 14
        entry = r.entry
    else:
        entry = lambda: r.take(r.u16()).decode('cp1252')
    assert r.take(6) == bytes.fromhex('010001010001')
    assert entry() == 'eCResourceMeshComplex_PS'
    assert r.u8() == 1 and r.u16() == 0
    version = r.u16(); r.skip(6)
    if version < 81: entry()
    if version < 82: r.skip(20)
    r.u16()
    for _ in range(r.u32()):
        entry(); entry(); r.u16(); r.skip(r.u32())
    version, ps_version = r.u16(), r.u16()
    assert version >= 34
    if ps_version > 22: r.u32()
    if ps_version < 30:
        if r.u16() > 1: r.u8()
    r.f32()
    sections = []
    stride = {0:4, 1:12, 2:16, 3:12, 4:4, 5:4, 6:4,
              12:8, 15:8, 18:8, 21:8, 64:12, 72:12, 73:8}
    def skip_array(n=4, genome=True):
        if genome: r.u8()
        r.skip(r.u32()*n)
    for _ in range(r.u32()):
        v = r.u16(); r.u32()
        box = r.vec(6); r.u32(); material = entry()
        streams = {}
        for _ in range(r.u32()):
            typ = r.u32(); r.u16(); r.u8(); count = r.u32()
            if typ not in stride: raise ValueError(f'unknown mesh stream {typ}')
            streams[typ] = {'count':count, 'stride':stride[typ], 'data':r.take(count*stride[typ])}
        if v > 2: skip_array(); skip_array()
        if v > 1:
            r.u8()
            for _ in range(r.u32()): skip_array(); skip_array(); r.skip(84)
        if v > 3: skip_array(24,False); skip_array()
        sections.append({'box':box, 'material':material, 'streams':streams})
    return sections


def mesh_bounds(sections):
    return [min(s['box'][i] for s in sections) for i in range(3)], [max(s['box'][i+3] for s in sections) for i in range(3)]


def obj_text(sections, name, origin=(0,0,0)):
    """Original mesh faces/UVs/normals, reflected into right-handed metres."""
    lines = [f'mtllib {name}.mtl']
    vi = ti = ni = 1
    triangles = 0
    for k,s in enumerate(sections):
        streams = s['streams']; positions = streams.get(1); indices = streams.get(0)
        if not positions or not indices: continue
        lines.append(f'o {name}_{k}'); lines.append('usemtl '+Path(s['material']).stem)
        for x,y,z in struct.iter_unpack('<fff',positions['data']):
            lines.append(f'v {(x-origin[0])/100:.6f} {(y-origin[1])/100:.6f} {-(z-origin[2])/100:.6f}')
        uv, normals = streams.get(12), streams.get(3)
        if uv:
            assert uv['count'] == positions['count']
            for u,v in struct.iter_unpack('<ff',uv['data']): lines.append(f'vt {u:.6f} {-v:.6f}')
        if normals:
            assert normals['count'] == positions['count']
            for x,y,z in struct.iter_unpack('<fff',normals['data']): lines.append(f'vn {x:.6f} {y:.6f} {-z:.6f}')
        ids = struct.unpack('<'+'I'*indices['count'],indices['data'])
        assert len(ids)%3 == 0 and max(ids,default=0) < positions['count']
        for j in range(0,len(ids),3):
            f = []
            for idx in reversed(ids[j:j+3]):
                f.append(f'{vi+idx}'+(f'/{ti+idx}' if uv else ('/' if normals else ''))+(f'/{ni+idx}' if normals else ''))
            lines.append('f '+' '.join(f))
        triangles += len(ids)//3
        vi += positions['count']
        if uv: ti += uv['count']
        if normals: ni += normals['count']
    return '\n'.join(lines)+'\n', triangles
