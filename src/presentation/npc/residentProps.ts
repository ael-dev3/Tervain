import * as THREE from 'three';
import type { WorkGesture } from '../npcStyle';
import type { ResidentBones, ResidentJoint } from './residentRig';
import { createWorkProp, type WorkPropKind } from './workProps';

/**
 * The tools a resident holds while working, on their own rig (A65). The rig has no fingers, so a tool rides its hand
 * from the palm: each is placed once in the model's bind pose, in a frame taken from that hand (along the fingers, out of
 * the palm, forward), and the work clip carries it.
 */
interface Placement {
  kind: WorkPropKind;
  holder: 'LeftHand' | 'RightHand';
  /** The tool's own +y axis in the hand frame (fingers, palm, forward), and its +z. */
  up: [number, number, number];
  front: [number, number, number];
  /** Offset from the palm in the hand frame, metres. */
  offset: [number, number, number];
  length?: number;
}

const TOOLS: Partial<Record<WorkGesture, Placement[]>> = {
  // Seated writing: the open ledger held in the left hand over the lap, the quill in the right.
  writing: [
    { kind: 'ledger', holder: 'LeftHand', up: [0, 1, 0], front: [1, 0, 0], offset: [0.02, 0.03, 0] },
    { kind: 'quill', holder: 'RightHand', up: [-1, 0, 0.4], front: [0, 0, 1], offset: [0.05, 0, 0.02] },
  ],
  // A ledger kept standing: held open in the left palm, written in with the right.
  ledger: [
    { kind: 'ledger', holder: 'LeftHand', up: [0, 1, 0], front: [1, 0, 0], offset: [0.02, 0.03, 0] },
    { kind: 'quill', holder: 'RightHand', up: [-1, 0, 0.4], front: [0, 0, 1], offset: [0.05, 0, 0.02] },
  ],
  // Dressing stone: the chisel in the left fist pointing ahead, the hammer in the right.
  stonework: [
    { kind: 'chisel', holder: 'LeftHand', up: [0, 0, 1], front: [0, 1, 0], offset: [0.01, 0, -0.02] },
    { kind: 'hammer', holder: 'RightHand', up: [0, 0, 1], front: [0, 1, 0], offset: [0.01, 0, -0.06] },
  ],
  // The measuring rod upright in the right fist.
  measuring: [{ kind: 'rod', holder: 'RightHand', up: [0, 0, 1], front: [0, 1, 0], offset: [0.01, 0, 0], length: 0.95 }],
  // An arrow lifted from the counter to sight along.
  provisioning: [{ kind: 'arrow', holder: 'RightHand', up: [0, 0, 1], front: [0, 1, 0], offset: [0.01, 0, 0] }],
};

/** A tool's working ends, which the work contacts bring onto their surfaces (A70). */
export type ToolPoint = 'chiselTip' | 'chiselButt' | 'hammerA' | 'hammerB' | 'rodFoot' | 'rodGrip';
/** Each working end in its tool's own frame (the tool's model, which a rod may slide within its holder's fist). */
export type ToolPoints = Partial<Record<ToolPoint, { tool: THREE.Object3D; point: THREE.Vector3 }>>;
const ENDS: Partial<Record<WorkPropKind, (length: number) => [ToolPoint, [number, number, number]][]>> = {
  chisel: () => [['chiselTip', [0, 0.17, 0]], ['chiselButt', [0, -0.06, 0]]],
  hammer: () => [['hammerA', [0.065, 0.27, 0]], ['hammerB', [-0.065, 0.27, 0]]],
  rod: length => [['rodFoot', [0, -length, 0]], ['rodGrip', [0, 0, 0]]],
};

export interface ResidentTools { props: THREE.Object3D[]; materials: THREE.MeshStandardMaterial[]; triangles: number; points: ToolPoints }

/**
 * Build a resident's tools for `gesture` onto its rig, hidden until it works. `palm` gives each hand's palm centre in the
 * model's bind space; the rig must still stand in its bind pose.
 */
export function createResidentTools(gesture: WorkGesture | undefined, bones: ResidentBones, scene: THREE.Object3D,
  palm: (side: 'LeftHand' | 'RightHand') => THREE.Vector3): ResidentTools {
  const out: ResidentTools = { props: [], materials: [], triangles: 0, points: {} };
  const placements = gesture ? TOOLS[gesture] : undefined;
  if (!placements) return out;
  scene.updateMatrixWorld(true);
  const toScene = new THREE.Matrix4().copy(scene.matrixWorld).invert();
  const at = (joint: ResidentJoint) => new THREE.Vector3().setFromMatrixPosition(bones[joint].matrixWorld).applyMatrix4(toScene);
  for (const placement of placements) {
    const built = createWorkProp(placement.kind, placement.length);
    const side = placement.holder;
    const hand = at(side), elbow = at(side === 'LeftHand' ? 'LeftForeArm' : 'RightForeArm');
    const along = hand.clone().sub(elbow).normalize();
    // Out of the palm: towards the body's middle line, square to the fingers.
    const inward = new THREE.Vector3(-Math.sign(hand.x) || 1, 0, 0);
    const palmOut = inward.sub(along.clone().multiplyScalar(inward.dot(along))).normalize();
    const forward = new THREE.Vector3().crossVectors(along, palmOut).multiplyScalar(side === 'LeftHand' ? -1 : 1).normalize();
    const basis = new THREE.Matrix4().makeBasis(along, palmOut, forward);
    const origin = palm(side).clone().add(new THREE.Vector3(...placement.offset).applyMatrix4(basis));
    // The tool's +y and +z expressed in the hand frame, then in bind space.
    const up = new THREE.Vector3(...placement.up).normalize().applyMatrix4(basis).normalize();
    const front = new THREE.Vector3(...placement.front).normalize().applyMatrix4(basis);
    front.sub(up.clone().multiplyScalar(front.dot(up))).normalize();
    const right = new THREE.Vector3().crossVectors(up, front);
    const toolInScene = new THREE.Matrix4().makeBasis(right, up, front).setPosition(origin);
    // As a child of its holder joint, at that place.
    const holder = bones[placement.holder];
    const holderInScene = new THREE.Matrix4().multiplyMatrices(toScene, holder.matrixWorld);
    const socket = new THREE.Group();
    socket.name = `NPC / ${placement.holder} ${placement.kind}`;
    new THREE.Matrix4().multiplyMatrices(holderInScene.invert(), toolInScene).decompose(socket.position, socket.quaternion, socket.scale);
    socket.add(built.group);
    socket.visible = false;
    holder.add(socket);
    for (const [name, at] of ENDS[placement.kind]?.(placement.length ?? 1) ?? []) out.points[name] = { tool: built.group, point: new THREE.Vector3(...at) };
    out.props.push(socket);
    out.materials.push(...built.materials);
    out.triangles += built.triangles;
  }
  return out;
}
