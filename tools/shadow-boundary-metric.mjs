/** Shadow-factor edge response on a projected quadrilateral; diagnostic, not a calibrated quality score. */
export function shadowBoundaryMetric(image,w,h,corners,{band=2,threshold=18}={}) {
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<16||h<16||image.length!==w*h||!Array.isArray(corners)||corners.length!==4||corners.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)))||!(band>0&&band<=16)||!(threshold>0&&threshold<=255))throw new Error('Invalid shadow boundary inputs');
 const turns=corners.map((a,i)=>{const b=corners[(i+1)%4],c=corners[(i+2)%4];return(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);});
 if(turns.some(t=>t===0)||!turns.every(t=>Math.sign(t)===Math.sign(turns[0])))throw new Error('Nonconvex shadow boundary');
 const points=corners.map(([x,y])=>[x*(w-1),y*(h-1)]),centre=points.reduce((c,p)=>[c[0]+p[0]/4,c[1]+p[1]/4],[0,0]);
 const sample=(x,y)=>{if(x<0||y<0||x>=w-1||y>=h-1)return null;const i=Math.floor(x),j=Math.floor(y),u=x-i,v=y-j,k=j*w+i;return image[k]*(1-u)*(1-v)+image[k+1]*u*(1-v)+image[k+w]*(1-u)*v+image[k+w+1]*u*v;};
 const edges=points.map((a,e)=>{const b=points[(e+1)%4],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<4)throw new Error('Degenerate shadow boundary');let nx=-dy/length,ny=dx/length;const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;if(nx*(mx-centre[0])+ny*(my-centre[1])<0){nx=-nx;ny=-ny;}let samples=0,affected=0,whiteOutside=0,sum=0,max=0;
  for(let i=1;i<Math.floor(length);i++){const t=i/Math.floor(length);if(t<.05||t>.95)continue;const x=a[0]+dx*t,y=a[1]+dy*t,inside=sample(x-nx*band,y-ny*band),outside=sample(x+nx*band,y+ny*band);if(inside===null||outside===null)continue;const jump=outside-inside;samples++;if(jump>=threshold)affected++;if(outside>=250)whiteOutside++;sum+=Math.max(0,jump);max=Math.max(max,jump);}
  return{samples,affected,affectedShare:samples?affected/samples:null,outsideWhiteShare:samples?whiteOutside/samples:null,meanPositiveJump:samples?sum/samples:null,maxJump:max};
 });
 const samples=edges.reduce((n,e)=>n+e.samples,0),affected=edges.reduce((n,e)=>n+e.affected,0);
 return{edges,samples,affected,affectedShare:samples?affected/samples:null,complete:edges.every(e=>e.samples>0),interpretation:'luminance jump across the projected native shadow-map boundary; candidates require comparison with gameplay captures'};
}
