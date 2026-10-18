/** Browser-side diagnostic hooks. No production material or geometry edits are persisted. */
export function installGrassDistanceProbe(T) {
 const R=T.renderer,scene=T.world.scene,camera=T.cam.camera;
 const mode={value:0},noSheen={value:0},noThrough={value:0};
 const sky=new Set();T.world.sky.group.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])sky.add(m);});
 const materials=new Set();scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])materials.add(m);});
 const endMain=s=>{const clean=s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,m=>' '.repeat(m.length)),match=/\bvoid\s+main\s*\(\s*(?:void)?\s*\)\s*\{/.exec(clean);if(!match)throw Error('Shader main missing');let depth=1;for(let i=match.index+match[0].length;i<clean.length;i++){if(clean[i]==='{')depth++;if(clean[i]==='}'&&!--depth)return i;}throw Error('Unclosed main');};
 const native=[];
 for(const m of materials){
  const old=m.onBeforeCompile,key=m.customProgramCacheKey.call(m),grass=m.name==='Tervain grass blades';
  if(grass)native.push({type:m.type,map:!!m.map,alphaMap:!!m.alphaMap,alphaTest:m.alphaTest,alphaToCoverage:m.alphaToCoverage,transparent:m.transparent,opacity:m.opacity,depthWrite:m.depthWrite});
  m.onBeforeCompile=function(s,r){old.call(this,s,r);Object.assign(s.uniforms,{tvProbeMode:mode,tvNoSheen:noSheen,tvNoThrough:noThrough});
   if(grass){
    for(const [marker,flag]of [['reflectedLight.directDiffuse += directLight.color * material.diffuseColor * sheen * G_SHEEN * 0.9;','tvNoSheen'],['reflectedLight.directDiffuse += directLight.color * material.diffuseColor * uTransTint * min( through * G_THROUGH, 0.45 );','tvNoThrough']]){
     if(!s.fragmentShader.includes(marker))throw Error('Native light marker missing');s.fragmentShader=s.fragmentShader.replace(marker,'if('+flag+'<0.5){'+marker+'}');
    }
    const e=endMain(s.vertexShader);s.vertexShader=s.vertexShader.slice(0,e)+'\nif(tvProbeMode>0.5)vGInfo=vec2(gDist,0.0);\n'+s.vertexShader.slice(e);s.vertexShader='uniform float tvProbeMode;\n'+s.vertexShader;
   }
   const label=grass?'vec3(1.0,0.0,0.0)':sky.has(m)?'vec3(0.0,0.0,1.0)':'vec3(0.0,1.0,0.0)';
   const bins=grass?'(vGInfo.x<20.0?vec3(1.0,0.0,0.0):vGInfo.x<60.0?vec3(0.0,1.0,0.0):vGInfo.x<120.0?vec3(0.0,0.0,1.0):vec3(0.0))':'vec3(0.0)';
   const e=endMain(s.fragmentShader);s.fragmentShader=s.fragmentShader.slice(0,e)+'\nif(tvProbeMode>1.5)gl_FragColor.rgb='+label+';else if(tvProbeMode>0.5)gl_FragColor.rgb='+bins+';\n'+s.fragmentShader.slice(e);
   s.fragmentShader='uniform float tvProbeMode;uniform float tvNoSheen;uniform float tvNoThrough;\n'+s.fragmentShader;
  };m.customProgramCacheKey=()=>key+'|grass-distance-diagnostic-v1';m.needsUpdate=true;
 }
 const rt=T.grade.target.clone();rt.depthTexture=null;rt.texture.type=1009;rt.texture.colorSpace='';rt.samples=4;
 const colour=()=>{mode.value=0;T.grade.render(scene,camera,0);const gl=R.getContext();if(gl.getError()||gl.isContextLost())throw Error('Invalid normal draw');};
 const mask=(kind=1,crop=null,width=R.domElement.width,height=R.domElement.height)=>{
  const oldTarget=R.getRenderTarget(),oldBackground=scene.background,clear=R.getClearColor([...materials].find(m=>m.color)?.color.clone()).clone(),alpha=R.getClearAlpha(),auto=R.autoClear;
  const w=crop?.width??width,h=crop?.height??height;rt.setSize(w,h);rt.viewport.set(0,0,w,h);rt.scissorTest=false;
  if(crop)camera.setViewOffset(width,height,crop.left,crop.top,w,h);
  mode.value=kind;scene.background=null;R.autoClear=true;R.setClearColor(0,0);
  try{R.setRenderTarget(rt);R.render(scene,camera);const pixels=new Uint8Array(w*h*4);R.readRenderTargetPixels(rt,0,0,w,h,pixels);const gl=R.getContext();if(gl.getError()||gl.isContextLost())throw Error('Invalid label draw');const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const flipped=new Uint8ClampedArray(pixels.length);for(let y=0;y<h;y++)flipped.set(pixels.subarray((h-1-y)*w*4,(h-y)*w*4),y*w*4);canvas.getContext('2d').putImageData(new ImageData(flipped,w,h),0,0);return {png:canvas.toDataURL('image/png').split(',')[1],width:w,height:h,samples:rt.samples};}
  finally{mode.value=0;R.setRenderTarget(oldTarget);R.setClearColor(clear,alpha);R.autoClear=auto;scene.background=oldBackground;if(crop)camera.clearViewOffset();}
 };
 return {native,mode,noSheen,noThrough,colour,mask,rt};
}
