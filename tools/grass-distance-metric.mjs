/** Decode geometric one-hot distance labels after linear screen resampling. */
export function grassDistanceBucket(r,g,b) {
 const sum=r+g+b,max=Math.max(r,g,b);
 return sum<64?255:max<.8*sum?3:r>=g&&r>=b?0:g>=b?1:2;
}
/** Exact decoded-RGB luminance in 1/10000 units, avoiding threshold round-off. */
export const grassLuminanceUnits=(r,g,b)=>2126*r+7152*g+722*b;
