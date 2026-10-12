import * as THREE from 'three';

/** Index only diagnostic mesh copies; preserve exact Three triangle tests and original face identities. */
export function indexVerticalSupport(mesh: THREE.Mesh, cellSize = 16): () => void {
  const source = mesh.geometry, position = source.getAttribute('position'), index = source.index;
  const end = Math.min(index?.count ?? position?.count ?? 0, source.drawRange.start + source.drawRange.count);
  if (!position || end / 3 < 512 || source.drawRange.start % 3 || end % 3) return () => {};
  const buckets = new Map<string, number[]>(), wide: number[] = [];
  const vertices = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (let i = source.drawRange.start; i < end; i += 3) {
    for (let k = 0; k < 3; k++) vertices[k]!.fromBufferAttribute(position, index?.getX(i + k) ?? i + k).applyMatrix4(mesh.matrixWorld);
    const x0 = Math.floor((Math.min(...vertices.map(v => v.x)) - 1e-5) / cellSize), x1 = Math.floor((Math.max(...vertices.map(v => v.x)) + 1e-5) / cellSize);
    const z0 = Math.floor((Math.min(...vertices.map(v => v.z)) - 1e-5) / cellSize), z1 = Math.floor((Math.max(...vertices.map(v => v.z)) + 1e-5) / cellSize);
    if (![x0, x1, z0, z1].every(Number.isFinite) || (x1-x0+1)*(z1-z0+1)>256) { wide.push(i/3); continue; }
    for (let x=x0;x<=x1;x++) for (let z=z0;z<=z1;z++) {
      const key=`${x},${z}`, faces=buckets.get(key)??[]; faces.push(i/3); buckets.set(key,faces);
    }
  }
  const cache = new Map<string, { geometry: THREE.BufferGeometry; faces: number[] }>();
  const original = mesh.raycast;
  mesh.raycast = function(ray, hits) {
    if (Math.abs(ray.ray.direction.x)>1e-8 || Math.abs(ray.ray.direction.z)>1e-8) return original.call(this,ray,hits);
    const key=`${Math.floor(ray.ray.origin.x/cellSize)},${Math.floor(ray.ray.origin.z/cellSize)}`;
    let entry=cache.get(key);
    if(!entry) {
      const faces=[...(buckets.get(key)??[]),...wide];
      const geometry=new THREE.BufferGeometry(); geometry.attributes=source.attributes;
      geometry.setIndex(faces.flatMap(face=>[0,1,2].map(k=>index?.getX(face*3+k)??face*3+k)));
      geometry.boundingBox=source.boundingBox; geometry.boundingSphere=source.boundingSphere;
      entry={geometry,faces};cache.set(key,entry);
    }
    if(!entry.faces.length)return;
    const begin=hits.length;
    try {
      this.geometry=entry.geometry;original.call(this,ray,hits);
      for(let i=begin;i<hits.length;i++)if(hits[i]!.faceIndex!=null)hits[i]!.faceIndex=entry.faces[hits[i]!.faceIndex!]!;
    }finally{this.geometry=source;}
  };
  return () => { mesh.raycast=original;for(const entry of cache.values())entry.geometry.dispose(); };
}
