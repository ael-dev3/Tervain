import { expect, it } from 'vitest';
// @ts-expect-error Tool modules run directly in Node and the browser.
import { recordBudgetFrames } from '../../tools/budget-frame-samples.mjs';

it('records completed frames rather than repeated reads of stale counters', () => {
  let calls = 285, triangles = 3061335;
  const app = { perf: { end() { return { calls, triangles }; } } };
  const original = app.perf.end, recorder = recordBudgetFrames(app);
  expect(recorder.samples).toEqual([]);
  const first = app.perf.end();
  expect(first.calls).toBe(285);
  calls = 226; triangles = 2414180;
  expect(recorder.samples).toHaveLength(1); // no new completed frame, no new sample
  for (let i = 0; i < 3; i++) app.perf.end();
  expect(recorder.samples).toEqual([[285,3061335],[226,2414180],[226,2414180],[226,2414180]]);
  app.perf.end();
  expect(recorder.samples).toHaveLength(4);
  recorder.stop();
  expect(app.perf.end).toBe(original);
});

it('preserves receiver, arguments, return values and exceptions', () => {
  const frame = { calls: 1, triangles: 2 };
  const app = { perf: { value: frame, end(fail: boolean) { if (fail) throw new Error('frame failed'); return this.value; } } };
  const recorder = recordBudgetFrames(app);
  expect(app.perf.end(false)).toBe(frame);
  expect(() => app.perf.end(true)).toThrow('frame failed');
  expect(recorder.samples).toHaveLength(1);
  recorder.stop();
});

it('does not overwrite a later hook when stopped', () => {
  const app = { perf: { end() { return { calls: 1, triangles: 2 }; } } };
  const recorder = recordBudgetFrames(app), wrapped = app.perf.end;
  const later = () => wrapped(); app.perf.end = later;
  recorder.stop(); app.perf.end();
  expect(app.perf.end).toBe(later);
  expect(recorder.samples).toEqual([]);
});

it('rejects missing meters and invalid limits instead of inventing samples', () => {
  expect(() => recordBudgetFrames({})).toThrow();
  expect(() => recordBudgetFrames({ perf: { end() {} } }, 0)).toThrow();
  const app = { perf: { end() { return { calls: NaN, triangles: 2 }; } } };
  const recorder = recordBudgetFrames(app);
  expect(() => app.perf.end()).toThrow('Invalid completed-frame budget');
  expect(recorder.samples).toEqual([]);
  recorder.stop();
});
