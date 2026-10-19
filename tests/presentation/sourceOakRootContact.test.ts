import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import * as C from '../../src/presentation/canopy';
import { createMeshyForest } from '../../src/presentation/meshyTrees';
import { meshyTreeTemplate } from './meshyTreeFixture';

function rootGaps(wood: THREE.BufferGeometry, twigs: readonly C.CanopyTwig[]) {
  const ringVertices=wood.hasAttribute('uv')||wood.hasAttribute('tangent')?4:3;
  const vertices=twigs.reduce((sum,t)=>sum+(t.from.distanceTo(t.to)>1e-3?(C.twigTriangles([t])/6+1)*ringVertices:0),0);
  let vertex=wood.getAttribute('position').count-vertices, index=wood.index!.count-twigs.reduce((sum,t)=>sum+(t.from.distanceTo(t.to)>1e-3?C.twigTriangles([t])*3:0),0);
  const geometry=new THREE.BufferGeometry().setAttribute('position',wood.getAttribute('position')), hit=new THREE.Vector3(), rows:number[]=[];
  try {
    for(const twig of twigs) {
      if(!(twig.from.distanceTo(twig.to)>1e-3))continue;
      const count=C.twigTriangles([twig])*3,centre=new THREE.Vector3();
      for(let i=0;i<3;i++)centre.add(new THREE.Vector3().fromBufferAttribute(wood.getAttribute('position'),vertex+i));
      centre.divideScalar(3);
      geometry.setIndex([...wood.index!.array.slice(0,index),...wood.index!.array.slice(index+count)]);
      rows.push(C.woodAnchor(geometry)(centre,hit));
      vertex+=(count/18+1)*ringVertices;index+=count;
    }
    expect(index).toBe(wood.index!.count);expect(vertex).toBe(wood.getAttribute('position').count);
    return rows;
  } finally {geometry.dispose();}
}

function crossedRoots(g: THREE.BufferGeometry, plans: readonly C.CanopyTwig[], ids: number[]) {
 const rv=g.hasAttribute('uv')||g.hasAttribute('tangent')?4:3;
 let vertex=g.getAttribute('position').count-plans.reduce((n,t)=>n+(C.twigTriangles([t])/6+1)*rv,0);
 let prefix=g.index!.count-plans.reduce((n,t)=>n+C.twigTriangles([t])*3,0),crossed=0;
 const p=g.getAttribute('position'),ray=new THREE.Ray(),tri=new THREE.Triangle(),hit=new THREE.Vector3();
 for(let i=0;i<plans.length;i++){
  const count=C.twigTriangles([plans[i]!])*3;
  if(ids.includes(i)){
   const root=new THREE.Vector3(),next=new THREE.Vector3();
   for(let k=0;k<3;k++){root.add(new THREE.Vector3().fromBufferAttribute(p,vertex+k));next.add(new THREE.Vector3().fromBufferAttribute(p,vertex+rv+k));}
   root.divideScalar(3);next.divideScalar(3);const length=root.distanceTo(next);ray.set(root,next.sub(root).normalize());
   for(let k=0;k<prefix;k+=3){tri.a.fromBufferAttribute(p,g.index!.getX(k));tri.b.fromBufferAttribute(p,g.index!.getX(k+1));tri.c.fromBufferAttribute(p,g.index!.getX(k+2));
    if(ray.intersectTriangle(tri.a,tri.b,tri.c,false,hit)&&root.distanceTo(hit)<=length+1e-5){crossed++;break;}}
  }
  vertex+=(count/18+1)*rv;prefix+=count;
 }
 return crossed;
}

it('reconnects retained source oak roots after seating without moving leaves or changing triangle topology',async()=>{
 const ids=['tree-1505'],templates=new Map();
 for(const id of ids)templates.set(id,await Promise.all(['near','mid','far'].map(l=>meshyTreeTemplate(id+'-'+l+'.glb'))));
 const real=C.reconnectGrownTwigRoots;let enabled=false;
 const spy=vi.spyOn(C,'reconnectGrownTwigRoots').mockImplementation((wood,twigs)=>enabled?real(wood,twigs):wood);
 const a=createMeshyForest(templates),b=createMeshyForest(templates);
 try {
  const before=ids.map(id=>a.variant('oak',0,id));enabled=true;
  const after=ids.map(id=>b.variant('oak',0,id));let flagsBefore=0,flagsAfter=0;
  for(let i=0;i<ids.length;i++)for(let lod=0;lod<3;lod++){
   const x=before[i]!.lods[lod]!,y=after[i]!.lods[lod]!;
   expect(y.tris).toBe(x.tris);expect(y.wood!.index!.array).toEqual(x.wood!.index!.array);
   expect(y.wood!.userData.twigIndex).toBe(x.wood!.userData.twigIndex);
   expect(y.leaf!.index?.array).toEqual(x.leaf!.index?.array);
   for(const name of Object.keys(x.leaf!.attributes))expect(y.leaf!.getAttribute(name).array).toEqual(x.leaf!.getAttribute(name).array);
   const plans=x.leaf!.userData.canopy?.twigs as C.CanopyTwig[]|undefined;
   if(!plans?.length)continue;
   const old=rootGaps(x.wood!,plans),fixed=rootGaps(y.wood!,plans);
   const rv=x.wood!.hasAttribute('uv')||x.wood!.hasAttribute('tangent')?4:3;
   let cursor=x.wood!.getAttribute('position').count-plans.reduce((n,t)=>n+(C.twigTriangles([t])/6+1)*rv,0);
   for(const name of Object.keys(x.wood!.attributes)){
    const original=x.wood!.getAttribute(name),candidate=y.wood!.getAttribute(name);
    expect(candidate.array.slice(0,cursor*original.itemSize)).toEqual(original.array.slice(0,cursor*original.itemSize));
    if(!['position','normal','uv','tangent'].includes(name))expect(candidate.array).toEqual(original.array);
   }
   for(const plan of plans){const rings=C.twigTriangles([plan])/6+1,tip=cursor+(rings-1)*rv;
    const centre=(g:THREE.BufferGeometry)=>{const v=new THREE.Vector3();for(let k=0;k<3;k++)v.add(new THREE.Vector3().fromBufferAttribute(g.getAttribute('position'),tip+k));return v.divideScalar(3);};
    expect(centre(y.wood!).distanceTo(centre(x.wood!))).toBeLessThan(1e-6);cursor+=rings*rv;
   }
   flagsBefore+=old.filter(d=>d>.12).length;flagsAfter+=fixed.filter(d=>d>.12).length;
   expect(Math.max(...fixed)).toBeLessThan(.12);
   const ids=old.flatMap((d,i)=>d>.12?[i]:[]);
   expect(crossedRoots(x.wood!,plans,ids)).toBe(0);
   expect(crossedRoots(y.wood!,plans,ids)).toBe(ids.length);
  }
  expect(flagsBefore).toBe(3);expect(flagsAfter).toBe(0);
 }finally{spy.mockRestore();a.dispose();b.dispose();}
},180000);
