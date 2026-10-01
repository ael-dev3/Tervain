import * as THREE from 'three';

/**
 * Light from the brightest spirits on the bark, leaves and ground round the tree (and inside the hollow). A few soft,
 * colour-tinted point lights are packed into shared uniforms and added in the lit materials' own shaders, so the wood
 * shows each spirit's colour as it passes without adding scene lights (which would recompile every material) or
 * shadow maps. Light positions are in view space. Each light carries an "outside" weight: a spirit inside the trunk
 * lights only the hollow, never the bark around the door from within.
 */
export interface WispLighting {
  readonly count: number;
  readonly uniforms: {
    uWispLights: { value: THREE.Vector4[] };
    uWispColours: { value: THREE.Vector4[] };
  };
  /** Patch a MeshStandardMaterial's shader; call from its onBeforeCompile after any other patches. */
  patch(shader: { uniforms: Record<string, THREE.IUniform>; fragmentShader: string }): void;
  /** Distinguishes patched programs by light count. */
  readonly key: string;
}

/** The light loop added to the patched standard materials (the hollow's own shader has its own, unweighted). */
function wispLightGlsl(count: number): string {
  if (count <= 0) return '';
  return `{
    vec3 tvP = -vViewPosition;
    for (int i = 0; i < ${count}; i++) {
      vec4 tvC = uWispColours[i];
      float tvK = tvC.a;
      if (tvK <= 0.0) continue;
      vec3 tvL = uWispLights[i].xyz - tvP;
      float tvD2 = dot(tvL, tvL);
      float tvR = uWispLights[i].w;
      float tvAtt = clamp(1.0 - tvD2 / (tvR * tvR), 0.0, 1.0);
      tvAtt = tvAtt * tvAtt / (1.0 + tvD2 * 1.6);
      float tvWrap = clamp((dot(normal, tvL * inversesqrt(max(tvD2, 1e-4))) + 0.35) / 1.35, 0.0, 1.0);
      reflectedLight.directDiffuse += BRDF_Lambert(diffuseColor.rgb) * tvC.rgb * (tvK * tvAtt * tvWrap);
    }
  }`;
}

export function createWispLighting(count: number): WispLighting {
  const n = Math.max(0, Math.floor(count));
  const uniforms = {
    uWispLights: { value: Array.from({ length: Math.max(1, n) }, () => new THREE.Vector4(0, -1e4, 0, 1)) },
    uWispColours: { value: Array.from({ length: Math.max(1, n) }, () => new THREE.Vector4(0, 0, 0, 0)) },
  };
  return {
    count: n,
    uniforms,
    key: `wisp${n}`,
    patch(shader) {
      if (n === 0) return;
      shader.uniforms.uWispLights = uniforms.uWispLights;
      shader.uniforms.uWispColours = uniforms.uWispColours;
      shader.fragmentShader = `uniform vec4 uWispLights[${n}];\nuniform vec4 uWispColours[${n}];\n${shader.fragmentShader}`.replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>\n${wispLightGlsl(n)}`,
      );
    },
  };
}
