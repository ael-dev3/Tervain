export type Vec3 = [number, number, number];

export interface NativeMaterial {
  /** Gothic 3: Normal=0, Masked=1, AlphaBlend=2. */
  blendMode: number;
  /** Original MaskReference byte, normalized by 255 in the native shader. */
  maskReference: number;
  source: string;
}

export interface SceneModel {
  obj: string;
  mtl?: string;
  source: string;
  unitScale?: number;
  materials?: Record<string, NativeMaterial>;
}

export interface SceneEntry {
  id: string;
  name: string;
  obj: string;
  mtl?: string;
  kind: 'terrain' | 'structure' | 'prop' | 'character' | 'tree';
  position: Vec3;
  quaternion?: [number, number, number, number];
  scale?: Vec3;
  source: string;
  materials?: Record<string, NativeMaterial>;
}

export interface ScenePerson {
  id: string;
  name: string;
  position: Vec3;
  body?: string;
  head?: string;
  rotationY?: number;
  source: string;
}

export interface ArdeaScene {
  version: number;
  units: 'metres';
  origin: Vec3;
  spawnSource: { archive: string; path: string; sha256: string };
  bounds: { min: Vec3; max: Vec3 };
  spawn: Vec3;
  spawnYaw?: number;
  spawnIsEye?: boolean;
  meshes: SceneEntry[];
  people: ScenePerson[];
  /** Model exhibits only; never treated as characters placed in the world. */
  inspectionPeople?: ScenePerson[];
  models?: Record<string, SceneModel>;
  metrics?: Record<string, number>;
  notes?: string[];
}
