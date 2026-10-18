// CDP preload for renderer-thread CPU probes only; never image proof.
(() => {
  globalThis.__tervainCpuNoRaster = true;
  const get = HTMLCanvasElement.prototype.getContext;
  const seen = new WeakSet();
  HTMLCanvasElement.prototype.getContext = function (...args) {
    const gl = get.apply(this, args);
    if (gl && (args[0] === 'webgl2' || args[0] === 'webgl') && !seen.has(gl)) {
      seen.add(gl);
      for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements']) if (gl[name]) gl[name] = () => {};
    }
    return gl;
  };
})();
