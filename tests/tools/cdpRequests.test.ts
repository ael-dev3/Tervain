import { afterEach, expect, it, vi } from 'vitest';
import { cdpRequests } from '../../tools/cdp.mjs';
afterEach(() => vi.useRealTimers());
it('resolves responses without confusing screencast acknowledgements and queries', async () => {
  vi.useFakeTimers();
  const sent: { id: number; method: string }[] = [], requests = cdpRequests(m => sent.push(m));
  const ack = requests.nextId(), pending = requests.send('Runtime.evaluate');
  expect(requests.reply({ id: ack })).toBe(false);
  const reply = { id: sent[0]!.id, result: { value: 1 } };
  expect(requests.reply(reply)).toBe(true); expect(await pending).toEqual(reply);
  expect(vi.getTimerCount()).toBe(0);
});
it('rejects protocol errors and clears their timers', async () => {
  vi.useFakeTimers();
  const requests = cdpRequests(() => {}), pending = requests.send('Runtime.evaluate');
  const rejected = expect(pending).rejects.toThrow('CDP Runtime.evaluate failed: invalid');
  requests.reply({ id: 1, error: { message: 'invalid' } }); await rejected;
  expect(vi.getTimerCount()).toBe(0);
});
it('bounds hung awaited evaluations', async () => {
  vi.useFakeTimers();
  const requests = cdpRequests(() => {}, 10), pending = requests.send('Runtime.evaluate');
  const rejected = expect(pending).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(11); await rejected;
  expect(requests.reply({ id: 1 })).toBe(false); expect(vi.getTimerCount()).toBe(0);
});
it('settles all pending checks on disconnect and rejects subsequent requests immediately', async () => {
  vi.useFakeTimers();
  const write = vi.fn(), requests = cdpRequests(write);
  const first = expect(requests.send('Runtime.evaluate')).rejects.toThrow('connection closed');
  const second = expect(requests.send('Page.captureScreenshot')).rejects.toThrow('connection closed');
  requests.close(); await Promise.all([first, second]);
  await expect(requests.send('Runtime.evaluate')).rejects.toThrow('connection closed');
  expect(write).toHaveBeenCalledTimes(2); expect(vi.getTimerCount()).toBe(0);
});
it('clears a request when writing to a dead socket throws', async () => {
  vi.useFakeTimers();
  const requests = cdpRequests(() => { throw new Error('socket closed'); });
  await expect(requests.send('Runtime.evaluate')).rejects.toThrow('socket closed');
  expect(vi.getTimerCount()).toBe(0);
});
