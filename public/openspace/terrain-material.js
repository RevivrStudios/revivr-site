import * as THREE from 'three';

// Four overlapping, independently oriented patches hide the photograph's
// repeat. Only the landscape's color lookup changes; no extra render pass.
export function softenTerrainTiling(material) {
  material.customProgramCacheKey = () => 'retreat-stochastic-ground-v1';
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_pars_fragment>', `
      #include <map_pars_fragment>
      #ifdef USE_MAP
      vec2 groundHash(vec2 p) {
        return fract(sin(vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3)))) * 43758.5453);
      }
      vec4 groundPatch(vec2 uv, vec2 cell) {
        vec2 seed = groundHash(cell);
        float angle = seed.x * 6.2831853;
        mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        return texture2D(map, rotation * uv + seed * 19.0);
      }
      vec4 blendedGround(vec2 uv) {
        vec2 grid = uv / 2.3;
        vec2 cell = floor(grid);
        vec2 weight = smoothstep(0.0, 1.0, fract(grid));
        return mix(
          mix(groundPatch(uv, cell), groundPatch(uv, cell + vec2(1.0,0.0)), weight.x),
          mix(groundPatch(uv, cell + vec2(0.0,1.0)), groundPatch(uv, cell + vec2(1.0,1.0)), weight.x),
          weight.y
        );
      }
      #endif
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',
      THREE.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )', 'blendedGround( vMapUv )'));
  };
}
