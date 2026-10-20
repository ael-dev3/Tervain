import * as THREE from 'three';
import {afterAll,beforeAll,expect,it,vi} from 'vitest';
import {buildFlora} from '../../src/presentation/flora';
import {smoothDistanceFade} from '../../src/presentation/distanceVisibility';
import {Terrain} from '../../src/world/terrain';
import {Colliders} from '../../src/world/colliders';
import {Exclusions} from '../../src/presentation/vegetation';
import {AssetLibrary} from '../../src/presentation/assets/library';
import {defaultSettings} from '../../src/platform/settings';
import {pineTemplates} from './pineFixture';
import {worldView} from '../../src/game/worldView';
import {createInitialState} from '../../src/game/state';
import type {FrameContext} from '../../src/presentation/context';
vi.mock('../../src/presentation/forestFloor',()=>({buildForestFloor:()=>({group:new THREE.Group(),update(){},dispose(){}})}));
vi.mock('../../src/presentation/treeMaterials',()=>({woodMaterial:()=>new THREE.MeshStandardMaterial(),leafMaterial:()=>new THREE.MeshStandardMaterial(),installBarkDetail(){},disposeTreeMaterials(){}}));
vi.mock('../../src/presentation/treeTextures',()=>({barkTextures:()=>({map:new THREE.DataTexture(),surface:new THREE.DataTexture()}),disposeTreeTextures(){}}));
vi.mock('../../src/presentation/distanceVisibility',async original=>{const actual=await original<typeof import('../../src/presentation/distanceVisibility')>();return{...actual,smoothDistanceFade:vi.fn(actual.smoothDistanceFade)};});
// The forest tests both bounds in one plane walk (treeBounds.test.ts proves it equals sphere && box); route it through the
// Frustum methods so the view and shadow rejections below can be stubbed.
vi.mock('../../src/presentation/foliage/treeBounds',()=>({intersectsTreeBounds:(f:THREE.Frustum,s:THREE.Sphere,b:THREE.Box3)=>f.intersectsSphere(s)&&f.intersectsBox(b)}));
let forest:ReturnType<typeof buildFlora>;
const camera=new THREE.PerspectiveCamera(60,16/9,.1,1200);
beforeAll(async()=>{const terrain=new Terrain();forest=buildFlora({terrain,excl:new Exclusions(terrain),colliders:new Colliders(),quality:'high',settings:defaultSettings(),library:AssetLibrary.empty(),sway:{uTime:{value:0},uWind:{value:0}}},await pineTemplates());});
afterAll(()=>forest.dispose?.());
const frame=(shadowFrustum?:THREE.Frustum):FrameContext=>({camera,quality:'high',reducedMotion:true,shadowsForViewOnly:false,shadowFrustum,time:0,focus:new THREE.Vector3(),nightness:0,sunDir:new THREE.Vector3(0,1,0),hour:12,view:worldView(createInitialState())});
const fades=()=>vi.mocked(smoothDistanceFade).mock.calls.filter(([,start,end])=>start===900&&end===1020).length;
const meshes=()=>{const out:THREE.InstancedMesh[]=[];forest.group.traverse(m=>{if(m instanceof THREE.InstancedMesh&&m.geometry.hasAttribute('aDistanceCoverage'))out.push(m);});return out;};
it('does not evaluate horizon fades for trees rejected by both view and shadow bounds',()=>{
 const reject=vi.spyOn(THREE.Frustum.prototype,'intersectsSphere').mockReturnValue(false);
 try{vi.mocked(smoothDistanceFade).mockClear();camera.position.set(-210,4,0);camera.lookAt(-200,5,10);camera.updateMatrixWorld(true);forest.update(0,frame());expect(meshes().length).toBeGreaterThan(0);expect(meshes().every(m=>m.count===0)).toBe(true);expect(fades()).toBe(0);}finally{reject.mockRestore();}
});
it('still evaluates distance coverage and packs trees kept only for shadows',()=>{
 const shadow=new THREE.Frustum();for(const p of shadow.planes){p.normal.set(0,1,0);p.constant=1e6;}
 const reject=vi.spyOn(THREE.Frustum.prototype,'intersectsSphere').mockImplementation(function(this:THREE.Frustum){return this===shadow||this.planes.every(p=>p.constant===1e6);});
 try{vi.mocked(smoothDistanceFade).mockClear();camera.position.x+=1;camera.updateMatrixWorld(true);forest.update(0,frame(shadow));expect(fades()).toBeGreaterThan(0);expect(meshes().some(m=>m.castShadow&&m.count>0)).toBe(true);}finally{reject.mockRestore();}
});
it('keeps horizon rejection even when the view and sun bounds admit a distant tree',()=>{
 const keep=vi.spyOn(THREE.Frustum.prototype,'intersectsSphere').mockReturnValue(true);
 const boxes=vi.spyOn(THREE.Frustum.prototype,'intersectsBox').mockReturnValue(true);
 try{vi.mocked(smoothDistanceFade).mockClear();camera.position.set(1e6,4,1e6);camera.updateMatrixWorld(true);forest.update(0,frame());expect(fades()).toBeGreaterThan(0);expect(meshes().every(m=>m.count===0)).toBe(true);}finally{keep.mockRestore();boxes.mockRestore();}
});
