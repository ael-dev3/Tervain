/** Explicit process data for the virtual browser Game ABI. These strings are
 * application inputs; they are not read from the installed Windows process,
 * browser URL, host environment or operating system. Native startup scans and
 * converts the retained live buffers through its actual source owners. */
import type { NativeWin32ProcessInputSelection } from './native-win32-process-inputs';

function ascii(value: string): readonly number[] {
  const bytes = Array.from(value, character => character.charCodeAt(0));
  if (bytes.some(byte => byte > 127)) throw new Error('Declared browser process input exceeds its ASCII ACP coverage');
  return Object.freeze(bytes);
}
const commandLine = ascii('"Gothic3.exe"\0');
const environment = ascii('GOTHIC3_BROWSER=1\0\0');
const wideEnvironment = Object.freeze(environment.flatMap(byte => [byte, 0]));

export const browserGameProcessInputs: NativeWin32ProcessInputSelection = Object.freeze({
  acpCodePage: 1252,
  conversionCoverage: 'ascii-explicit-positive-count',
  initialDirectionFlag: 0,
  commandLineA: Object.freeze({ kind: 'buffer', bytes: commandLine }),
  environmentW: Object.freeze({ kind: 'buffer', bytes: wideEnvironment }),
  environmentA: Object.freeze({ kind: 'buffer', bytes: environment }),
  releaseW: Object.freeze({ result: 1 }),
  releaseA: Object.freeze({ result: 1 }),
});
