import * as THREE from 'three';

function positiveDimensions(...dimensions: number[]) {
  if (dimensions.some((dimension) => !Number.isFinite(dimension) || dimension <= 0)) {
    throw new RangeError('Silk geometry dimensions must be finite and positive.');
  }
}

function geometryOf(position: number[], uv: number[], index: number[], seams: [number, number][]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  // UV seams are coincident vertices, so their normals must share the same lighting.
  const normals = geometry.getAttribute('normal'), a = new THREE.Vector3(), b = new THREE.Vector3();
  for (const [first, last] of seams) {
    a.fromBufferAttribute(normals, first).add(b.fromBufferAttribute(normals, last)).normalize();
    normals.setXYZ(first, a.x, a.y, a.z); normals.setXYZ(last, a.x, a.y, a.z);
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Original 384-triangle fabric bolt. Its axis is local X, the floor is y=0,
 * and its exact nominal bounds are width × 2radius × 2radius. Shallow end-face
 * ridges show the wound fabric; a continuous outer crease marks the loose edge.
 * UVs follow the fabric along the roll, with circular projections on the ends.
 */
export function makeSilkBoltGeometry(width: number, radius: number): THREE.BufferGeometry {
  positiveDimensions(width, radius);
  const position: number[] = [], uv: number[] = [], index: number[] = [];
  const segments = 16, half = width / 2;
  const vertex = (x: number, radial: number, angle: number, u: number, v: number) => {
    // The seam is an inward fold, so it never changes the supported outer bounds.
    const delta = Math.atan2(Math.sin(angle - Math.PI * 0.625), Math.cos(angle - Math.PI * 0.625));
    const seam = Math.max(0, 1 - Math.abs(delta) / 0.30);
    const fold = 1 - 0.032 * seam * seam;
    const y = radius + radial * radius * fold * Math.cos(angle), z = radial * radius * fold * Math.sin(angle);
    const id = position.length / 3;
    position.push(x, y, z); uv.push(u, v);
    return id;
  };
  const rings: number[][] = [];
  const lengths = [-0.94, -0.86, 0.86, 0.94], radii = [0.975, 1, 1, 0.975];
  for (let k = 0; k < lengths.length; k++) {
    const ring: number[] = [];
    for (let j = 0; j <= segments; j++) {
      const angle = (j % segments) / segments * Math.PI * 2;
      ring.push(vertex(lengths[k]! * half, radii[k]!, angle, k / (lengths.length - 1), j / segments));
    }
    rings.push(ring);
  }
  for (let k = 0; k < rings.length - 1; k++) for (let j = 0; j < segments; j++) {
    const a = rings[k]![j]!, b = rings[k + 1]![j]!, c = rings[k + 1]![j + 1]!, d = rings[k]![j + 1]!;
    index.push(a, d, b, b, d, c);
  }
  for (const sign of [-1, 1]) {
    const center = position.length / 3;
    position.push(sign * half, radius, 0); uv.push(0.5, 0.5);
    const cap: number[][] = [];
    const windingRadii = [0.10, 0.30, 0.52, 0.74, 0.975], windingX = [0.99, 0.958, 0.985, 0.962, 0.94];
    for (let k = 0; k < windingRadii.length; k++) {
      const ring: number[] = [];
      for (let j = 0; j < segments; j++) {
        const angle = j / segments * Math.PI * 2, r = windingRadii[k]!;
        ring.push(vertex(sign * windingX[k]! * half, r, angle, 0.5 + Math.cos(angle) * r * 0.5, 0.5 + Math.sin(angle) * r * 0.5));
      }
      cap.push(ring);
    }
    const face = (a: number, b: number, c: number) => sign > 0 ? index.push(a, b, c) : index.push(a, c, b);
    for (let j = 0; j < segments; j++) face(center, cap[0]![j]!, cap[0]![(j + 1) % segments]!);
    for (let k = 0; k < cap.length - 1; k++) for (let j = 0; j < segments; j++) {
      const a = cap[k]![j]!, b = cap[k + 1]![j]!, c = cap[k + 1]![(j + 1) % segments]!, d = cap[k]![(j + 1) % segments]!;
      face(a, b, c); face(a, c, d);
    }
  }
  return geometryOf(position, uv, index, rings.map((ring) => [ring[0]!, ring[segments]!]));
}

/**
 * Original 144-triangle folded textile, centered in X/Z and supported at y=0.
 * Alternating rounded shoulders and inset folds create a complete cloth volume
 * instead of a stack of open planes. Its nominal bounds are width × height × depth.
 */
export function makeFoldedSilkGeometry(width: number, depth: number, height: number): THREE.BufferGeometry {
  positiveDimensions(width, depth, height);
  const position: number[] = [], uv: number[] = [], index: number[] = [];
  const outline = [[-1, -0.82], [-0.82, -1], [0, -1], [0.82, -1], [1, -0.82], [1, 0], [1, 0.82], [0.82, 1], [0, 1], [-0.82, 1], [-1, 0.82], [-1, 0]];
  const heights = [0, 0.12, 0.30, 0.46, 0.74, 0.91], insets = [0.94, 1, 0.963, 0.993, 1, 0.955];
  const rings: number[][] = [];
  for (let k = 0; k < heights.length; k++) {
    const ring: number[] = [];
    for (let j = 0; j <= outline.length; j++) {
      const wrap = j % outline.length, [ox, oz] = outline[wrap]!, inset = insets[k]!;
      const x = (ox! * inset + (Math.abs(ox!) < 0.99 ? Math.sin(wrap * 1.7 + k * 0.6) * 0.012 : 0)) * width / 2;
      const z = (oz! * inset + (Math.abs(oz!) < 0.99 ? Math.cos(wrap * 1.3 + k * 0.4) * 0.012 : 0)) * depth / 2;
      const wrinkle = k === 0 ? 0 : Math.sin(wrap * 1.1 + k * 0.7) * 0.022;
      const y = height * (heights[k]! + wrinkle);
      ring.push(position.length / 3);
      position.push(x, y, z); uv.push(j / outline.length, y / height);
    }
    rings.push(ring);
  }
  for (let k = 0; k < rings.length - 1; k++) for (let j = 0; j < outline.length; j++) {
    const next = j + 1;
    const a = rings[k]![j]!, b = rings[k]![next]!, c = rings[k + 1]![next]!, d = rings[k + 1]![j]!;
    index.push(a, d, b, b, d, c);
  }
  // Duplicate the cap vertices for continuous planar textile UVs and hard hem edges.
  for (const top of [false, true]) {
    const source = rings[top ? rings.length - 1 : 0]!.slice(0, outline.length), cap: number[] = [];
    const center = position.length / 3;
    position.push(0, top ? height : 0, 0); uv.push(0.5, 0.5);
    for (const id of source) {
      const x = position[id * 3]!, y = position[id * 3 + 1]!, z = position[id * 3 + 2]!;
      cap.push(position.length / 3); position.push(x, y, z); uv.push(x / width + 0.5, z / depth + 0.5);
    }
    for (let j = 0; j < cap.length; j++) {
      const a = cap[j]!, b = cap[(j + 1) % cap.length]!;
      if (top) index.push(center, b, a); else index.push(center, a, b);
    }
  }
  return geometryOf(position, uv, index, rings.map((ring) => [ring[0]!, ring[outline.length]!]));
}
