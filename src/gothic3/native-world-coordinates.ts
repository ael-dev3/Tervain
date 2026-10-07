/** Browser exploration uses a scene-relative origin and camera-eye height;
 * the original Navigation map queries absolute, unreflected centimetres. */
export const GOTHIC3_HERO_EYE_HEIGHT_METRES = 1.65;

export function browserHeroPositionToNativeCm(
  eyePositionMetres: readonly [number, number, number],
  legacyOriginMetres: readonly [number, number, number],
): readonly [number, number, number] {
  if (![...eyePositionMetres, ...legacyOriginMetres].every(Number.isFinite)) {
    throw new Error('Finite browser position and scene origin are required.');
  }
  return Object.freeze([
    Math.fround((eyePositionMetres[0] + legacyOriginMetres[0]) * 100),
    Math.fround((eyePositionMetres[1] + legacyOriginMetres[1] - GOTHIC3_HERO_EYE_HEIGHT_METRES) * 100),
    Math.fround(-(eyePositionMetres[2] + legacyOriginMetres[2]) * 100),
  ]);
}
