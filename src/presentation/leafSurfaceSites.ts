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
// The base alpha channel is already owned by decodedImages. For square atlases, higher max levels cost about one third as much again.
const alphaMaxLevels = new WeakMap<LeafChannelImage, readonly LeafChannelImage[]>();
function maxLevels(image: LeafChannelImage): readonly LeafChannelImage[] {
  const cached = alphaMaxLevels.get(image); if (cached) return cached;
  const levels = [image];
  while (levels[levels.length - 1]!.width > 1 || levels[levels.length - 1]!.height > 1) {
    const previous = levels[levels.length - 1]!, width = Math.ceil(previous.width / 2), height = Math.ceil(previous.height / 2);
    const data = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let maximum = 0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        if (x * 2 + dx >= previous.width || y * 2 + dy >= previous.height) continue;
        maximum = Math.max(maximum, previous.data[(y * 2 + dy) * previous.width + x * 2 + dx]!);
      }
      data[y * width + x] = maximum;
    }
    levels.push({ width, height, data });
  }
  alphaMaxLevels.set(image, levels); return levels;
}
function opaqueInRect(levels: readonly LeafChannelImage[], levelIndex: number, x: number, y: number,
  loX: number, hiX: number, loY: number, hiY: number, opacity: number, cutoff: number, edges: readonly number[], padding: number): boolean {
  const level = levels[levelIndex]!;
  if (x >= level.width || y >= level.height) return false;
  const size = 2 ** levelIndex, px = x * size, py = y * size;
  if (px > hiX || py > hiY || px + size <= loX || py + size <= loY) return false;
  const upper = level.data[y * level.width + x]! / 255 * opacity;
  if (upper < cutoff) return false;
  // A max texel outside the UV triangle cannot contribute, even when it lies inside its enclosing rectangle.
  // Expand each node by the filter footprint before testing the triangle's edge half-planes.
  let insideTriangle = true;
  for (let i = 0; i < edges.length; i += 3) {
    const nx = edges[i]!, ny = edges[i + 1]!;
    if (nx * (nx < 0 ? px - padding : px + size) + ny * (ny < 0 ? py - padding : py + size) + edges[i + 2]! < -1e-6) return false;
    if (nx * (nx < 0 ? px + size : px - padding) + ny * (ny < 0 ? py + size : py - padding) + edges[i + 2]! < 0) insideTriangle = false;
  }
  if (levelIndex === 0 || insideTriangle && px >= loX && py >= loY && px + size - 1 <= hiX && py + size - 1 <= hiY) return true;
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++)
    if (opaqueInRect(levels, levelIndex - 1, x * 2 + dx, y * 2 + dy, loX, hiX, loY, hiY, opacity, cutoff, edges, padding)) return true;
  return false;
}

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

/** Opacity lookup for one leaf material's cutout (map alpha × alphaMap green × opacity), for offline audits.
 * Null when the material is not masked or its pixels cannot be decoded. */
export function leafCutoutSampler(material: THREE.Material): { uv: string; cutoff: number; alpha(u: number, v: number): number;
  mayHaveOpaque(u0: number, v0: number, u1: number, v1: number, u2: number, v2: number): boolean } | null {
  const m = material as THREE.MeshStandardMaterial;
  if (!(m.alphaTest > 0) || !Number.isFinite(m.alphaTest) || !m.map) return null;
  const maps: { texture: THREE.Texture; image: LeafChannelImage }[] = [];
  for (const [texture, channel] of [[m.map, 3], [m.alphaMap, 1]] as const) {
    if (!texture) continue;
    const image = nativeImageChannel(texture.image, channel);
    if (!image) return null;
    maps.push({ texture, image });
  }
  const opacity = Number.isFinite(m.opacity) ? m.opacity : 1, cutoff = m.alphaTest;
  // Allocation-free lookups (an island pass samples every leaf triangle many times): each map's UV transform once.
  const lookups = maps.map(({ texture, image }) => {
    const e = textureMatrix(texture).elements, w = image.width, h = image.height, data = image.data, flip = texture.flipY;
    const nearest = texture.magFilter === THREE.NearestFilter, ws = texture.wrapS, wt = texture.wrapT;
    const texel = (x: number, y: number) => data[wrappedPixel(y, h, wt) * w + wrappedPixel(x, w, ws)]! / 255;
    return (u: number, v: number) => {
      let x = e[0]! * u + e[3]! * v + e[6]!, y = e[1]! * u + e[4]! * v + e[7]!;
      if (flip) y = 1 - y;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
      if (nearest) return texel(Math.floor(x * w), Math.floor(y * h));
      x = x * w - 0.5; y = y * h - 0.5;
      const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
      return (texel(ix, iy) * (1 - fx) + texel(ix + 1, iy) * fx) * (1 - fy) + (texel(ix, iy + 1) * (1 - fx) + texel(ix + 1, iy + 1) * fx) * fy;
    };
  });
  const first = maps[0]!, e = textureMatrix(first.texture).elements, image = first.image, texture = first.texture;
  const flip = texture.flipY, nearest = texture.magFilter === THREE.NearestFilter, wrapS = texture.wrapS, wrapT = texture.wrapT;
  const mayHaveOpaque = (u0: number, v0: number, u1: number, v1: number, u2: number, v2: number): boolean => {
    // Bilinear alpha is bounded by its source texels. A UV rectangle with no texel reaching the cutoff
    // cannot contain opacity; alphaMap can only reduce it. Wrapped edge rectangles keep the conservative path.
    const x0 = e[0]! * u0 + e[3]! * v0 + e[6]!, x1 = e[0]! * u1 + e[3]! * v1 + e[6]!, x2 = e[0]! * u2 + e[3]! * v2 + e[6]!;
    let y0 = e[1]! * u0 + e[4]! * v0 + e[7]!, y1 = e[1]! * u1 + e[4]! * v1 + e[7]!, y2 = e[1]! * u2 + e[4]! * v2 + e[7]!;
    if (flip) { y0 = 1 - y0; y1 = 1 - y1; y2 = 1 - y2; }
    const pad = nearest ? 0 : 0.5;
    let loX = Math.floor(Math.min(x0, x1, x2) * image.width - pad), hiX = Math.floor(Math.max(x0, x1, x2) * image.width - pad) + (nearest ? 0 : 1);
    let loY = Math.floor(Math.min(y0, y1, y2) * image.height - pad), hiY = Math.floor(Math.max(y0, y1, y2) * image.height - pad) + (nearest ? 0 : 1);
    if (![loX, hiX, loY, hiY].every(Number.isSafeInteger)) return true;
    if (wrapS === THREE.ClampToEdgeWrapping) { loX = Math.max(0, Math.min(image.width - 1, loX)); hiX = Math.max(0, Math.min(image.width - 1, hiX)); }
    if (wrapT === THREE.ClampToEdgeWrapping) { loY = Math.max(0, Math.min(image.height - 1, loY)); hiY = Math.max(0, Math.min(image.height - 1, hiY)); }
    // Wrapped rectangles crossing an image edge stay conservative; ordinary atlas interiors use the exact max query.
    if (loX < 0 || hiX >= image.width || loY < 0 || hiY >= image.height) return true;
    const edges: number[] = [];
    // Clamping outside the image is nonlinear: in that case keep the rectangle-only upper bound.
    if (Math.min(x0, x1, x2, y0, y1, y2) >= 0 && Math.max(x0, x1, x2, y0, y1, y2) <= 1) {
      const xs = [x0 * image.width - pad, x1 * image.width - pad, x2 * image.width - pad];
      const ys = [y0 * image.height - pad, y1 * image.height - pad, y2 * image.height - pad];
      const sign = Math.sign((xs[1]! - xs[0]!) * (ys[2]! - ys[0]!) - (ys[1]! - ys[0]!) * (xs[2]! - xs[0]!));
      if (sign) for (let i = 0; i < 3; i++) {
        const j = (i + 1) % 3, nx = (ys[i]! - ys[j]!) * sign, ny = (xs[j]! - xs[i]!) * sign;
        edges.push(nx, ny, -nx * xs[i]! - ny * ys[i]!);
      }
    }
    const levels = maxLevels(image);
    return opaqueInRect(levels, levels.length - 1, 0, 0, loX, hiX, loY, hiY, opacity, cutoff, edges, nearest ? 0 : 1);
  };
  return { uv: m.map.channel ? `uv${m.map.channel}` : 'uv', cutoff, mayHaveOpaque, alpha: (u, v) => {
    let a = opacity;
    for (const lookup of lookups) a *= lookup(u, v);
    return a;
  } };
}
