import * as THREE from 'three'

/**
 * Envoltorio del WebGLRenderer con la configuración visual base del proyecto:
 * color sRGB, tone mapping filmico y sombras suaves.
 */
export class Renderer {
  readonly instance: THREE.WebGLRenderer

  constructor(container: HTMLElement) {
    this.instance = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    })

    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.instance.outputColorSpace = THREE.SRGBColorSpace
    this.instance.toneMapping = THREE.ACESFilmicToneMapping
    this.instance.toneMappingExposure = 1.08
    this.instance.shadowMap.enabled = true
    this.instance.shadowMap.type = THREE.PCFShadowMap

    this.instance.domElement.className = 'viewport'
    this.instance.domElement.setAttribute('role', 'img')
    this.instance.domElement.setAttribute('aria-label', 'Vista 3D de la ciudad en miniatura')

    container.append(this.instance.domElement)
  }

  setSize(width: number, height: number): void {
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.instance.setSize(width, height, false)
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.instance.render(scene, camera)
  }

  dispose(): void {
    this.instance.dispose()
    this.instance.domElement.remove()
  }
}
