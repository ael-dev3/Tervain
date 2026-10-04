import type { ResourceReceipt } from './resource';
import type { Vec3 } from './types';

export interface TerrainResource extends ResourceReceipt { url: string }
export interface TerrainTexture extends TerrainResource {
  id: string;
  width: number;
  height: number;
  hostedMipCount: number;
}
export interface TerrainCell {
  id: string;
  region: string;
  boundsMetres: { min: Vec3; max: Vec3 };
  geometry: TerrainResource & { vertices: number; triangles: number; primitiveCount: number };
  primitiveMaterialIds: string[];
  textureIds: string[];
  native: { registered: boolean; enabledByAnyRegistry: boolean; entityGuid20: string };
}
export interface TerrainManifest {
  schema: 'gothic3-terrain-v1';
  summary: { cells: number; triangles: number; regions: Record<string, number> };
  coordinates: { legacyArdeaOriginMetres: Vec3 };
  cells: TerrainCell[];
  textures: TerrainTexture[];
  materialGraphs: TerrainResource;
  limits: string[];
}
export interface MaterialProxy { selector: number; token: string; valid: boolean }
export interface NativeMaterialNode {
  id: string;
  class: string;
  values: Record<string, unknown>;
  inputs?: Record<string, MaterialProxy>;
  outputs?: Record<string, MaterialProxy>;
  texCoord?: MaterialProxy;
  textureId?: string;
  selectionStatus?: string;
}
export interface NativeMaterialGraph { id: string; root: string; nodes: NativeMaterialNode[] }
export interface NativeMaterialGraphs {
  schema: 'gothic3-terrain-material-graphs-v1';
  materials: NativeMaterialGraph[];
}
