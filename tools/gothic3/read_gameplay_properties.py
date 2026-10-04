# SPDX-License-Identifier: GPL-3.0-only
"""Offline, lossless gameplay-property interpretation for Gothic 3 records.

This module consumes read_genome records; it never modifies the game/study.
Layouts: georgeto/g3dit 30113b8254d3e6d0395d8e3c78618a99fbc0a6ca.
The decoder describes serialized data, not native initialization or behavior.
Every property and tail retains its original hex, even after interpretation.
Unsupported layouts, invalid lengths and nonfinite floats remain explicit raw
records. GUIDs are the original 20-byte serialization, not guessed UUIDs.
"""
import argparse
import hashlib
import json
import math
import re
from functools import lru_cache
from pathlib import Path

try:
    from .read_genome import Reader, read_entities
except ImportError:
    from read_genome import Reader, read_entities


SEMANTICS_PATH = Path(__file__).resolve().parents[2] / 'assets/gothic3/gameplay/entity-semantics.json'
SUBCLASS_MARKER = bytes.fromhex('010001010001')
STRING_TYPES = {
    'bCString', 'bCUnicodeString', 'eCLocString', 'bCScriptString',
    'bCAnimationResourceString', 'bCImageOrMaterialResourceString',
    'bCImageResourceString', 'bCMeshResourceString', 'bCSpeedTreeResourceString',
}
INTEGER_FORMATS = {
    'char': 'B', 'unsigned char': 'B', 'short': 'h', 'unsigned short': 'H',
    'int': 'i', 'unsigned int': 'I', 'long': 'i', 'unsigned long': 'I',
}


@lru_cache(maxsize=1)
def _enums():
    if not SEMANTICS_PATH.exists():
        return {}
    return json.loads(SEMANTICS_PATH.read_text(encoding='utf-8')).get('enums', {})


class Cursor(Reader):
    def __init__(self, data, strings, offset=0, base_offset=None, inline_strings=False):
        super().__init__(data, strings, offset)
        self.base_offset = base_offset
        self.inline_strings = inline_strings

    def entry(self):
        if self.inline_strings:
            return self.take(self.u16()).decode('cp1252')
        return super().entry()

    def absolute(self, pos):
        return None if self.base_offset is None else self.base_offset + pos

    def boolean(self):
        value = self.u8()
        if value not in (0, 1):
            raise ValueError(f'invalid serialized boolean {value} at {self.pos - 1}')
        return bool(value)

    def finite(self, count=1):
        values = self.vec(count)
        if not all(math.isfinite(v) for v in values):
            raise ValueError('nonfinite float preserved as raw; JSON has no faithful numeric representation')
        return values[0] if count == 1 else values

    def count(self, minimum_bytes=1):
        count = self.unpack('i')[0]
        if count < 0 or count > (len(self.data) - self.pos) // minimum_bytes:
            raise ValueError(f'impossible element count {count} at {self.pos - 4}')
        return count


def _reference(raw_guid, kind, template_index):
    result = {'rawGuid20': raw_guid, 'referenceKind': kind}
    if template_index is not None and kind == 'template' and raw_guid in template_index:
        # Index entries are caller-owned metadata. The original GUID is unchanged.
        result['resolvedTemplate'] = template_index[raw_guid]
    return result


def _proxy(r, kind, template_index):
    version = r.u16()
    present = r.boolean()
    result = {'version': version, 'present': present, 'referenceKind': kind, 'rawGuid20': None}
    if present:
        result.update(_reference(r.take(20).hex(), kind, template_index))
    return result


def _read_value(r, typ, template_index=None):
    typ = typ.strip()
    if typ.startswith('class '):
        typ = typ[6:]
    if typ in STRING_TYPES or typ.endswith('ResourceString'):
        return r.entry(), 'string'
    if typ == 'bool':
        return r.boolean(), 'boolean'
    if typ in INTEGER_FORMATS:
        return r.unpack(INTEGER_FORMATS[typ])[0], 'integer'
    if typ == 'float':
        return r.finite(), 'float32'
    if typ == 'bCPropertyID':
        return _reference(r.take(20).hex(), 'unspecified', template_index), 'guid20'
    if typ == 'bCGuid':
        guid, valid = r.take(16).hex(), r.unpack('i')[0]
        return {'rawGuid16': guid, 'serializedValidDword': valid,
                'valid': (valid & 0xff) != 0}, 'guidWithValidity'
    if typ in ('eCEntityProxy', 'eCTemplateEntityProxy'):
        kind = 'template' if typ == 'eCTemplateEntityProxy' else 'entity'
        return _proxy(r, kind, template_index), 'proxy'
    if typ == 'eCPropertySetProxy':
        version, present = r.u16(), r.boolean()
        name = r.entry() if present else None
        return {'version': version, 'propertySetPresent': present, 'propertySetName': name,
                'entity': _proxy(r, 'entity', template_index)}, 'propertySetProxy'
    match = re.fullmatch(r'bTPropertyContainer<\s*enum\s+(\w+)\s*>', typ)
    if match:
        version, value = r.u16(), r.unpack('i')[0]
        enum = match.group(1)
        symbols = _enums().get(enum, {}).get('values', {}).get(str(value), [])
        return {'enum': enum, 'version': version, 'value': value,
                'symbol': symbols[0] if symbols else None, 'symbols': symbols}, 'enum'
    if typ == 'bTPropertyContainer<bool>':
        return {'version': r.u16(), 'value': r.boolean(),
                'interpretationBasis': 'serialized bool type and three-byte payload; u16 container version plus bool byte'}, 'booleanContainer'
    if typ.startswith('enum '):
        enum, value = typ[5:].strip(), r.unpack('i')[0]
        symbols = _enums().get(enum, {}).get('values', {}).get(str(value), [])
        return {'enum': enum, 'value': value, 'symbol': symbols[0] if symbols else None,
                'symbols': symbols}, 'enum'
    if typ == 'bCVector':
        return r.finite(3), 'vector3'
    if typ == 'bCVector2':
        return r.finite(2), 'vector2'
    if typ == 'bCQuaternion':
        return r.finite(4), 'quaternion'
    if typ == 'bCMatrix':
        return r.finite(16), 'matrix4'
    if typ == 'bCEulerAngles':
        values = r.finite(3)
        return dict(zip(('yaw', 'pitch', 'roll'), values)), 'eulerAngles'
    if typ in ('bCBox', 'bCRange3'):
        first, second = r.finite(3), r.finite(3)
        return {'min': first, 'max': second}, 'box' if typ == 'bCBox' else 'range3'
    if typ == 'bCRange1':
        return {'min': r.finite(), 'max': r.finite()}, 'range1'
    if typ == 'bCPoint':
        return {'x': r.unpack('i')[0], 'y': r.unpack('i')[0]}, 'point2'
    if typ == 'bCRect':
        return {'left': r.unpack('i')[0], 'top': r.unpack('i')[0],
                'right': r.unpack('i')[0], 'bottom': r.unpack('i')[0]}, 'rect'
    if typ == 'bCMotion':
        return {'position': r.finite(3), 'rotation': r.finite(4)}, 'motion'
    if typ in ('bCFloatColor', 'bCFloatAlphaColor'):
        value = {'serializedVtable': r.unpack('i')[0], 'rgb': r.finite(3)}
        if typ == 'bCFloatAlphaColor':
            value['alpha'] = r.finite()
        return value, 'color'
    match = re.fullmatch(r'bT(?:Obj|Val)Array<\s*(.+)\s*>', typ)
    if match:
        prefix = r.u8()  # g3dit skipListPrefix: preserve, do not treat as boolean.
        count = r.count()
        element_type = match.group(1).strip()
        elements = [_read_value(r, element_type, template_index)[0] for _ in range(count)]
        return {'prefix': prefix, 'elementType': element_type, 'count': count, 'items': elements}, 'array'
    match = re.fullmatch(r'bTPropertyObject<\s*class\s+(\w+)\s*(?:,\s*class\s+(\w+)\s*)?>', typ)
    if match:
        child, offsets = _read_class(r, body_name=match.group(1))
        value = _normalize_class(child, r.strings, template_index, offsets)
        value['declaredBaseClass'] = match.group(2)
        return value, 'propertyObject'
    raise ValueError(f'no reviewed serializer for {typ}')


def decode_property(prop, strings, *, template_index=None, offsets=None):
    """Return a typed property plus original bytes; never infer absent values."""
    raw_hex = prop.get('raw', '')
    result = {'name': prop['name'], 'type': prop['type'], 'raw': raw_hex,
              'status': 'unsupported', 'kind': 'opaque', 'value': None}
    if offsets is not None:
        result['serialization'] = offsets
    try:
        raw = bytes.fromhex(raw_hex)
        result['byteLength'] = len(raw)
        base = offsets.get('sourceOffset') if offsets else None
        r = Cursor(raw, strings, base_offset=base,
                   inline_strings=bool(offsets and offsets.get('inlineStrings')))
        value, kind = _read_value(r, prop['type'], template_index)
        if r.pos != len(raw):
            raise ValueError(f'decoder consumed {r.pos} of {len(raw)} bytes')
        result.update(status='decoded', kind=kind, value=value)
    except (ValueError, IndexError, KeyError) as exc:
        result['unsupportedReason'] = str(exc)
        if prop.get('value') is not None:
            result['readerValue'] = prop['value']
    return result


def _read_class(r, *, outer=False, legacy=False, body_name=None, context_wrapper=False):
    """Read only serialization boundaries; retain all non-property class bytes."""
    start = r.pos
    meta = {'offset': start, 'sourceOffset': r.absolute(start), 'inlineStrings': r.inline_strings}
    if outer:
        meta['outerVersion'] = r.u16()
        if legacy:
            meta['preSize'], meta['preType'] = r.u32(), r.entry()
    if body_name is None:
        if r.take(6) != SUBCLASS_MARKER:
            raise ValueError(f'invalid subclass marker at {r.pos - 6}')
        name = r.entry()
        meta['typeToVersionFillerRaw'] = r.take(5).hex()
    else:
        name = body_name
    meta['objectVersion'], meta['objectSize'] = r.u16(), r.u32()
    end = r.pos + meta['objectSize']
    if end > len(r.data):
        raise ValueError(f'{name} object boundary exceeds stream at {end}')
    if meta['objectVersion'] == 1:
        meta['legacyObjectName'] = r.entry()
    if meta['objectVersion'] <= 0x51:
        meta['legacyObjectGuidRaw20'] = r.take(20).hex()
    meta['propertyVersion'], count = r.u16(), r.count(10)
    meta['propertyCount'] = count
    meta['headerRaw'] = r.data[start:r.pos].hex()
    props, prop_offsets = [], []
    for _ in range(count):
        prop_start = r.pos
        if r.inline_strings:
            prop_name, prop_type = r.entry(), r.entry()
            name_index = type_index = None
        else:
            name_index, type_index = r.u16(), r.u16()
            if max(name_index, type_index) >= len(r.strings):
                raise ValueError('property string index outside table')
            prop_name, prop_type = r.strings[name_index], r.strings[type_index]
        magic, size = r.u16(), r.u32()
        payload = r.pos
        raw = r.take(size).hex()
        props.append({'name': prop_name, 'type': prop_type, 'raw': raw, 'value': None})
        prop_offsets.append({'offset': payload, 'sourceOffset': r.absolute(payload),
                             'recordOffset': prop_start, 'recordSourceOffset': r.absolute(prop_start),
                             'nameStringIndex': name_index, 'typeStringIndex': type_index,
                             'magic': magic, 'byteLength': size, 'inlineStrings': r.inline_strings,
                             'recordHeaderRaw': r.data[prop_start:payload].hex()})
    version = r.u16()
    tail_start = r.pos
    if tail_start > end:
        raise ValueError(f'{name} properties exceed object boundary')
    # The dynamic-context wrapper is never an ordinary entity property set.
    if name == 'eCEntityDynamicContext':
        if not context_wrapper:
            raise ValueError('dynamic context wrapper requires its archive-specific reader')
        meta['declaredContextEndOffset'] = end
        end = tail_start + (1 if version > 1 else 0) + (8 if version > 38 else 0) + (24 if version > 39 else 0)
    tail = r.take(end - tail_start).hex()
    meta.update(tailOffset=tail_start, tailSourceOffset=r.absolute(tail_start),
                endOffset=end, endSourceOffset=r.absolute(end), properties=prop_offsets)
    if outer:
        if r.u32() != 0xDEADC0DE:
            raise ValueError(f'{name} missing outer DEADC0DE marker')
    return {'name': name, 'version': version, 'properties': props, 'tail': tail}, meta


def _field(r, typ, name, template_index=None):
    start = r.pos
    value, kind = _read_value(r, typ, template_index)
    return {'name': name, 'type': typ, 'kind': kind, 'value': value,
            'offset': start, 'sourceOffset': r.absolute(start),
            'byteLength': r.pos - start, 'raw': r.data[start:r.pos].hex()}


def _decode_tail(clazz, strings, template_index, offsets):
    raw = bytes.fromhex(clazz.get('tail', ''))
    result = {'raw': raw.hex(), 'byteLength': len(raw), 'status': 'empty' if not raw else 'unsupported',
              'value': None, 'offset': offsets.get('tailOffset') if offsets else None,
              'sourceOffset': offsets.get('tailSourceOffset') if offsets else None}
    if not raw:
        return result
    r = Cursor(raw, strings, base_offset=result['sourceOffset'],
               inline_strings=bool(offsets and offsets.get('inlineStrings')))
    name, version = clazz['name'], clazz['version']
    try:
        if name == 'gCInventory_PS':
            if version != 9:
                raise ValueError(f'only native ReadV9 inventory layout reviewed; version {version} retained raw')
            stack_version, count = r.u16(), r.count(21)
            stacks = []
            for _ in range(count):
                child, child_offsets = _read_class(r)
                if child['name'] != 'gCInventoryStack':
                    raise ValueError(f'inventory stack has unexpected type {child["name"]}')
                stacks.append(_normalize_class(child, strings, template_index, child_offsets))
            slot_version, slot_count = r.u16(), r.count(3)
            slots, warnings = [], []
            if slot_count != 19:
                warnings.append(f'serialized slot count {slot_count}; g3dit gESlot defines 19 positions')
            for index in range(slot_count):
                start = r.pos
                if r.data[r.pos:r.pos + 3] == bytes.fromhex('010000'):
                    r.take(3)
                    slots.append({'index': index, 'empty': True, 'offset': start,
                                  'sourceOffset': r.absolute(start), 'raw': '010000'})
                else:
                    child, child_offsets = _read_class(r)
                    if child['name'] != 'gCInventorySlot':
                        raise ValueError(f'inventory slot has unexpected type {child["name"]}')
                    normalized = _normalize_class(child, strings, template_index, child_offsets)
                    slot_property = next((p for p in normalized['properties'] if p['name'] == 'Slot'), None)
                    enum = slot_property['value'] if slot_property else None
                    declared = enum.get('value') if isinstance(enum, dict) else None
                    if declared != index:
                        warnings.append(f'slot position {index} has serialized Slot={declared}')
                    slots.append({'index': index, 'empty': False, 'record': normalized})
            cached = [_field(r, 'eCEntityProxy', f'cachedTreasureSet{i + 1}', template_index) for i in range(5)]
            value = {'stackListVersion': stack_version, 'stacks': stacks, 'slotListVersion': slot_version,
                     'slotCount': slot_count, 'slots': slots, 'cachedTreasureSetEntities': cached, 'warnings': warnings}
        elif name == 'gCPlayerMemory_PS':
            if version <= 4:
                raise ValueError('g3dit explicitly does not support gCPlayerMemory_PS class versions <= 4')
            count, attributes = r.count(23), []
            for _ in range(count):
                start = r.pos
                key_index = r.u16()
                if key_index >= len(strings):
                    raise ValueError('attribute map key outside string table')
                child, child_offsets = _read_class(r)
                attributes.append({'key': strings[key_index], 'keyStringIndex': key_index,
                                   'offset': start, 'sourceOffset': r.absolute(start),
                                   'record': _normalize_class(child, strings, template_index, child_offsets)})
            value = {'attributeCount': count, 'attributes': attributes}
        elif name in ('gCEnclave_PS', 'gCParty_PS'):
            value = {'members': _field(r, 'bTObjArray<class eCEntityProxy>', 'members', template_index)}
        elif name == 'gCAnchor_PS':
            value = {'interactPoints': _field(r, 'bTObjArray<class eCEntityProxy>', 'interactPoints', template_index)}
        elif name == 'gCProjectile_PS':
            schema = [('bool', 'flying')]
            if version >= 41:
                schema.append(('bCVector', 'projectileDirection'))
            if version >= 42:
                schema.append(('bCVector', 'shootStartPosition'))
            if version >= 75:
                schema += [('float', 'missileFrameTime'), ('float', 'missileDecayTime')]
            if version >= 77:
                schema.append(('bool', 'hasCollided'))
            value = {'fields': [_field(r, typ, field, template_index) for typ, field in schema]}
        elif name == 'gCItem_PS':
            expected = bytes.fromhex('010000000100000000010000000001000000000100000000')
            stats_raw = r.take(len(expected)).hex()
            slot, visible, prefix, count = r.unpack('i')[0], r.u8(), r.u8(), r.count(12)
            scripts = []
            for _ in range(count):
                start = r.pos
                serializer_version = r.u16()
                script = {field: r.entry() for field in ('command', 'entity1', 'entity2', 'id1', 'id2')}
                script.update(version=serializer_version, offset=start, sourceOffset=r.absolute(start),
                              raw=r.data[start:r.pos].hex())
                scripts.append(script)
            value = {'itemStatsRaw': stats_raw, 'itemStatsMatchesWriterConstant': stats_raw == expected.hex(),
                     'slot': slot, 'visibleRaw': visible, 'scriptListPrefix': prefix, 'scripts': scripts,
                     'scriptExecutedRaw': r.u8(),
                     'limitations': ['Script rows are serialized commands; no execution is inferred.']}
        elif name == 'gCCharacterControl_PS':
            if version < 2:
                raise ValueError('g3dit expects no control tail for class versions < 2')
            schema = [('float', 'unk2C'), ('float', 'timeSinceLastPress_TurnWeight_RightLeft'),
                      ('float', 'timeSinceLastPress_TurnWeight_UpDown'), ('float', 'unk38')]
            schema += [('int', 'timeSinceLastPress_' + suffix) for suffix in
                       ('Forward', 'StrafeLeft', 'StrafeRight', 'Backward', 'Up', 'Down')]
            schema += [('bool', 'bAnyControlPressed'), ('bool', 'bTurning'), ('float', 'fMovementConstraints'),
                       ('bCVector', 'input_MovementVector'), ('bCMatrix', 'cachedInvertedCameraViewMatrix')]
            value = {'fields': [_field(r, typ, field, template_index) for typ, field in schema],
                     'unknownSemantics': ['unk2C', 'unk38']}
        elif name == 'gCCharacterSensor_PS':
            if version < 2:
                raise ValueError('g3dit expects no sensor tail for class versions < 2')
            schema = [('bCVector', field) for field in ('position', 'unsmoothedPosition', 'savedFrameStatePosition')]
            schema += [('bool', field) for field in ('unk38', 'unk39', 'goalChanged', 'unk41')]
            schema += [('bCMotion', 'goalPose')]
            value = {'fields': [_field(r, typ, field, template_index) for typ, field in schema],
                     'unknownSemantics': ['unk38', 'unk39', 'unk41']}
        else:
            raise ValueError(f'no reviewed post-class serializer for {name} version {version}')
        if r.pos != len(raw):
            raise ValueError(f'tail decoder consumed {r.pos} of {len(raw)} bytes')
        result.update(status='decoded', value=value)
    except (ValueError, IndexError, KeyError) as exc:
        result['unsupportedReason'] = str(exc)
    return result


def _normalize_class(clazz, strings, template_index=None, offsets=None):
    prop_offsets = offsets.get('properties', []) if offsets else []
    props = [decode_property(prop, strings, template_index=template_index,
                             offsets=prop_offsets[i] if i < len(prop_offsets) else None)
             for i, prop in enumerate(clazz['properties'])]
    result = {'name': clazz['name'], 'version': clazz['version'], 'properties': props,
              'tail': _decode_tail(clazz, strings, template_index, offsets)}
    if offsets:
        result['serialization'] = {k: v for k, v in offsets.items() if k != 'properties'}
    if clazz.get('slots'):
        result['readerAnimationSlots'] = clazz['slots']
    return result


def normalize_entity(entity, strings, *, source=None, template_index=None, class_offsets=None):
    """Normalize one read_genome entity without changing its original record.

    propertySets is authoritative and preserves repeated classes/properties.
    gameplay maps each original gC class name to a list of its property sets.
    class_offsets may be the aligned scanner metadata from read_gameplay_file;
    without it, absolute property offsets are left absent, never synthesized.
    source is caller-owned provenance (a portable relative path is recommended).
    """
    classes = [_normalize_class(clazz, strings, template_index,
                                class_offsets[i] if class_offsets and i < len(class_offsets) else None)
               for i, clazz in enumerate(entity.get('classes', []))]
    result = {key: entity[key] for key in ('index', 'name', 'guid', 'creator', 'flags', 'alpha',
              'worldMatrix', 'localMatrix', 'worldBox', 'localBox', 'sourceOffset') if key in entity}
    result.update(source=source, propertySets=classes, gameplay={}, unknowns=[])
    for index, clazz in enumerate(classes):
        if clazz['name'].startswith('gC'):
            result['gameplay'].setdefault(clazz['name'], []).append(clazz)
        for prop_index, prop in enumerate(clazz['properties']):
            if prop['status'] != 'decoded':
                result['unknowns'].append({'classIndex': index, 'propertyIndex': prop_index,
                                           'class': clazz['name'], 'property': prop['name'],
                                           'type': prop['type'], 'raw': prop['raw'],
                                           'reason': prop['unsupportedReason']})
        if clazz['tail']['status'] == 'unsupported':
            result['unknowns'].append({'classIndex': index, 'class': clazz['name'],
                                       'tailRaw': clazz['tail']['raw'],
                                       'reason': clazz['tail']['unsupportedReason']})
    return result


def _entity_offsets(data, entity, strings, is_node, legacy):
    r = Cursor(data, strings, entity['sourceOffset'], base_offset=0)
    if is_node:
        r.skip(2 + 2)
        if r.u8():
            r.skip(20)
        r.skip(24 + 60)
    else:
        r.skip(4)
        if r.u8():
            r.skip(20)
    r.skip(2 + 2 + 20 + (8 if legacy else 7) + 4 + 6 + 2 + 128 + 72 + 51)
    count = r.count(21)
    if count != len(entity['classes']):
        raise ValueError(f'class count audit failed for {entity["name"]}')
    offsets = []
    for expected in entity['classes']:
        actual, metadata = _read_class(r, outer=True, legacy=legacy)
        signature = lambda c: (c['name'], c['version'], c['tail'],
                                [(p['name'], p['type'], p['raw']) for p in c['properties']])
        if signature(actual) != signature(expected):
            raise ValueError(f'class byte audit failed for {entity["name"]}/{expected["name"]}')
        offsets.append(metadata)
    return offsets


def _read_native_entity(r, index, is_node):
    """Versioned native headers: Engine eCEntity::ReadV63/ReadV83.

    This independent fallback also accepts inline-string archives. It is used
    only when the narrow read_genome reader rejects an original source file.
    """
    start, metadata = r.pos, {}
    if is_node:
        has_creator, disable_patch = r.boolean(), r.boolean()
        spatial_version = r.u16()
        metadata.update(hasCreator=has_creator, disablePatch=disable_patch, spatialVersion=spatial_version)
        creator = None
        if spatial_version != 30:
            creator = r.take(20).hex() if r.boolean() else None
            if spatial_version > 34:
                metadata['spatialBoundsRaw'] = r.take(24 + 60).hex()
    else:
        metadata['outerVersion'], dynamic_version = r.u16(), r.u16()
        metadata['dynamicVersion'] = dynamic_version
        if dynamic_version < 83:
            metadata['legacyDynamicFlag'] = r.boolean()
        creator = r.take(20).hex() if r.boolean() else None
    version, node_version, guid = r.u16(), r.u16(), r.take(20).hex()
    if not 31 <= version <= 83:
        raise ValueError(f'unsupported native entity header version {version} at {start}')
    metadata.update(entityVersion=version, nodeVersion=node_version)
    flag_count = 7 if version >= 83 else (8 if version >= 63 else 9)
    flags, alpha = list(r.take(flag_count)), r.finite()
    metadata['insertType'], metadata['lastRenderPriority'] = r.u16(), r.u8()
    metadata['locked'] = r.boolean()
    if version > 57:
        metadata['specialDepthTexPassEnabled'] = r.boolean()
    if version >= 40:
        metadata['unknownFlag2'] = r.boolean()
    name, world, local = r.entry(), r.finite(16), r.finite(16)
    world_tree_box, local_box, world_box = r.finite(6), r.finite(6), r.finite(6)
    metadata['worldTreeBox'] = world_tree_box
    if version >= 41:
        metadata['sphereRaw'] = r.take(32).hex()
    if version >= 34:
        metadata['visualLoDFactor'] = r.finite()
    if version >= 38:
        metadata['unknownFlag3'] = r.boolean()
    if version >= 39:
        metadata['objectCullFactor'] = r.finite()
    if version >= 56:
        metadata['dataChangedTimeStamp'] = r.u32()
    if version >= 61:
        metadata['uniformScaling'] = r.finite()
    if version >= 62:
        metadata['rangedObjectCulling'], metadata['processingRangeOutFadingEnabled'] = r.boolean(), r.boolean()
    metadata['headerRaw'] = r.data[start:r.pos].hex()
    classes, offsets = [], []
    for _ in range(r.count(21)):
        clazz, offset = _read_class(r, outer=version >= 42,
                                   legacy=42 <= version < 83)
        classes.append(clazz)
        offsets.append(offset)
    if is_node and has_creator and not disable_patch:
        metadata['postReadTemplateGuidRaw20'] = r.take(20).hex()
    entity = {'index': index, 'name': name, 'guid': guid, 'creator': creator,
              'flags': flags, 'alpha': alpha, 'worldMatrix': world, 'localMatrix': local,
              'localBox': local_box, 'worldBox': world_box, 'sourceOffset': start,
              'classes': classes, 'nativeHeader': metadata}
    return entity, offsets


def _read_native_world(data, path):
    is_node = path.suffix.lower() == '.node'
    context, wrapper, archive = None, None, {}
    if data[:8] == b'GENOMFLE':
        r, boundary, genome = _genome_strings(data)
        archive['genome'] = genome
        if not is_node and r.take(8) != b'GENOMEDL':
            raise ValueError('missing GENOMEDL archive marker')
        archive['version'] = r.u16()
    elif data[:8] == b'GENOMEDL':
        r, boundary = Cursor(data, [], base_offset=0, inline_strings=True), len(data)
        r.take(8)
        archive['version'] = r.u16()
        if r.pos == len(data):
            return {'entities': [], 'parents': [], 'strings': [], 'offsets': [],
                    'archiveSerialization': archive, 'status': 'unsupported', 'rawFile': data.hex(),
                    'unsupportedReason': 'Verified source contains only GENOMEDL/version header; no entity count or content is present.'}
        if archive['version'] >= 51:
            archive['legacyStringTableVersion'] = r.u16()
            active = r.boolean()
            r.strings = [r.take(r.u16()).decode('cp1252') for _ in range(r.count(2))] if active else []
            r.inline_strings = False
            archive['codeSize'] = r.u32()
            if archive['codeSize'] != len(data) - r.pos:
                raise ValueError('legacy dynamic archive code-section boundary mismatch')
    else:
        r, boundary = Cursor(data, [], base_offset=0, inline_strings=True), len(data)
        if is_node:
            archive['version'] = r.u16()
            if 51 <= archive['version'] <= 72:
                archive['legacyStringTableVersion'] = r.u16()
                active = r.boolean()
                strings = [r.take(r.u16()).decode('cp1252') for _ in range(r.count(2))] if active else []
                r.strings, r.inline_strings = strings, False
                archive['codeSize'] = r.u32()
                if archive['codeSize'] != len(data) - r.pos:
                    raise ValueError('legacy node code-section boundary mismatch')
        else:
            archive['version'] = None
    if not is_node:
        context, wrapper = _read_class(r, context_wrapper=True)
        if context['name'] != 'eCEntityDynamicContext':
            raise ValueError('unreviewed native dynamic-context wrapper')
    entities, offsets = [], []
    for index in range(r.count(260)):
        entity, metadata = _read_native_entity(r, index, is_node)
        entities.append(entity)
        offsets.append(metadata)
    parents = []
    while True:
        parent = r.unpack('i')[0]
        if parent == -1:
            break
        child = r.unpack('i')[0]
        if not (0 <= parent < len(entities) and 0 <= child < len(entities)):
            raise ValueError('native world parent/child index outside entity table')
        parents.append([parent, child])
    trailer = r.take(boundary - r.pos)
    if trailer not in (b'', bytes.fromhex('ffffffff')):
        raise ValueError(f'unreviewed native world trailer {trailer.hex()}')
    archive['trailerRaw'] = trailer.hex()
    if context is not None:
        archive['context'] = _normalize_class(context, r.strings, offsets=wrapper)
    return {'entities': entities, 'parents': parents, 'strings': r.strings,
            'offsets': offsets, 'archiveSerialization': archive, 'status': 'decoded'}


def read_gameplay_file(path, *, source=None, template_index=None, gameplay_only=False, entity_names=None, strict=False):
    """Read a .node/.lrentdat and audit exact property offsets against read_genome.

    gameplay_only filters entities with no original gC property sets. Tree
    indices/parents remain original; their targets may be outside this subset.
    """
    path = Path(path)
    data = path.read_bytes()
    source = path.name if source is None else source
    if not data:
        return {'schemaVersion': 1, 'source': source,
                'sourceSha256': hashlib.sha256(data).hexdigest(), 'sourceByteLength': 0,
                'sourceEntityCount': None, 'entities': [], 'parents': [], 'status': 'unsupported',
                'readerMode': 'exact source-byte preservation', 'rawFile': '',
                'unsupportedReason': 'Verified effective source is zero bytes; no archive header or entity stream is present.',
                'limitations': ['No entity or gameplay state is asserted for this source.']}
    try:
        document = read_entities(path)
        reader_mode = 'read_genome with independent byte-offset audit'
    except (AssertionError, ValueError, IndexError):
        try:
            document = _read_native_world(data, path)
        except (ValueError, IndexError) as exc:
            if strict:
                raise
            reason = str(exc)
            if data[:8] == b'GENOMFLE' and data[10:14] == b'\x00' * 4:
                reason = 'Verified source has GENOMFLE string-table boundary zero and no valid DEADBEEF footer; serialized stream is incomplete or unfinalized.'
            document = {'entities': [], 'parents': [], 'strings': [], 'offsets': [],
                        'status': 'unsupported', 'rawFile': data.hex(), 'unsupportedReason': reason}
        reader_mode = 'independent versioned native fallback'
    selected = [e for e in document['entities'] if
                (entity_names is None or e['name'] in entity_names) and
                (not gameplay_only or any(c['name'].startswith('gC') for c in e['classes']))]
    normalized = []
    for entity in selected:
        offsets = (document['offsets'][entity['index']] if 'offsets' in document else
                   _entity_offsets(data, entity, document['strings'], path.suffix.lower() == '.node', data[:8] != b'GENOMFLE'))
        record = normalize_entity(entity, document['strings'], source=source, template_index=template_index, class_offsets=offsets)
        if 'nativeHeader' in entity:
            record['nativeHeader'] = entity['nativeHeader']
        normalized.append(record)
    result = {'schemaVersion': 1, 'source': source, 'sourceSha256': hashlib.sha256(data).hexdigest(),
            'sourceByteLength': len(data),
            'sourceEntityCount': len(document['entities']) if document.get('status') != 'unsupported' else None,
            'entities': normalized, 'parents': document['parents'],
            'parentIndicesReferenceFullSource': gameplay_only or entity_names is not None,
            'readerMode': reader_mode, 'status': document.get('status', 'decoded'),
            'limitations': ['Serialized world records do not establish post-load script initialization or quest activation.',
                            'Treasure sets and cached inventory references are not executed or expanded.']}
    for field in ('archiveSerialization', 'rawFile', 'unsupportedReason'):
        if field in document:
            result[field] = document[field]
    return result


def _genome_strings(data):
    r = Cursor(data, [], base_offset=0)
    if r.take(8) != b'GENOMFLE':
        raise ValueError('expected GENOMFLE')
    version, boundary = r.u16(), r.u32()
    if data[boundary:boundary + 4] != bytes.fromhex('efbeadde'):
        raise ValueError('missing genome DEADBEEF boundary')
    st = Cursor(data, [], boundary + 4, base_offset=0)
    table_marker = st.u8()
    strings = [st.take(st.u16()).decode('cp1252') for _ in range(st.count(2))]
    if st.pos != len(data):
        raise ValueError('string table does not consume genome file')
    r.strings = strings
    return r, boundary, {'version': version, 'stringTableMarker': table_marker}


def _read_template_document(path, *, source=None, template_index=None):
    """Read native .tple headers, preserving helper and reference identities.

    Referenced object-group headers remain references: patching/inheritance and
    native OnChildrenAvailable/OnCustomPatch callbacks are not simulated.
    """
    path = Path(path)
    data = path.read_bytes()
    source = path.name if source is None else source
    inline_legacy = data[:8] not in (b'GENOMFLE', b'GENOMETP')
    if data[:8] == b'GENOMFLE':
        r, boundary, genome = _genome_strings(data)
        legacy = False
    else:
        r = Cursor(data, [], base_offset=0, inline_strings=inline_legacy)
        boundary, genome, legacy = len(data), None, True
    if not inline_legacy and r.take(8) != b'GENOMETP':
        raise ValueError('expected GENOMETP template stream')
    version_raw = r.take(4).hex() if not inline_legacy else None
    index_table = None
    if legacy and not inline_legacy:
        enabled = r.boolean()
        strings = [r.take(r.u16()).decode('cp1252') for _ in range(r.count(2))] if enabled else []
        r.strings = strings
    elif not inline_legacy:
        indexed = r.boolean()
        if indexed:
            index_table = [r.u16() for _ in range(r.count(2))]
            if any(index >= len(r.strings) for index in index_table):
                raise ValueError('template index table points outside genome string table')
            r.strings = [r.strings[index] for index in index_table]
    code_size = r.u32() if not inline_legacy else None
    count = r.count(260)
    headers = []
    for index in range(count):
        start = r.pos
        version = r.u16()
        if not 39 <= version <= 62:
            raise ValueError(f'unreviewed native template header version {version}')
        filename = r.entry() if version >= 57 else path.name
        guid = r.take(20).hex()
        flags = [r.boolean() for _ in range(8)]
        ref_template = r.take(20).hex() if r.boolean() else None
        alpha, insert_type, render_priority = r.finite(), r.u16(), r.u8()
        name, world, local = r.entry(), r.finite(16), r.finite(16)
        world_tree_box, local_box, world_box = r.finite(6), r.finite(6), r.finite(6)
        lod, unknown_flag, deleted = r.finite(), r.boolean(), r.boolean()
        metadata = {'headerVersion': version, 'fileName': filename, 'helperParent': flags[7],
                    'fileNameOrigin': 'serialized' if version >= 57 else 'source-path; native reads archive filename',
                    'refTemplate': ref_template, 'insertType': insert_type, 'lastRenderPriority': render_priority,
                    'visualLoDFactor': lod, 'unknownFlag3': unknown_flag, 'deleted': deleted,
                    'worldTreeBox': world_tree_box}
        if version >= 40:
            metadata['objectCullFactor'] = r.finite()
        if version >= 56:
            metadata['dataChangedTimeStamp'] = r.u32()
        if version >= 58:
            metadata['specialDepthTexPassEnabled'] = r.boolean()
        if version >= 61:
            metadata['uniformScaling'] = r.finite()
        if version >= 62:
            metadata['rangedObjectCulling'], metadata['processingRangeOutFadingEnabled'] = r.boolean(), r.boolean()
        metadata['headerRaw'] = data[start:r.pos].hex()
        classes, offsets = [], []
        if ref_template is None:
            for _ in range(r.count(27)):
                clazz, offset = _read_class(r, outer=version >= 42, legacy=version >= 42)
                classes.append(clazz)
                offsets.append(offset)
        entity = {'index': index, 'name': name, 'guid': guid, 'creator': ref_template,
                  'flags': [int(value) for value in flags], 'alpha': alpha, 'worldMatrix': world,
                  'localMatrix': local, 'localBox': local_box, 'worldBox': world_box,
                  'sourceOffset': start, 'classes': classes}
        normalized = normalize_entity(entity, r.strings, source=source, template_index=template_index, class_offsets=offsets)
        normalized['templateHeader'] = metadata
        headers.append(normalized)
    parents = []
    while True:
        parent = r.unpack('i')[0]
        if parent == -1:
            break
        child = r.unpack('i')[0]
        if not (0 <= parent < len(headers) and 0 <= child < len(headers)):
            raise ValueError('template parent/child index outside header table')
        parents.append([parent, child])
    # Writers emit a second sentinel; some legacy templates stop after one.
    trailer = r.take(boundary - r.pos)
    if trailer not in (b'', bytes.fromhex('ffffffff')):
        raise ValueError(f'unsupported template trailer: {trailer.hex()}')
    return {'schemaVersion': 1, 'source': source, 'status': 'decoded', 'sourceSha256': hashlib.sha256(data).hexdigest(),
            'sourceByteLength': len(data), 'entities': headers, 'parents': parents,
            'templateStream': {'versionRaw': version_raw, 'codeSectionSize': code_size,
                               'indexTable': index_table, 'genome': genome, 'inlineLegacy': inline_legacy,
                               'trailerRaw': trailer.hex()},
            'limitations': ['Template references do not execute native patch or initialization callbacks.',
                            'Helper item headers and gameplay reference headers retain separate GUIDs.']}


def read_template_file(path, *, source=None, template_index=None, strict=False):
    """Read a template or retain its complete bytes and explicit failure reason.

    strict=True raises source-format failures for an audit. The default keeps
    each original file represented, including native-rejected obsolete formats.
    """
    try:
        return _read_template_document(path, source=source, template_index=template_index)
    except (ValueError, IndexError) as exc:
        if strict:
            raise
        path = Path(path)
        data = path.read_bytes()
        return {'schemaVersion': 1, 'source': path.name if source is None else source,
                'status': 'unsupported', 'sourceSha256': hashlib.sha256(data).hexdigest(),
                'sourceByteLength': len(data), 'entities': [], 'parents': [],
                'rawFile': data.hex(), 'unsupportedReason': str(exc),
                'limitations': ['No gameplay definition is asserted for this unsupported source format.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--source', help='portable source/archive provenance')
    parser.add_argument('--gameplay-only', action='store_true')
    args = parser.parse_args()
    if args.input.suffix.lower() == '.tple':
        document = read_template_file(args.input, source=args.source)
    elif args.input.suffix.lower() == '.json':
        source_doc = json.loads(args.input.read_text(encoding='utf-8'))
        document = {'schemaVersion': 1, 'source': args.source,
                    'entities': [normalize_entity(e, source_doc['strings'], source=args.source)
                                 for e in source_doc['entities']]}
    else:
        document = read_gameplay_file(args.input, source=args.source, gameplay_only=args.gameplay_only)
    text = json.dumps(document, ensure_ascii=False, indent=2, allow_nan=False) + '\n'
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text, encoding='utf-8')
    else:
        print(text, end='')


if __name__ == '__main__':
    main()
