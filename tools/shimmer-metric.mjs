/** Video-only temporal residuals, in decoded 8-bit luminance. No semantic grass classification or pass threshold. */
const gradients = new WeakMap();
function gradient(image, w, h) {
  let known = gradients.get(image);
  if (known) return known;
  const x = new Int16Array(image.length), y = new Int16Array(image.length);
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
    const k = j * w + i; x[k] = image[k + 1] - image[k - 1]; y[k] = image[k + w] - image[k - w];
  }
  known = { x, y }; gradients.set(image, known); return known;
}
const median = values => { if (!values.length) return 0; values.sort((a, b) => a - b); return values[Math.floor(values.length / 2)]; };
function bilinear(image, x, y, w) {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, k = j * w + i;
  return image[k] * (1 - u) * (1 - v) + image[k + 1] * u * (1 - v) + image[k + w] * (1 - u) * v + image[k + w + 1] * u * v;
}
function motion(current, other, w, h, block, radius) {
  const a = gradient(current, w, h), b = gradient(other, w, h), cols = Math.ceil(w / block), rows = Math.ceil(h / block);
  const result = [];
  for (let by = 0; by < rows; by++) for (let bx = 0; bx < cols; bx++) {
    const descriptors = [];
    for (let y = by * block + 3; y < Math.min(h - 2, (by + 1) * block); y += 4)
      for (let x = bx * block + 3; x < Math.min(w - 2, (bx + 1) * block); x += 4) descriptors.push([x, y, a.x[y * w + x], a.y[y * w + x]]);
    const cost = (dx, dy) => {
      if (!descriptors.length) return Infinity;
      let sum = 0;
      for (const [x, y, gx, gy] of descriptors) {
        const px = x + dx, py = y + dy;
        if (px < 1 || py < 1 || px >= w - 2 || py >= h - 2) return Infinity;
        sum += Math.abs(gx - bilinear(b.x, px, py, w)) + Math.abs(gy - bilinear(b.y, px, py, w));
      }
      return sum / (descriptors.length * 2);
    };
    let dx = 0, dy = 0, best = cost(0, 0);
    for (let y = -radius; y <= radius; y++) for (let x = -radius; x <= radius; x++) {
      const c = cost(x, y);
      if (c + .001 * (x * x + y * y) < best + .001 * (dx * dx + dy * dy)) { dx = x; dy = y; best = c; }
    }
    const ix = dx, iy = dy;
    // Quarter-pixel refinement reduces ordinary interpolation residuals during slow camera pans.
    for (const y of [-.5, -.25, 0, .25, .5]) for (const x of [-.5, -.25, 0, .25, .5]) {
      const c = cost(ix + x, iy + y);
      if (c < best) { dx = ix + x; dy = iy + y; best = c; }
    }
    result.push({ dx, dy, cost: best });
  }
  return { values: result, cols };
}
export function frameShimmer(previous, current, next, w, h, options = {}) {
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 16 || h < 16 || [previous, current, next].some(a => a.length !== w * h)) throw new Error('Invalid shimmer frame dimensions');
  if(options.sparkleMask && options.sparkleMask.length!==w*h)throw new Error('Invalid sparkle mask dimensions');
  const block = options.block ?? 16, radius = options.searchRadius ?? 8, threshold = options.threshold ?? 18, maxCost = options.maxCost ?? 24;
  if (!Number.isInteger(block) || block < 8 || !Number.isInteger(radius) || radius < 0 || radius > 64 || !(threshold > 0 && threshold <= 255)) throw new Error('Invalid shimmer options');
  const p = motion(current, previous, w, h, block, radius), n = motion(current, next, w, h, block, radius);
  const sample = (x, y) => {
    const b = Math.floor(y / block) * p.cols + Math.floor(x / block), a = p.values[b], c = n.values[b];
    if (a.cost > maxCost || c.cost > maxCost) return null;
    const px = x + a.dx, py = y + a.dy, nx = x + c.dx, ny = y + c.dy;
    if (Math.min(px, nx) < 1 || Math.min(py, ny) < 1 || Math.max(px, nx) >= w - 2 || Math.max(py, ny) >= h - 2) return null;
    return [bilinear(previous, px, py, w), bilinear(next, nx, ny, w)];
  };
  const dp = [], dn = [];
  for (let y = 2; y < h - 2; y += 4) for (let x = 2; x < w - 2; x += 4) {
    const pair = sample(x, y); if (!pair) continue;
    dp.push(current[y * w + x] - pair[0]); dn.push(current[y * w + x] - pair[1]);
  }
  const exposurePrevious = median(dp), exposureNext = median(dn), histogram = new Uint32Array(256);
  let validPixels = 0, sparklePixels = 0, maskedSparklePixels = 0, sum = 0;
  for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
    const pair = sample(x, y); if (!pair) continue;
    const value = current[y * w + x], baseline = (pair[0] + exposurePrevious + pair[1] + exposureNext) / 2;
    const residual = Math.abs(value - baseline);
    sum += residual; histogram[Math.min(255, Math.floor(residual))]++; validPixels++;
    const local = (current[y * w + x - 1] + current[y * w + x + 1] + current[(y - 1) * w + x] + current[(y + 1) * w + x]) / 4;
    if (value - baseline >= threshold && value - local >= threshold / 2) { sparklePixels++;if(options.sparkleMask?.[y*w+x])maskedSparklePixels++; }
  }
  let count = 0, shimmerP95 = 0;
  for (; shimmerP95 < 255; shimmerP95++) { count += histogram[shimmerP95]; if (count >= validPixels * .95) break; }
  return { validPixels, validShare: validPixels / ((w - 4) * (h - 4)), sparklePixels,
    sparkleShare: validPixels ? sparklePixels / validPixels : null, shimmerMean: validPixels ? sum / validPixels : null,
    shimmerP95: validPixels ? shimmerP95 : null, exposurePrevious, exposureNext,
    ...(options.sparkleMask?{maskedSparklePixels,maskedSparkleShare:validPixels?maskedSparklePixels/validPixels:null}:{}) };
}
export function summarizeShimmer(samples) {
  const usable = samples.filter(s => s.validPixels > 0), pixels = usable.reduce((a, s) => a + s.validPixels, 0);
  const sorted = usable.map(s => s.shimmerMean).sort((a, b) => a - b);
  return { frames: samples.length, usableFrames: usable.length,
    shimmerMean: pixels ? usable.reduce((a, s) => a + s.shimmerMean * s.validPixels, 0) / pixels : null,
    shimmerFrameP95: sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .95))] : null,
    sparkleShare: pixels ? usable.reduce((a, s) => a + s.sparklePixels, 0) / pixels : null,
    alignmentShare: samples.length ? samples.reduce((a, s) => a + s.validShare, 0) / samples.length : 0,
    peaks: [...usable].sort((a, b) => b.sparkleShare - a.sparkleShare || b.shimmerMean - a.shimmerMean).slice(0, 10) };
}
