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
function components(g: THREE.BufferGeometry, charge: (units?: number) => void): Component[] {
  const p=g.getAttribute('position');if(!p||p.count===0)throw new Error('Missing leaf positions');charge(p.count);const graph=union(p.count),weld=new Map<string,number>();
  for(let i=0;i<p.count;i++){if(![p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite))throw new Error('Nonfinite leaf positions');const key=`${Math.round(p.getX(i)*1e4)},${Math.round(p.getY(i)*1e4)},${Math.round(p.getZ(i)*1e4)}`,other=weld.get(key);if(other!==undefined)graph.join(i,other);else weld.set(key,i);}
  const index=g.index,used=new Set<number>();for(let i=0;i+2<(index?.count??p.count);i+=3){charge();const a=index?.getX(i)??i,b=index?.getX(i+1)??i+1,c=index?.getX(i+2)??i+2;graph.join(a,b);graph.join(a,c);used.add(a);used.add(b);used.add(c);}
  const groups=new Map<number,number[]>();for(const i of used){charge();const key=graph.find(i),group=groups.get(key)??[];group.push(i);groups.set(key,group);}
  return [...groups.values()].map(vertices=>{const box=new THREE.Box3();for(const i of vertices){charge();box.expandByPoint(new THREE.Vector3().fromBufferAttribute(p,i));}const samples=[box.getCenter(new THREE.Vector3())];for(let i=0;i<Math.min(8,vertices.length);i++)samples.push(new THREE.Vector3().fromBufferAttribute(p,vertices[Math.floor(i*vertices.length/Math.min(8,vertices.length))]!));return{box,samples};});
}
interface LeafNode { box: THREE.Box3; ids?: number[]; left?: LeafNode; right?: LeafNode; uniform: number }
function boundsTree(boxes: readonly THREE.Box3[], charge: () => void): LeafNode {
  const build=(ids:number[]):LeafNode=>{charge();const box=new THREE.Box3();for(const i of ids)box.union(boxes[i]!);if(ids.length<=8)return{box,ids,uniform:-1};
    const size=box.getSize(new THREE.Vector3()),axis=size.x>=size.y&&size.x>=size.z?'x':size.y>=size.z?'y':'z';
    ids.sort((a,b)=>(boxes[a]!.min[axis]+boxes[a]!.max[axis])-(boxes[b]!.min[axis]+boxes[b]!.max[axis]));
    const middle=ids.length>>1;return{box,left:build(ids.slice(0,middle)),right:build(ids.slice(middle)),uniform:-1};};
  if(!boxes.length)throw new Error('Missing support triangles');return build(boxes.map((_,i)=>i));
}

/** Boruvka's minimum spanning forest: nearest foreign component queries avoid dense all-pairs graphs. */
function spanningLeafEdges(parts: Component[], limit: number, charge: () => void): [number,number,number][] {
  if (!parts.length) return [];
  const root=boundsTree(parts.map(p=>p.box),charge),graph=union(parts.length),edges:[number,number,number][]=[];
  const mark=(node:LeafNode):number=>{charge();if(node.ids){const first=graph.find(node.ids[0]!);return node.uniform=node.ids.every(i=>graph.find(i)===first)?first:-1;}const a=mark(node.left!),b=mark(node.right!);return node.uniform=a===b?a:-1;};
  for(;;){mark(root);const best=new Map<number,[number,number,number]>();
    for(let i=0;i<parts.length;i++){const group=graph.find(i);if(best.get(group)?.[2]===0)continue;const box=parts[i]!.box;let distance=best.get(group)?.[2]??limit,other=-1;
      const visit=(node:LeafNode)=>{charge();if(node.uniform===group||boxGap(box,node.box)>distance)return;
        if(node.ids){for(const j of node.ids){if(graph.find(j)===group)continue;charge();const d=boxGap(box,parts[j]!.box);if(d<=distance){distance=d;other=j;if(d===0)return;}}return;}
        const left=node.left!,right=node.right!,first=boxGap(box,left.box)<=boxGap(box,right.box)?left:right,second=first===left?right:left;
        visit(first);if(distance!==0)visit(second);
      };visit(root);if(other>=0)best.set(group,[i,other,distance]);
    }
    let changed=false;for(const[a,b,d]of best.values())if(graph.find(a)!==graph.find(b)){graph.join(a,b);edges.push([a,b,d]);changed=true;}
    if(!changed)break;
  }
  return edges;
}

/** Offline geometric candidates, not an art verdict. Full population adapters bypass render culling. */
export function auditCanopies(targets: readonly CanopyAuditTarget[], options: CanopyAuditOptions = {}) {
  const gap=options.gap??.75,maxOperations=options.maxOperations??20_000_000;
  if(!(gap>0&&Number.isFinite(gap))||!Number.isInteger(maxOperations)||maxOperations<1)throw new Error('Invalid canopy audit budget');
  let operations=0;const charge=(units=1)=>{operations+=units;if(operations>maxOperations)throw new Error('Canopy audit budget exhausted');};
  const groups=new Map<THREE.BufferGeometry,Map<THREE.BufferGeometry,{maxGap:number;minGap:number;components:Component[];contacts:number[];edges:[number,number,number][]}>>();
  const scale=(m:THREE.Matrix4)=>{const a=new THREE.Vector3().setFromMatrixColumn(m,0).length(),b=new THREE.Vector3().setFromMatrixColumn(m,1).length(),c=new THREE.Vector3().setFromMatrixColumn(m,2).length();if(!m.elements.every(Number.isFinite)||!(a>0)||Math.max(a,b,c)-Math.min(a,b,c)>a*1e-4)throw new Error('Unsupported nonuniform canopy transform');return a;};
  for(const t of targets){if(!t.leaves)continue;let leaves=groups.get(t.wood);if(!leaves){leaves=new Map();groups.set(t.wood,leaves);}let entry=leaves.get(t.leaves);if(!entry){entry={maxGap:0,minGap:Infinity,components:components(t.leaves,charge),contacts:[],edges:[]};leaves.set(t.leaves,entry);}const localGap=gap/scale(t.matrix);entry.maxGap=Math.max(entry.maxGap,localGap);entry.minGap=Math.min(entry.minGap,localGap);}
  for(const[wood,leafGroups]of groups){const p=wood.getAttribute('position'),index=wood.index;if(!p)throw new Error('Missing wood positions');
    const triangles:THREE.Triangle[]=[];for(let i=0;i+2<(index?.count??p.count);i+=3){charge();triangles.push(new THREE.Triangle(...[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,index?.getX(i+j)??i+j)) as [THREE.Vector3,THREE.Vector3,THREE.Vector3]));}
    const woodBounds=triangles.map(t=>new THREE.Box3().setFromPoints([t.a,t.b,t.c])),support=boundsTree(woodBounds,charge),nearest=new THREE.Vector3();
    for(const entry of leafGroups.values()){
      entry.contacts=entry.components.map(c=>{let distance=entry.maxGap,found=false;
        for(const sample of c.samples){
          const visit=(node:LeafNode)=>{charge();if(node.box.distanceToPoint(sample)>distance)return;
            if(node.ids){for(const i of node.ids){charge();triangles[i]!.closestPointToPoint(sample,nearest);const d=nearest.distanceTo(sample);if(d<=distance){distance=d;found=true;}if(found&&distance<=entry.minGap)return;}return;}
            const left=node.left!,right=node.right!,first=left.box.distanceToPoint(sample)<=right.box.distanceToPoint(sample)?left:right,second=first===left?right:left;
            visit(first);if(!found||distance>entry.minGap)visit(second);
          };visit(support);if(found&&distance<=entry.minGap)break;
        }return found?distance:Infinity;});
      entry.edges = spanningLeafEdges(entry.components, entry.maxGap, charge);
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
