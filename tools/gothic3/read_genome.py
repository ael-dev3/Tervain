# SPDX-License-Identifier: GPL-3.0-only
"""Read-only Gothic 3 .node/.lrentdat entity reader for asset preparation.

Binary layout reference: georgeto/g3dit, commit
30113b8254d3e6d0395d8e3c78618a99fbc0a6ca (GPL-3.0), particularly
GenomeFile, NodeFile, ArchiveEntity, ClassUtil and eCVisualAnimation_PS.
This deliberately decodes only source transforms, typed string properties and
animation mesh slots. All other property bytes remain opaque.
"""
import struct
from pathlib import Path


class Reader:
    def __init__(self, data, strings=None, offset=0):
        self.data, self.strings, self.pos = data, strings or [], offset

    def take(self, n):
        if n < 0 or self.pos + n > len(self.data):
            raise ValueError(f'out of bounds read at {self.pos}: {n}')
        v = self.data[self.pos:self.pos+n]
        self.pos += n
        return v

    def skip(self, n): self.take(n)
    def unpack(self, fmt): return struct.unpack('<'+fmt, self.take(struct.calcsize('<'+fmt)))
    def u8(self): return self.unpack('B')[0]
    def u16(self): return self.unpack('H')[0]
    def u32(self): return self.unpack('I')[0]
    def entry(self):
        i = self.u16()
        if i >= len(self.strings): raise ValueError(f'invalid string index {i}')
        return self.strings[i]
    def property_entry(self, raw):
        if len(raw) != 2: return None
        i = struct.unpack('<H', raw)[0]
        if i >= len(self.strings): raise ValueError(f'invalid property string index {i}')
        return self.strings[i]
    def f32(self): return self.unpack('f')[0]
    def vec(self, n): return list(self.unpack('f'*n))


def read_class(r, outer=True, legacy=False):
    if outer:
        r.u16()
        if legacy:
            r.u32(); pre_name = r.entry()
    assert r.take(6) == bytes.fromhex('010001010001')
    name = r.entry()
    r.skip(5)
    version, size = r.u16(), r.u32()
    end = r.pos + size
    if version == 1: r.entry()
    if version <= 0x51: r.skip(20)
    r.u16()
    props = []
    for _ in range(r.u32()):
        prop, typ = r.entry(), r.entry()
        r.u16()
        raw = r.take(r.u32())
        value = None
        if typ in ('bCString', 'bCUnicodeString') or typ.endswith('ResourceString'):
            value = r.property_entry(raw)
        props.append({'name': prop, 'type': typ, 'value': value, 'raw': raw.hex()})
    class_version = r.u16()
    tail = r.data[r.pos:end]
    slots = []
    if name == 'eCVisualAnimation_PS':
        r.u16()
        def slot(named):
            s = {'slot': r.entry() if named else 'actor'}
            r.u16(); s['file'] = r.entry(); s['materialSwitch'] = r.u32()
            if r.u8():
                r.u16(); s['file2'] = r.entry(); s['materialSwitch2'] = r.u32()
            return s
        slots.append(slot(False))
        for _ in range(r.u32()):
            slots.append(slot(True))
            assert r.u8() == 1
    if name == 'eCEntityDynamicContext':
        # Its stored object size spans the containing archive; it is not an
        # ordinary property-set boundary. The source reader consumes 33 bytes.
        r.skip(33)
    else:
        if r.pos > end: raise ValueError(f'class {name} read past boundary')
        r.pos = end
    if outer: assert r.u32() == 0xDEADC0DE
    return {'name': name, 'version': class_version, 'properties': props, 'slots': slots, 'tail': tail.hex()}


def read_entities(path):
    data = Path(path).read_bytes()
    r = Reader(data)
    legacy = data[:8] != b'GENOMFLE'
    strings = []
    if legacy:
        # Engine.dll eCGeometrySpatialContext::ReadNodes / ReadNodesOld:
        # v72 stores its archive string table before its entity stream.
        assert r.u16() == 72 and r.u16() == 1 and r.u8() == 1
        for _ in range(r.u32()): strings.append(r.take(r.u16()).decode('cp1252'))
        remaining = r.u32()
        assert remaining == len(data)-r.pos
        deadbeef = len(data)
    else:
        assert r.take(8) == b'GENOMFLE'
        r.u16(); deadbeef = r.u32()
        st = Reader(data, offset=deadbeef+4)
        assert st.u8() == 1
        for _ in range(st.u32()): strings.append(st.take(st.u16()).decode('cp1252'))
        assert st.pos == len(data)
    r.strings = strings
    is_node = Path(path).suffix.lower() == '.node'
    if not is_node:
        assert r.take(8) == b'GENOMEDL'
    if not legacy: assert r.u16() == 83
    if not is_node: read_class(r, False)
    entities = []
    for i in range(r.u32()):
        start = r.pos
        if is_node:
            has_creator, disable_patch = r.u8(), r.u8()
            assert r.u16() == 0x23
            creator = r.take(20).hex() if r.u8() else None
            r.skip(24+60)
        else:
            assert r.u16() == 0x40 and r.u16() == 0x53
            creator = r.take(20).hex() if r.u8() else None
        entity_version = r.u16()
        assert entity_version == (0x3F if legacy else 0x53)
        r.u16()
        guid = r.take(20).hex()
        flags = list(r.take(8 if legacy else 7))
        alpha = r.f32()
        r.skip(6)
        name = r.entry()
        world, local = r.vec(16), r.vec(16)
        world_tree_box, local_box, world_box = r.vec(6), r.vec(6), r.vec(6)
        r.skip(32+4+1+4+4+4+2)
        classes = [read_class(r, legacy=legacy) for _ in range(r.u32())]
        if is_node and has_creator and not disable_patch: r.skip(20)
        entities.append({'index': i, 'name': name, 'guid': guid, 'creator': creator,
                         'flags': flags, 'alpha': alpha, 'worldMatrix': world,
                         'localMatrix': local, 'worldBox': world_box, 'localBox': local_box,
                         'classes': classes, 'sourceOffset': start})
    parents = []
    while True:
        parent = r.u32()
        if parent == 0xFFFFFFFF: break
        child = r.u32()
        assert parent < len(entities) and child < len(entities)
        parents.append([parent, child])
    assert r.u32() == 0xFFFFFFFF
    assert r.pos == deadbeef
    if not legacy: assert r.u32() == 0xDEADBEEF
    return {'entities': entities, 'parents': parents, 'strings': strings}
