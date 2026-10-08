"""Observe system VERSION.dll resource APIs; never load or execute Gothic code.
Windows only. Captures one explicit host selection, not a universal API layout.
"""
import argparse
import ctypes
from ctypes import wintypes
import hashlib
import json
from pathlib import Path
import sys
SHA = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'

def capture(binary, output):
    if hashlib.sha256(binary.read_bytes()).hexdigest() != SHA:
        raise ValueError('Unsupported SharedBase module')
    filename = str(binary.resolve()).encode('ascii')
    version = ctypes.WinDLL('version', use_last_error=True)
    version.GetFileVersionInfoSizeA.argtypes = [ctypes.c_char_p, ctypes.POINTER(wintypes.DWORD)]
    version.GetFileVersionInfoSizeA.restype = wintypes.DWORD
    version.GetFileVersionInfoA.argtypes = [ctypes.c_char_p, wintypes.DWORD, wintypes.DWORD, ctypes.c_void_p]
    version.GetFileVersionInfoA.restype = wintypes.BOOL
    version.VerQueryValueA.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.POINTER(ctypes.c_void_p), ctypes.POINTER(wintypes.UINT)]
    version.VerQueryValueA.restype = wintypes.BOOL
    handle = wintypes.DWORD(0xffffffff)
    size = version.GetFileVersionInfoSizeA(filename, ctypes.byref(handle))
    if not size:
        raise ctypes.WinError(ctypes.get_last_error())
    buffer = ctypes.create_string_buffer(size)
    if not version.GetFileVersionInfoA(filename, handle.value, size, buffer):
        raise ctypes.WinError(ctypes.get_last_error())
    initial = buffer.raw
    queries = []
    for query in [b'\\VarFileInfo\\Translation', b'\\StringFileInfo\\000004B0\\FileVersion']:
        pointer, length = ctypes.c_void_p(), wintypes.UINT()
        before = buffer.raw
        result = version.VerQueryValueA(buffer, query, ctypes.byref(pointer), ctypes.byref(length))
        if not result or pointer.value is None:
            raise ValueError('Expected version resource query failed')
        offset = pointer.value - ctypes.addressof(buffer)
        if offset < 0 or offset + length.value > size:
            raise ValueError('Returned query outside prepared allocation')
        queries.append({'query': query.decode('ascii'), 'result': result, 'offset': offset,
            'length': length.value, 'bytes': ctypes.string_at(pointer, length.value).hex(),
            'beforeSha256': hashlib.sha256(before).hexdigest(),
            'afterSha256': hashlib.sha256(buffer.raw).hexdigest(),
            'changedBytes': [{'offset': i, 'before': a, 'after': b}
                for i, (a, b) in enumerate(zip(before, buffer.raw)) if a != b]})
    receipt = {'scope': 'Host Windows resource API observation; original Gothic DLL code was not loaded or executed. This is an explicit platform selection, not a universal Windows layout.',
        'inputSha256': SHA, 'size': size, 'handle': handle.value,
        'initialBufferBytes': initial.hex(), 'initialBufferSha256': hashlib.sha256(initial).hexdigest(),
        'preparedBufferBytes': buffer.raw.hex(), 'preparedBufferSha256': hashlib.sha256(buffer.raw).hexdigest(),
        'queries': queries, 'hostWindowsVersion': list(sys.getwindowsversion())}
    output.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8', newline='\n')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--binary', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    capture(args.binary, args.output)
