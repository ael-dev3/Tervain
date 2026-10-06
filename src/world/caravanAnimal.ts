import { WAGON, type V2 } from './layout';

/** The working mount rests off the waystation lane, beside the caravan's transport equipment. */
export const CARAVAN_ANIMAL_REST = {
  x: WAGON.x - 3.8,
  z: WAGON.z + 4.9,
  yaw: 0,
  radius: 2,
  railZ: 2.05,
  railHalfWidth: 1.6,
  trough: { x: -2.12, z: .72, width: .64, depth: 1.05, height: .44 },
  baggage: { x: 2.12, z: .72, width: .63, depth: .58, height: .55 },
} as const;

export function caravanAnimalPoint(x: number, z: number): V2 {
  const c = Math.cos(CARAVAN_ANIMAL_REST.yaw), s = Math.sin(CARAVAN_ANIMAL_REST.yaw);
  return { x: CARAVAN_ANIMAL_REST.x + x * c + z * s, z: CARAVAN_ANIMAL_REST.z - x * s + z * c };
}
