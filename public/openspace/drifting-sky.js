import * as THREE from 'three';

// Animate only the visible panorama, never the environment used for lighting.
// One inexpensive sky draw, with no reflection passes or volumetric marching.
export function createDriftingSky(texture) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: { panorama: { value: texture } },
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      vertexShader: `
        varying vec3 skyDirection;
        void main() {
          skyDirection = position;
          // Ignore translation for a distant sky, including stereo eye offsets.
          vec3 direction = mat3(viewMatrix) * mat3(modelMatrix) * position;
          vec4 clip = projectionMatrix * vec4(direction, 1.0);
          gl_Position = clip.xyww;
        }
      `,
      fragmentShader: `
        uniform sampler2D panorama;
        varying vec3 skyDirection;
        void main() {
          vec3 direction = normalize(skyDirection);
          vec2 uv = vec2(
            atan(direction.z, direction.x) * 0.15915494309189535 + 0.5,
            asin(clamp(direction.y, -1.0, 1.0)) * 0.3183098861837907 + 0.5
          );
          gl_FragColor = vec4(texture2D(panorama, uv).rgb, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    }),
  );
  sky.name = 'Slow cloud drift';
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  sky.visible = false;
  return {
    mesh: sky,
    update(delta, reducedMotion) {
      if (!sky.visible || reducedMotion) return;
      // About seven degrees per minute. Clamp resumed-tab deltas to avoid jumps.
      sky.rotation.y = (sky.rotation.y + Math.max(0, Math.min(delta, 0.1)) * 0.002) % (Math.PI * 2);
    },
  };
}
