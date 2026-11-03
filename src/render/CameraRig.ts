import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

/**
 * Cámara orbital con el esquema pedido en el diseño:
 * clic derecho rota, rueda hace zoom y clic central desplaza.
 * El clic izquierdo queda libre para las herramientas de construcción (Fase 3).
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera
  readonly controls: OrbitControls

  constructor(domElement: HTMLElement) {
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000)
    this.camera.position.set(27, 23, 27)

    this.controls = new OrbitControls(this.camera, domElement)
    this.controls.target.set(0, 1, 0)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.075
    this.controls.minDistance = 8
    this.controls.maxDistance = 120
    this.controls.maxPolarAngle = Math.PI * 0.49
    this.controls.mouseButtons = {
      // -1 desactiva el botón izquierdo (OrbitControls lo interpreta como "sin acción").
      LEFT: -1 as unknown as THREE.MOUSE,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.ROTATE,
    }

    this.controls.update()
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
  }

  update(): void {
    this.controls.update()
  }

  dispose(): void {
    this.controls.dispose()
  }
}
