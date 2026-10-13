import * as THREE from 'three';
import {describe,it,expect} from 'vitest';
import {auditSkinnedBones,auditHeadAnchor} from '../../tools/skinned-bone-audit.mjs';
function fixture(){
 const root=new THREE.Group(),torso=new THREE.Bone(),head=new THREE.Bone();torso.name='chest';head.name='head';head.position.y=.3;root.add(torso);torso.add(head);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,.3,0],3));geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute([1,0,0,0],4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute([1,0,0,0],4));
 const mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshBasicMaterial());root.add(mesh);root.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton([torso,head]));return{root,torso,head,mesh};
}
describe('skinned NPC collapse diagnostic',()=>{
 it('accepts normal and mirrored transforms without mutating a bone',()=>{const f=fixture();f.root.scale.set(-2,2,2);const before=f.head.position.toArray();expect(auditSkinnedBones(f.root).pass).toBe(true);expect(auditHeadAnchor(f).pass).toBe(true);expect(f.head.position.toArray()).toEqual(before);});
 it('rejects a collapsed head even though its posed vertex remains finite',()=>{const f=fixture();f.head.scale.setScalar(0);f.root.updateMatrixWorld(true);f.mesh.skeleton.update();const point=f.mesh.getVertexPosition(0,new THREE.Vector3());expect(point.toArray().every(Number.isFinite)).toBe(true);expect(auditSkinnedBones(f.root).invalid).toContainEqual({bone:'head',reason:'collapsed-local-scale'});});
 it('detects zero-scale ancestors and a single collapsed axis',()=>{const f=fixture();f.root.scale.y=0;expect(auditSkinnedBones(f.root).invalid.some(v=>v.reason==='singular-world-transform')).toBe(true);f.root.scale.y=1;f.head.scale.z=0;expect(auditSkinnedBones(f.root).pass).toBe(false);});
 it('rejects coincident head anchors and nonfinite scales',()=>{const f=fixture();f.head.position.set(0,0,0);expect(auditHeadAnchor(f).pass).toBe(false);f.head.scale.x=NaN;expect(auditSkinnedBones(f.root).invalid.some(v=>v.reason==='nonfinite-scale')).toBe(true);});
 it('does not treat an empty scene as a checked skeleton',()=>{expect(auditSkinnedBones(new THREE.Group()).pass).toBe(false);});
});
