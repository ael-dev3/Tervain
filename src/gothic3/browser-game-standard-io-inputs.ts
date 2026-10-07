/** The browser's declared virtual process has three CHAR standard handles.
 * RuntimePlatform mints their opaque capabilities and performs the source's
 * physical critical-section registrations. These are not host console handles. */
import type { NativeWin32StandardIoSelection } from './native-win32-standard-io';

export const browserGameStandardIoInputs: NativeWin32StandardIoSelection = Object.freeze({
  standardHandles: Object.freeze([
    Object.freeze({ id: -10 as const, result: 'valid' as const, fileType: 2 }),
    Object.freeze({ id: -11 as const, result: 'valid' as const, fileType: 2 }),
    Object.freeze({ id: -12 as const, result: 'valid' as const, fileType: 2 }),
  ]),
  setHandleCount: Object.freeze({ result: 32 }),
  sectionInitialization: 'owned-registration',
});
