import { describe, expect, it } from 'vitest';
import { NativeWin32FileSystem } from '../../src/gothic3/native-win32-file-system';
import type { NativeWin32CreateFileArguments, NativeWin32FileSystemSelection } from '../../src/gothic3/native-win32-file-system';

const input = (filename = 'zSpie.txt'): NativeWin32CreateFileArguments => ({ filename, access: 0x80000000, share: 3,
  security: { length: 12, descriptor: 0, inherit: 1 }, disposition: 3, attributes: 0x80, template: 0 });
const selection = (): NativeWin32FileSystemSelection => ({ cwd: 'C:/Gothic3', directories: ['C:/', 'C:/Gothic3'],
  files: [{ path: 'zSpie.txt', bytes: [65, 10], readable: true }] });

describe('owned virtual regular files for original SharedBase startup', () => {
  it('retires only the live owned handle and preserves its identity for native cleanup', () => {
    const fs = new NativeWin32FileSystem({}, selection()), other = new NativeWin32FileSystem({}, selection());
    const opened = fs.open(input()), sibling = fs.open(input()), foreign = other.open(input());
    if (!opened.known || !sibling.known || !foreign.known || typeof opened.value.handle === 'number' ||
        typeof sibling.value.handle === 'number' || typeof foreign.value.handle === 'number') throw new Error('Regular files did not open');
    const handle = opened.value.handle;
    expect(fs.close({ ...handle }).known).toBe(false);
    expect(fs.close(foreign.value.handle).known).toBe(false);
    expect(fs.snapshot().openHandles).toHaveLength(2);
    expect(fs.close(handle)).toEqual({ known: true, value: 1 });
    expect(fs.owns(handle)).toBe(false); expect(fs.recognizes(handle)).toBe(true);
    expect(fs.recognizes({ ...handle })).toBe(false); expect(fs.recognizes(foreign.value.handle)).toBe(false);
    expect(fs.close(handle).known).toBe(false); expect(fs.fileType(handle).known).toBe(false);
    expect(fs.owns(sibling.value.handle)).toBe(true); expect(other.owns(foreign.value.handle)).toBe(true);
    expect(fs.snapshot().retiredHandleCount).toBe(1);
    expect(fs.snapshot().openHandles[0]!.handle).toBe(sibling.value.handle);
    const reopened = fs.open(input());
    if (!reopened.known || typeof reopened.value.handle === 'number') throw new Error('File did not reopen');
    expect(reopened.value.handle).not.toBe(handle); expect(fs.owns(reopened.value.handle)).toBe(true);
  });
  it('opens case-insensitive DOS paths into distinct owned regular-file handles', () => {
    const owner = {}, fs = new NativeWin32FileSystem(owner, selection()), first = fs.open(input('ZSPIE.TXT')), second = fs.open(input('./zSpie.txt'));
    expect(first.known).toBe(true); expect(second.known).toBe(true);
    if (!first.known || !second.known || typeof first.value.handle === 'number' || typeof second.value.handle === 'number') throw new Error('Regular file did not open');
    expect(first.value.handle).not.toBe(second.value.handle); expect(first.value.handle.owner).toBe(owner);
    expect(first.value.lastError).toBeUndefined(); expect(Object.isFrozen(first.value.handle)).toBe(true);
    expect(fs.owns(first.value.handle)).toBe(true); expect(fs.owns({ ...first.value.handle })).toBe(false);
    expect(fs.fileType(first.value.handle)).toEqual({ known: true, value: 1 });
    expect(fs.fileType({ ...first.value.handle }).known).toBe(false);
    expect(fs.snapshot().openHandles.map(handle => [handle.path, handle.inherit, handle.byteLength])).toEqual([
      ['c:/gothic3/zspie.txt', true, 2], ['c:/gothic3/zspie.txt', true, 2] ]);
  });
  it('derives missing-file, missing-parent and directory errors from lookup', () => {
    const fs = new NativeWin32FileSystem({}, selection());
    expect(fs.open(input('absent.txt'))).toEqual({ known: true, value: { handle: 0xffffffff, lastError: 2 } });
    expect(fs.open(input('absent/file.txt'))).toEqual({ known: true, value: { handle: 0xffffffff, lastError: 3 } });
    expect(fs.open(input('C:/Gothic3'))).toEqual({ known: true, value: { handle: 0xffffffff, lastError: 5 } });
    expect(fs.snapshot().openHandles).toHaveLength(0);
  });
  it('rejects read access to a file whose retained permission denies it', () => {
    const fs = new NativeWin32FileSystem({}, { ...selection(), files: [{ path: 'zSpie.txt', bytes: [1], readable: false }] });
    expect(fs.open(input())).toEqual({ known: true, value: { handle: 0xffffffff, lastError: 5 } });
    expect(fs.snapshot().openHandles).toHaveLength(0);
  });
  it('copies directory, file, permission and byte declarations before callers mutate them', () => {
    const bytes = [65, 10], file = { path: 'zSpie.txt', bytes, readable: true }, files = [file], directories = ['C:/', 'C:/Gothic3'];
    const source = { cwd: 'C:/Gothic3', directories, files }, fs = new NativeWin32FileSystem({}, source);
    bytes.push(99); file.readable = false; file.path = 'other.txt'; files.length = 0; directories.length = 0; source.cwd = 'D:/';
    const result = fs.open(input()); expect(result.known).toBe(true);
    if (!result.known || typeof result.value.handle === 'number') throw new Error('Retained file did not open');
    expect(fs.snapshot().cwd).toBe('c:/gothic3'); expect(fs.snapshot().openHandles[0]!.byteLength).toBe(2);
  });
  it('leaves unsupported API modes and device names unknown without allocating handles', () => {
    const fs = new NativeWin32FileSystem({}, selection());
    for (const change of [{ access: 0x40000000 }, { share: 0 }, { disposition: 2 }, { attributes: 0x40000080 }, { template: 1 }, { security: { length: 12, descriptor: 7, inherit: 1 } }]) {
      expect(fs.open({ ...input(), ...change }).known).toBe(false);
    }
    for (const filename of ['NUL', 'C:zSpie.txt', '\\\\server\\file', 'name*', 'name.']) expect(fs.open(input(filename)).known).toBe(false);
    expect(fs.snapshot().openHandles).toHaveLength(0);
  });
  it('rejects accessor declarations, missing parents and duplicate file identities', () => {
    let reads = 0; const source = Object.defineProperty({ ...selection() }, 'files', { get: () => { reads++; return []; } });
    expect(() => new NativeWin32FileSystem({}, source)).toThrow(/accessor/); expect(reads).toBe(0);
    expect(() => new NativeWin32FileSystem({}, { ...selection(), directories: ['C:/Gothic3'] })).toThrow(/parent/);
    expect(() => new NativeWin32FileSystem({}, { ...selection(), files: [...selection().files, { path: 'ZSPIE.TXT', bytes: [], readable: true }] })).toThrow(/Unique/);
  });
});
