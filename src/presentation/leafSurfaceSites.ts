import * as THREE from 'three';

export interface LeafSurfaceSite { x: number; y: number; z: number }
/** Decoded pixels in canvas order: first row at the top, four unsigned-byte channels per pixel. */
export interface LeafRgbaImage { width: number; height: number; data: ArrayLike<number> }
export interface LeafSurfaceOptions {
  /** Maximum triangle candidates examined, rather than an unbounded search to fill this count. */
  limit?: number;
  /** Pure CPU boundary for tests; native decoding is used when omitted. */
  readImage?: (image: unknown) => LeafRgbaImage | null;
}

interface LeafChannelImage { width: number; height: number; data: Uint8Array }
// Canonical decoded image identities survive cloned Texture wrappers. Cache one
// byte of alpha per pixel, rather than retaining another full RGBA atlas.
const decodedImages = new WeakMap<object, Map<1 | 3, LeafChannelImage | null>>();
function validPixels(image: LeafRgbaImage | null): image is LeafRgbaImage {
  return !!image && Number.isInteger(image.width) && Number.isInteger(image.height)
    && image.width > 0 && image.height > 0 && image.width * image.height <= 16_777_216
    && image.data.length >= image.width * image.height * 4;
}

/** Read one immutable decoded image at build time. Never alters or closes the source bitmap. */
function nativeImagePixels(source: unknown): LeafRgbaImage | null {
  if (!source || typeof source !== 'object') return null;
  let result: LeafRgbaImage | null = null;
  try {
    const direct = source as Partial<LeafRgbaImage>;
    const width = direct.width ?? 0, height = direct.height ?? 0;
    if (direct.data && validPixels(direct as LeafRgbaImage)) result = direct as LeafRgbaImage;
    else if (Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 && width * height <= 16_777_216) {
      const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, height)
        : typeof document !== 'undefined' ? document.createElement('canvas') : null;
      if (canvas) {
        canvas.width = width; canvas.height = height;
        const context = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
        if (context) {
          context.drawImage(source as CanvasImageSource, 0, 0);
          result = { width, height, data: context.getImageData(0, 0, width, height).data };
        }
      }
    }
  } catch {
    // Closed, tainted, unavailable or unsupported images must not produce invisible emission sites.
  }
  return result;
}

function channelPixels(image: LeafRgbaImage | null, channel: 1 | 3): LeafChannelImage | null {
  if (!validPixels(image)) return null;
  const data = new Uint8Array(image.width * image.height);
  for (let i = 0; i < data.length; i++) {
    const value = image.data[i * 4 + channel]!;
    data[i] = Number.isFinite(value) ? Math.max(0, Math.min(255, value)) : 0;
  }
  return { width: image.width, height: image.height, data };
}

function nativeImageChannel(source: unknown, channel: 1 | 3): LeafChannelImage | null {
  if (!source || typeof source !== 'object') return null;
  let channels = decodedImages.get(source);
  if (!channels) { channels = new Map(); decodedImages.set(source, channels); }
  if (channels.has(channel)) return channels.get(channel)!;
  const result = channelPixels(nativeImagePixels(source), channel);
  channels.set(channel, result);
  return result;
}

function wrappedPixel(index: number, size: number, wrap: THREE.Wrapping): number {
  if (wrap === THREE.RepeatWrapping) return ((index % size) + size) % size;
  if (wrap === THREE.MirroredRepeatWrapping) {
    const repeated = ((index % (size * 2)) + size * 2) % (size * 2);
    return repeated < size ? repeated : size * 2 - repeated - 1;
  }
  return Math.max(0, Math.min(size - 1, index));
}

/** Effective UV transform without changing the immutable template texture's matrix. */
function textureMatrix(texture: THREE.Texture): THREE.Matrix3 {
  return texture.matrixAutoUpdate ? new THREE.Matrix3().setUvTransform(texture.offset.x, texture.offset.y,
    texture.repeat.x, texture.repeat.y, texture.rotation, texture.center.x, texture.center.y) : texture.matrix.clone();
}

/** Base-level CPU alpha sampling with the same UV orientation and wrapping as Three's texture upload.
 * glTF textures use flipY=false, so UV v=0 reads the first decoded image row.
 */
export function sampleLeafRgbaAlpha(image: LeafRgbaImage, u: number, v: number, texture: THREE.Texture, channel: 1 | 3 = 3): number {
  if (!validPixels(image)) return 0;
  return sampleChannelAlpha(image.width, image.height, (x, y) => image.data[(y * image.width + x) * 4 + channel]!, u, v, texture);
}

function sampleChannelAlpha(width: number, height: number, valueAt: (x: number, y: number) => number,
  u: number, v: number, texture: THREE.Texture): number {
  if (!Number.isFinite(u) || !Number.isFinite(v)) return 0;
  const matrix = textureMatrix(texture);
  if (!matrix.elements.every(Number.isFinite)) return 0;
  const uv = new THREE.Vector2(u, v).applyMatrix3(matrix);
  if (texture.flipY) uv.y = 1 - uv.y;
  if (![uv.x, uv.y].every(Number.isFinite)) return 0;
  const texel = (x: number, y: number) => {
    const ix = wrappedPixel(x, width, texture.wrapS), iy = wrappedPixel(y, height, texture.wrapT);
    const value = valueAt(ix, iy);
    return Number.isFinite(value) ? Math.max(0, Math.min(255, value)) / 255 : 0;
  };
  if (texture.magFilter === THREE.NearestFilter) return texel(Math.floor(uv.x * width), Math.floor(uv.y * height));
  const x = uv.x * width - 0.5, y = uv.y * height - 0.5;
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  return (texel(ix, iy) * (1 - fx) + texel(ix + 1, iy) * fx) * (1 - fy)
    + (texel(ix, iy + 1) * (1 - fx) + texel(ix + 1, iy + 1) * fx) * fy;
}

/** Source-local visible surface sites for detached leaves or menu perches.
 * Run once on the prepared clone, then retain the result with its TreeVariant.
 * Opaque source volumes need neither DOM access nor pixel readback. MASK cards
 * must pass their decoded texture alpha and opacity; failure yields no sites.
 */
export function sampleLeafSurfaceSites(
  geometry: THREE.BufferGeometry,
  material: THREE.MeshStandardMaterial,
  options: LeafSurfaceOptions = {},
): readonly LeafSurfaceSite[] {
  const position = geometry.getAttribute('position');
  if (!position || !(material.opacity > 0) || !Number.isFinite(material.opacity)) return [];
  const limit = Math.max(0, Math.min(4096, Math.floor(options.limit ?? 512)));
  if (!Number.isFinite(limit) || limit === 0) return [];
  const index = geometry.index, triangles = Math.floor((index?.count ?? position.count) / 3);
  const stride = Math.max(1, Math.ceil(triangles / limit));
  const masked = material.alphaTest > 0;
  const maps: { texture: THREE.Texture; image: LeafChannelImage }[] = [];
  if (masked) {
    if (!material.map || !Number.isFinite(material.alphaTest)) return [];
    try {
      for (const [texture, channel] of [[material.map, 3], [material.alphaMap, 1]] as const) {
        if (!texture) continue;
        const image = options.readImage ? channelPixels(options.readImage(texture.image), channel) : nativeImageChannel(texture.image, channel);
        if (!image) return [];
        const uvName = texture.channel === 0 ? 'uv' : `uv${texture.channel}`;
        if (!geometry.getAttribute(uvName)) return [];
        maps.push({ texture, image });
      }
    } catch { return []; }
  }
  const sites: LeafSurfaceSite[] = [];
  for (let triangle = 0; triangle < triangles; triangle += stride) {
    const a = index ? index.getX(triangle * 3) : triangle * 3;
    const b = index ? index.getX(triangle * 3 + 1) : triangle * 3 + 1;
    const c = index ? index.getX(triangle * 3 + 2) : triangle * 3 + 2;
    if (![a, b, c].every(i => Number.isInteger(i) && i >= 0 && i < position.count)) continue;
    const ax = position.getX(a), ay = position.getY(a), az = position.getZ(a);
    const bx = position.getX(b), by = position.getY(b), bz = position.getZ(b);
    const cx = position.getX(c), cy = position.getY(c), cz = position.getZ(c);
    if (![ax, ay, az, bx, by, bz, cx, cy, cz].every(Number.isFinite)) continue;
    const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    const nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (nx * nx + ny * ny + nz * nz <= 1e-16) continue;
    let alpha = material.opacity;
    for (const map of maps) {
      const uv = geometry.getAttribute(map.texture.channel === 0 ? 'uv' : `uv${map.texture.channel}`);
      alpha *= sampleChannelAlpha(map.image.width, map.image.height,
        (x, y) => map.image.data[y * map.image.width + x]!,
        (uv.getX(a) + uv.getX(b) + uv.getX(c)) / 3,
        (uv.getY(a) + uv.getY(b) + uv.getY(c)) / 3, map.texture);
    }
    if (masked && alpha < material.alphaTest) continue;
    sites.push({ x: (ax + bx + cx) / 3, y: (ay + by + cy) / 3, z: (az + bz + cz) / 3 });
  }
  return sites;
}
