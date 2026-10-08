/**
 * Formal wear for the thornback, for the teaser only: a top hat with a crimson band, a gold monocle on a chain and a
 * crimson bow tie, built in the page from the game's own Three.js classes (the game itself is unchanged) and worn on
 * the creature's head, so they follow every turn, nod and charge.
 *
 * `dress` runs inside the page (it is passed as source to the DevTools Protocol). `side` picks the eye that wears the
 * monocle: 1 is the creature's left (+x in its head), -1 its right.
 */
export function dress(side = 1) {
  const T = window.tervain;
  const beast = T.enemies.find((e) => e.id === 'cut_creature');
  if (!beast) return null;
  const head = beast.rig.head;
  if (head.userData.formal) return head.userData.formal;
  const sample = beast.rig.root.getObjectByProperty('isMesh', true);
  const Mesh = sample.constructor, Geometry = sample.geometry.constructor;
  const Attribute = sample.geometry.getAttribute('position').constructor, Material = sample.material.constructor;
  const Group = head.constructor;

  const build = (positions, indices, material) => {
    const g = new Geometry();
    g.setAttribute('position', new Attribute(new Float32Array(positions), 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    const m = new Mesh(g, material);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  /** A surface of revolution about y. A profile point given twice makes a hard edge there. */
  const lathe = (profile, material, segments = 48) => {
    const p = [], idx = [];
    for (const [r, y] of profile) {
      for (let s = 0; s <= segments; s++) {
        const a = (s / segments) * Math.PI * 2;
        p.push(r * Math.sin(a), y, r * Math.cos(a));
      }
    }
    const ring = segments + 1;
    for (let k = 0; k < profile.length - 1; k++) {
      if (profile[k][0] === profile[k + 1][0] && profile[k][1] === profile[k + 1][1]) continue;
      for (let s = 0; s < segments; s++) {
        const a = k * ring + s, b = a + 1, c = a + ring, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
    return build(p, idx, material);
  };
  /** A torus about the z axis: radius R, tube r. */
  const torus = (R, r, material, around = 40, tube = 10) => {
    const p = [], idx = [];
    for (let i = 0; i <= around; i++) {
      const u = (i / around) * Math.PI * 2;
      for (let j = 0; j <= tube; j++) {
        const v = (j / tube) * Math.PI * 2;
        p.push((R + r * Math.cos(v)) * Math.cos(u), (R + r * Math.cos(v)) * Math.sin(u), r * Math.sin(v));
      }
    }
    for (let i = 0; i < around; i++) for (let j = 0; j < tube; j++) {
      const a = i * (tube + 1) + j, b = a + tube + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    return build(p, idx, material);
  };
  /** A thin round tube through points (the monocle's chain). */
  const tube = (points, r, material, sides = 6) => {
    const p = [], idx = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2];
      const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      // Two directions across the tube: perpendicular to its run.
      let nx = -tz, ny = 0, nz = tx;
      if (Math.hypot(nx, nz) < 1e-3) { nx = 1; nz = 0; }
      const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
      for (let s = 0; s <= sides; s++) {
        const w = (s / sides) * Math.PI * 2, c = Math.cos(w) * r, d = Math.sin(w) * r;
        p.push(points[i][0] + nx * c + bx * d, points[i][1] + ny * c + by * d, points[i][2] + nz * c + bz * d);
      }
    }
    for (let i = 0; i < points.length - 1; i++) for (let s = 0; s < sides; s++) {
      const a = i * (sides + 1) + s, b = a + sides + 1;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
    return build(p, idx, material);
  };
  /** One wing of a bow tie: a pinched, puffed fan from the knot out to x = `reach` on side `sx`. */
  const wing = (sx, reach, half, depth, material) => {
    const p = [], idx = [];
    const cols = 10, rows = 8;
    for (const face of [1, -1]) {
      for (let i = 0; i <= cols; i++) {
        const u = i / cols, x = sx * (0.012 + u * reach);
        // The wing flares from the knot, with a soft notch at its outer edge.
        const h = half * (0.38 + 0.62 * Math.sin(Math.min(1, u * 1.15) * Math.PI / 2)) * (1 - 0.18 * Math.max(0, u - 0.86) / 0.14);
        for (let j = 0; j <= rows; j++) {
          const v = j / rows * 2 - 1, y = v * h * (1 - (u > 0.9 ? 0.25 * (1 - Math.abs(v)) * (u - 0.9) / 0.1 : 0));
          const puff = depth * (0.55 + 0.45 * Math.cos(v * Math.PI / 2)) * (0.6 + 0.4 * Math.sin(u * Math.PI));
          p.push(x, y, face * puff);
        }
      }
    }
    const grid = (cols + 1) * (rows + 1);
    for (const [f, base] of [[1, 0], [-1, grid]]) {
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const a = base + i * (rows + 1) + j, b = a + rows + 1;
        if ((f > 0) === (sx > 0)) idx.push(a, b, a + 1, a + 1, b, b + 1);
        else idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
    // Close the outer edge and the top and bottom rims.
    for (let j = 0; j < rows; j++) {
      const a = cols * (rows + 1) + j, b = grid + a;
      if (sx > 0) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    for (const j of [0, rows]) for (let i = 0; i < cols; i++) {
      const a = i * (rows + 1) + j, b = a + rows + 1, c = grid + a, d = grid + b;
      if ((j === 0) === (sx > 0)) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
    }
    return build(p, idx, material);
  };

  // Matte, as felt is: a glossy brim seen from above mirrors the sky and reads as straw.
  const felt = new Material({ color: 0x101013, roughness: 0.9, metalness: 0, envMapIntensity: 0.3 });
  // Double-sided: the bow tie's puffed wings are closed by hand.
  const silk = new Material({ color: 0x8e0f1c, roughness: 0.32, metalness: 0.08, side: 2 });
  const gold = new Material({ color: 0xf2c25a, roughness: 0.22, metalness: 0.9, emissive: 0x2a1a02 });
  const glass = new Material({ color: 0xe8f0ff, roughness: 0.04, metalness: 0.2, transparent: true, opacity: 0.22, depthWrite: false });

  const formal = new Group();
  formal.name = 'Thornback / formal wear (teaser)';

  // The hat: a tall crown, a little wider at the top, on a brim curled at its sides; worn at a jaunty tilt.
  const hat = new Group();
  hat.add(lathe([[0, 0.004], [0.2, 0.004], [0.2, 0.004], [0.212, 0.012], [0.212, 0.02], [0.2, 0.026], [0.2, 0.026], [0.124, 0.026],
    [0.124, 0.026], [0.13, 0.31], [0.13, 0.31], [0.126, 0.318], [0, 0.318]], felt));
  hat.add(lathe([[0.1265, 0.03], [0.1265, 0.03], [0.1275, 0.085], [0.1275, 0.085], [0.12, 0.09]], silk));
  hat.position.set(0.02 * side, 0.205, 0.03);
  hat.rotation.set(-0.12, 0, -0.2 * side);
  formal.add(hat);

  // The monocle: a gold rim over the eye, a disc of glass, and a fine chain looping down to the bow tie.
  const eye = [0.2 * side, 0.1, 0.45];
  const monocle = new Group();
  const rim = torus(0.068, 0.011, gold);
  const disc = lathe([[0, 0], [0.066, 0], [0.066, 0]], glass, 32);
  disc.rotation.x = Math.PI / 2;
  monocle.add(rim, disc);
  monocle.position.set(eye[0] + 0.03 * side, eye[1], eye[2] + 0.01);
  // Face out from the side of the snout, a little forward.
  monocle.rotation.set(0, side * 1.18, 0);
  formal.add(monocle);
  const from = [eye[0] + 0.035 * side, eye[1] - 0.068, eye[2] + 0.02], to = [0.05 * side, -0.27, 0.2];
  const chain = [];
  for (let i = 0; i <= 18; i++) {
    const u = i / 18;
    chain.push([from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u - Math.sin(u * Math.PI) * 0.07, from[2] + (to[2] - from[2]) * u + Math.sin(u * Math.PI) * 0.03]);
  }
  formal.add(tube(chain, 0.0045, gold));

  // The bow tie: under the jaw, facing forward.
  const tie = new Group();
  tie.add(wing(1, 0.17, 0.085, 0.022, silk), wing(-1, 0.17, 0.085, 0.022, silk));
  const knot = lathe([[0, -0.035], [0.034, -0.032], [0.04, 0], [0.034, 0.032], [0, 0.035]], silk, 16);
  knot.scale.set(1, 1, 0.75);
  tie.add(knot);
  tie.position.set(0, -0.285, 0.2);
  tie.rotation.set(-0.35, 0, 0);
  formal.add(tie);

  head.add(formal);
  head.userData.formal = { hat: hat.uuid, monocle: monocle.uuid, tie: tie.uuid };
  // Where the monocle is, for the glint in the caption layer.
  window.__monocle = () => {
    const v = monocle.getWorldPosition(new (T.cam.camera.position.constructor)());
    const s = v.clone().project(T.cam.camera);
    return { x: (s.x + 1) / 2, y: (1 - s.y) / 2, z: s.z };
  };
  return head.userData.formal;
}
