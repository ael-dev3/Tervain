import * as THREE from 'three';

export interface CanopyAuditTarget { label: string; wood: THREE.BufferGeometry; leaves: THREE.BufferGeometry | null; matrix: THREE.Matrix4 }
export interface CanopyAuditOptions { gap?: number; maxOperations?: number }
interface Component { box: THREE.Box3; samples: THREE.Vector3[] }
const boxGap = (a: THREE.Box3, b: THREE.Box3) => Math.hypot(
  Math.max(0,a.min.x-b.max.x,b.min.x-a.max.x),Math.max(0,a.min.y-b.max.y,b.min.y-a.max.y),Math.max(0,a.min.z-b.max.z,b.min.z-a.max.z));
function union(size: number) {
  const parent=Int32Array.from({length:size},(_,i)=>i);
  const find=(i:number):number=>{while(parent[i]!==i){parent[i]=parent[parent[i]!]!;i=parent[i]!;}return i;};
  return {find,join:(a:number,b:number)=>{parent[find(a)]=find(b);}};
}
function components(g: THREE.BufferGeometry): Component[] {
  const p=g.getAttribute('position');if(!p||p.count===0)throw new Error('Missing leaf positions');const graph=union(p.count),weld=new Map<string,number>();
  for(let i=0;i<p.count;i++){if(![p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite))throw new Error('Nonfinite leaf positions');const key=`${Math.round(p.getX(i)*1e4)},${Math.round(p.getY(i)*1e4)},${Math.round(p.getZ(i)*1e4)}`,other=weld.get(key);if(other!==undefined)graph.join(i,other);else weld.set(key,i);}
  const index=g.index;for(let i=0;i+2<(index?.count??p.count);i+=3){const a=index?.getX(i)??i;graph.join(a,index?.getX(i+1)??i+1);graph.join(a,index?.getX(i+2)??i+2);}
  const groups=new Map<number,number[]>();for(const i of weld.values()){const key=graph.find(i),group=groups.get(key)??[];group.push(i);groups.set(key,group);}
  return [...groups.values()].map(vertices=>{const box=new THREE.Box3();for(const i of vertices)box.expandByPoint(new THREE.Vector3().fromBufferAttribute(p,i));const samples=[box.getCenter(new THREE.Vector3())];for(let i=0;i<Math.min(8,vertices.length);i++)samples.push(new THREE.Vector3().fromBufferAttribute(p,vertices[Math.floor(i*vertices.length/Math.min(8,vertices.length))]!));return{box,samples};});
}
/** Offline geometric candidates, not an art verdict. Full population adapters bypass render culling. */
export function auditCanopies(targets: readonly CanopyAuditTarget[], options: CanopyAuditOptions = {}) {
  const gap=options.gap??.75,maxOperations=options.maxOperations??20_000_000;
  if(!(gap>0&&Number.isFinite(gap))||!Number.isInteger(maxOperations)||maxOperations<1)throw new Error('Invalid canopy audit budget');
  let operations=0;const charge=()=>{if(++operations>maxOperations)throw new Error('Canopy audit budget exhausted');};
  const groups=new Map<THREE.BufferGeometry,Map<THREE.BufferGeometry,{maxGap:number;components:Component[];contacts:number[];edges:[number,number,number][]}>>();
  const scale=(m:THREE.Matrix4)=>{const a=new THREE.Vector3().setFromMatrixColumn(m,0).length(),b=new THREE.Vector3().setFromMatrixColumn(m,1).length(),c=new THREE.Vector3().setFromMatrixColumn(m,2).length();if(!m.elements.every(Number.isFinite)||!(a>0)||Math.max(a,b,c)-Math.min(a,b,c)>a*1e-4)throw new Error('Unsupported nonuniform canopy transform');return a;};
  for(const t of targets){if(!t.leaves)continue;let leaves=groups.get(t.wood);if(!leaves){leaves=new Map();groups.set(t.wood,leaves);}let entry=leaves.get(t.leaves);if(!entry){entry={maxGap:0,components:components(t.leaves),contacts:[],edges:[]};leaves.set(t.leaves,entry);}entry.maxGap=Math.max(entry.maxGap,gap/scale(t.matrix));}
  for(const[wood,leafGroups]of groups){const p=wood.getAttribute('position'),index=wood.index;if(!p)throw new Error('Missing wood positions');
    const triangles:THREE.Triangle[]=[];for(let i=0;i+2<(index?.count??p.count);i+=3)triangles.push(new THREE.Triangle(...[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,index?.getX(i+j)??i+j)) as [THREE.Vector3,THREE.Vector3,THREE.Vector3]));
    for(const entry of leafGroups.values()){
      const cell=Math.max(.5,entry.maxGap),cells=new Map<string,number[]>(),wide:number[]=[];
      const range=(box:THREE.Box3)=>[Math.floor(box.min.x/cell),Math.floor(box.max.x/cell),Math.floor(box.min.y/cell),Math.floor(box.max.y/cell),Math.floor(box.min.z/cell),Math.floor(box.max.z/cell)];
      for(let i=0;i<triangles.length;i++){const tri=triangles[i]!,r=range(new THREE.Box3().setFromPoints([tri.a,tri.b,tri.c]).expandByScalar(entry.maxGap));if((r[1]!-r[0]!+1)*(r[3]!-r[2]!+1)*(r[5]!-r[4]!+1)>512){wide.push(i);continue;}for(let x=r[0]!;x<=r[1]!;x++)for(let y=r[2]!;y<=r[3]!;y++)for(let z=r[4]!;z<=r[5]!;z++){charge();const key=`${x},${y},${z}`,list=cells.get(key)??[];list.push(i);cells.set(key,list);}}
      const nearest=new THREE.Vector3();entry.contacts=entry.components.map(c=>{let distance=Infinity;for(const sample of c.samples){const list=cells.get(`${Math.floor(sample.x/cell)},${Math.floor(sample.y/cell)},${Math.floor(sample.z/cell)}`)??[];for(const i of [...list,...wide]){charge();triangles[i]!.closestPointToPoint(sample,nearest);distance=Math.min(distance,nearest.distanceTo(sample));}}return distance;});
      // Query only neighboring leaf bounds. A minimum spanning forest preserves connectivity
      // at every instance's distance threshold while avoiding dense repeated edges per tree.
      const leafCells=new Map<string,number[]>(),large:number[]=[],pairs:[number,number,number][]=[];
      const keys=(r:number[],visit:(key:string)=>void)=>{for(let x=r[0]!;x<=r[1]!;x++)for(let y=r[2]!;y<=r[3]!;y++)for(let z=r[4]!;z<=r[5]!;z++){charge();visit(`${x},${y},${z}`);}};
      const huge=(r:number[])=>(r[1]!-r[0]!+1)*(r[3]!-r[2]!+1)*(r[5]!-r[4]!+1)>512;
      for(let i=0;i<entry.components.length;i++){
        const box=entry.components[i]!.box,search=range(box.clone().expandByScalar(entry.maxGap)),near=new Set<number>(large);
        if(huge(search)){for(let j=0;j<i;j++)near.add(j);}else keys(search,key=>{for(const j of leafCells.get(key)??[])near.add(j);});
        for(const j of near){charge();const distance=boxGap(box,entry.components[j]!.box);if(distance<=entry.maxGap)pairs.push([i,j,distance]);}
        const own=range(box);if(huge(own))large.push(i);else keys(own,key=>{const list=leafCells.get(key)??[];list.push(i);leafCells.set(key,list);});
      }
      pairs.sort((a,b)=>a[2]-b[2]);const spanning=union(entry.components.length);
      for(const[a,b,d]of pairs){charge();if(spanning.find(a)!==spanning.find(b)){spanning.join(a,b);entry.edges.push([a,b,d]);}}
    }
  }
  const trees=targets.map(t=>{if(!t.leaves)return{label:t.label,leafless:true,components:0,chunks:0,candidates:[] as {position:number[];components:number;sampledWoodGap:number|null}[]};const entry=groups.get(t.wood)!.get(t.leaves)!,s=scale(t.matrix),limit=gap/s,graph=union(entry.components.length);
    for(const[a,b,d]of entry.edges){charge();if(d<=limit)graph.join(a,b);}const chunks=new Map<number,{box:THREE.Box3;count:number;contact:number}>();
    for(let i=0;i<entry.components.length;i++){const key=graph.find(i),chunk=chunks.get(key)??{box:new THREE.Box3(),count:0,contact:Infinity};chunk.box.union(entry.components[i]!.box);chunk.count++;chunk.contact=Math.min(chunk.contact,entry.contacts[i]!);chunks.set(key,chunk);}
    const candidates=[...chunks.values()].filter(c=>c.contact>limit).map(c=>({position:c.box.getCenter(new THREE.Vector3()).applyMatrix4(t.matrix).toArray(),components:c.count,sampledWoodGap:Number.isFinite(c.contact)?c.contact*s:null}));
    return{label:t.label,leafless:false,components:entry.components.length,chunks:chunks.size,candidates};});
  return{schema:1,gap,operations,complete:true,summary:{trees:trees.length,leafless:trees.filter(t=>t.leafless).length,components:trees.reduce((n,t)=>n+t.components,0),chunks:trees.reduce((n,t)=>n+t.chunks,0),candidates:trees.reduce((n,t)=>n+t.candidates.length,0)},trees,
    scope:'Registered forest near-source rest geometry. Leaf components link by bounding-box proximity, then sampled wood-triangle contacts. Alpha transparency and shader wind are not evaluated; candidates require visual review. Null sampled gap means no nearby triangle was found, not an exact distance.'};
}
