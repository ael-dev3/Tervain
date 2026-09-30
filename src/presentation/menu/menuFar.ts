import * as THREE from 'three';
import { fbm, ridged, smoothstep } from '../../world/noise';
import { MENU_SKY_GLSL, MENU_SEA_LEVEL, menuSkyUniforms } from './menuSky';
import { MENU_LIGHTHOUSE } from './menuLayout';

/**
 * What lies beyond the brow: wooded hills stepping away on the left, a headland on the right with Lantern Point's tower
 * on it, and a far coast drawn thin on the horizon. These are silhouettes seen through dusk haze, so they use a small
 * shader that fades each surface into the sky colour behind it (not a single fog colour, which would be wrong on the
 * sun's side). The lighthouse keeps its lamp and slow beam, as in the playable coast.
 */

const HAZE_VERT = /* glsl */ `
varying vec3 vW;
varying vec3 vN;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const HAZE_FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uZenith;
uniform vec3 uUpper;
uniform vec3 uHorizonCool;
uniform vec3 uHorizonWarm;
uniform vec3 uSunCore;
uniform vec3 uCloudDark;
uniform vec3 uCloudLit;
uniform vec3 uBase;
uniform vec3 uTop;
uniform float uHaze;
uniform float uTreeTex;
uniform sampler2D uNoise;
varying vec3 vW;
varying vec3 vN;
${MENU_SKY_GLSL}
void main() {
  // Land under the waterline is left to the sky dome's sea, so every shore is a clean line.
  if (vW.y < ${MENU_SEA_LEVEL.toFixed(2)}) discard;
  vec3 v = vW - cameraPosition;
  float dist = length(v);
  vec3 d = v / dist;
  vec3 n = normalize(vN);
  // Dark land, faintly lit from the sky above and rimmed on the faces that turn toward the low sun.
  float sky = clamp(n.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = mix(uBase, uTop, sky);
  float rim = pow(clamp(dot(n, uSunDir) * 0.8 + 0.2, 0.0, 1.0), 3.0);
  col += uHorizonWarm * rim * 0.12;
  // Tree texture on wooded silhouettes: dark clumps breaking up the surface.
  float clump = texture2D(uNoise, vW.xz * 0.018 + vW.y * 0.01).r;
  col *= mix(1.0, 0.65 + 0.7 * clump, uTreeTex);
  float f = 1.0 - exp(-dist * uHaze);
  vec3 hz = menuSkyFar(normalize(vec3(d.x, max(d.y, 0.0) * 0.6 + 0.01, d.z)));
  col = mix(col, hz, clamp(f, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`;

function hazeMaterial(base: number, top: number, haze: number, trees: number, noise: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...menuSkyUniforms,
      uNoise: { value: noise },
      uBase: { value: new THREE.Color().setHex(base) },
      uTop: { value: new THREE.Color().setHex(top) },
      uHaze: { value: haze },
      uTreeTex: { value: trees },
    },
    vertexShader: HAZE_VERT,
    fragmentShader: HAZE_FRAG,
  });
}

/** A landmass as a height grid over a rectangle; `h` returns metres above the sea (<= 0 means open water, not drawn). */
function landGrid(x0: number, x1: number, z0: number, z1: number, nx: number, nz: number, h: (x: number, z: number) => number): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = x0 + ((x1 - x0) * i) / nx;
      const z = z0 + ((z1 - z0) * j) / nz;
      pos.push(x, MENU_SEA_LEVEL + Math.max(-3, h(x, z)), z);
    }
  }
  const row = nx + 1;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * row + i;
      const b = a + 1;
      const c = a + row + 1;
      const d = a + row;
      const ys = [pos[a * 3 + 1]!, pos[b * 3 + 1]!, pos[c * 3 + 1]!, pos[d * 3 + 1]!];
      if (ys.every((y) => y <= MENU_SEA_LEVEL - 0.5)) continue;
      idx.push(a, d, b, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** A soft-edged blob mask: 1 inside the outline, falling to 0 over `edge` metres, with a noisy coastline. */
function blob(x: number, z: number, cx: number, cz: number, rx: number, rz: number, rot: number, edge: number, seed: number) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const lx = (x - cx) * c - (z - cz) * s;
  const lz = (x - cx) * s + (z - cz) * c;
  const a = Math.atan2(lz / rz, lx / rx);
  const wob = 1 + 0.22 * fbm(Math.cos(a) * 2 + seed, Math.sin(a) * 2, 3, seed);
  const r = Math.hypot(lx / rx, lz / rz) / wob;
  return smoothstep(1, 1 - edge, r);
}

export interface MenuFar {
  group: THREE.Group;
  beam: THREE.Group;
  lampPos: THREE.Vector3;
  update(time: number): void;
  dispose(): void;
}

export function buildMenuFar(noise: THREE.Texture): MenuFar {
  const group = new THREE.Group();
  group.name = 'Menu_Far_Silhouettes';
  const disposables: { dispose(): void }[] = [];
  const add = (g: THREE.BufferGeometry, m: THREE.Material, name: string) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.name = name;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    group.add(mesh);
    disposables.push(g, m);
    return mesh;
  };

  // The headland: a long rise of moor ending in cliffs, the lighthouse on its seaward knob.
  const L = MENU_LIGHTHOUSE;
  const headH = (x: number, z: number) => {
    const m = Math.max(
      blob(x, z, L.x - 150, L.z + 40, 170, 48, 0.2, 0.12, 3),
      blob(x, z, L.x - 6, L.z + 2, 32, 24, -0.2, 0.2, 5),
    );
    const top = 16 + ridged(x * 0.012, z * 0.012, 3, 7) * 14 + fbm(x * 0.05, z * 0.05, 3, 8) * 3;
    return m * top - (1 - m) * 6;
  };
  add(landGrid(L.x - 340, L.x + 50, L.z - 80, L.z + 110, 100, 50, headH), hazeMaterial(0x070809, 0x121312, 0.0008, 0.35, noise), 'Menu_Far_Headland');

  // The lighthouse on the headland: a stone shaft, a gallery and a lamp room, with the keeper's roof beside it.
  const lx = L.x;
  const lz = L.z;
  const ly = MENU_SEA_LEVEL + headH(lx, lz);
  // The tower's foot and the house's walls run down into the rock, so they sit on the knob however it slopes.
  const tower = new THREE.LatheGeometry(
    [new THREE.Vector2(3.7, -2.5), new THREE.Vector2(3.6, 0), new THREE.Vector2(3.4, 1.2), new THREE.Vector2(2.9, 12), new THREE.Vector2(2.6, 16.5), new THREE.Vector2(3.3, 16.8), new THREE.Vector2(3.3, 17.3), new THREE.Vector2(2.1, 17.4), new THREE.Vector2(2.1, 19.6), new THREE.Vector2(2.6, 19.8), new THREE.Vector2(0.3, 21.4)],
    10,
  );
  const towerMesh = add(tower, hazeMaterial(0x0d0c0c, 0x1c1a18, 0.0007, 0, noise), 'Menu_Far_Lighthouse');
  towerMesh.position.set(lx, ly, lz);
  towerMesh.updateMatrix();
  const hx = lx + 9;
  const hz = lz + 4;
  const under: number[] = [];
  for (const [dx, dz] of [[0, 0], [-4.5, -3], [4.5, -3], [4.5, 3], [-4.5, 3]] as const) {
    under.push(headH(hx + dx * Math.cos(0.4) + dz * Math.sin(0.4), hz - dx * Math.sin(0.4) + dz * Math.cos(0.4)));
  }
  const floor = MENU_SEA_LEVEL + Math.max(...under);
  const footing = Math.max(...under) - Math.min(...under) + 1;
  const cottage = new THREE.BoxGeometry(9, 4.5 + footing, 6);
  cottage.translate(0, (4.5 - footing) / 2, 0);
  const cot = add(cottage, hazeMaterial(0x0c0b0a, 0x1a1816, 0.0008, 0, noise), 'Menu_Far_Keeper_House');
  cot.position.set(hx, floor, hz);
  cot.rotation.y = 0.4;
  cot.updateMatrix();
  const lampPos = new THREE.Vector3(lx, ly + 18.5, lz);
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(6.0, 3.6, 1.4), fog: false });
  const lamp = add(new THREE.SphereGeometry(1.25, 10, 8), lampMat, 'Menu_Far_Lamp');
  lamp.position.copy(lampPos);
  lamp.updateMatrix();

  // The beam: two long additive cones that turn slowly, fading with distance from the lamp (see settlement.ts; the
  // far-end term is clamped so it never goes negative, which once drew a ring).
  const beam = new THREE.Group();
  beam.position.copy(lampPos);
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(1.0, 0.82, 0.55) }, uAlpha: { value: 0.045 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying float vT;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        vT = clamp(position.x / 260.0, 0.0, 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uAlpha;
      varying vec3 vN; varying vec3 vV; varying float vT;
      void main() {
        float c = pow(abs(dot(normalize(vN), normalize(vV))), 2.0);
        float a = uAlpha * c * pow(max(1.0 - vT, 0.0), 1.6) * smoothstep(0.0, 0.02, vT);
        gl_FragColor = vec4(uColor * a, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  disposables.push(beamMat);
  for (const [rot, s] of [[0, 1], [Math.PI, 0.7]] as const) {
    const g = new THREE.CylinderGeometry(14, 0.8, 260, 18, 1, true);
    g.rotateZ(-Math.PI / 2);
    g.translate(130, 0, 0);
    disposables.push(g);
    const m = new THREE.Mesh(g, beamMat);
    m.rotation.y = rot;
    m.scale.setScalar(s);
    m.frustumCulled = false;
    m.renderOrder = 5;
    beam.add(m);
  }
  beam.rotation.y = 1.9;
  group.add(beam);

  // Wooded hills on the left, stepping back in three layers of haze.
  const hill = (seed: number, cx: number, cz: number, rx: number, rz: number, rot: number, hgt: number) => (x: number, z: number) => {
    const m = blob(x, z, cx, cz, rx, rz, rot, 0.35, seed);
    return m * (hgt * (0.6 + 0.4 * ridged(x * 0.008 + seed, z * 0.008, 3, seed)) + 4 * fbm(x * 0.06, z * 0.06, 2, seed + 1)) - (1 - m) * 6;
  };
  // Each grid reaches past its hill's wobbling outline on every side, so no hill ends in a sheer cut where its grid stops.
  add(landGrid(-390, -30, -340, -110, 76, 48, hill(21, -210, -225, 150, 80, 0.2, 55)), hazeMaterial(0x0e1411, 0x1e2620, 0.0026, 1, noise), 'Menu_Far_Wood_Hill_Near');
  add(landGrid(-660, -130, -620, -320, 72, 42, hill(22, -400, -470, 230, 110, 0.1, 80)), hazeMaterial(0x121815, 0x222a24, 0.0021, 1, noise), 'Menu_Far_Wood_Hill_Mid');
  // The far coast across the bay: a thin band on the horizon, nearly swallowed by the haze. Both ends sink into the sea
  // before the grid stops, so the band ends in low points rather than sheer cuts.
  add(landGrid(-1600, 200, -2300, -1500, 70, 20, (x, z) => {
    const m = smoothstep(-1740, -1880, z + fbm(x * 0.004, 0, 2, 31) * 120) * smoothstep(200, 30, x) * smoothstep(-1600, -1430, x);
    return m * (22 + 30 * ridged(x * 0.003, z * 0.003, 3, 32)) - (1 - m) * 5;
  }), hazeMaterial(0x1a1b1c, 0x2a2a28, 0.0012, 0.5, noise), 'Menu_Far_Coast');

  let angle = 1.9;
  let last = 0;
  return {
    group,
    beam,
    lampPos,
    update(time: number) {
      const dt = Math.max(0, Math.min(0.1, time - last));
      last = time;
      angle += dt * 0.55;
      beam.rotation.y = angle;
    },
    dispose() {
      for (const d of disposables) d.dispose();
      lampMat.dispose();
    },
  };
}
