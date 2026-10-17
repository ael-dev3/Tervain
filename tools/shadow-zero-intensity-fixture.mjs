/** Runs the actual shadow kernel in a tiny independent WebGL2 context, counting executed comparison taps. */
export function shadowZeroIntensityFixture(nativeSource, guard) {
  // Three's formatting includes a space before the opening parenthesis.
  const functionText = name => {
    const match = new RegExp('float ' + name + '\\s*\\(').exec(nativeSource);
    if (!match) throw Error('Missing shader function: ' + name);
    const start = match.index, open = nativeSource.indexOf('{', start);
    let depth = 1, end = open + 1;
    while (depth && end < nativeSource.length) { if (nativeSource[end] === '{') depth++; if (nativeSource[end] === '}') depth--; end++; }
    if (depth) throw Error('Unclosed shader function: ' + name);
    return nativeSource.slice(start, end);
  };
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
  const gl = canvas.getContext('webgl2', {antialias: false, alpha: false, preserveDrawingBuffer: true});
  if (!gl) throw Error('No fixture WebGL2 context');
  const compile = (type, source) => {
    const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const vs = compile(gl.VERTEX_SHADER, `#version 300 es
    void main(){vec2 p=gl_VertexID==0?vec2(-1.,-1.):gl_VertexID==1?vec2(3.,-1.):vec2(-1.,3.);gl_Position=vec4(p,0.,1.);}`);
  const helper = name => functionText(name);
  const tap = helper('tvShadowTap').replace('{', '{ taps += 1.0;');
  const original = helper('getShadow'), candidate = original.replace('{', '{\n' + guard);
  const noise = helper('interleavedGradientNoise');
  // Vogel's helper returns vec2 rather than float.
  const vogelStart = nativeSource.indexOf('vec2 vogelDiskSample'), vogelOpen = nativeSource.indexOf('{', vogelStart), vogelEnd = nativeSource.indexOf('}', vogelOpen) + 1;
  if (vogelStart < 0) throw Error('Missing Vogel sampler');
  const vogel = nativeSource.slice(vogelStart, vogelEnd);
  const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
  gl.disable(gl.DITHER); gl.viewport(0, 0, 1, 1);
  const patterns = {lit: [0.9,0.9,0.9,0.9], dark: [0.1,0.1,0.1,0.1], edge: [0.1,0.9,0.9,0.1]};
  const rows = [];
  try {
    for (const [mode, kernel] of [['before', original], ['after', candidate]]) {
      const fs = compile(gl.FRAGMENT_SHADER, `#version 300 es
        precision highp float; precision highp sampler2DShadow;
        #define PI2 6.283185307179586
        out vec4 colour; uniform sampler2DShadow depthMap; uniform float intensity; uniform float radius; uniform float outside;
        float taps=0.0;
        ${noise}\n${vogel}\n${tap}\n${kernel}
        void main(){float value=getShadow(depthMap,vec2(2.),intensity,0.,radius,vec4(outside>.5?1.1:.5,.5,.5,1.));colour=vec4(value,taps/255.,0.,1.);}`);
      const program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
      gl.useProgram(program); gl.uniform1i(gl.getUniformLocation(program, 'depthMap'), 0);
      for (const [pattern, depths] of Object.entries(patterns)) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, 2, 2, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, new Uint32Array(depths.map(v => Math.round(v * 0xffffffff))));
        for (const intensity of [0, .5, 1, -.2]) for (const radius of [-1, 1]) for (const outside of [0, 1]) {
          gl.uniform1f(gl.getUniformLocation(program, 'intensity'), intensity); gl.uniform1f(gl.getUniformLocation(program, 'radius'), radius); gl.uniform1f(gl.getUniformLocation(program, 'outside'), outside);
          gl.drawArrays(gl.TRIANGLES, 0, 3); const pixel = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
          rows.push({mode, pattern, intensity, radius, outside, shadowByte: pixel[0], taps: pixel[1]});
        }
      }
      gl.deleteProgram(program); gl.deleteShader(fs);
    }
    if (gl.getError() !== gl.NO_ERROR) throw Error('Fixture WebGL error');
  } finally { gl.deleteTexture(texture); gl.deleteShader(vs); gl.getExtension('WEBGL_lose_context')?.loseContext(); }
  const before = rows.filter(r => r.mode === 'before'), after = rows.filter(r => r.mode === 'after');
  const pass = before.every((a,i) => a.shadowByte === after[i].shadowByte && (a.intensity === 0 ? after[i].taps === 0 : a.taps === after[i].taps))
    && before.some(r => r.intensity === 0 && r.taps > 0);
  return {rows, pass};
}
