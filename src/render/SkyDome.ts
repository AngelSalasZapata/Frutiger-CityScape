import * as THREE from 'three'

import type { ThemeDefinition } from './theme'

const VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldDirection;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldDirection = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uTopColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;

  varying vec3 vWorldDirection;

  void main() {
    vec3 direction = normalize(vWorldDirection);

    float height = smoothstep(-0.08, 0.65, direction.y);
    vec3 color = mix(uHorizonColor, uTopColor, height);

    float sunDot = max(dot(direction, normalize(uSunDirection)), 0.0);
    color += uSunColor * pow(sunDot, 320.0) * 1.6;
    color += uSunColor * pow(sunDot, 6.0) * 0.12;

    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/**
 * Cúpula de cielo con degradado y halo solar. Es geometría y no un skybox
 * para poder cambiar la paleta por tema sin cargar texturas.
 */
export class SkyDome {
  readonly object: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>

  constructor(theme: ThemeDefinition) {
    const [sunX, sunY, sunZ] = theme.sky.sunDirection

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color(theme.sky.top) },
        uHorizonColor: { value: new THREE.Color(theme.sky.horizon) },
        uSunColor: { value: new THREE.Color(theme.sky.sun) },
        uSunDirection: { value: new THREE.Vector3(sunX, sunY, sunZ).normalize() },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    })

    this.object = new THREE.Mesh(new THREE.SphereGeometry(800, 48, 32), material)
    this.object.name = 'sky-dome'
    this.object.frustumCulled = false
  }

  dispose(): void {
    this.object.geometry.dispose()
    this.object.material.dispose()
  }
}
