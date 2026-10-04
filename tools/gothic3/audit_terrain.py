# SPDX-License-Identifier: GPL-3.0-only
"""Audit actual782-cell export against original bytes; no fixtures/game execution.

Usage: python -B tools/gothic3/audit_terrain.py --study COMPLETED_STUDY
Writes only assets/gothic3/terrain/conversion-audit.json after every check passes.
"""
import argparse
from collections import Counter
import io
import json
from pathlib import Path
import struct

from PIL import Image
from export_world_index import Sources,sha
from read_xcmsh import read_mesh,mesh_bounds
from terrain_formats import json_bytes,ximg_png


REPO=Path(__file__).resolve().parents[2]
OUT=REPO/'public/gothic3/terrain'


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--study',type=Path,required=True);args=parser.parse_args()
    index_data=(args.study/'02_Unpacked_Data/_metadata/effective_layers.json').read_bytes()
    sources=Sources(args.study.resolve(),json.loads(index_data)['files'])
    originals={(e['family'],e['logical_path']):e for e in sources.entries}
    manifest_data=(OUT/'manifest.json').read_bytes();manifest=json.loads(manifest_data)
    assert manifest['schema']=='gothic3-terrain-v1' and len(manifest['cells'])==782
    provenance_data=(OUT/manifest['provenance']['url']).read_bytes()
    assert sha(provenance_data)==manifest['provenance']['sha256'];provenance=json.loads(provenance_data)
    assert sha(index_data)==provenance['sourceIndexSHA256']
    for expected in provenance['outputs'].values():
        data=(OUT/expected['url']).read_bytes()
        assert len(data)==expected['bytes'] and sha(data)==expected['sha256']
    for ref in provenance['inputs'].values():
        entry=originals[(ref['family'],ref['path'])];assert entry['sha256']==ref['sha256'];sources.read(entry)
    graph_data=(OUT/manifest['materialGraphs']['url']).read_bytes()
    assert sha(graph_data)==manifest['materialGraphs']['sha256'];graphs=json.loads(graph_data)
    material_ids={m['id'] for m in graphs['materials']};texture_ids={t['id'] for t in manifest['textures']}
    assert len(material_ids)==65 and len(texture_ids)==89
    audited_primitives=0;audited_triangles=0;audited_vertices=0;stream_primitives=Counter();maximum_rounding_error=0.
    for number,cell in enumerate(manifest['cells'],1):
        entry=originals[(cell['source']['family'],cell['source']['path'])];sources.read(entry)
        sections=read_mesh(sources.path(entry));assert sha(sources.path(entry).read_bytes())==entry['sha256']
        geometry=cell['geometry'];data=(OUT/geometry['url']).read_bytes()
        assert sha(data)==geometry['sha256'] and len(data)==geometry['bytes']
        magic,version,total=struct.unpack_from('<III',data);assert (magic,version,total)==(0x46546c67,2,len(data))
        js_size,js_type=struct.unpack_from('<II',data,12);assert js_type==0x4e4f534a and js_size%4==0
        doc=json.loads(data[20:20+js_size]);bin_size,bin_type=struct.unpack_from('<II',data,20+js_size)
        assert bin_type==0x004e4942 and 28+js_size+bin_size==len(data)==total
        binary=data[28+js_size:];assert len(binary)==doc['buffers'][0]['byteLength']
        for view in doc['bufferViews']:
            assert view['byteOffset']%4==0 and view['byteOffset']+view['byteLength']<=len(binary)
        def accessor(index):
            record=doc['accessors'][index];view=doc['bufferViews'][record['bufferView']]
            assert record.get('byteOffset',0)==0 and 'byteStride' not in view
            return record,binary[view['byteOffset']:view['byteOffset']+view['byteLength']]
        low,high=mesh_bounds(sections);center=[(low[i]+high[i])/2 for i in range(3)]
        expected_center=[center[0]/100,center[1]/100,-center[2]/100]
        assert doc['nodes'][0]['translation']==cell['centerMetres']==expected_center
        primitives=doc['meshes'][0]['primitives'];assert len(primitives)==len(sections)==geometry['primitiveCount']
        vertices=0;triangles=0
        for primitive,section,material_id in zip(primitives,sections,cell['primitiveMaterialIds'],strict=True):
            assert material_id in material_ids and material_id.casefold()==section['material'].rstrip('|').casefold()
            assert doc['materials'][primitive['material']]['extras']['nativeMaterialId']==material_id
            assert primitive['mode']==4
            streams=section['streams'];stream_primitives.update(str(t) for t in streams)
            count=streams[1]['count'];vertices+=count
            record,positions=accessor(primitive['attributes']['POSITION']);assert record['count']==count and record['componentType']==5126
            expected=[[(p[i]-center[i])/100*(-1 if i==2 else 1) for i in range(3)]
                      for p in struct.iter_unpack('<fff',streams[1]['data'])]
            assert positions==b''.join(struct.pack('<fff',*p) for p in expected)
            actual=list(struct.iter_unpack('<fff',positions))
            maximum_rounding_error=max(maximum_rounding_error,max(abs(a-b) for p,q in zip(expected,actual) for a,b in zip(p,q)))
            assert record['min']==[min(p[i] for p in actual) for i in range(3)]
            assert record['max']==[max(p[i] for p in actual) for i in range(3)]
            for typ,stream in streams.items():
                if typ in (0,1):continue
                assert stream['count']==count
                if typ in (3,64):
                    attr='NORMAL' if typ==3 else '_G3_TANGENT'
                    expected_bytes=b''.join(struct.pack('<fff',x,y,-z) for x,y,z in struct.iter_unpack('<fff',stream['data']))
                elif typ in (12,15,18,21):attr='TEXCOORD_'+str((typ-12)//3);expected_bytes=stream['data']
                elif typ in (4,5):attr='_G3_BGRA' if typ==4 else '_G3_SPECULAR_BGRA';expected_bytes=stream['data']
                else:raise ValueError('Unsupported actual stream')
                ar,actual_bytes=accessor(primitive['attributes'][attr]);assert actual_bytes==expected_bytes and ar['count']==count
                if typ in (4,5):assert ar['componentType']==5121 and not ar.get('normalized',False)
                else:assert ar['componentType']==5126
            ir,indices=accessor(primitive['indices']);assert ir['count']==streams[0]['count']
            assert ir['componentType'] in (5123,5125);fmt='H' if ir['componentType']==5123 else 'I'
            ids=list(struct.unpack('<'+'I'*streams[0]['count'],streams[0]['data']))
            expected_ids=[v for i in range(0,len(ids),3) for v in reversed(ids[i:i+3])]
            assert indices==struct.pack('<'+fmt*len(expected_ids),*expected_ids)
            assert len(ids)%3==0;triangles+=len(ids)//3
            audited_primitives+=1
        assert vertices==geometry['vertices'] and triangles==geometry['triangles']
        audited_vertices+=vertices;audited_triangles+=triangles
        assert cell['native']['visualResourceFileName'].casefold()==Path(cell['source']['path']).name.casefold()
        assert set(cell['textureIds']).issubset(texture_ids)
        if number%200==0:print(f'Audited original geometry bytes: {number}/782.',flush=True)
    for number,texture in enumerate(manifest['textures'],1):
        entry=originals[(texture['source']['family'],texture['source']['path'])];native=sources.read(entry)
        png,pixels,metadata=ximg_png(native);actual=(OUT/texture['url']).read_bytes()
        assert png==actual and sha(actual)==texture['sha256'] and sha(pixels)==texture['pixelSHA256']
        with Image.open(io.BytesIO(actual)) as image:assert image.convert('RGBA').tobytes()==pixels
        assert metadata['nativeMipCount']==texture['nativeMipCount'] and texture['hostedMipCount']==1
        if number%20==0:print(f'Audited original decoded texture pixels: {number}/89.',flush=True)
    assert audited_triangles==manifest['summary']['triangles']==2082155
    assert audited_vertices==manifest['summary']['vertices']==1931561
    assert audited_primitives==manifest['summary']['primitives']==2549
    assert dict(stream_primitives)==manifest['summary']['primitiveCountByStream']
    assert maximum_rounding_error==manifest['summary']['maxPositionRoundingErrorMetres']
    receipt={'schema':'gothic3-terrain-conversion-audit-v1','manifestSHA256':sha(manifest_data),
        'provenanceSHA256':sha(provenance_data),'sourceIndexSHA256':sha(index_data),
        'auditScriptSHA256':sha(Path(__file__).read_bytes()),'cells':782,'nativeTextureDependencies':89,
        'uniquePNGFiles':len({t['url'] for t in manifest['textures']}),'triangles':audited_triangles,
        'vertices':audited_vertices,'primitives':audited_primitives,
        'maxPositionRoundingErrorMetres':maximum_rounding_error,
        'verified':['Every GLB header/accessor/buffer range and primitive/material binding.',
                    'Every original triangle index after explicit Z-reflection winding reversal.',
                    'Every UV/color byte, every reflected normal/tangent float, every source-derived position float.',
                    'All actual source/output hashes and every PNG decoded RGBA pixel against its original largest XIMG mip.'],
        'scope':'Actual original files and produced artifacts only; no fixtures, native execution, renderer/performance/full-game assertion.'}
    output=REPO/'assets/gothic3/terrain/conversion-audit.json';data=json_bytes(receipt);output.write_bytes(data)
    assert sha(output.read_bytes())==sha(data)
    print(json.dumps({'audit':receipt,'receiptSHA256':sha(data)}),flush=True)


if __name__=='__main__':main()
