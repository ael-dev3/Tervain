import { describe, expect, it } from 'vitest';
import { clampMapView, fullMapView, mapCanvasPoint, MAP_BOUNDS, MAP_H, MAP_W, mapPointAt, mapWorldAt, mapX, mapZ, panMap, zoomMapAt } from '../../src/presentation/ui/mapProjection';

describe('regional map navigation', () => {
  it('keeps the ground under the cursor fixed while zooming away from the sheet edges', () => {
    const cursor = { x: MAP_W * .6, y: MAP_H * .43 };
    let view = fullMapView();
    const ground = mapWorldAt(view, cursor.x, cursor.y);
    for (const zoom of [2, 3.5, 1.5, 2.75]) {
      view = zoomMapAt(view, zoom, cursor.x, cursor.y);
      const after = mapWorldAt(view, cursor.x, cursor.y);
      expect(after.x).toBeCloseTo(ground.x);
      expect(after.z).toBeCloseTo(ground.z);
    }
  });

  it('clamps panning at all four edges without ever exposing empty canvas', () => {
    for (const zoom of [1, 1.2, 2, 4]) {
      const start = clampMapView({ ...fullMapView(), zoom });
      for (const [dx, dy] of [[1e6, 0], [-1e6, 0], [0, 1e6], [0, -1e6], [1e6, -1e6]]) {
        const view = panMap(start, dx!, dy!);
        const topLeft = mapPointAt(view, 0, 0), bottomRight = mapPointAt(view, MAP_W, MAP_H);
        expect(topLeft.x).toBeGreaterThanOrEqual(0);
        expect(topLeft.y).toBeGreaterThanOrEqual(0);
        expect(bottomRight.x).toBeLessThanOrEqual(MAP_W);
        expect(bottomRight.y).toBeLessThanOrEqual(MAP_H);
        if (dx! > 0) expect(topLeft.x).toBeCloseTo(0);
        if (dx! < 0) expect(bottomRight.x).toBeCloseTo(MAP_W);
        if (dy! > 0) expect(topLeft.y).toBeCloseTo(0);
        if (dy! < 0) expect(bottomRight.y).toBeCloseTo(MAP_H);
      }
    }
  });

  it('maps north, south, east and west to the actual world bounds', () => {
    const view = fullMapView();
    expect(mapWorldAt(view, 0, 0)).toEqual({ x: MAP_BOUNDS.x0, z: MAP_BOUNDS.z0 });
    expect(mapWorldAt(view, MAP_W, MAP_H)).toEqual({ x: MAP_BOUNDS.x1, z: MAP_BOUNDS.z1 });
    expect(mapWorldAt(view, MAP_W, 0)).toEqual({ x: MAP_BOUNDS.x1, z: MAP_BOUNDS.z0 });
    expect(mapWorldAt(view, 0, MAP_H)).toEqual({ x: MAP_BOUNDS.x0, z: MAP_BOUNDS.z1 });
  });

  it('converts CSS-scaled clicks to the same world coordinate and remains invertible while zoomed', () => {
    const target = { x: -180, z: -40 };
    const view = clampMapView({ x: mapX(target.x), y: mapZ(target.z), zoom: 2.5 });
    const canvasPoint = { x: MAP_W / 2, y: MAP_H / 2 };
    for (const scale of [.35, .75, 1, 1.35, 2]) {
      const rect = { left: 217, top: 143, width: MAP_W * scale, height: MAP_H * scale };
      const point = mapCanvasPoint(rect.left + canvasPoint.x * scale, rect.top + canvasPoint.y * scale, rect);
      const world = mapWorldAt(view, point.x, point.y);
      expect(world.x).toBeCloseTo(target.x);
      expect(world.z).toBeCloseTo(target.z);
    }
    const full = fullMapView();
    for (const point of [{ x: -210, z: 65 }, { x: 12, z: -75 }, { x: 90, z: 140 }]) {
      const world = mapWorldAt(full, mapX(point.x), mapZ(point.z));
      expect(world.x).toBeCloseTo(point.x); expect(world.z).toBeCloseTo(point.z);
    }
  });

  it('bounds finite zoom and recovers invalid centres and zoom without NaN or blank view', () => {
    for (const zoom of [-100, 0, .5, 1, 2, 4, 10, NaN, Infinity, -Infinity]) {
      const view = clampMapView({ x: NaN, y: Infinity, zoom });
      expect(view.zoom).toBeGreaterThanOrEqual(1); expect(view.zoom).toBeLessThanOrEqual(4);
      expect(Number.isFinite(view.x) && Number.isFinite(view.y) && Number.isFinite(view.zoom)).toBe(true);
      expect(mapPointAt(view, 0, 0).x).toBeGreaterThanOrEqual(0);
      expect(mapPointAt(view, MAP_W, MAP_H).y).toBeLessThanOrEqual(MAP_H);
    }
    expect(clampMapView({ ...fullMapView(), zoom: 10 }).zoom).toBe(4);
    expect(clampMapView({ ...fullMapView(), zoom: NaN })).toEqual(fullMapView());
  });
});
