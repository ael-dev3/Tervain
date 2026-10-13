import type { Object3D } from 'three';
export interface BoneAudit { boneCount: number; minimumScale: number | null; invalid: { bone: string; reason: string }[]; pass: boolean }
export function auditSkinnedBones(root: Object3D): BoneAudit;
export function auditHeadAnchor(rig: {root: Object3D;head: Object3D;torso: Object3D}): {distance: number;pass: boolean;scope: string};
