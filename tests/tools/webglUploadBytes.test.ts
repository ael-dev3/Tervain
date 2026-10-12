import { describe, expect, it } from 'vitest';
import { textureUploadBytes } from '../../tools/webgl-upload-bytes.mjs';

describe('play-gate texture source bytes', () => {
  it('does not report null Retina render-target allocations as uploads', () => {
    expect(textureUploadBytes('texImage2D', [3553, 0, 6408, 2880, 1800, 0, 6408, 5121, null])).toBe(0);
    expect(textureUploadBytes('texImage3D', [32879, 0, 6408, 16, 16, 16, 0, 6408, 5121, null])).toBe(0);
  });
  it('counts image sources and sized typed-array sources', () => {
    expect(textureUploadBytes('texImage2D', [3553, 0, 6408, 6408, 5121, { width: 32, height: 16 }])).toBe(2048);
    expect(textureUploadBytes('texSubImage2D', [3553, 0, 0, 0, 6408, 5121, { width: 32, height: 16 }])).toBe(2048);
    expect(textureUploadBytes('texImage2D', [3553, 0, 6408, 2, 2, 0, 6408, 5121, new Uint8Array(16)])).toBe(16);
    expect(textureUploadBytes('texSubImage3D', [32879, 0, 0, 0, 0, 2, 2, 2, 6408, 5121, new Uint8Array(32)])).toBe(32);
  });
  it('counts source offsets in elements and compressed source ranges', () => {
    expect(textureUploadBytes('texImage3D', [32879, 0, 6408, 2, 2, 2, 0, 6408, 5126, new Float32Array(12), 4])).toBe(32);
    expect(textureUploadBytes('compressedTexImage2D', [3553, 0, 33776, 4, 4, 0, new Uint8Array(20), 4, 8])).toBe(8);
    expect(textureUploadBytes('compressedTexSubImage2D', [3553, 0, 0, 0, 4, 4, 33776, new Uint8Array(20), 4])).toBe(16);
  });
});
