"""Prepare the installed SVM manager tables from byte-audited native readers.

Reads immutable study inputs and the installed language INI. Does not load DLLs
or execute native code. The prepared arrays retain serialized record order;
they do not claim to reproduce the native hash map's physical bucket layout.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import struct
from pathlib import Path

from research_native_combat import PE, sha


REPO = Path(__file__).resolve().parents[2]
SOURCE_RELATIVE = '02_Unpacked_Data/Archives/Strings.p00/SVMAdmin.dat'
SOURCE_SHA = '018295b8a7ae06e45dcb8ce9816b1fe65f672aeecbc93de5308a3af3aa884943'
MODULES = {
    'Game': ('Game_dll', 'Game.dll', 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f'),
    'SharedBase': ('SharedBase_dll', 'SharedBase.dll', '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'),
}
ENTRIES = {
    'Game': '''20009a7f 20024d75 200239f7 200312b4 2002a09a 2002f432
20018c2d 20035fcb 2001ce4f 2002a8c4 20034f45 200120e4 20013ff7
2002c92b 20026bde 20022e7b 2001b2b6'''.split(),
    'SharedBase': ['10005b96', '100012df'],
}
INSTRUCTION = re.compile(r'^([0-9a-f]{8}) \| ([0-9a-f]+) \| (.*)$')


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class Cursor:
    def __init__(self, data: bytes, position: int, end: int, strings=None):
        self.data, self.position, self.end = data, position, end
        self.strings = strings

    def take(self, size: int) -> bytes:
        if size < 0 or self.position + size > self.end:
            raise ValueError(f'SVM read crosses boundary at {self.position}: {size}')
        value = self.data[self.position:self.position + size]
        self.position += size
        return value

    def unpack(self, fmt: str):
        return struct.unpack('<' + fmt, self.take(struct.calcsize('<' + fmt)))[0]

    def u8(self): return self.unpack('B')
    def u16(self): return self.unpack('H')
    def u32(self): return self.unpack('I')

    def indexed_string(self):
        index = self.u16()
        if self.strings is None or index >= len(self.strings):
            raise ValueError(f'SVM indexed CString outside declared table: {index}')
        return self.strings[index], index

    def unicode_string(self):
        # SharedBase 100012df -> 1001eb80 reads a u16 BYTE length,
        # divides by two for allocation, then reads exactly that many bytes.
        size = self.u16()
        if size % 2:
            raise ValueError('Unsupported odd native Unicode byte length')
        return self.take(size).decode('utf-16-le', errors='surrogatepass'), size


def require(value, expected, description):
    if value != expected:
        raise ValueError(f'Unreviewed {description}: {value!r}; expected {expected!r}')


def read_manager(data: bytes):
    header = Cursor(data, 0, len(data))
    require(header.take(8), b'GENOMFLE', 'container tag')
    require(header.u16(), 1, 'container version')
    end = header.u32()
    table = Cursor(data, end, len(data))
    require(table.u32(), 0xDEADBEEF, 'string table marker')
    require(table.u8(), 1, 'string table prefix')
    strings = [table.take(table.u16()).decode('cp1252') for _ in range(table.u32())]
    require(len(strings), 648, 'declared string count')
    tail = data[table.position:]
    # The effective patch has two appended strings outside its declared count.
    # Keep those bytes separately. They are never available as indexed strings.
    require(tail, bytes.fromhex('0900536d697468426f6f6b1200536f6d657468696e67496e546865426f6f6b'),
            'patch trailer beyond declared string table')
    r = Cursor(data, 14, end, strings)
    require(r.u16(), 1, 'SVM manager version')
    voices_start = r.position
    require(r.u8(), 1, 'voice map prefix')
    voice_count = r.u32()
    require(voice_count, 54, 'voice map count')
    voices = []
    for _ in range(voice_count):
        begin = r.position
        voice, voice_index = r.indexed_string()
        require(r.u16(), 1, 'voice category value version')
        require(r.u8(), 1, 'voice category array prefix')
        values = [r.indexed_string() for _ in range(r.u32())]
        voices.append({'voice': voice, 'categories': [v[0] for v in values],
                       'voiceStringIndex': voice_index,
                       'categoryStringIndices': [v[1] for v in values],
                       'sourceOffset': begin, 'sourceEnd': r.position})
    voices_end = r.position
    categories_start = r.position
    require(r.u8(), 1, 'category map prefix')
    category_count = r.u32()
    require(category_count, 15, 'category map count')
    categories = []
    pair_count = 0
    for _ in range(category_count):
        begin = r.position
        category, category_index = r.indexed_string()
        # Game 203b0570 handles version1 as CString[] plus empty Unicode values.
        # The actual version2 records take its other branch into 203afa00.
        require(r.u16(), 2, 'category pair value version')
        require(r.u8(), 1, 'category pair array prefix')
        entries = []
        for _ in range(r.u32()):
            pair_start = r.position
            require(r.u16(), 1, 'individual pair version')
            label, label_index = r.indexed_string()
            text, unicode_bytes = r.unicode_string()
            entries.append({'label': label, 'text': text, 'labelStringIndex': label_index,
                            'unicodeBytes': unicode_bytes,
                            'sourceOffset': pair_start, 'sourceEnd': r.position})
        pair_count += len(entries)
        categories.append({'category': category, 'entries': entries,
                           'categoryStringIndex': category_index,
                           'sourceOffset': begin, 'sourceEnd': r.position})
    require(r.position, end, 'consumed SVM object stream end')
    require(pair_count, 581, 'category pair count')
    if len({v['voice'] for v in voices}) != voice_count or len({v['category'] for v in categories}) != category_count:
        raise ValueError('This preparation profile requires distinct serialized map keys')
    wrapper = {'version': 1, 'objectStreamOffset': 14, 'objectStreamEnd': end,
               'stringTableOffset': end, 'stringCount': len(strings),
               'stringTableEnd': table.position, 'trailingBytes': len(tail),
               'trailingHex': tail.hex(), 'trailingSha256': digest(tail)}
    audit = {'voiceCount': voice_count, 'categoryCount': category_count, 'pairCount': pair_count,
             'voiceMapOffset': voices_start, 'voiceMapEnd': voices_end,
             'categoryMapOffset': categories_start, 'categoryMapEnd': r.position,
             'voiceValueVersion': 1, 'categoryValueVersion': 2, 'pairVersion': 1,
             'mapAndArrayPrefixes': 1, 'allObjectStreamBytesConsumed': True,
             'order': 'serialized record order and native array element order; physical hash bucket layout is not reconstructed',
             'unicodeText': 'opaque native bCUnicodeString values, preserved without interpretation',
             'undeclaredTrailerHandling': 'preserved separately; never appended to the 648 indexed strings'}
    return {'version': 1, 'voices': voices, 'categories': categories}, wrapper, audit


def read_language(path: Path):
    data = path.read_bytes()
    section = None
    found = {}
    for number, line in enumerate(data.decode('utf-8-sig').splitlines(), 1):
        match = re.fullmatch(r'\s*\[([^\]]+)\]\s*', line)
        if match:
            section = match[1]
        elif section == 'Language' and '=' in line:
            key, value = line.split('=', 1)
            if key.strip() in ('Audio', 'Text'):
                found[key.strip()] = (value.strip(), number)
    require(found.get('Audio', (None,))[0], 'English', 'installed audio language')
    require(found.get('Text', (None,))[0], 'English', 'installed text language')
    return {'audio': found['Audio'][0], 'text': found['Text'][0],
            'source': {'path': str(path.absolute()), 'sha256': digest(data), 'bytes': len(data),
                       'section': 'Language', 'audioKey': 'Audio', 'textKey': 'Text',
                       'audioLine': found['Audio'][1], 'textLine': found['Text'][1]}}


def native_evidence(study: Path):
    result = {}
    for name, (folder, filename, expected_hash) in MODULES.items():
        module_path = study / '00_Original_Runtime' / filename
        require(sha(module_path), expected_hash, name + ' PE hash')
        pe = PE(module_path)
        directory = study / '01_Decompiled_Code' / folder
        csv_path = directory / 'functions.csv'
        rows = {r['address']: r for r in csv.DictReader(csv_path.open(encoding='utf-8-sig', newline=''))}
        assembly_path = directory / 'full_disassembly.asm'
        lines = assembly_path.read_text(encoding='utf8').splitlines()
        selected = list(ENTRIES[name])
        receipts = []
        for entry in selected:
            row = rows[entry]
            ranges = [tuple(int(v, 16) for v in value.split('-')) for value in row['body_ranges'].split(';')]
            records = []
            for line in lines[int(row['assembly_entry_line']) - 1:]:
                match = INSTRUCTION.fullmatch(line)
                if not match:
                    continue
                address = int(match[1], 16)
                if address > max(hi for _, hi in ranges):
                    break
                if not any(lo <= address <= hi for lo, hi in ranges):
                    continue
                raw = bytes.fromhex(match[2])
                require(pe.at(address, len(raw)), raw, f'{name} instruction {match[1]}')
                records.append((address, raw))
            require(sum(len(raw) for _, raw in records), int(row['body_bytes']), name + ' body size ' + entry)
            raw = records[0][1]
            target = None
            if len(raw) == 5 and raw[0] == 0xE9:
                target = f'{records[0][0] + 5 + struct.unpack_from("<i", raw, 1)[0]:08x}'
                if target not in selected:
                    selected.append(target)
            receipts.append({'entry': entry, 'name': row['qualified_name'],
                             'forwardingTarget': target, 'bodyRanges': row['body_ranges'],
                             'instructionCount': len(records), 'instructionBytes': sum(len(raw) for _, raw in records),
                             'instructionByteSha256': digest(b''.join(raw for _, raw in records)),
                             'allInstructionBytesMatch': True,
                             'studyCSource': row['pseudocode_file'], 'studyCLine': int(row['pseudocode_line']),
                             'studyCSha256': sha(directory / row['pseudocode_file']),
                             'studyAssemblyLine': int(row['assembly_entry_line'])})
        result[name] = {'sha256': expected_hash, 'studyCsvSha256': sha(csv_path),
                        'studyAssemblySha256': sha(assembly_path), 'functions': receipts}
        if name == 'Game':
            literals = {}
            for address, expected in [(0x206A4A88, b'Data/Strings/SVMAdmin.dat'),
                                      (0x206A4AC4, b'SVM_%s_%s'),
                                      (0x2065C620, b'_'), (0x2067E7D8, b'.wav')]:
                require(pe.cstring(address), expected, 'Game SVM literal')
                literals[f'{address:08x}'] = expected.decode('ascii')
            result[name]['literals'] = literals
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    parser.add_argument('--ini', type=Path, default=Path(r'C:\Program Files (x86)\Steam\steamapps\common\Gothic 3\Ini\ge3.ini'))
    parser.add_argument('--out', type=Path, default=REPO / 'assets/gothic3/speech/svm-admin.json')
    args = parser.parse_args()
    data = (args.study / SOURCE_RELATIVE).read_bytes()
    require(digest(data), SOURCE_SHA, 'effective SVMAdmin.dat hash')
    manager, wrapper, audit = read_manager(data)
    output = {'schema': 'gothic3-svm-admin-v1',
              'source': {'archive': 'Strings.p00', 'path': 'SVMAdmin.dat',
                         'logicalPath': 'Data/Strings/SVMAdmin.dat',
                         'studyRelativePath': SOURCE_RELATIVE, 'sha256': SOURCE_SHA, 'bytes': len(data)},
              'wrapper': wrapper, 'manager': manager, 'language': read_language(args.ini),
              'audit': audit, 'nativeEvidence': native_evidence(args.study)}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf8', newline='\n')
    print(json.dumps({'output': str(args.out), 'sha256': sha(args.out), 'bytes': args.out.stat().st_size,
                      'voiceCount': audit['voiceCount'], 'categoryCount': audit['categoryCount'],
                      'pairCount': audit['pairCount'], 'audio': output['language']['audio']}))


if __name__ == '__main__':
    main()
