# SPDX-License-Identifier: GPL-3.0-only
"""Lossless Windows-1252 gameplay INI reader; never executes native code."""
from collections import Counter


def parse_ini(data):
    text = data.decode('cp1252')
    section = ''
    records = []
    sections = {}
    issues = []
    seen = Counter()
    for number, raw in enumerate(text.splitlines(), 1):
        stripped = raw.strip()
        if not stripped or stripped.startswith((';', '#')):
            continue
        if stripped.startswith('[') and stripped.endswith(']'):
            section = stripped[1:-1]
            sections.setdefault(section, {})
            continue
        key, separator, value = raw.partition('=')
        key = key.strip()
        value = value.strip() if separator else ''
        record = {'line': number, 'section': section, 'key': key,
                  'value': value, 'hasEquals': bool(separator), 'raw': raw}
        records.append(record)
        seen[(section, key)] += 1
        if seen[(section, key)] > 1:
            issues.append({'kind': 'duplicate-key', 'section': section,
                           'key': key, 'line': number})
        sections.setdefault(section, {})[key] = value
    return {'encoding': 'windows-1252', 'sections': sections,
            'records': records, 'issues': issues}


def vector(value):
    # Empty operand positions and trailing separators are significant.
    return [] if value == '' else value.split(';')


def integer(fields, key, issues):
    raw = fields.get(key)
    if raw is None or raw == '':
        return None
    try:
        return int(raw, 10)
    except ValueError:
        issues.append({'kind': 'invalid-integer', 'key': key, 'raw': raw})
        return None


def boolean(fields, key, issues):
    raw = fields.get(key)
    if raw is None or raw == '':
        return None
    if raw.lower() in ('true', 'false'):
        return raw.lower() == 'true'
    issues.append({'kind': 'invalid-boolean', 'key': key, 'raw': raw})
    return None


def aligned(fields, keys, issues):
    vectors = {key: vector(fields.get(key, '')) for key in keys}
    n = max((len(v) for v in vectors.values()), default=0)
    # Empty vector can encode n empty operands; only a nonempty mismatched
    # vector is an ambiguity that must be exposed to the interpreter.
    lengths = {k: len(v) for k, v in vectors.items()}
    if any(length not in (0, n) for length in lengths.values()):
        issues.append({'kind': 'unaligned-vectors', 'lengths': lengths})
    return [{key: values[i] if i < len(values) else ''
             for key, values in vectors.items()} for i in range(n)]
