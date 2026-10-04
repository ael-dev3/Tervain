import { describe, expect, it } from 'vitest';
import { GothicArchives, MemorySource, groupOrder, pickArchives, readEntry, readPackIndex } from '../../src/gothic3local/archive';
import { selectFromFiles } from '../../src/gothic3local/source';
import { pack } from './fixtures';

const text = (s: string) => new TextEncoder().encode(s);
const decode = (b: Uint8Array) => new TextDecoder().decode(b);

describe('Gothic 3 archives (G3V0 packs)', () => {
  it('reads the directory tree and both stored and zlib entries', async () => {
    const bytes = pack(
      [
        { path: 'Meshes/A.xcmsh', data: text('stored entry') },
        { path: 'Meshes/B.xcmsh', data: text('a compressed entry, '.repeat(20)), compress: true },
      ],
      [{ path: 'Sub/C.ximg', data: text('nested') }],
    );
    const entries = await readPackIndex(new MemorySource(bytes, 'Test.pak'));
    expect(entries.map((e) => e.path)).toEqual(['Sub/C.ximg', 'Meshes/A.xcmsh', 'Meshes/B.xcmsh']);
    expect(entries[2]!.compression).toBe(2);
    expect(decode(await readEntry(entries[1]!))).toBe('stored entry');
    expect(decode(await readEntry(entries[2]!))).toBe('a compressed entry, '.repeat(20));
    expect(decode(await readEntry(entries[0]!))).toBe('nested');
  });

  it('rejects files that are not packs', async () => {
    const junk = new Uint8Array(64).fill(1);
    await expect(readPackIndex(new MemorySource(junk, 'Junk.pak'))).rejects.toThrow(/G3V0/);
    await expect(readPackIndex(new MemorySource(new Uint8Array(8), 'Tiny.pak'))).rejects.toThrow(/too small/);
  });

  it('lets later patches override the base archive, by path and by file name', async () => {
    const base = pack([
      { path: 'Images/Grass.ximg', data: text('old grass') },
      { path: 'Images/Rock.ximg', data: text('rock') },
    ]);
    const patch = pack([{ path: 'images/grass.ximg', data: text('patched grass') }]);
    // Given in an arbitrary order; the patch must still win.
    const archives = await GothicArchives.open([new MemorySource(patch, '_compiledImage.p00'), new MemorySource(base, '_compiledImage.pak')]);
    expect(decode(await archives.read('IMAGES/GRASS.XIMG'))).toBe('patched grass');
    expect(decode((await archives.readNamed('Rock.ximg'))!)).toBe('rock');
    expect(await archives.readNamed('missing.ximg')).toBeNull();
    expect(archives.list((k) => k.endsWith('.ximg'))).toHaveLength(2);
  });

  it('orders a group as the base archive and then its patches', () => {
    expect(groupOrder(['Strings.p01', 'Other.pak', 'Strings.pak', 'Strings.p00'], 'Strings')).toEqual(['Strings.pak', 'Strings.p00', 'Strings.p01']);
  });

  it('picks the archives the viewer reads and names the missing required ones', () => {
    const names = ['_compiledImage.pak', '_compiledImage.p00', '_compiledMesh.pak', 'Sound.pak', 'Projects_compiled.pak'];
    const { wanted, missing } = pickArchives(names);
    expect(wanted).toEqual(['_compiledImage.pak', '_compiledImage.p00', '_compiledMesh.pak', 'Projects_compiled.pak']);
    expect(missing).toEqual(['_compiledMaterial.pak']);
  });

  it('selects archives from a picked game folder, ignoring other folders', () => {
    const file = (rel: string) => {
      const f = new File([new Uint8Array(4)], rel.split('/').pop()!);
      Object.defineProperty(f, 'webkitRelativePath', { value: rel });
      return f;
    };
    const required = ['_compiledImage.pak', '_compiledMaterial.pak', '_compiledMesh.pak', 'Projects_compiled.pak'];
    const picked = selectFromFiles([...required.map((n) => file(`Gothic 3/Data/${n}`)), file('Gothic 3/Backup/Old/_compiledMesh.p00')]);
    expect('sources' in picked && picked.sources.map((s) => s.name).sort()).toEqual([...required].sort());
    expect(selectFromFiles([file('Gothic 3/Data/_compiledImage.pak')])).toEqual({ missing: ['_compiledMaterial.pak', '_compiledMesh.pak', 'Projects_compiled.pak'] });
  });
});
