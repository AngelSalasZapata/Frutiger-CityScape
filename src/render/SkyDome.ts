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
  uniform float uStars;

  varying vec3 vWorldDirection;

  float hash(vec3 direction) {
    return fract(sin(dot(direction, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  }

  void main() {
    vec3 direction = normalize(vWorldDirection);

    float height = smoothstep(-0.08, 0.65, direction.y);
    vec3 color = mix(uHorizonColor, uTopColor, height);

    float sunDot = max(dot(direction, normalize(uSunDirection)), 0.0);
    color += uSunColor * pow(sunDot, 320.0) * 1.6;
    color += uSunColor * pow(sunDot, 6.0) * 0.12;

    float starNoise = hash(floor(direction * 420.0));
    float stars = step(0.9975, starNoise) * smoothstep(0.0, 0.4, direction.y);
    color += vec3(0.82, 0.94, 1.0) * stars * uStars * 1.4;

    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/**
 * Cúpula de cielo con degradado, halo solar y estrellas procedurales para los
 * temas nocturnos. Es geometría y no un skybox para poder cambiar la paleta
 * por tema sin cargar texturas.
 */
export class SkyDome {
  readonly object: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>

  private theme: ThemeDefinition

  constructor(theme: ThemeDefinition) {
    this.theme = theme
    const [sunX, sunY, sunZ] = theme.sky.sunDirection

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color(theme.sky.top) },
        uHorizonColor: { value: new THREE.Color(theme.sky.horizon) },
        uSunColor: { value: new THREE.Color(theme.sky.sun) },
        uSunDirection: { value: new THREE.Vector3(sunX, sunY, sunZ).normalize() },
        uStars: { value: theme.sky.stars ?? 0 },
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

  applyTheme(theme: ThemeDefinition): void {
    this.theme = theme
    const [sunX, sunY, sunZ] = theme.sky.sunDirection
    const uniforms = this.object.material.uniforms

    uniforms.uTopColor!.value.set(theme.sky.top)
    uniforms.uHorizonColor!.value.set(theme.sky.horizon)
    uniforms.uSunColor!.value.set(theme.sky.sun)
    uniforms.uSunDirection!.value.set(sunX, sunY, sunZ).normalize()
    uniforms.uStars!.value = theme.sky.stars ?? 0
  }

  applyDayCycle(daylight: number, sunDirection: THREE.Vector3): void {
    const twilight = new THREE.Color('#f09b74')
    const upperTwilight = new THREE.Color('#35579b')
    const uniforms = this.object.material.uniforms
    uniforms
      .uTopColor!.value.copy(upperTwilight)
      .lerp(new THREE.Color(this.theme.sky.top), daylight)
    uniforms
      .uHorizonColor!.value.copy(twilight)
      .lerp(new THREE.Color(this.theme.sky.horizon), daylight)
    uniforms.uSunDirection!.value.copy(sunDirection).normalize()
  }

  dispose(): void {
    this.object.geometry.dispose()
    this.object.material.dispose()
  }
}
