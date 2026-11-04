import * as THREE from 'three'

import type { ThemeDefinition } from '@/render/theme'

import type { WorldPreset } from './WorldConfig'
import { worldScale } from './WorldConfig'

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;

  varying vec3 vWorldPosition;
  varying float vWave;

  void main() {
    vec3 displaced = position;

    float waveA = sin(position.x * 0.11 + uTime * 0.72);
    float waveB = sin(position.z * 0.15 - uTime * 0.54);
    float waveC = sin((position.x + position.z) * 0.055 + uTime * 0.31);
    float wave = waveA * 0.1 + waveB * 0.07 + waveC * 0.14;

    displaced.y += wave;
    vWave = wave;

    vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform vec3 uSkyColor;
  uniform vec3 uFoamColor;
  uniform vec3 uSunDirection;
  uniform vec3 uFogColor;

  uniform float uTime;
  uniform float uIslandHalf;
  uniform float uFogNear;
  uniform float uFogFar;

  varying vec3 vWorldPosition;
  varying float vWave;

  void main() {
    vec3 normal = normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition)));
    if (normal.y < 0.0) normal = -normal;

    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - clamp(dot(normal, viewDirection), 0.0, 1.0), 3.0);

    float ripple =
      0.5 +
      0.5 * sin(vWorldPosition.x * 0.85 + uTime * 1.35) *
      sin(vWorldPosition.z * 0.73 - uTime * 1.05);

    float depthMix = smoothstep(-0.22, 0.22, vWave) * 0.55 + ripple * 0.18;
    vec3 color = mix(uDeepColor, uShallowColor, clamp(depthMix, 0.0, 1.0));
    color = mix(color, uSkyColor, fresnel * 0.65);

    vec3 sunDirection = normalize(uSunDirection);
    vec3 halfVector = normalize(sunDirection + viewDirection);
    float specular = pow(max(dot(normal, halfVector), 0.0), 120.0);
    color += uSkyColor * specular * 1.4;

    float edgeDistance = max(abs(vWorldPosition.x), abs(vWorldPosition.z)) - uIslandHalf;
    float foam = (1.0 - smoothstep(0.1, 1.2, abs(edgeDistance))) * (0.55 + 0.45 * ripple);
    color = mix(color, uFoamColor, clamp(foam * 0.7, 0.0, 0.85));

    float viewDistance = distance(cameraPosition.xz, vWorldPosition.xz);
    float fogFactor = smoothstep(uFogNear, uFogFar, viewDistance);
    color = mix(color, uFogColor, fogFactor);

    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/**
 * Agua que rodea el diorama. La ola y el brillo son procedurales para no
 * depender de texturas en esta fase; en la Fase 4 se combinará con el
 * postproceso y reflejos reales.
 */
export class Water {
  readonly object: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>

  private readonly size: number
  private elapsed = 0

  constructor(preset: WorldPreset, theme: ThemeDefinition) {
    this.size = preset.size
    const scale = worldScale(preset.size)
    const extent = Math.max(188, preset.size * 3.4 + 80)
    const geometry = new THREE.PlaneGeometry(extent, extent, 128, 128)
    geometry.rotateX(-Math.PI / 2)

    const [sunX, sunY, sunZ] = theme.sky.sunDirection

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeepColor: { value: new THREE.Color(theme.water.deep) },
        uShallowColor: { value: new THREE.Color(theme.water.shallow) },
        uSkyColor: { value: new THREE.Color(theme.water.sky) },
        uFoamColor: { value: new THREE.Color(theme.water.foam) },
        uSunDirection: { value: new THREE.Vector3(sunX, sunY, sunZ).normalize() },
        uIslandHalf: { value: preset.size / 2 + 0.7 },
        uFogColor: { value: new THREE.Color(theme.fog.color) },
        uFogNear: { value: theme.fog.near * scale },
        uFogFar: { value: theme.fog.far * scale },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
    })

    this.object = new THREE.Mesh(geometry, material)
    this.object.name = 'water'
    this.object.position.y = -0.9
    this.object.receiveShadow = false
  }

  update(dt: number): void {
    this.elapsed = (this.elapsed + dt) % 10_000
    this.object.material.uniforms.uTime!.value = this.elapsed
  }

  applyTheme(theme: ThemeDefinition): void {
    const uniforms = this.object.material.uniforms
    const [sunX, sunY, sunZ] = theme.sky.sunDirection
    const scale = worldScale(this.size)

    uniforms.uDeepColor!.value.set(theme.water.deep)
    uniforms.uShallowColor!.value.set(theme.water.shallow)
    uniforms.uSkyColor!.value.set(theme.water.sky)
    uniforms.uFoamColor!.value.set(theme.water.foam)
    uniforms.uSunDirection!.value.set(sunX, sunY, sunZ).normalize()
    uniforms.uFogColor!.value.set(theme.fog.color)
    uniforms.uFogNear!.value = theme.fog.near * scale
    uniforms.uFogFar!.value = theme.fog.far * scale
  }

  dispose(): void {
    this.object.geometry.dispose()
    this.object.material.dispose()
  }
}
