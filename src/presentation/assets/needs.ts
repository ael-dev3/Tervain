import type { AssetNeed } from './library';
import { NEEDS as groundcover } from '../groundcover';
import { NEEDS as people } from '../characters';
import { NEEDS as settlement } from '../settlement';
import { NEEDS as wildlife } from '../wildlife';

/** Everything the scene modules ask for, de-duplicated by the library when preloading. */
export const ALL_NEEDS: AssetNeed[] = [...groundcover, ...people, ...settlement, ...wildlife];
