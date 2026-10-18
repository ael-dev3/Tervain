/** Reverse only the candidate's shader edits; leave the compiled scene/renderer intact. */
export function applyGrassFacingVariant(shader,p,mode){
 if(mode==='after')return;
 let s=shader.vertexShader;
 const swap=(a,b)=>{if(s.split(a).length!==2)throw Error('Facing patch marker mismatch');s=s.replace(a,b);};
 swap(p.after.coverage,'');swap('float gFace =',p.before.coverage+'\nfloat gFace =');
 if(mode==='before'){
  swap(p.after.tangent,p.before.tangent);swap(p.after.rounding,p.before.rounding);
  swap('float gFaceDot = dot(gN, gToEye);\nif (gFaceDot < 0.0) gN = -gN;','if (dot(gN, gToEye) < 0.0) gN = -gN;');
 }else if(mode!=='opt-only')throw Error('Unknown facing variant');
 shader.vertexShader=s;
}
