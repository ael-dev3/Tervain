import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

interface View { buffer?: number; byteOffset?: number; byteLength: number; extensions?: Record<string, { buffer?: number; byteOffset?: number; byteLength: number; byteStride: number; count: number; mode: string; filter?: string }> }

/**
 * The bytes a GLB buffer view holds once loaded: raw from the binary chunk, or decoded from EXT_meshopt_compression
 * (written losslessly by tools/optimise-models.mjs), so receipts of decoded geometry hold for either layout.
 */
export async function bufferViewBytes(json: { bufferViews: View[] }, binary: Buffer, index: number): Promise<Buffer> {
  const view = json.bufferViews[index]!, meshopt = view.extensions?.EXT_meshopt_compression;
  if (!meshopt) return binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
  await MeshoptDecoder.ready;
  const source = binary.subarray(meshopt.byteOffset ?? 0, (meshopt.byteOffset ?? 0) + meshopt.byteLength);
  const target = new Uint8Array(meshopt.count * meshopt.byteStride);
  MeshoptDecoder.decodeGltfBuffer(target, meshopt.count, meshopt.byteStride, new Uint8Array(source), meshopt.mode, meshopt.filter);
  return Buffer.from(target.buffer, target.byteOffset, view.byteLength);
}
