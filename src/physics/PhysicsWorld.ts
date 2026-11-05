import type RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'

import type { City, PlacedInstance } from '@/building/City'
import type { EventBus } from '@/core/EventBus'
import type { AppEvents } from '@/app/events'

interface PhysicsEntry {
  readonly body: RAPIER.RigidBody
  readonly collider: RAPIER.Collider
  readonly height: number
  readonly dynamic: boolean
}

interface GrabState {
  readonly id: string
  readonly body: RAPIER.RigidBody
  distance: number
  readonly target: THREE.Vector3
}

/**
 * Adaptador de Rapier para los objetos del catálogo. La grilla sigue siendo la
 * fuente de verdad de construcción; la física solo se activa en modo Jugar.
 */
export class PhysicsWorld {
  private world: RAPIER.World | null = null
  private readonly entries = new Map<string, PhysicsEntry>()
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2()
  private readonly target = new THREE.Vector3()
  private grab: GrabState | null = null
  private active = false
  private initialized = false
  private rapier: typeof RAPIER | null = null

  constructor(
    private readonly city: City,
    private readonly camera: THREE.Camera,
    private readonly domElement: HTMLElement,
    private readonly bus: EventBus<AppEvents>,
  ) {
    domElement.addEventListener('pointerdown', this.handlePointerDown)
    domElement.addEventListener('pointermove', this.handlePointerMove)
    domElement.addEventListener('pointerup', this.handlePointerUp)
    domElement.addEventListener('pointercancel', this.handlePointerUp)
  }

  async initialize(): Promise<void> {
    if (this.initialized) return
    const module = await import('@dimforge/rapier3d-compat')
    this.rapier = module.default
    await this.rapier.init()
    this.initialized = true
  }

  async setActive(active: boolean): Promise<void> {
    if (active === this.active) return
    if (active) {
      await this.initialize()
      this.createWorld()
      this.active = true
      this.bus.emit('notice', {
        message: 'Modo jugar: arrastrá props y vehículos dinámicos con clic izquierdo.',
        tone: 'info',
      })
      return
    }

    this.active = false
    this.releaseGrab()
    this.entries.clear()
    this.world?.free()
    this.world = null
    this.city.resetPhysicalPoses()
    this.bus.emit('notice', { message: 'Modo construir: física pausada.', tone: 'info' })
  }

  update(dt: number): void {
    if (!this.active || !this.world) return
    this.syncInstances()
    this.applyGrab(dt)
    this.world.timestep = Math.min(dt, 1 / 30)
    this.world.step()

    for (const [id, entry] of this.entries) {
      if (!entry.dynamic) continue
      const translation = entry.body.translation()
      const rotation = entry.body.rotation()
      this.city.setPhysicsPose(
        id,
        new THREE.Vector3(translation.x, translation.y - entry.height / 2, translation.z),
        new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w),
      )
    }
  }

  dispose(): void {
    this.releaseGrab()
    this.domElement.removeEventListener('pointerdown', this.handlePointerDown)
    this.domElement.removeEventListener('pointermove', this.handlePointerMove)
    this.domElement.removeEventListener('pointerup', this.handlePointerUp)
    this.domElement.removeEventListener('pointercancel', this.handlePointerUp)
    this.entries.clear()
    this.world?.free()
    this.world = null
  }

  private createWorld(): void {
    this.entries.clear()
    this.world?.free()
    this.world = new this.api.World({ x: 0, y: -9.81, z: 0 })
    const floor = this.api.ColliderDesc.cuboid(512, 0.08, 512).setTranslation(0, -0.08, 0)
    this.world.createCollider(floor)
    this.syncInstances()
  }

  private syncInstances(): void {
    if (!this.world) return
    const existing = new Set(this.city.all().map((instance) => instance.id))
    for (const [id, entry] of this.entries) {
      if (existing.has(id)) continue
      this.world.removeCollider(entry.collider, true)
      this.world.removeRigidBody(entry.body)
      this.entries.delete(id)
    }
    for (const instance of this.city.all()) {
      if (!this.entries.has(instance.id)) this.addInstance(instance)
    }
  }

  private addInstance(instance: PlacedInstance): void {
    if (!this.world) return
    const physics = instance.record.physics ?? instance.item.physics
    const dynamic = physics === 'dynamic'
    const kinematic = physics === 'kinematic'
    const height = Math.max(instance.item.height, 0.24)
    const bodyDescription = dynamic
      ? this.api.RigidBodyDesc.dynamic()
      : kinematic
        ? this.api.RigidBodyDesc.kinematicPositionBased()
        : this.api.RigidBodyDesc.fixed()
    const position = instance.object.position
    bodyDescription.setTranslation(position.x, position.y + height / 2, position.z)
    bodyDescription.setRotation(instance.object.quaternion)
    if (dynamic) bodyDescription.setLinearDamping(1.7).setAngularDamping(2.4)

    const body = this.world.createRigidBody(bodyDescription)
    const cells = instance.cells
    const width = Math.max(
      0.25,
      Math.max(...cells.map((cell) => cell.x)) - Math.min(...cells.map((cell) => cell.x)) + 0.84,
    )
    const depth = Math.max(
      0.25,
      Math.max(...cells.map((cell) => cell.z)) - Math.min(...cells.map((cell) => cell.z)) + 0.84,
    )
    const collider = this.world.createCollider(
      this.api.ColliderDesc.cuboid(width / 2, height / 2, depth / 2)
        .setFriction(0.78)
        .setRestitution(0.12),
      body,
    )
    this.entries.set(instance.id, { body, collider, height, dynamic })
  }

  private updatePointer(event: PointerEvent): void {
    const rect = this.domElement.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.active || event.button !== 0) return
    this.updatePointer(event)
    const hit = this.raycaster
      .intersectObjects(this.city.instancesObject.children, true)
      .find((candidate) => {
        const instance = this.city.instanceFromObject(candidate.object)
        return instance ? this.entries.get(instance.id)?.dynamic : false
      })
    if (!hit) return
    const instance = this.city.instanceFromObject(hit.object)
    if (!instance) return
    const entry = this.entries.get(instance.id)
    if (!entry) return
    this.grab = {
      id: instance.id,
      body: entry.body,
      distance: hit.distance,
      target: hit.point.clone(),
    }
    this.domElement.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.grab) return
    this.updatePointer(event)
    this.raycaster.ray.at(this.grab.distance, this.grab.target)
    this.grab.target.y = Math.max(this.grab.target.y, 0.3)
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (!this.grab || (event.button !== 0 && event.type !== 'pointercancel')) return
    this.releaseGrab()
  }

  private applyGrab(dt: number): void {
    if (!this.grab) return
    const position = this.grab.body.translation()
    this.target.set(position.x, position.y, position.z)
    this.target.sub(this.grab.target).multiplyScalar(-28 * dt)
    this.grab.body.applyImpulse(this.target, true)
  }

  private releaseGrab(): void {
    this.grab = null
  }

  private get api(): typeof RAPIER {
    if (!this.rapier) throw new Error('Rapier aún no está inicializado')
    return this.rapier
  }
}
