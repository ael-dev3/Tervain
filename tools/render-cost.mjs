/** Install before application startup; collect source upload bytes and nominal texture storage. */
export function installRenderCost(textureUploadBytes) {
  const states = new WeakMap();
  globalThis.__renderCostStates = states;
  function state(gl) {
    let s = states.get(gl);
    if (!s) { s = { uploads: 0, draws: 0, textures: new Map(), bindings: new Map(), unit: 33984, unknownFormats: 0 }; states.set(gl, s); }
    return s;
  }
  const target = t => t >= 34069 && t <= 34074 ? 34067 : t;
  function tex(s, t) { const object = s.bindings.get(`${s.unit}:${target(t)}`); if (!object) return null; let entry = s.textures.get(object); if (!entry) { entry = new Map(); s.textures.set(object, entry); } return entry; }
  // Nominal bytes per texel. Driver padding, compression and renderbuffers are outside this estimate.
  const sized = new Map([[32856,4],[32849,3],[33321,1],[33323,2],[33325,2],[33327,4],[34843,6],[34842,8],[33326,4],[33328,8],[34837,12],[34836,16],[33189,2],[33190,4],[36012,4],[35056,4],[36013,8],[35907,4],[35905,3]]);
  function bytes(s, format, type) {
    if (sized.has(format)) return sized.get(format);
    const channels = format === 6408 ? 4 : format === 6407 ? 3 : format === 33319 ? 2 : [6406,6409,6402,6403].includes(format) ? 1 : 0;
    if (channels) { if ([32819,32820,33635].includes(type)) return 2; return channels * ([5126,5125,5124].includes(type) ? 4 : [5131,36193,5123,5122].includes(type) ? 2 : 1); }
    s.unknownFormats++; return 4;
  }
  const observe = {
    activeTexture(s,a) { s.unit = a[0]; },
    bindTexture(s,a) { s.bindings.set(`${s.unit}:${target(a[0])}`, a[1]); },
    deleteTexture(s,a) { s.textures.delete(a[0]); },
    texImage2D(s,a) {
      const entry=tex(s,a[0]);if(!entry)return;
      const source=a.length===6?a[5]:null,w=source?(source.videoWidth??source.width??0):a[3],h=source?(source.videoHeight??source.height??0):a[4];
      entry.set(`${a[0]}:${a[1]}`, {w,h,d:1,b:bytes(s,a[2],a.length===6?a[4]:a[7])});
    },
    texImage3D(s,a) { tex(s,a[0])?.set(`${a[0]}:${a[1]}`,{w:a[3],h:a[4],d:a[5],b:bytes(s,a[2],a[8])}); },
    texStorage2D(s,a) { const entry=tex(s,a[0]);if(!entry)return;const faces=a[0]===34067?[34069,34070,34071,34072,34073,34074]:[a[0]];for(const face of faces)for(let l=0;l<a[1];l++)entry.set(`${face}:${l}`,{w:Math.max(1,a[3]>>l),h:Math.max(1,a[4]>>l),d:1,b:bytes(s,a[2])}); },
    texStorage3D(s,a) { const entry=tex(s,a[0]);if(!entry)return;for(let l=0;l<a[1];l++)entry.set(`${a[0]}:${l}`,{w:Math.max(1,a[3]>>l),h:Math.max(1,a[4]>>l),d:a[0]===35866?a[5]:Math.max(1,a[5]>>l),b:bytes(s,a[2])}); },
    generateMipmap(s,a) { const entry=tex(s,a[0]);if(!entry)return;for(const[key,base]of [...entry]){if(!key.endsWith(':0'))continue;for(let l=1;l<=Math.floor(Math.log2(Math.max(base.w,base.h)));l++)entry.set(`${key.slice(0,-1)}${l}`,{w:Math.max(1,base.w>>l),h:Math.max(1,base.h>>l),d:base.d,b:base.b});} },
  };
  for (const proto of [globalThis.WebGLRenderingContext?.prototype,globalThis.WebGL2RenderingContext?.prototype]) {
    if (!proto) continue;
    for (const name of [...Object.keys(observe),'bufferData','bufferSubData','texSubImage2D','texSubImage3D','compressedTexImage2D','compressedTexSubImage2D','drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']) {
      if (!Object.prototype.hasOwnProperty.call(proto,name) || typeof proto[name] !== 'function') continue;
      const original=proto[name];proto[name]=function(...a){const s=state(this);
        if(name==='bufferData'||name==='bufferSubData'){const i=name==='bufferData'?1:2,v=a[i];if(v?.byteLength!==undefined){const next=3;const offset=a[next]??0,length=a[next+1];s.uploads+=length>0?length*(v.BYTES_PER_ELEMENT??1):Math.max(0,v.byteLength-offset*(v.BYTES_PER_ELEMENT??1));}}
        else if (/^(texImage|texSubImage|compressedTex)/.test(name)) s.uploads+=textureUploadBytes(name,a);
        if(name.startsWith('draw'))s.draws++;
        observe[name]?.(s,a);return original.apply(this,a);};
    }
  }
}
