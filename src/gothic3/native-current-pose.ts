/** Source pose-state extraction used by gCNPC_PS::TrackCurrentPose.
 *
 * This maps one currently playing native motion filename into the two pose
 * candidates and blend weight written by Game:202f90c0. It does not choose
 * animation clips, run an NPC task, or reproduce multi-layer actor blending.
 */
export interface NativeTrackedPose {
  /** The first pose after the native transition-direction branch. */
  readonly primaryPose: number;
  /** The alternate pose paired with primaryPose by the native track reader. */
  readonly alternatePose: number;
  /** Native single-track blend weight, rounded to the stored float32 value. */
  readonly blendWeight: number;
  readonly normalizedPlayTime: number;
  readonly motionFilename: string;
  readonly evidence: 'Game:202f90c0';
}

export type NativeTrackedPoseResult =
  | { readonly status: 'resolved'; readonly value: NativeTrackedPose; readonly evidence: readonly ['Game:202f90c0'] }
  | { readonly status: 'unsupported'; readonly reason: string; readonly dependencies: readonly string[] };

function poseCodeAtUnderscore(filename: string, ordinal: number): number | null {
  let separator = -1;
  for (let index = 0; index < ordinal; index++) {
    separator = filename.indexOf('_', separator + 1);
    if (separator < 0) return null;
  }

  const major = filename[separator + 2] ?? '\0';
  const minor = filename[separator + 3] ?? '\0';
  if (major === '0') {
    if (minor === '0') return 5;
    if (minor === '1') return 6;
    if (minor === '2') return 7;
    if (minor === '3') return 8;
  } else if (major === '1') {
    if (minor === '0') return 9;
    if (minor === '1') return 10;
    if (minor === '2') return 11;
    if (minor === '3') return 12;
    if (minor === '_') return 2;
  } else if (major === '2') {
    if (minor === '0') return 13;
    if (minor === '1') return 14;
    if (minor === '2') return 15;
    if (minor === '3') return 16;
    if (minor === '_') return 3;
  } else if (major === '3') {
    if (minor === '0') return 17;
    if (minor === '1') return 18;
    if (minor === '2') return 19;
    if (minor === '3') return 20;
    if (minor === '_') return 4;
  } else if (minor === '0') {
    if (major === '4') return 21;
    if (major === '5') return 22;
    if (major === '6') return 23;
    if (major === '7') return 24;
  }

  // The native switch initializes each pose candidate to enum value 1 and
  // leaves it there when the encoded pose suffix has no recognized branch.
  return 1;
}

/** Reproduces the filename/time portion of TrackCurrentPose for one motion.
 * `transitionState` is the native actor flag at emfx2Actor+0x74 and must be
 * captured by the live animation host; it is never inferred from the clip.
 */
export function trackNativePoseFromMotion(filename: string, playTime: number, maxTime: number,
  transitionState: number): NativeTrackedPoseResult {
  if (typeof filename !== 'string' || filename.length === 0) {
    return { status: 'unsupported', reason: 'A live native motion filename is required.', dependencies: ['motion-filename'] };
  }
  if (!Number.isFinite(playTime) || !Number.isFinite(maxTime) || maxTime < 0) {
    return { status: 'unsupported', reason: 'Native motion times must be finite and the maximum nonnegative.', dependencies: ['motion-time'] };
  }
  if (transitionState !== 0 && transitionState !== 1) {
    return { status: 'unsupported', reason: 'The live actor transition-direction flag must be captured as 0 or 1.', dependencies: ['actor-transition-state'] };
  }

  const initialPose = poseCodeAtUnderscore(filename, 4);
  const alternatePose = poseCodeAtUnderscore(filename, 12);
  if (initialPose === null || alternatePose === null) {
    return { status: 'unsupported', reason: 'The motion filename does not contain the native fourth and twelfth pose separators.', dependencies: ['native-motion-name-layout'] };
  }

  const normalizedPlayTime = maxTime > 0 ? playTime / maxTime : 0;
  let primaryPose = initialPose;
  let secondaryPose = alternatePose;
  let blendWeight = Math.fround(1 - normalizedPlayTime);
  if ((normalizedPlayTime > 0.5 && transitionState === 0) ||
      (normalizedPlayTime <= 0.5 && transitionState === 1)) {
    blendWeight = Math.fround(normalizedPlayTime);
    [primaryPose, secondaryPose] = [secondaryPose, primaryPose];
  }
  if (!Number.isFinite(blendWeight)) {
    return { status: 'unsupported', reason: 'Native pose blend weight exceeds the stored float32 domain.', dependencies: ['motion-time'] };
  }

  return { status: 'resolved', value: Object.freeze({ primaryPose, alternatePose: secondaryPose,
    blendWeight, normalizedPlayTime, motionFilename: filename, evidence: 'Game:202f90c0' }),
    evidence: ['Game:202f90c0'] };
}
