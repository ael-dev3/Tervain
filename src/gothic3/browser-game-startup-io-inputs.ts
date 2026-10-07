/** Declared startup data for a fresh browser Game CRT invocation. These writes
 * describe the virtual process; they are not captured host Windows values. */
import type { NativeWin32StartupIoSelection } from './native-win32-startup-io';

export const browserGameStartupIoInputs: NativeWin32StartupIoSelection = Object.freeze({
  startupInfoA: Object.freeze({
    outcome: 'normal' as const,
    writes: Object.freeze([
      Object.freeze({ offset: 0, width: 4 as const, value: 68, knownMask: 0xffffffff }),
      Object.freeze({ offset: 0x32, width: 2 as const, value: 0, knownMask: 0xffff }),
      Object.freeze({ offset: 0x34, width: 4 as const, value: 0, knownMask: 0xffffffff }),
    ]),
  }),
});
