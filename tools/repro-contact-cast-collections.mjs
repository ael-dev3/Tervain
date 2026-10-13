import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import R from '@dimforge/rapier3d-compat';
import { createServer, transformWithOxc } from 'vite';

const ref = '9ab40b387', output = process.argv[2] ?? 'contact-cast-collections.json';
const source = execFileSync('git', ['show', `${ref}:src/world/physics.ts`], { encoding: 'utf8' });
const expression = '[...this.props, ...(includeRocks ? this.rocks : [])]';
assert.equal(source.split(expression).length, 2);
const instrumented = source.replace(expression, `(this.reproCollections = (this.reproCollections ?? 0) + 1, ${expression})`);
const baseline = (await transformWithOxc(instrumented, 'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,
  (_, q, p) => `from '${path.posix.resolve('/src/world', p)}'`);
const server = await createServer({ configFile: false, logLevel: 'error', plugins: [{
  name: 'baseline', resolveId(id) { if (id === '/@baseline') return '\0baseline'; },
  load(id) { if (id === '\0baseline') return baseline; },
}], server: { middlewareMode: true, hmr: false, ws: false } });
let world;
try {
  const { RealmPhysics, initializePhysics } = await server.ssrLoadModule('/src/world/physics.ts');
  const { RealmPhysics: Old } = await server.ssrLoadModule('/@baseline');
  const { Colliders } = await server.ssrLoadModule('/src/world/colliders.ts');
  const { Terrain } = await server.ssrLoadModule('/src/world/terrain.ts');
  await initializePhysics();
  const terrain = new Terrain(), colliders = new Colliders();
  // Native finite rock geometry exercises both collection paths and prop/rock hit ordering.
  const y = terrain.heightAt(0, 0) + .8;
  colliders.rockMeshes.push({ id: 'repro-rock', positions: new Float32Array([-2,y,-2, 2,y,-2, -2,y,2, 2,y,2]),
    indices: new Uint32Array([0,2,1,1,2,3]), bounds: { minX:-2,maxX:2,minY:y,maxY:y,minZ:-2,maxZ:2 } });
  world = new RealmPhysics(terrain, colliders);
  const before = Old.prototype.castContacts, after = RealmPhysics.prototype.castContacts;
  const queries = [], ball = new R.Ball(.35), capsule = new R.Capsule(.625,.35);
  for (let z=-30; z<=65; z+=5) for (let x=-45; x<=35; x+=5) {
    const y=terrain.heightAt(x,z);
    queries.push([ball,{x,y:y+1.15,z},{x:0,y:-1,z:0},120]);
    queries.push([capsule,{x,y:y+.975,z},{x:.5,y:0,z:.2},1]);
  }
  for (const prop of world.props) {
    const p=prop.collider.translation();
    queries.push([ball,{x:p.x,y:p.y+2,z:p.z},{x:0,y:-1,z:0},4]);
  }
  queries.push([ball,{x:0,y:y+2,z:0},{x:0,y:-1,z:0},4]);
  const snapshot = world.snapshot();
  let exactCasts=0;
  for (const c of [...world.props,...world.rocks]) {
    const cast=c.collider.castShape.bind(c.collider);
    c.collider.castShape=(...args)=>{exactCasts++;return cast(...args);};
  }
  const simplify = hit => hit ? { handle:hit.contact.collider.handle,toi:hit.hit.time_of_impact,
    normal:hit.normal,witness:hit.witness } : null;
  let comparisons=0,hits=0,beforeCasts=0,afterCasts=0;
  const compare = (q,includeRocks,accept) => {
    exactCasts=0;const a=simplify(before.call(world,...q,accept,includeRocks));beforeCasts+=exactCasts;
    exactCasts=0;const b=simplify(after.call(world,...q,accept,includeRocks));afterCasts+=exactCasts;
    assert.deepEqual(b,a);comparisons++;hits+=Number(!!a);return a;
  };
  for (const includeRocks of [false,true]) for (const q of queries) compare(q,includeRocks);
  assert.ok(compare(queries.at(-1),true));assert.equal(compare(queries.at(-1),false),null);
  for (const prop of world.props) prop.collider.setEnabled(false);
  compare(queries.at(-1),true);compare(queries.at(-1),false);
  for (const prop of world.props) prop.collider.setEnabled(true);
  for (const accept of [normal=>normal.y>.45,normal=>normal.y<-.45,()=>false])
    for (const q of queries.slice(-10)) compare(q,true,accept);
  const changed=world.snapshot();changed[0].position={x:0,y:y+.5,z:0};world.restore(changed);
  compare(queries.at(-1),true);compare(queries.at(-1),false);
  world.restore(snapshot);
  assert.equal(beforeCasts,afterCasts);assert.equal(world.reproCollections,comparisons);
  // The candidate executes no collection expression; no global Array monkey patch is needed.
  assert.ok(!after.toString().includes('...this.props'));
  const report={baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/world/physics.ts')).digest('hex'),
    scope:'Actual Rapier contact queries. Counts cover combined contact-array materializations, not total allocations, heap bytes or hardware frame timing.',
    props:world.props.length,rocks:world.rocks.length,comparisons,hits,beforeCasts,afterCasts,
    beforeCombinedCollections:world.reproCollections,afterCombinedCollections:0,
    controls:['props-only','props-and-rocks','disabled-props','normal-filters','rejected-hits','restored-prop-before-step'],
    exactHitsNormalsWitnesses:true,pass:true};
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} finally { world?.dispose();await server.close(); }
