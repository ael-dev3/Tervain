/** Diagnostic only: a graft must cross earlier rendered wood; its own/later triangles cannot establish contact. */
export function birchStemContacts(THREE, variant, ids = [22, 37, 43, 50]) {
  const v = variant, rows = [];
  for (const mode of ['before', 'after']) {
    const g = v[mode], p = g.getAttribute('position');
    const root = new THREE.Vector3(), next = new THREE.Vector3(), tri = new THREE.Triangle(), ray = new THREE.Ray(), hit = new THREE.Vector3();
    let vertex = v.baseCount, prefix = v.baseIndex;
    for (let i = 0; i < v.twigs.length; i++) {
      const t = v.twigs[i]; if (!(t.from.distanceTo(t.to) > 1e-3)) continue;
      const count = 18 * (t.from.distanceTo(t.to) > 2.5 ? 2 : 1);
      if (ids.includes(i)) {
        root.set(0, 0, 0); next.set(0, 0, 0);
        for (let k = 0; k < 3; k++) {
          root.add(new THREE.Vector3().fromBufferAttribute(p, vertex + k));
          next.add(new THREE.Vector3().fromBufferAttribute(p, vertex + v.ringVertices + k));
        }
        root.divideScalar(3); next.divideScalar(3);
        const length = root.distanceTo(next); ray.set(root, next.sub(root).normalize());
        let intersections = 0;
        for (let k = 0; k < prefix; k += 3) {
          tri.a.fromBufferAttribute(p, g.index.getX(k)); tri.b.fromBufferAttribute(p, g.index.getX(k + 1)); tri.c.fromBufferAttribute(p, g.index.getX(k + 2));
          if (ray.intersectTriangle(tri.a, tri.b, tri.c, false, hit) && root.distanceTo(hit) <= length + 1e-5) intersections++;
        }
        rows.push({ mode, twig: i, firstCentrelineSegmentCrossesPriorWood: intersections > 0, intersections });
      }
      vertex += (count / 18 + 1) * v.ringVertices; prefix += count;
    }
    if(prefix!==g.index.count||vertex!==p.count)throw Error('Unexpected twig topology');
  }
  return { rows, scope: 'Read-only native replay geometry. Ray from the rendered root-ring centre to the next ring centre, tested against preceding rendered wood triangles only. No own or later twig can establish support.' };
}
