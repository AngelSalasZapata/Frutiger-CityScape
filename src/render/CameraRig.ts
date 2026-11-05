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

  private readonly focus = new THREE.Vector3()
  private readonly keyboardDirection = new THREE.Vector3()
  private readonly forward = new THREE.Vector3()
  private readonly right = new THREE.Vector3()
  private readonly pressedKeys = new Set<string>()

  constructor(domElement: HTMLElement) {
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000)
    this.camera.position.set(27, 23, 27)

    this.controls = new OrbitControls(this.camera, domElement)
    this.controls.target.set(0, 0.6, 0)
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
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    window.addEventListener('blur', this.clearKeyboardMovement)
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
  }

  /**
   * Coloca la cámara a una distancia que encuadra el diorama completo tanto a
   * lo alto como a lo ancho, conservando el ángulo orbital actual. Se llama al
   * crear el mundo y al cambiar de preset.
   */
  frameWorld(size: number): void {
    this.focus.set(0, 0.6, 0)

    const direction = this.camera.position.clone().sub(this.controls.target)
    if (direction.lengthSq() < 1e-6) {
      direction.set(1, 0.85, 1)
    }

    direction.normalize().multiplyScalar(this.recommendedDistance(size))
    this.controls.target.copy(this.focus)
    this.camera.position.copy(this.focus).add(direction)

    this.controls.minDistance = 5 + size * 0.08
    this.controls.maxDistance = size * 2.4 + 90
    this.controls.update()
  }

  /**
   * Evita que un cambio de relación de aspecto (por ejemplo, una ventana
   * vertical) recorte el diorama. Solo aleja la cámara; nunca la acerca para
   * no perder el zoom manual del jugador.
   */
  ensureWorldFits(size: number): void {
    const required = this.recommendedDistance(size)
    const direction = this.camera.position.clone().sub(this.controls.target)

    if (direction.length() >= required) return

    direction.normalize().multiplyScalar(required)
    this.camera.position.copy(this.controls.target).add(direction)
    this.controls.update()
  }

  update(dt = 0): void {
    this.updateKeyboardMovement(dt)
    this.controls.update()
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    window.removeEventListener('blur', this.clearKeyboardMovement)
    this.controls.dispose()
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      this.isEditable(event.target)
    )
      return
    const key = event.key.toLowerCase()
    if (!['w', 'a', 's', 'd'].includes(key)) return
    this.pressedKeys.add(key)
    event.preventDefault()
  }

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.pressedKeys.delete(event.key.toLowerCase())
  }

  private readonly clearKeyboardMovement = (): void => {
    this.pressedKeys.clear()
  }

  private updateKeyboardMovement(dt: number): void {
    if (dt <= 0 || this.pressedKeys.size === 0) return

    this.keyboardDirection.set(
      Number(this.pressedKeys.has('d')) - Number(this.pressedKeys.has('a')),
      0,
      Number(this.pressedKeys.has('s')) - Number(this.pressedKeys.has('w')),
    )
    if (this.keyboardDirection.lengthSq() === 0) return

    this.forward.copy(this.controls.target).sub(this.camera.position).setY(0)
    if (this.forward.lengthSq() < 1e-6) this.forward.set(0, 0, -1)
    this.forward.normalize()
    this.right.crossVectors(this.forward, this.camera.up).setY(0).normalize()
    const distance = this.camera.position.distanceTo(this.controls.target)
    const speed = Math.max(8, distance * 0.75)
    const movement = this.forward
      .multiplyScalar(-this.keyboardDirection.z)
      .addScaledVector(this.right, this.keyboardDirection.x)
      .normalize()
      .multiplyScalar(speed * dt)
    this.camera.position.add(movement)
    this.controls.target.add(movement)
  }

  private isEditable(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    )
  }

  private recommendedDistance(size: number): number {
    const verticalFov = (this.camera.fov * Math.PI) / 180
    // Incluye un margen para que se vea el agua que rodea la isla.
    const framedSize = size * 1.18 + 6
    const fitHeight = framedSize / (2 * Math.tan(verticalFov / 2))
    const fitWidth = fitHeight / Math.max(this.camera.aspect, 0.0001)

    return Math.max(fitHeight, fitWidth) * 1.18 + 4
  }
}
