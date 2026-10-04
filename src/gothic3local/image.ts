import { BinaryReader, latin1 } from './binary';

/**
 * Compiled images (.ximg), as observed: a GENOMFLE header, then a resource header (sizes, a time stamp), the tag
 * "G3IMG", a version, and at fixed offsets the width (0x2f), height (0x33), mip count (0x3f) and the format: a FourCC
 * ("DXT1", "DXT3", "DXT5") or a Direct3D format number (21 is A8R8G8B8). The pixel data starts at 0x57: the mip levels
 * of each face in turn, smallest first (the full-size level last), in 4×4 blocks for the DXT formats. The string table
 * follows the data.
 */

export type ImageFormat = 'DXT1' | 'DXT3' | 'DXT5' | 'ARGB8';

export interface G3Image {
  width: number;
  height: number;
  format: ImageFormat;
  /** Faces (1, or 6 for a cube map), each a list of mip levels from the largest. */
  faces: Uint8Array[][];
}

export const IMAGE_DATA_OFFSET = 0x57;

export function blockBytes(format: ImageFormat): number {
  return format === 'DXT1' ? 8 : 16;
}

/** Bytes of one mip level. */
export function levelSize(format: ImageFormat, width: number, height: number): number {
  if (format === 'ARGB8') return Math.max(1, width) * Math.max(1, height) * 4;
  return Math.max(1, Math.ceil(width / 4)) * Math.max(1, Math.ceil(height / 4)) * blockBytes(format);
}

export function parseImage(bytes: Uint8Array): G3Image {
  if (bytes.length < IMAGE_DATA_OFFSET) throw new Error('image too small');
  if (latin1(bytes.subarray(0x26, 0x2b)) !== 'G3IMG') throw new Error('not a G3IMG image');
  const r = new BinaryReader(bytes);
  r.pos = 0x0a;
  const end = r.u32();
  r.pos = 0x2f;
  const width = r.u32();
  const height = r.u32();
  r.pos = 0x3f;
  const mips = Math.max(1, r.u32());
  const tag = latin1(bytes.subarray(0x47, 0x4b));
  let format: ImageFormat;
  if (tag === 'DXT1' || tag === 'DXT3' || tag === 'DXT5') format = tag;
  else if (r.view.getUint32(0x47, true) === 21) format = 'ARGB8';
  else throw new Error(`unsupported image format ${JSON.stringify(tag)}`);
  let faceBytes = 0;
  for (let i = 0; i < mips; i++) faceBytes += levelSize(format, width >> i, height >> i);
  const dataEnd = Math.min(end, bytes.length);
  const faceCount = Math.max(1, Math.floor((dataEnd - IMAGE_DATA_OFFSET) / faceBytes));
  if (faceCount !== 1 && faceCount !== 6) throw new Error(`image data holds ${faceCount} faces`);
  const faces: Uint8Array[][] = [];
  let at = IMAGE_DATA_OFFSET;
  for (let f = 0; f < faceCount; f++) {
    const levels: Uint8Array[] = new Array<Uint8Array>(mips);
    for (let i = mips - 1; i >= 0; i--) {
      const n = levelSize(format, width >> i, height >> i);
      levels[i] = bytes.subarray(at, at + n);
      at += n;
    }
    faces.push(levels);
  }
  return { width, height, format, faces };
}

/* ------------------------------------------------------------------ software decoding (fallback and tools) */

function rgb565(c: number, out: number[], o: number) {
  out[o] = (((c >> 11) & 31) * 255 + 15) / 31;
  out[o + 1] = (((c >> 5) & 63) * 255 + 31) / 63;
  out[o + 2] = ((c & 31) * 255 + 15) / 31;
}

/** Decode one level of a DXT image to RGBA8 (rows top to bottom). */
export function decodeLevel(format: ImageFormat, data: Uint8Array, width: number, height: number): Uint8Array {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const out = new Uint8Array(w * h * 4);
  if (format === 'ARGB8') {
    for (let i = 0; i < w * h; i++) {
      out[i * 4] = data[i * 4 + 2]!;
      out[i * 4 + 1] = data[i * 4 + 1]!;
      out[i * 4 + 2] = data[i * 4]!;
      out[i * 4 + 3] = data[i * 4 + 3]!;
    }
    return out;
  }
  const bw = Math.max(1, Math.ceil(w / 4));
  const bh = Math.max(1, Math.ceil(h / 4));
  const size = blockBytes(format);
  const colors = new Array<number>(16).fill(0);
  const alphas = new Array<number>(16).fill(255);
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      const b = (by * bw + bx) * size;
      const c = format === 'DXT1' ? b : b + 8;
      const c0 = data[c]! | (data[c + 1]! << 8);
      const c1 = data[c + 2]! | (data[c + 3]! << 8);
      rgb565(c0, colors, 0);
      rgb565(c1, colors, 4);
      colors[3] = 255;
      colors[7] = 255;
      if (c0 > c1 || format !== 'DXT1') {
        for (let k = 0; k < 3; k++) {
          colors[8 + k] = (2 * colors[k]! + colors[4 + k]!) / 3;
          colors[12 + k] = (colors[k]! + 2 * colors[4 + k]!) / 3;
        }
        colors[11] = 255;
        colors[15] = 255;
      } else {
        for (let k = 0; k < 3; k++) {
          colors[8 + k] = (colors[k]! + colors[4 + k]!) / 2;
          colors[12 + k] = 0;
        }
        colors[11] = 255;
        colors[15] = 0;
      }
      if (format === 'DXT3') {
        for (let i = 0; i < 16; i++) {
          const nib = (data[b + (i >> 1)]! >> ((i & 1) * 4)) & 15;
          alphas[i] = nib * 17;
        }
      } else if (format === 'DXT5') {
        const a0 = data[b]!;
        const a1 = data[b + 1]!;
        const table = [a0, a1];
        if (a0 > a1) for (let k = 1; k < 7; k++) table.push(((7 - k) * a0 + k * a1) / 7);
        else {
          for (let k = 1; k < 5; k++) table.push(((5 - k) * a0 + k * a1) / 5);
          table.push(0, 255);
        }
        let bits = 0;
        for (let k = 0; k < 6; k++) bits += data[b + 2 + k]! * 2 ** (8 * k);
        for (let i = 0; i < 16; i++) alphas[i] = table[Math.floor(bits / 2 ** (3 * i)) & 7]!;
      }
      const idx = data[c + 4]! | (data[c + 5]! << 8) | (data[c + 6]! << 16) | (data[c + 7]! << 24);
      for (let i = 0; i < 16; i++) {
        const x = bx * 4 + (i & 3);
        const y = by * 4 + (i >> 2);
        if (x >= w || y >= h) continue;
        const sel = (idx >>> (2 * i)) & 3;
        const o = (y * w + x) * 4;
        out[o] = colors[sel * 4]!;
        out[o + 1] = colors[sel * 4 + 1]!;
        out[o + 2] = colors[sel * 4 + 2]!;
        out[o + 3] = format === 'DXT1' ? colors[sel * 4 + 3]! : alphas[i]!;
      }
    }
  }
  return out;
}
