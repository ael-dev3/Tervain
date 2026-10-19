/** Record distinct completed game frames, never repeated wall-clock reads of renderer.info. */
export function recordBudgetFrames(app, limit = 4) {
  if (!Number.isInteger(limit) || limit < 1 || !app?.perf || typeof app.perf.end !== 'function') throw new Error('Budget recorder requires a frame meter and a positive sample limit');
  const meter = app.perf, original = meter.end, samples = [];
  let active = true;
  function end(...args) {
    const result = original.apply(this, args);
    if (active && samples.length < limit) {
      if (!Number.isFinite(result?.calls) || !Number.isFinite(result?.triangles)) throw new Error('Invalid completed-frame budget');
      samples.push([result.calls, result.triangles]);
    }
    return result;
  }
  meter.end = end;
  return { samples, stop() { active = false; if (meter.end === end) meter.end = original; } };
}
