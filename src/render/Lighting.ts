import * as THREE from 'three'

import type { ThemeDefinition } from './theme'

/**
 * Iluminación del diorama: hemisférica para el rebote del cielo y direccional
 * para sombras suaves. Los valores provienen del tema activo.
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
    this.sun.position.set(18, 30, 14)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(2048, 2048)
    this.sun.shadow.camera.near = 1
    this.sun.shadow.camera.far = 90
    this.sun.shadow.camera.left = -28
    this.sun.shadow.camera.right = 28
    this.sun.shadow.camera.top = 28
    this.sun.shadow.camera.bottom = -28
    this.sun.shadow.bias = -0.0004
    this.sun.shadow.normalBias = 0.02

    this.object.name = 'lighting'
    this.object.add(this.hemisphere, this.sun, this.sun.target)
  }

  dispose(): void {
    this.sun.dispose()
    this.hemisphere.dispose()
    this.sun.target.removeFromParent()
  }
}
