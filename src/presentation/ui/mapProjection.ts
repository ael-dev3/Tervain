/** North is negative Z; the original world uses yaw zero toward positive Z. */
export const MAP_BOUNDS = { x0: -352, x1: 168, z0: -144, z1: 168 } as const;
export const MAP_PIXELS_PER_METRE = 2.2;
export const MAP_W = Math.round((MAP_BOUNDS.x1 - MAP_BOUNDS.x0) * MAP_PIXELS_PER_METRE);
export const MAP_H = Math.round((MAP_BOUNDS.z1 - MAP_BOUNDS.z0) * MAP_PIXELS_PER_METRE);
export const mapX = (x: number) => (x - MAP_BOUNDS.x0) / (MAP_BOUNDS.x1 - MAP_BOUNDS.x0) * MAP_W;
export const mapZ = (z: number) => (z - MAP_BOUNDS.z0) / (MAP_BOUNDS.z1 - MAP_BOUNDS.z0) * MAP_H;
export function mapHeading(yaw: number): number { return Math.PI - (Number.isFinite(yaw) ? yaw : 0); }

export interface MapViewport { x: number; y: number; zoom: number }
export const fullMapView = (): MapViewport => ({ x: MAP_W / 2, y: MAP_H / 2, zoom: 1 });
export function mapCanvasPoint(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }): { x: number; y: number } {
  return { x: (clientX - rect.left) / Math.max(1, rect.width) * MAP_W, y: (clientY - rect.top) / Math.max(1, rect.height) * MAP_H };
}
/** View centres are clamped by the visible half-extents, so panning never exposes blank paper. */
export function clampMapView(view: MapViewport): MapViewport {
  const zoom = Number.isFinite(view.zoom) ? Math.max(1, Math.min(4, view.zoom)) : 1;
  const halfW = MAP_W / (2 * zoom), halfH = MAP_H / (2 * zoom);
  return {
    x: Math.max(halfW, Math.min(MAP_W - halfW, Number.isFinite(view.x) ? view.x : MAP_W / 2)),
    y: Math.max(halfH, Math.min(MAP_H - halfH, Number.isFinite(view.y) ? view.y : MAP_H / 2)), zoom,
  };
}
/** Canvas coordinates are independent of CSS size and UI scale. */
export function mapPointAt(view: MapViewport, x: number, y: number): { x: number; y: number } {
  return { x: view.x + (x - MAP_W / 2) / view.zoom, y: view.y + (y - MAP_H / 2) / view.zoom };
}
export function mapWorldAt(view: MapViewport, x: number, y: number): { x: number; z: number } {
  const p = mapPointAt(view, x, y);
  return {
    x: MAP_BOUNDS.x0 + p.x / MAP_W * (MAP_BOUNDS.x1 - MAP_BOUNDS.x0),
    z: MAP_BOUNDS.z0 + p.y / MAP_H * (MAP_BOUNDS.z1 - MAP_BOUNDS.z0),
  };
}
/** Zoom around the cursor rather than sliding the selected ground out from underneath it. */
export function zoomMapAt(view: MapViewport, zoom: number, x = MAP_W / 2, y = MAP_H / 2): MapViewport {
  const point = mapPointAt(view, x, y);
  const nextZoom = clampMapView({ ...view, zoom }).zoom;
  return clampMapView({ x: point.x - (x - MAP_W / 2) / nextZoom, y: point.y - (y - MAP_H / 2) / nextZoom, zoom: nextZoom });
}
export function panMap(view: MapViewport, dx: number, dy: number): MapViewport {
  return clampMapView({ ...view, x: view.x - dx / view.zoom, y: view.y - dy / view.zoom });
}

export interface MapLabel { x: number; y: number; width: number; height: number }
/** Try the nearest clear space around a place, then move down only if every nearby candidate is occupied. */
export function placeMapLabel(x: number, y: number, width: number, occupied: MapLabel[]): MapLabel {
  const candidates = [[0, -31], [0, 13], [width / 2 + 13, -8], [-width / 2 - 13, -8], [0, -53], [0, 35]];
  const make = (dx: number, dy: number): MapLabel => ({ x: Math.max(14, Math.min(MAP_W - width - 14, x + dx - width / 2)), y: Math.max(12, Math.min(MAP_H - 44, y + dy)), width, height: 24 });
  const clear = (candidate: MapLabel) => !occupied.some((other) => candidate.x < other.x + other.width + 8 && candidate.x + candidate.width + 8 > other.x && candidate.y < other.y + other.height + 5 && candidate.y + candidate.height + 5 > other.y);
  for (const [dx, dy] of candidates) { const result = make(dx!, dy!); if (clear(result)) return result; }
  for (let step = 1; step <= 24; step++) {
    const result = make(0, 35 + step * 29);
    if (clear(result)) return result;
  }
  return make(0, -31);
}
