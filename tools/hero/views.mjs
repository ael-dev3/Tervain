#!/usr/bin/env node
/**
 * Front, side and back renders of the wanderer in his bind pose on a white ground, as Meshy multi-image references:
 * node tools/hero/views.mjs [out-dir]   (default shots/hero-views; the served game at TERVAIN_URL, default :5173)
 */
import fs from 'node:fs';
import path from 'node:path';
import { openPage } from '../cdp.mjs';

const out = process.argv[2] ?? 'shots/hero-views';
const base = process.env.TERVAIN_URL ?? 'http://127.0.0.1:5173/';
fs.mkdirSync(out, { recursive: true });
const page = await openPage(`${base}?shot=1&place=rillford&hour=11&quality=high&settle=2`, { w: 1024, h: 1024 });
try {
  for (let i = 0; i < 600; i++) { if (await page.eval('return document.title').catch(() => '') === 'READY') break; await page.wait(1000); }
  const info = await page.eval(`const T = window.tervain; T.frame = () => {}; T.openPause = () => {};
    const THREE = await import('/node_modules/.vite/deps/three.js');
    const { clone } = await import('/node_modules/.vite/deps/three_examples_jsm_utils_SkeletonUtils__js.js').catch(() => ({}));
    const src = T.player.rig.root, fig = clone ? clone(src) : src.clone(true);
    fig.position.set(0, 0, 0); fig.rotation.set(0, 0, 0);
    let bones = 0; fig.traverse((o) => { if (o.isSkinnedMesh) { o.skeleton.pose(); bones = o.skeleton.bones.length; } });
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xffffff);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(2, 4, 3); scene.add(sun);
    scene.add(fig); fig.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(fig), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
    const half = Math.max(size.x, size.y, size.z) * 0.56, cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 50);
    const r = T.renderer, views = {};
    const oldSize = r.getSize(new THREE.Vector2()), oldRatio = r.getPixelRatio(), oldTone = r.toneMapping;
    r.setPixelRatio(1); r.setSize(1024, 1024, false); r.toneMapping = THREE.NoToneMapping;
    for (const [name, angle] of [['front', 0], ['side', Math.PI / 2], ['back', Math.PI]]) {
      cam.position.set(mid.x + Math.sin(angle) * 10, mid.y, mid.z + Math.cos(angle) * 10); cam.lookAt(mid);
      r.setRenderTarget(null); r.render(scene, cam); views[name] = r.domElement.toDataURL('image/png');
    }
    r.setPixelRatio(oldRatio); r.setSize(oldSize.x, oldSize.y, false); r.toneMapping = oldTone;
    window.__views = views;
    return JSON.stringify({ bones, size: size.toArray().map((v) => v.toFixed(3)) });`);
  console.log(info);
  for (const name of ['front', 'side', 'back']) {
    const data = await page.eval(`return window.__views['${name}']`);
    fs.writeFileSync(path.join(out, `${name}.png`), Buffer.from(data.split(',')[1], 'base64'));
  }
} finally { await page.close(); }
