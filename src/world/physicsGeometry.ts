/** Renderer-free contact data for the visible, static woody surfaces of canonical trees.
 * Buffers are shared across instances of a source variant, owned by the forest, and valid
 * until that world is disposed. Consumers must not modify them. Leaves are deliberately absent. */
export interface PhysicalWoodGeometry {
  readonly id: string;
  /** Packed xyz source positions, already flattened and uniformly sized for the species/seed. */
  readonly positions: Float32Array;
  /** Complete near-wood triangle topology, including nonindexed procedural geometry. */
  readonly indices: Uint32Array;
  readonly translation: { readonly x: number; readonly y: number; readonly z: number };
  readonly yaw: number;
  /** Final uniform instance scale. Apply it equally to all three axes. */
  readonly scale: number;
}

/** One grounded boulder: these world-space triangles are the exact transformed rendered shape.
 * The canonical circle is retained for NPC navigation; the player and loose cargo use this surface. */
export interface PhysicalRockGeometry {
  readonly id: string;
  readonly positions: Float32Array;
  readonly indices: Uint32Array;
  readonly bounds: { readonly minX: number; readonly minY: number; readonly minZ: number;
    readonly maxX: number; readonly maxY: number; readonly maxZ: number };
}
