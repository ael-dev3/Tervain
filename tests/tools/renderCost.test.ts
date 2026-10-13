import {afterEach, expect, it, vi} from 'vitest';
import {installRenderCost} from '../../tools/render-cost.mjs';
import {textureUploadBytes} from '../../tools/webgl-upload-bytes.mjs';
class GL {
 activeTexture(_u:number){} bindTexture(_t:number,_o:object|null){} deleteTexture(_o:object){}
 texImage2D(..._a:unknown[]){} texStorage2D(..._a:unknown[]){} generateMipmap(_t:number){}
 bufferData(..._a:unknown[]){} bufferSubData(..._a:unknown[]){} drawElements(..._a:unknown[]){}
}
afterEach(()=>vi.unstubAllGlobals());
function fixture(){class Context extends GL {} for(const name of Object.getOwnPropertyNames(GL.prototype).filter(n=>n!=='constructor'))Object.defineProperty(Context.prototype,name,{value:GL.prototype[name as keyof GL],writable:true,configurable:true});vi.stubGlobal('WebGLRenderingContext',undefined);vi.stubGlobal('WebGL2RenderingContext',Context);installRenderCost(textureUploadBytes);const gl=new Context();gl.bindTexture(3553,{});return{gl,state:(globalThis as unknown as {__renderCostStates:WeakMap<object,{uploads:number;draws:number;textures:Map<object,Map<string,{w:number;h:number;d:number;b:number}>>}>}).__renderCostStates.get(gl)!};}
function storage(s:ReturnType<typeof fixture>['state']){let bytes=0;for(const t of s.textures.values())for(const l of t.values())bytes+=l.w*l.h*l.d*l.b;return bytes;}
it('counts source bytes and element offsets without counting allocation-only buffers',()=>{const{gl,state}=fixture();gl.bufferData(34962,1024,35044);gl.bufferData(34962,new Float32Array(8),35044,2,3);gl.bufferSubData(34962,0,new Uint16Array(8),2,0);expect(state.uploads).toBe(24);gl.drawElements(4,3,5123,0);expect(state.draws).toBe(1);});
it('tracks sized mip storage, replacement and deletion',()=>{const{gl,state}=fixture();const texture={};gl.bindTexture(3553,texture);gl.texStorage2D(3553,3,34842,4,4);expect(storage(state)).toBe((16+4+1)*8);gl.texImage2D(3553,0,32856,4,4,0,6408,5121,null);expect(storage(state)).toBe(64+40);gl.deleteTexture(texture);expect(storage(state)).toBe(0);});
it('accounts for image upload bytes and generated mip levels separately',()=>{const{gl,state}=fixture();gl.texImage2D(3553,0,6408,6408,5121,{width:4,height:4});gl.generateMipmap(3553);expect(state.uploads).toBe(64);expect(storage(state)).toBe(84);});
