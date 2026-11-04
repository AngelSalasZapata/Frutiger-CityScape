import * as THREE from 'three'

import type { ThemeDefinition } from './theme'

/**
 * Iluminación del diorama: hemisférica para el rebote del cielo y direccional
 * para sombras suaves. Los valores provienen del tema activo y la frustum de
 * sombras se ajusta al tamaño del mundo seleccionado.
 */
export class Lighting {
  readonly object = new THREE.Group()

  private readonly sun: THREE.DirectionalLight
  private readonly hemisphere: THREE.HemisphereLight
  private readonly sunDirection = new THREE.Vector3(0.45, 0.55, 0.35).normalize()

  private worldSize = 32

  constructor(theme: ThemeDefinition) {
    this.hemisphere = new THREE.HemisphereLight(
      theme.lighting.hemisphereSky,
      theme.lighting.hemisphereGround,
      theme.lighting.hemisphereIntensity,
    )

    this.sun = new THREE.DirectionalLight(theme.lighting.sun, theme.lighting.sunIntensity)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(2048, 2048)
    this.sun.shadow.bias = -0.0004
    this.sun.shadow.normalBias = 0.02

    this.object.name = 'lighting'
    this.object.add(this.hemisphere, this.sun, this.sun.target)

    this.applyTheme(theme)
    this.setWorldSize(this.worldSize)
  }

  applyTheme(theme: ThemeDefinition): void {
    this.hemisphere.color.set(theme.lighting.hemisphereSky)
    this.hemisphere.groundColor.set(theme.lighting.hemisphereGround)
    this.hemisphere.intensity = theme.lighting.hemisphereIntensity

    this.sun.color.set(theme.lighting.sun)
    this.sun.intensity = theme.lighting.sunIntensity

    const [x, y, z] = theme.sky.sunDirection
    this.sunDirection.set(x, y, z).normalize()
    this.positionSun()
  }

  /**
   * Reencuadra la sombra y aleja el sol para que el diorama completo reciba
   * una resolución de sombra razonable en cualquier preset.
   */
  setWorldSize(size: number): void {
    this.worldSize = size

    const half = size / 2
    const diagonal = half * Math.SQRT2
    const extent = diagonal + 4

    this.positionSun()

    this.sun.target.position.set(0, 0, 0)
    this.sun.target.updateMatrixWorld()

    this.sun.shadow.camera.left = -extent
    this.sun.shadow.camera.right = extent
    this.sun.shadow.camera.top = extent
    this.sun.shadow.camera.bottom = -extent
    this.sun.shadow.camera.near = 1
    this.sun.shadow.camera.far = size * 3 + 80
    this.sun.shadow.camera.updateProjectionMatrix()
  }

  dispose(): void {
    this.sun.dispose()
    this.hemisphere.dispose()
    this.sun.target.removeFromParent()
  }

  private positionSun(): void {
    const distance = this.worldSize * 1.6 + 24
    this.sun.position.copy(this.sunDirection).multiplyScalar(distance)
  }
}
