import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';

const sha = (raw: Uint8Array) => createHash('sha256').update(raw).digest('hex');
interface Method {
  bodyVA: string; instructionCount: number; bodyByteCount: number;
  bodyInstructionBytesSha256: string; assemblySha256: string; cSha256: string;
}
for (const packageName of ['arena-property-registration', 'arena-status-descriptor']) {
  it(`preserves the original instruction and C evidence for ${packageName}`, () => {
    const base = `assets/gothic3/${packageName}/`;
    const source = JSON.parse(readFileSync(base + 'source.json', 'utf8'));
    expect(source.sourceOnly).toBe(true);
    expect(source.wholeCrtTraversalCompleted).toBe(false);
    for (const method of Object.values(source.methods) as Method[]) {
      const body = method.bodyVA.slice(2);
      const assembly = readFileSync(base + body + '.asm.txt');
      expect(sha(assembly)).toBe(method.assemblySha256);
      expect(sha(readFileSync(base + body + '.c.txt'))).toBe(method.cSha256);
      const rows = assembly.toString('utf8').trim().split('\n');
      const bytes = Buffer.concat(rows.map(row => Buffer.from(row.split(' | ')[1]!, 'hex')));
      expect(rows.length).toBe(method.instructionCount);
      expect(bytes.length).toBe(method.bodyByteCount);
      expect(sha(bytes)).toBe(method.bodyInstructionBytesSha256);
    }
  });
}
it('pins the Status owner dispatch and cold descriptor independently of runtime execution', () => {
  const source = JSON.parse(readFileSync('assets/gothic3/arena-status-descriptor/source.json', 'utf8'));
  expect(source.vtableAddress).toBe('20659aec');
  expect(source.slots['10']).toBe('2001af23');
  expect(source.methods.statusVirtualSlot10.bodyInstructionBytesSha256)
    .toBe('38058506e8e859d5be73a33baa621352c08ea01f2224ee170173253757193941');
  expect(source.coldDescriptor.address).toBe('207b5038');
  expect(source.coldDescriptor.raw).toBe('00'.repeat(36));
  expect(source.nameLiteral).toEqual({ address: '20657534', raw: '53746174757300' });
});
