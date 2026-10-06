import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { MESHY_TREE_IDS, MESHY_TREE_LODS } from '../../src/presentation/meshyTrees';
import { meshyTreeBinary } from './meshyTreeFixture';

interface FileReceipt {
  path: string; file: string; bytes: number; sha256: string; triangles: number; uniqueTriangles: number;
  parts: { name: string; triangles: number; mesh: number }[];
  images: { mimeType: string; bytes: number; sha256: string; width: number; height: number }[];
}
interface TreeManifest {
  schemaVersion: number; gameVersion: string;
  protectedPine: { path: string; bytes: number; sha256: string; triangles: number }[];
  assets: { id: string; selected: boolean; selection: string; sourceFilename: string; sourceSha256: string; sourceTriangles: number;
    sourceUnmodified: boolean; runtime: Record<typeof MESHY_TREE_LODS[number], FileReceipt> }[];
}
let manifest: TreeManifest;
beforeAll(() => { manifest = JSON.parse(readFileSync(new URL('../../docs/engineering/meshy-tree-assets.json', import.meta.url), 'utf8')) as TreeManifest; });

describe('frozen supplied-tree preparation receipts', () => {
  it('records fifteen distinct owner originals, exactly thirteen active source IDs and two explicit reserves', () => {
    expect(manifest.schemaVersion).toBe(1); expect(manifest.gameVersion).toBe('0.0.12'); expect(manifest.assets).toHaveLength(15);
    expect(new Set(manifest.assets.map(asset => asset.id)).size).toBe(15);
    expect(new Set(manifest.assets.map(asset => asset.sourceFilename)).size).toBe(15);
    expect(manifest.assets.filter(asset => asset.selected).map(asset => asset.id).sort()).toEqual([...MESHY_TREE_IDS].sort());
    expect(manifest.assets.filter(asset => !asset.selected).map(asset => asset.id).sort()).toEqual(['tree-1459', 'tree-3106']);
    for (const asset of manifest.assets) {
      expect(asset.sourceSha256).toMatch(/^[a-f0-9]{64}$/); expect(asset.sourceUnmodified).toBe(true); expect(asset.sourceTriangles).toBeGreaterThan(0);
      expect(asset.sourceFilename).toMatch(/^Meshy_AI_.*\.glb$/);
      expect(asset.selection).toBe(!asset.selected ? 'reserve' : asset.id === 'tree-1537' ? 'wood-only' : 'full-tree');
    }
  });

  it('matches actual bytes, SHA-256, embedded image hashes and complete mesh-instance triangles for all 45 prepared GLBs', () => {
    for (const asset of manifest.assets) for (const level of MESHY_TREE_LODS) {
      const receipt = asset.runtime[level], file = `${asset.id}-${level}.glb`, { bytes, json } = meshyTreeBinary(file);
      expect(receipt.path).toBe(`public/models/flora/meshy-012/${file}`); expect(receipt.file).toBe(file);
      expect(receipt.bytes).toBe(bytes.length); expect(receipt.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
      let uniqueTriangles = 0;
      const meshTriangles = json.meshes.map((mesh: { primitives: { mode?: number; indices?: number; attributes: { POSITION: number } }[] }) => {
        let count = 0;
        for (const primitive of mesh.primitives) {
          expect(primitive.mode ?? 4).toBe(4);
          const accessor = json.accessors[primitive.indices ?? primitive.attributes.POSITION];
          expect(accessor.count % 3).toBe(0); count += accessor.count / 3;
        }
        uniqueTriangles += count; return count;
      });
      const instances = json.nodes.filter((node: { mesh?: number }) => Number.isInteger(node.mesh));
      const triangles = instances.reduce((sum: number, node: { mesh: number }) => sum + meshTriangles[node.mesh]!, 0);
      expect(triangles).toBe(receipt.triangles); expect(uniqueTriangles).toBe(receipt.uniqueTriangles);
      expect(triangles).toBeGreaterThan(0); expect(triangles).toBeLessThan(20_000);
      expect(receipt.parts.map(part => part.name).sort()).toEqual(['Foliage', 'Wood']);
      expect(receipt.parts.reduce((sum, part) => sum + part.triangles, 0)).toBe(triangles);
      for (const part of receipt.parts) {
        const node = instances.find((candidate: { name: string }) => candidate.name === part.name);
        expect(node).toBeDefined(); expect(part.mesh).toBe(node.mesh); expect(part.triangles).toBe(meshTriangles[node.mesh]);
      }
      expect(receipt.images).toHaveLength(json.images.length);
      const jsonLength = bytes.readUInt32LE(12), binaryOffset = 28 + jsonLength;
      for (const [i, image] of json.images.entries()) {
        expect(image.uri).toBeUndefined(); const view = json.bufferViews[image.bufferView];
        const raw = bytes.subarray(binaryOffset + (view.byteOffset ?? 0), binaryOffset + (view.byteOffset ?? 0) + view.byteLength), recorded = receipt.images[i]!;
        expect(recorded.mimeType).toBe(image.mimeType); expect(recorded.bytes).toBe(raw.length);
        expect(recorded.sha256).toBe(createHash('sha256').update(raw).digest('hex'));
        expect(recorded.width).toBeGreaterThan(0); expect(recorded.height).toBeGreaterThan(0);
        if (image.mimeType === 'image/png') { expect(recorded.width).toBe(raw.readUInt32BE(16)); expect(recorded.height).toBe(raw.readUInt32BE(20)); }
      }
    }
  });

  it('keeps every protected Pine receipt equal to the actual unchanged hosted binary', () => {
    expect(manifest.protectedPine).toHaveLength(3);
    for (const receipt of manifest.protectedPine) {
      const bytes = readFileSync(new URL(`../../${receipt.path}`, import.meta.url));
      expect(bytes.length).toBe(receipt.bytes); expect(createHash('sha256').update(bytes).digest('hex')).toBe(receipt.sha256);
      expect(receipt.triangles).toBeLessThan(10_000);
    }
  });
});
