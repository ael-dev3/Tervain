import * as THREE from 'three';

// Shared component-graph detection: the canopy audit and the generator both use these, so they agree on which clumps are detached.
export type CutoutSampler = { uv: string; cutoff: number; alpha(u: number, v: number): number;
  /** Conservative hint: false only when the whole UV triangle is transparent. */
  mayHaveOpaque?(u0: number, v0: number, u1: number, v1: number, u2: number, v2: number): boolean } | null | undefined;
export interface Component { box: THREE.Box3; samples: THREE.Vector3[]; vertices?: number[] }
export const boxGap = (a: THREE.Box3, b: THREE.Box3) => Math.hypot(
  Math.max(0,a.min.x-b.max.x,b.min.x-a.max.x),Math.max(0,a.min.y-b.max.y,b.min.y-a.max.y),Math.max(0,a.min.z-b.max.z,b.min.z-a.max.z));
export function union(size: number) {
  const parent=Int32Array.from({length:size},(_,i)=>i);
  const find=(i:number):number=>{while(parent[i]!==i){parent[i]=parent[parent[i]!]!;i=parent[i]!;}return i;};
  return {find,join:(a:number,b:number)=>{parent[find(a)]=find(b);}};
}
export function components(g: THREE.BufferGeometry, charge: () => void, cutout?: CutoutSampler): Component[] {
  const p=g.getAttribute('position');if(!p||p.count===0)throw new Error('Missing leaf positions');const index=g.index;
  // Alpha mode: each triangle's opaque texels are their own part; welded quads no longer join leaves that do not touch.
  if(cutout){
    for(let i=0;i<p.count;i++)if(![p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite))throw new Error('Nonfinite leaf positions');
    const uv=g.getAttribute(cutout.uv);if(!uv)throw new Error('Missing leaf UVs for alpha audit');
    const opaque=new Map<number,THREE.Vector3[]>(),N=6,point=new THREE.Vector3(),corners=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()],edgeA=new THREE.Vector3(),edgeB=new THREE.Vector3();
    // Atlas cards repeat UV triangles. Cache only their opaque weights within this cutout's scan.
    const patterns=new Map<string,[number,number,number][]>();
    for(let i=0;i+2<(index?.count??p.count);i+=3){const v=[0,1,2].map(j=>index?.getX(i+j)??i+j) as [number,number,number],key=i;
      charge();for(let k=0;k<3;k++)corners[k]!.fromBufferAttribute(p,v[k]!);
      const u0=uv.getX(v[0]),u1=uv.getX(v[1]),u2=uv.getX(v[2]),t0=uv.getY(v[0]),t1=uv.getY(v[1]),t2=uv.getY(v[2]);
      const patternKey=`${u0},${t0},${u1},${t1},${u2},${t2}`;
      let weights=patterns.get(patternKey);
      if(!weights){weights=[];for(let a=0;a<=N;a++)for(let b=0;a+b<=N;b++){
        const w=[a/N,b/N,(N-a-b)/N] as [number,number,number];
        if(cutout.alpha(w[0]*u0+w[1]*u1+w[2]*u2,w[0]*t0+w[1]*t1+w[2]*t2)<cutout.cutoff)continue;
        weights.push(w);
      }
      // A clear coarse grid does not prove a clear card: thin needles can lie between its samples.
      // Retain positive fine-grid witnesses rather than aborting the whole audit. Cache empty patterns too.
      if(!weights.length){
        // Do not seed the empty-pattern cache from a collapsed card: a real card can reuse its UVs later.
        if(edgeA.subVectors(corners[1]!,corners[0]!).cross(edgeB.subVectors(corners[2]!,corners[0]!)).lengthSq()===0)continue;
        for(let a=0;a<=48;a++)for(let b=0;a+b<=48;b++){
          charge();const w0=a/48,w1=b/48,w2=(48-a-b)/48;
          if(cutout.alpha(w0*u0+w1*u1+w2*u2,w0*t0+w1*t1+w2*t2)>=cutout.cutoff)
            weights.push([w0,w1,w2]);
        }
        // A thin opaque edge can also evade the 48-grid. Refine only patterns with conservative positive hints.
        if(!weights.length&&cutout.mayHaveOpaque){
          charge();if(cutout.mayHaveOpaque(u0,t0,u1,t1,u2,t2))for(let a=0;a<=192;a++)for(let b=0;a+b<=192;b++){
            charge();const w0=a/192,w1=b/192,w2=(192-a-b)/192;
            if(cutout.alpha(w0*u0+w1*u1+w2*u2,w0*t0+w1*t1+w2*t2)>=cutout.cutoff)weights.push([w0,w1,w2]);
          }
        }
      }
      patterns.set(patternKey,weights);}
      for(const w of weights){point.set(0,0,0);for(let k=0;k<3;k++)point.addScaledVector(corners[k]!,w[k]!);
        const list=opaque.get(key)??[];list.push(point.clone());opaque.set(key,list);}}
    return [...opaque.values()].map(points=>{const box=new THREE.Box3().setFromPoints(points),centre=box.getCenter(new THREE.Vector3());
      // A cutout can leave the box centre transparent. Only opaque samples may establish wood contact.
      let nearest=points[0]!;for(const point of points)if(point.distanceToSquared(centre)<nearest.distanceToSquared(centre))nearest=point;
      const samples=[nearest];
      for(let i=0;i<Math.min(8,points.length);i++)samples.push(points[Math.floor(i*points.length/Math.min(8,points.length))]!);return{box,samples};});}
  // Unmasked mode alone needs welded vertex connectivity. Alpha mode returns above.
  const graph=union(p.count),weld=new Map<string,number>();
  for(let i=0;i<p.count;i++){if(![p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite))throw new Error('Nonfinite leaf positions');const key=`${Math.round(p.getX(i)*1e4)},${Math.round(p.getY(i)*1e4)},${Math.round(p.getZ(i)*1e4)}`,other=weld.get(key);if(other!==undefined)graph.join(i,other);else weld.set(key,i);}
  const used=new Set<number>();for(let i=0;i+2<(index?.count??p.count);i+=3){const a=index?.getX(i)??i,b=index?.getX(i+1)??i+1,c=index?.getX(i+2)??i+2;graph.join(a,b);graph.join(a,c);used.add(a);used.add(b);used.add(c);}
  const groups=new Map<number,number[]>();for(const i of used){const key=graph.find(i),group=groups.get(key)??[];group.push(i);groups.set(key,group);}
  // A bounding-box centre can sit in a hole, outside the actual leaf surface. Project it onto its component.
  const triangles=new Map<number,number[]>();
  for(let i=0;i+2<(index?.count??p.count);i+=3){const key=graph.find(index?.getX(i)??i),list=triangles.get(key)??[];list.push(i);triangles.set(key,list);}
  const triangle=new THREE.Triangle(),point=new THREE.Vector3();
  return [...groups.entries()].map(([key,vertices])=>{
    const box=new THREE.Box3();for(const i of vertices)box.expandByPoint(new THREE.Vector3().fromBufferAttribute(p,i));
    const centre=box.getCenter(new THREE.Vector3()),surface=new THREE.Vector3();let distance=Infinity;
    for(const i of triangles.get(key)!){
      charge();triangle.a.fromBufferAttribute(p,index?.getX(i)??i);triangle.b.fromBufferAttribute(p,index?.getX(i+1)??i+1);triangle.c.fromBufferAttribute(p,index?.getX(i+2)??i+2);
      triangle.closestPointToPoint(centre,point);const d=point.distanceToSquared(centre);
      if(d<distance){distance=d;surface.copy(point);}if(distance===0)break;
    }
    if(!Number.isFinite(distance))throw new Error('Unsupported leaf surface');
    const samples=[surface];
    for(let i=0;i<Math.min(8,vertices.length);i++)samples.push(new THREE.Vector3().fromBufferAttribute(p,vertices[Math.floor(i*vertices.length/Math.min(8,vertices.length))]!));
    return{box,samples,vertices};
  });
}
export interface LeafNode { box: THREE.Box3; ids?: number[]; left?: LeafNode; right?: LeafNode; uniform: number }
export function boundsTree(boxes: readonly THREE.Box3[], charge: () => void): LeafNode {
  const build=(ids:number[]):LeafNode=>{charge();const box=new THREE.Box3();for(const i of ids)box.union(boxes[i]!);if(ids.length<=8)return{box,ids,uniform:-1};
    const size=box.getSize(new THREE.Vector3()),axis=size.x>=size.y&&size.x>=size.z?'x':size.y>=size.z?'y':'z';
    ids.sort((a,b)=>(boxes[a]!.min[axis]+boxes[a]!.max[axis])-(boxes[b]!.min[axis]+boxes[b]!.max[axis]));
    const middle=ids.length>>1;return{box,left:build(ids.slice(0,middle)),right:build(ids.slice(middle)),uniform:-1};};
  if(!boxes.length)throw new Error('Missing support triangles');return build(boxes.map((_,i)=>i));
}

/** Boruvka's minimum spanning forest: nearest foreign component queries avoid dense all-pairs graphs. */
export function spanningLeafEdges(parts: Component[], limit: number, charge: () => void): [number,number,number][] {
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
/** A sampled wood-contact witness within maxGap, or Infinity. The search stops once a witness
 * is inside that cutoff; its returned distance must not classify a smaller contact threshold. */
export function contactDistances(parts: readonly Component[], wood: THREE.BufferGeometry, maxGap: number, charge: () => void = () => {}): number[] {
  const p = wood.getAttribute('position'), index = wood.index;
  if (!p) throw new Error('Missing wood positions');
  const triangles: THREE.Triangle[] = [];
  for (let i = 0; i + 2 < (index?.count ?? p.count); i += 3) triangles.push(new THREE.Triangle(...[0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(p, index?.getX(i + j) ?? i + j)) as [THREE.Vector3, THREE.Vector3, THREE.Vector3]));
  const woodBounds = triangles.map(t => new THREE.Box3().setFromPoints([t.a, t.b, t.c]));
  const support = boundsTree(woodBounds, charge), nearest = new THREE.Vector3();
  const minGap = maxGap;
  return parts.map(c => {
    let distance = maxGap, found = false;
    for (const sample of c.samples) {
      const visit = (node: LeafNode) => {
        charge(); if (node.box.distanceToPoint(sample) > distance) return;
        if (node.ids) { for (const i of node.ids) { charge(); triangles[i]!.closestPointToPoint(sample, nearest); const d = nearest.distanceTo(sample); if (d <= distance) { distance = d; found = true; } if (found && distance <= minGap) return; } return; }
        const left = node.left!, right = node.right!, first = left.box.distanceToPoint(sample) <= right.box.distanceToPoint(sample) ? left : right, second = first === left ? right : left;
        visit(first); if (!found || distance > minGap) visit(second);
      };
      visit(support); if (found && distance <= minGap) break;
    }
    return found ? distance : Infinity;
  });
}

/**
 * The detached-clump rule: a component is far when its contact distance exceeds `reach`; far components join into
 * clumps through spanning edges no longer than `limit`. A clump is detached when none of its components is near wood.
 */
export function farClumps(parts: readonly Component[], contacts: readonly number[], reach: number, limit: number, maxGap: number, charge: () => void = () => {}): { far: boolean[]; clumpOf: number[]; detachedClumps: number } {
  const isFar = (i: number) => !(contacts[i]! <= reach);
  const far = union(parts.length);
  const farIds = parts.map((_, i) => i).filter(isFar);
  if (farIds.length === parts.length) {
    for (const [a, b, d] of spanningLeafEdges(parts as Component[], maxGap, charge)) { charge(); if (d <= limit) far.join(a, b); }
  } else if (farIds.length > 1) {
    for (const [a, b] of spanningLeafEdges(farIds.map(i => parts[i]!), limit, charge)) far.join(farIds[a]!, farIds[b]!);
  }
  const clumps = new Set<number>();
  const far2 = parts.map((_, i) => isFar(i));
  for (let i = 0; i < parts.length; i++) if (far2[i]) clumps.add(far.find(i));
  return { far: far2, clumpOf: parts.map((_, i) => far.find(i)), detachedClumps: clumps.size };
}

/** Detached cards and clumps of one leaf geometry against one wood geometry, in the leaf geometry's own units. */
export function detachedClumpSet(leaves: THREE.BufferGeometry, wood: THREE.BufferGeometry, reach: number, gap: number, charge: () => void = () => {}) {
  const parts = components(leaves, charge);
  const maxGap = Math.max(gap, reach);
  // Membership is decided at reach, not the (possibly larger) clump-link gap.
  // A witness somewhere inside maxGap does not prove contact inside reach.
  const contacts = contactDistances(parts, wood, reach, charge);
  return { parts, components: parts.length, contacts, ...farClumps(parts, contacts, reach, gap, maxGap, charge) };
}
