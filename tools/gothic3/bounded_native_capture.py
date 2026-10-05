"""Capture current native evidence within complete original catalog body ranges.

Historical collectors/receipts are unchanged. Global assembly VA selection
includes discontiguous ranges while excluding neighboring function bodies.
All reads and byte/hash checks are offline; native programs are not executed.
"""
from __future__ import annotations

from bisect import bisect_right
import csv
import hashlib
import re
import struct
from pathlib import Path

from research_native_combat import INSTRUCTION, cblocks, sha


def collect(study, short, module, selected, pe, out):
    directory = Path(study) / '01_Decompiled_Code' / module
    csv_path = directory / 'functions.csv'
    asm_path = directory / 'full_disassembly.asm'
    with csv_path.open(encoding='utf-8-sig', newline='') as file:
        catalog = {row['address']: row for row in csv.DictReader(file)}
    entries = set(selected.split())
    pending = list(entries)
    while pending:
        entry = pending.pop()
        row = catalog[entry]
        raw = pe.at(int(entry, 16), 5)
        if row['body_bytes'] == '5' and raw[0] == 0xe9:
            target = f'{int(entry, 16) + 5 + struct.unpack_from("<i", raw, 1)[0]:08x}'
            if target not in catalog:
                raise ValueError('Original forwarding target absent: ' + short + ':' + target)
            if target not in entries:
                entries.add(target)
                pending.append(target)
    ranges_by_entry = {}
    intervals = []
    for entry in sorted(entries):
        row = catalog[entry]
        if row['status'] != 'decompiled':
            raise ValueError('Original decompilation absent: ' + short + ':' + entry)
        ranges = [(int(start, 16), int(end, 16)) for start, end in
                  re.findall(r'([0-9a-f]{8})-([0-9a-f]{8})', row['body_ranges'])]
        if not ranges or any(end < start for start, end in ranges):
            raise ValueError('Original body ranges invalid: ' + entry)
        if any(right[0] <= left[1] for left, right in zip(ranges, ranges[1:])):
            raise ValueError('Original body ranges overlap or are unordered: ' + entry)
        if sum(end - start + 1 for start, end in ranges) != int(row['body_bytes']):
            raise ValueError('Original catalog body extent differs: ' + entry)
        if not any(start <= int(entry, 16) <= end for start, end in ranges):
            raise ValueError('Original entry outside its body: ' + entry)
        ranges_by_entry[entry] = ranges
        intervals.extend((start, end, entry) for start, end in ranges)
    intervals.sort()
    starts = [item[0] for item in intervals]
    max_ends = []
    maximum = -1
    for _, end, _ in intervals:
        maximum = max(maximum, end)
        max_ends.append(maximum)
    records = {entry: [] for entry in entries}
    # Address selection covers every range, including ones after other ENTRY
    # headers. Prefix maxima allow multiple catalog bodies sharing an address.
    with asm_path.open(encoding='utf8') as file:
        for line in file:
            match = INSTRUCTION.match(line)
            if not match:
                continue
            address = int(match[1], 16)
            index = bisect_right(starts, address) - 1
            raw = None
            while index >= 0 and max_ends[index] >= address:
                start, end, entry = intervals[index]
                if start <= address <= end:
                    if raw is None:
                        raw = bytes.fromhex(match[2])
                        if not raw or pe.at(address, len(raw)) != raw:
                            raise ValueError('Bounded original instruction differs: ' + match[1])
                    if address + len(raw) - 1 > end:
                        raise ValueError('Instruction crosses original body boundary: ' + entry)
                    records[entry].append({'address': match[1], 'bytes': match[2], 'assembly': match[3]})
                index -= 1
    c = {}
    paths = {directory / catalog[entry]['pseudocode_file'] for entry in entries}
    c_hashes = {path: sha(path) for path in paths}
    for path in paths:
        for entry, block, line in cblocks(path):
            if entry in entries:
                if entry in c:
                    raise ValueError('Duplicate original pseudocode entry: ' + entry)
                c[entry] = (block, line)
    csv_hash, asm_hash = sha(csv_path), sha(asm_path)
    functions, instructions = [], {}
    for entry in sorted(entries):
        row = catalog[entry]
        ranges = ranges_by_entry[entry]
        retained = sorted(records[entry], key=lambda item: int(item['address'], 16))
        addresses = [int(item['address'], 16) for item in retained]
        if len(addresses) != len(set(addresses)) or int(entry, 16) not in addresses:
            raise ValueError('Duplicate/missing bounded entry instruction: ' + entry)
        for start, end in ranges:
            cursor = start
            for item in retained:
                address = int(item['address'], 16)
                if start <= address <= end:
                    if address != cursor:
                        raise ValueError('Gap/overlap in original body coverage: ' + entry)
                    cursor += len(bytes.fromhex(item['bytes']))
            if cursor != end + 1:
                raise ValueError('Incomplete original discontiguous body coverage: ' + entry)
        instruction_bytes = sum(len(bytes.fromhex(item['bytes'])) for item in retained)
        if instruction_bytes != int(row['body_bytes']):
            raise ValueError('Original instruction/catalog extent differs: ' + entry)
        block, line = c[entry]
        destination = Path(out) / 'sources' / short
        destination.mkdir(parents=True, exist_ok=True)
        c_path, asm_excerpt = destination / (entry + '.c.txt'), destination / (entry + '.asm.txt')
        text = '; ' + entry + ' ' + row['qualified_name'] + '\n'
        text += ''.join(item['address'] + ' | ' + item['bytes'] + ' | ' + item['assembly'] + '\n'
                        for item in retained)
        c_path.write_text(block, encoding='utf8', newline='\n')
        asm_excerpt.write_text(text, encoding='utf8', newline='\n')
        identity = short + ':' + entry
        instructions[identity] = retained
        functions.append({'id': identity, 'entry': entry, 'name': row['qualified_name'],
            'bodyRanges': row['body_ranges'], 'bodyBytes': int(row['body_bytes']),
            'studyCsvSha256': csv_hash, 'studyAssemblySha256': asm_hash,
            'studyAssemblyLine': int(row['assembly_entry_line']) - 1,
            'studyCPath': row['pseudocode_file'], 'studyCLine': line,
            'studyCSha256': c_hashes[directory / row['pseudocode_file']],
            'cExcerpt': c_path.relative_to(out).as_posix(), 'cExcerptSha256': sha(c_path),
            'assemblyExcerpt': asm_excerpt.relative_to(out).as_posix(),
            'assemblyExcerptSha256': sha(asm_excerpt), 'instructionCount': len(retained),
            'instructionBytes': instruction_bytes, 'allInstructionBytesMatchOriginalPE': True,
            'allInstructionsInsideOriginalPEBodyRanges': True,
            'completeOriginalPEBodyRangesCovered': True,
            'bodyRangeBoundary': 'inclusive-original-functions.csv-body_ranges-global-VA-selection',
            'originalPEBodyRanges': [
                {'startVA': f'{start:08x}', 'endVAInclusive': f'{end:08x}', 'bytes': end - start + 1,
                 'sha256': hashlib.sha256(pe.at(start, end - start + 1)).hexdigest()}
                for start, end in ranges],
            'originalPEBodySha256': hashlib.sha256(b''.join(
                pe.at(start, end - start + 1) for start, end in ranges)).hexdigest()})
    return functions, instructions
