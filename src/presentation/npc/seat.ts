/**
 * Sitting on a real seat. A resident's seat contact (buttocks and the backs of the thighs) is measured on load
 * (npc/poseFit.ts); a seat's height then decides where the hips go and how the legs fold.
 */
export interface SeatMeasure {
  /** How far below the hip joint the seat contact lies with the thighs level (model bind metres). */
  drop: number;
  /** Hip joint to knee joint. */
  thigh: number;
  /** Knee joint to the soles. */
  shin: number;
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/**
 * Legs and hip drop for sitting on a seat `height` metres above the ground, for a figure drawn at `scale`: the seat
 * contact rests on the seat; thighs stay level unless the seat is high, when they slope so the soles still reach the
 * ground; on a low seat the shins reach forward instead. Angles in the poser's channels (thigh and knee on both legs).
 */
export function seatLegs(seat: SeatMeasure, height: number, scale: number, hipY: number): { lower: number; thigh: number; knee: number } {
  const hip = height / Math.max(0.1, scale) + seat.drop;
  const room = hip - seat.shin;
  let thigh = -1.55, knee = 1.5;
  if (room > 0.02) {
    thigh = Math.min(-0.9, -Math.acos(clamp(room / Math.max(0.1, seat.thigh), 0, 1)));
    knee = -thigh;
  } else {
    knee = 1.55 - Math.acos(clamp(hip / Math.max(0.1, seat.shin), 0, 1));
  }
  return { lower: (hip - hipY) / (hipY / 0.95), thigh, knee };
}
