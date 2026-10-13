/** Inclusive segment/triangle contact, independent of material side. */
export function segmentTriangleHit(p,q,a,b,c) {
 const dx=q[0]-p[0],dy=q[1]-p[1],dz=q[2]-p[2];
 const ex=b[0]-a[0],ey=b[1]-a[1],ez=b[2]-a[2],fx=c[0]-a[0],fy=c[1]-a[1],fz=c[2]-a[2];
 const hx=dy*fz-dz*fy,hy=dz*fx-dx*fz,hz=dx*fy-dy*fx,det=ex*hx+ey*hy+ez*hz;
 if(Math.abs(det)<1e-12)return false;const inv=1/det,tx=p[0]-a[0],ty=p[1]-a[1],tz=p[2]-a[2],u=(tx*hx+ty*hy+tz*hz)*inv;
 if(u< -1e-8||u>1+1e-8)return false;const cx=ty*ez-tz*ey,cy=tz*ex-tx*ez,cz=tx*ey-ty*ex,v=(dx*cx+dy*cy+dz*cz)*inv;
 if(v< -1e-8||u+v>1+1e-8)return false;const t=(fx*cx+fy*cy+fz*cz)*inv;return t>=-1e-8&&t<=1+1e-8;
}
