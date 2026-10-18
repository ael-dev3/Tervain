import * as THREE from 'three';
import { woodReachLocal } from '../presentation/canopy';
import { components, boundsTree, spanningLeafEdges, union, farClumps, type Component, type LeafNode } from './canopyConnectivity';

export interface CanopyAuditTarget { label: string; species?: string; /** Species/asset, for grouping. */ kind?: string; lod?: number; wood: THREE.BufferGeometry | null; leaves: THREE.BufferGeometry | null; matrix: THREE.Matrix4;
  /** Material requires alpha testing; an unavailable mask must not silently become opaque. */
  cutoutRequired?: boolean;
  /** The leaf material's alpha cutout; used only with `alpha: true`. */
  cutout?: { uv: string; cutoff: number; alpha(u: number, v: number): number } | null }
export interface CanopyAuditOptions { gap?: number; maxOperations?: number; /** Level of detail audited (0 near, 1 middle, 2 far). */ lod?: number;
  /** World distance (m) beyond which a leaf card counts as hanging clear of every branch (default 1.5). */ woodReach?: number;
  /** Alpha-aware: bound each card by its opaque texels (alpha ≥ cutoff) instead of its quad, so cards whose quads
   * touch but whose leaves do not stay apart, and fully clear cards drop out (default false). */
  alpha?: boolean }
export function auditCanopies(targets: readonly CanopyAuditTarget[], options: CanopyAuditOptions = {}) {
  const lod=options.lod??0;if(!Number.isInteger(lod)||lod<0||lod>2)throw new Error('Invalid canopy LOD');
  if(targets.some(target=>target.lod!==undefined&&target.lod!==lod))throw new Error('Canopy target LOD mismatch');
  const gap=options.gap??.75,woodReach=options.woodReach??1.5,maxOperations=options.maxOperations??20_000_000;
  if(!(woodReach>0&&Number.isFinite(woodReach))||!(gap>0&&Number.isFinite(gap))||!Number.isInteger(maxOperations)||maxOperations<1)throw new Error('Invalid canopy audit budget');
  let operations=0;const charge=()=>{if(++operations>maxOperations)throw new Error('Canopy audit budget exhausted');};
  if(options.alpha)for(const target of targets)if(target.leaves&&target.cutoutRequired&&!target.cutout)throw new Error(`Missing required leaf cutout: ${target.label}`);
  const groups=new Map<THREE.BufferGeometry,Map<THREE.BufferGeometry,{maxGap:number;minGap:number;components:Component[];contacts:number[];edges:[number,number,number][]}>>();
  const scale=(m:THREE.Matrix4)=>{const a=new THREE.Vector3().setFromMatrixColumn(m,0).length(),b=new THREE.Vector3().setFromMatrixColumn(m,1).length(),c=new THREE.Vector3().setFromMatrixColumn(m,2).length();if(!m.elements.every(Number.isFinite)||!(a>0)||Math.max(a,b,c)-Math.min(a,b,c)>a*1e-4)throw new Error('Unsupported nonuniform canopy transform');
    const e=m.elements;
    if(e[3]!==0||e[7]!==0||e[11]!==0||e[15]!==1)throw new Error('Unsupported non-affine canopy transform');
    const dot=(i:number,j:number)=>e[i]!*e[j]!+e[i+1]!*e[j+1]!+e[i+2]!*e[j+2]!;
    if(Math.max(Math.abs(dot(0,4)),Math.abs(dot(0,8)),Math.abs(dot(4,8)))>a*a*1e-4)throw new Error('Unsupported sheared canopy transform');return a;};
  for(const t of targets){if(!t.leaves||!t.wood)continue;let leaves=groups.get(t.wood);if(!leaves){leaves=new Map();groups.set(t.wood,leaves);}let entry=leaves.get(t.leaves);if(!entry){entry={maxGap:0,minGap:Infinity,components:components(t.leaves,charge,options.alpha?t.cutout??undefined:undefined),contacts:[],edges:[]};leaves.set(t.leaves,entry);}const factor=scale(t.matrix),localGap=gap/factor,localReach=woodReach/factor;entry.maxGap=Math.max(entry.maxGap,localGap,localReach);entry.minGap=Math.min(entry.minGap,localGap,localReach);}
  for(const[wood,leafGroups]of groups){const p=wood.getAttribute('position'),index=wood.index;if(!p)throw new Error('Missing wood positions');
    const triangles:THREE.Triangle[]=[];for(let i=0;i+2<(index?.count??p.count);i+=3)triangles.push(new THREE.Triangle(...[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,index?.getX(i+j)??i+j)) as [THREE.Vector3,THREE.Vector3,THREE.Vector3]));
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
  const trees=targets.map(t=>{const metadata={species:t.species??'unclassified',lod:t.lod??lod};if(!t.wood){scale(t.matrix);return{label:t.label,...metadata,kind:t.kind,missingWood:true,position:t.matrix.elements.slice(12,15),leafless:!t.leaves,components:0,chunks:0,detachedCards:0,detachedClumps:0,maxWoodGap:null,candidates:[] as {position:number[];components:number;sampledWoodGap:number|null}[]};}if(!t.leaves)return{label:t.label,...metadata,missingWood:false,leafless:true,components:0,chunks:0,detachedCards:0,detachedClumps:0,maxWoodGap:0,candidates:[] as {position:number[];components:number;sampledWoodGap:number|null}[]};const entry=groups.get(t.wood)!.get(t.leaves)!,s=scale(t.matrix),limit=gap/s,graph=union(entry.components.length);
    for(const[a,b,d]of entry.edges){charge();if(d<=limit)graph.join(a,b);}const chunks=new Map<number,{box:THREE.Box3;count:number;contact:number}>();
    for(let i=0;i<entry.components.length;i++){const key=graph.find(i),chunk=chunks.get(key)??{box:new THREE.Box3(),count:0,contact:Infinity};chunk.box.union(entry.components[i]!.box);chunk.count++;chunk.contact=Math.min(chunk.contact,entry.contacts[i]!);chunks.set(key,chunk);}
    const candidates=[...chunks.values()].filter(c=>c.contact>limit).map(c=>({position:c.box.getCenter(new THREE.Vector3()).applyMatrix4(t.matrix).toArray(),components:c.count,sampledWoodGap:Number.isFinite(c.contact)?c.contact*s:null}));
    // Playtest 6: a crown is one chunk, yet a clump in it can still hang clear of every branch. Cards farther than
    // `woodReach` from the wood are grouped (by the same proximity links) into detached clumps.
    const reach=woodReachLocal(woodReach,s);
    const shared=farClumps(entry.components,entry.contacts,reach,limit,entry.maxGap,charge);
    let farCards=0,maxWoodGap=0;
    for(let i=0;i<entry.components.length;i++)if(shared.far[i]){farCards++;maxWoodGap=Math.max(maxWoodGap,Number.isFinite(entry.contacts[i]!)?entry.contacts[i]!*s:Infinity);}
    return{label:t.label,...metadata,kind:t.kind,missingWood:false,leafless:false,components:entry.components.length,chunks:chunks.size,detachedCards:farCards,detachedClumps:shared.detachedClumps,maxWoodGap:Number.isFinite(maxWoodGap)?maxWoodGap:null,candidates};});
  const bySpecies:Record<string,{trees:number;leafless:number;candidates:number}>={};for(const t of trees){const group=bySpecies[t.species]??={trees:0,leafless:0,candidates:0};group.trees++;group.leafless+=Number(t.leafless);group.candidates+=t.candidates.length;}
  return{schema:1,lod,gap,operations,complete:trees.every(t=>!t.missingWood),alpha:options.alpha?{maskedTrees:targets.filter(t=>t.leaves&&t.cutout).length}:false,bySpecies,summary:{trees:trees.length,missingWood:trees.filter(t=>t.missingWood).length,leafless:trees.filter(t=>t.leafless).length,components:trees.reduce((n,t)=>n+t.components,0),chunks:trees.reduce((n,t)=>n+t.chunks,0),candidates:trees.reduce((n,t)=>n+t.candidates.length,0),woodReach,detachedCards:trees.reduce((n,t)=>n+t.detachedCards,0),detachedClumps:trees.reduce((n,t)=>n+t.detachedClumps,0),treesWithDetached:trees.filter(t=>t.detachedClumps>0).length},trees,
    scope:'Registered forest selected-LOD rest geometry. Leaf components link by bounding-box proximity, then leaf-surface samples test wood-triangle contacts. Alpha cutout is evaluated only in alpha mode (opaque-texel bounds); shader wind is not; candidates require visual review. Null sampled gap means no nearby triangle was found, not an exact distance.'};
}
