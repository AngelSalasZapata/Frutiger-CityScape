import * as THREE from 'three'

import type { City, PlacedInstance } from '@/building/City'
import type { PhysicsWorld } from '@/physics/PhysicsWorld'
import type { GridCell } from '@/world/WorldGrid'

import { cellKey, nextRoadCell, roadNeighbors } from './RoadNetwork'

interface VehicleState {
  route: GridCell[]
  routeIndex: number
  position: THREE.Vector3
  target: THREE.Vector3 | null
  heading: number
  speed: number
  nextLanding: number
}

const ROAD_SPEED = 1.15
const WATER_SPEED = 0.86
const AIR_SPEED = 0.62
const CONTROL_TURN_SPEED = 2.35

/** Movimiento autónomo para tránsito, navegación y vuelo dentro del diorama. */
export class VehicleSystem {
  private readonly states = new Map<string, VehicleState>()
  private readonly passengers = new Map<string, Set<string>>()
  private readonly pressed = new Set<string>()
  private playing = false
  private elapsed = 0

  constructor(
    private readonly city: City,
    private readonly physics: PhysicsWorld,
  ) {
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
  }

  setPlaying(playing: boolean): void {
    this.playing = playing
    this.pressed.clear()
    if (!playing) {
      this.states.clear()
      this.passengers.clear()
    }
  }

  update(dt: number): void {
    this.elapsed += dt
    this.sync()
    if (!this.playing) return

    const roads = this.roadKeys()
    const selectedId = this.city.selectionId
    for (const vehicle of this.vehicles()) {
      if (this.physics.isGrabbed(vehicle.id)) continue
      const state = this.states.get(vehicle.id)
      if (!state) continue
      const behavior = vehicle.item.vehicleBehavior ?? 'road'
      const controlled = behavior === 'road' && vehicle.id === selectedId && this.hasDrivingInput()

      if (controlled) this.driveSelected(vehicle, state, dt)
      else if (behavior === 'road' && roads.size > 0) this.driveRoad(vehicle, state, roads, dt)
      else if (behavior === 'water') this.driveWater(vehicle, state, dt)
      else if (behavior === 'air') this.driveAir(vehicle, state, dt)
    }
  }

  /** Reserva un asiento en un vehículo cercano y disponible para un habitante. */
  boardPassenger(npcId: string, position: THREE.Vector3): string | null {
    if (!this.playing || this.passengerVehicle(npcId)) return null
    const vehicle = this.vehicles()
      .filter((candidate) => this.canBoard(candidate))
      .sort(
        (left, right) =>
          left.object.position.distanceToSquared(position) -
          right.object.position.distanceToSquared(position),
      )[0]
    if (!vehicle || vehicle.object.position.distanceTo(position) > 1.45) return null

    const passengers = this.passengers.get(vehicle.id) ?? new Set<string>()
    passengers.add(npcId)
    this.passengers.set(vehicle.id, passengers)
    return vehicle.id
  }

  leavePassenger(npcId: string): void {
    for (const [vehicleId, passengers] of this.passengers) {
      if (!passengers.delete(npcId)) continue
      if (passengers.size === 0) this.passengers.delete(vehicleId)
      return
    }
  }

  passengerPose(npcId: string): { position: THREE.Vector3; vehicle: PlacedInstance } | null {
    const vehicleId = this.passengerVehicle(npcId)
    if (!vehicleId) return null
    const vehicle = this.city.instance(vehicleId)
    if (!vehicle) return null
    const passengers = [...(this.passengers.get(vehicleId) ?? [])]
    const index = Math.max(0, passengers.indexOf(npcId))
    const offset = new THREE.Vector3(index % 2 ? 0.18 : -0.18, vehicle.item.height * 0.32, 0)
    offset.applyQuaternion(vehicle.object.quaternion)
    return { position: vehicle.object.position.clone().add(offset), vehicle }
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    this.pressed.clear()
    this.states.clear()
    this.passengers.clear()
  }

  private sync(): void {
    const vehicles = this.vehicles()
    const ids = new Set(vehicles.map((vehicle) => vehicle.id))
    for (const id of this.states.keys()) if (!ids.has(id)) this.states.delete(id)
    for (const id of this.passengers.keys()) if (!ids.has(id)) this.passengers.delete(id)
    for (const vehicle of vehicles) {
      if (this.states.has(vehicle.id)) continue
      this.states.set(vehicle.id, {
        route: [],
        routeIndex: 0,
        position: vehicle.object.position.clone(),
        target: null,
        heading: vehicle.object.rotation.y,
        speed: 0,
        nextLanding: this.elapsed + 8 + Math.random() * 12,
      })
    }
  }

  private driveRoad(
    vehicle: PlacedInstance,
    state: VehicleState,
    roads: ReadonlySet<string>,
    dt: number,
  ): void {
    if (state.routeIndex >= state.route.length) this.createRoadRoute(state, roads)
    const targetCell = state.route[state.routeIndex]
    if (!targetCell) return
    const target = this.positionForCell(targetCell)
    const distance = state.position.distanceTo(target)
    if (distance < 0.08) {
      state.position.copy(target)
      state.routeIndex += 1
      return
    }
    const speed = ROAD_SPEED * this.trafficFactor(vehicle.id, state, targetCell, roads)
    this.moveToward(vehicle, state, target, Math.min(distance, speed * dt), true)
  }

  private driveWater(vehicle: PlacedInstance, state: VehicleState, dt: number): void {
    if (!state.target || state.position.distanceTo(state.target) < 0.2) {
      state.target = this.randomWaterTarget()
    }
    this.moveToward(vehicle, state, state.target, WATER_SPEED * dt, false)
    vehicle.modelHolder.position.y = Math.sin(this.elapsed * 2.3 + state.heading) * 0.045
    vehicle.modelHolder.rotation.z = Math.sin(this.elapsed * 1.6 + state.heading) * 0.035
  }

  private driveAir(vehicle: PlacedInstance, state: VehicleState, dt: number): void {
    if (!state.target || state.position.distanceTo(state.target) < 0.18) {
      const landing = this.elapsed >= state.nextLanding
      state.target = this.randomAirTarget(landing)
      if (landing) state.nextLanding = this.elapsed + 14 + Math.random() * 16
    }
    this.moveToward(vehicle, state, state.target, AIR_SPEED * dt, false)
    vehicle.modelHolder.position.y = Math.sin(this.elapsed * 1.35 + state.heading) * 0.09
  }

  private driveSelected(vehicle: PlacedInstance, state: VehicleState, dt: number): void {
    const forward = Number(this.pressed.has('arrowup')) - Number(this.pressed.has('arrowdown'))
    const turn = Number(this.pressed.has('arrowright')) - Number(this.pressed.has('arrowleft'))
    state.speed = THREE.MathUtils.damp(state.speed, forward * 2.1, 7, dt)
    state.heading -= turn * CONTROL_TURN_SPEED * dt * (state.speed >= 0 ? 1 : -1)
    const direction = new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading))
    state.position.addScaledVector(direction, state.speed * dt)
    const cell =
      this.city.worldGrid.worldToCell(state.position.x, state.position.z) ?? vehicle.record.anchor
    state.position.y = this.city.groundHeightAt(cell) + 0.035
    this.applyPose(vehicle, state)
    this.spinWheels(vehicle, Math.abs(state.speed) * dt)
  }

  private createRoadRoute(state: VehicleState, roads: ReadonlySet<string>): void {
    const start = this.closestRoad(state.position, roads)
    if (!start) return
    const route: GridCell[] = [start]
    let previous: GridCell | null = null
    let current = start
    for (let step = 0; step < 20; step += 1) {
      const next = nextRoadCell(current, previous, roads)
      if (!next) break
      route.push(next)
      previous = current
      current = next
    }
    state.route = route
    state.routeIndex = 0
  }

  private trafficFactor(
    id: string,
    state: VehicleState,
    target: GridCell,
    roads: ReadonlySet<string>,
  ): number {
    for (const [otherId, other] of this.states) {
      if (otherId !== id && other.position.distanceTo(state.position) < 0.9) return 0
    }
    if (roadNeighbors(target, roads).length >= 3) {
      for (const [otherId, other] of this.states) {
        if (otherId < id && other.position.distanceTo(this.positionForCell(target)) < 1.1) return 0
      }
    }
    return 1
  }

  private moveToward(
    vehicle: PlacedInstance,
    state: VehicleState,
    target: THREE.Vector3,
    distance: number,
    ground: boolean,
  ): void {
    const direction = target.clone().sub(state.position)
    if (ground) direction.y = 0
    if (direction.lengthSq() === 0) return
    direction.normalize()
    state.heading = Math.atan2(direction.x, direction.z)
    state.position.addScaledVector(direction, Math.min(distance, state.position.distanceTo(target)))
    if (ground) state.position.y = target.y
    this.applyPose(vehicle, state)
    if (ground) this.spinWheels(vehicle, distance)
  }

  private applyPose(vehicle: PlacedInstance, state: VehicleState): void {
    const rotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      state.heading,
    )
    this.physics.driveVehicle(vehicle.id, state.position, rotation)
  }

  private spinWheels(vehicle: PlacedInstance, distance: number): void {
    vehicle.modelHolder.traverse((object) => {
      if (/wheel|roda|pneu|tire/i.test(object.name)) object.rotation.x += distance * 7
    })
  }

  private canBoard(vehicle: PlacedInstance): boolean {
    const behavior = vehicle.item.vehicleBehavior ?? 'road'
    const capacity = vehicle.item.id === 'bus_aero' ? 4 : 1
    const passengers = this.passengers.get(vehicle.id)?.size ?? 0
    return passengers < capacity && (behavior !== 'air' || vehicle.object.position.y < 1.5)
  }

  private passengerVehicle(npcId: string): string | null {
    for (const [vehicleId, passengers] of this.passengers)
      if (passengers.has(npcId)) return vehicleId
    return null
  }

  private randomWaterTarget(): THREE.Vector3 {
    const half = this.city.worldGrid.halfSize
    const edge = half + 1.8 + Math.random() * 5
    const along = (Math.random() - 0.5) * half * 1.8
    const horizontal = Math.random() > 0.5
    return new THREE.Vector3(
      horizontal ? edge * (Math.random() > 0.5 ? 1 : -1) : along,
      -0.72,
      horizontal ? along : edge * (Math.random() > 0.5 ? 1 : -1),
    )
  }

  private randomAirTarget(landing: boolean): THREE.Vector3 {
    const half = this.city.worldGrid.halfSize * 0.78
    const x = (Math.random() * 2 - 1) * half
    const z = (Math.random() * 2 - 1) * half
    const cell = this.city.worldGrid.worldToCell(x, z)
    const ground = cell ? this.city.groundHeightAt(cell) : 0
    return new THREE.Vector3(x, ground + (landing ? 0.52 : 3.3 + Math.random() * 2.5), z)
  }

  private positionForCell(cell: GridCell): THREE.Vector3 {
    const point = this.city.worldGrid.cellToWorld(cell)
    return new THREE.Vector3(point.x, this.city.groundHeightAt(cell) + 0.035, point.z)
  }

  private closestRoad(position: THREE.Vector3, roads: ReadonlySet<string>): GridCell | null {
    let closest: GridCell | null = null
    let closestDistance = 2.5
    for (const key of roads) {
      const [x = Number.NaN, z = Number.NaN] = key.split(':').map(Number)
      if (!Number.isInteger(x) || !Number.isInteger(z)) continue
      const cell = { x, z }
      const distance = position.distanceToSquared(this.positionForCell(cell))
      if (distance < closestDistance * closestDistance) {
        closest = cell
        closestDistance = Math.sqrt(distance)
      }
    }
    return closest
  }

  private roadKeys(): Set<string> {
    return new Set(
      this.city
        .all()
        .filter((item) => item.item.category === 'path')
        .map((item) => cellKey(item.record.anchor)),
    )
  }

  private vehicles(): readonly PlacedInstance[] {
    return this.city.all().filter((instance) => instance.item.category === 'vehicle')
  }

  private hasDrivingInput(): boolean {
    return [...this.pressed].some((key) => key.startsWith('arrow'))
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.playing || !event.key.startsWith('Arrow')) return
    this.pressed.add(event.key.toLowerCase())
    event.preventDefault()
  }

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.key.toLowerCase())
  }
}
