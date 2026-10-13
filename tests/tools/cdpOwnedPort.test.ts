import { expect, it } from 'vitest';
import { ownedDebugPort } from '../../tools/cdp.mjs';

it('reads a complete launch-owned Chrome endpoint file, including Windows newlines', () => {
  expect(ownedDebugPort('42137\n/devtools/browser/fixture-browser\n')).toBe(42137);
  expect(ownedDebugPort('42138\r\n/devtools/browser/fixture-browser\r\n')).toBe(42138);
});

it('retries incomplete and malformed endpoint files instead of connecting elsewhere', () => {
  for (const content of ['', '42137', '42137\n', '42137\n/devtools/browser/', '42137\n/other/fixture', '42137\n/devtools/browser/fixture/extra']) {
    expect(ownedDebugPort(content)).toBeNull();
  }
});

it('rejects invalid, out-of-range and non-integer ports', () => {
  for (const port of ['0', '-1', '65536', '9007199254740992', '1.5', '42x', ' 42']) {
    expect(ownedDebugPort(`${port}\n/devtools/browser/fixture-browser`)).toBeNull();
  }
  expect(ownedDebugPort('1\n/devtools/browser/fixture-browser')).toBe(1);
  expect(ownedDebugPort('65535\n/devtools/browser/fixture-browser')).toBe(65535);
});
