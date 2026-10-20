/** Explicit gradients keep mip selection defined when a fragment skips the distant bark reads. */
export const BARK_SAMPLE_GLSL = /* glsl */ `
        vec4 tvBarkSample(sampler2D barkMap, vec3 p, vec3 weights, vec3 dx, vec3 dy) {
          return textureGrad(barkMap, p.zy, dx.zy, dy.zy) * weights.x
               + textureGrad(barkMap, p.xz, dx.xz, dy.xz) * weights.y
               + textureGrad(barkMap, p.xy, dx.xy, dy.xy) * weights.z;
        }`;

/** Keep the blend and height derivatives outside the branch, including mixed near/far pixel quads. */
export const BARK_READ_GLSL = /* glsl */ `
        float tvBarkClose = 1.0 - smoothstep(45.0, 100.0, length(vViewPosition));
        vec3 tvBarkDx = dFdx(tvBarkCoordinates), tvBarkDy = dFdy(tvBarkCoordinates);
        vec3 tvBarkAlbedo = vec3(0.0);
        vec2 tvBarkReliefRoughness = vec2(0.0);
        if (tvBarkClose > 0.0) {
          tvBarkAlbedo = tvBarkSample(tvBarkColour, tvBarkCoordinates, tvBarkWeights, tvBarkDx, tvBarkDy).rgb;
          tvBarkReliefRoughness = tvBarkSample(tvBarkSurface, tvBarkCoordinates, tvBarkWeights, tvBarkDx, tvBarkDy).rg;
        }`;
