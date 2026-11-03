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
  }

  /**
   * Reencuadra la sombra y aleja el sol para que el diorama completo reciba
   * una resolución de sombra razonable en cualquier preset.
   */
  setWorldSize(size: number): void {
    const half = size / 2
    const diagonal = half * Math.SQRT2
    const extent = diagonal + 4

    this.sun.position.set(half * 0.9, size * 1.15 + 12, half * 0.6)
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
}
