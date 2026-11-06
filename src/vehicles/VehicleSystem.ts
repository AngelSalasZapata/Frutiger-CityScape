import * as THREE from 'three'

import type { City, PlacedInstance } from '@/building/City'
import type { PhysicsWorld } from '@/physics/PhysicsWorld'
import type { GridCell } from '@/world/WorldGrid'

import { cellKey, nextRoadCell, roadNeighbors } from './RoadNetwork'

interface VehicleState {
  route: GridCell[]
  routeIndex: number
  position: THREE.Vector3
  heading: number
  speed: number
}

const TRAFFIC_SPEED = 1.15
const CONTROL_TURN_SPEED = 2.35

/** Tráfico ligero sobre caminos auto-conectados y conducción opcional por teclado. */
export class VehicleSystem {
  private readonly states = new Map<string, VehicleState>()
  private readonly pressed = new Set<string>()
  private playing = false

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
    if (!playing) this.states.clear()
  }

  update(dt: number): void {
    this.sync()
    if (!this.playing) return

    const roads = this.roadKeys()
    if (roads.size === 0) return
    const selectedId = this.city.selectionId

    for (const vehicle of this.vehicles()) {
      if (this.physics.isGrabbed(vehicle.id)) continue
      const state = this.states.get(vehicle.id)
      if (!state) continue
      const controlled = vehicle.id === selectedId && this.hasDrivingInput()

      if (controlled) {
        this.driveSelected(vehicle, state, dt)
      } else {
        this.driveTraffic(vehicle, state, roads, dt)
      }
    }
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    this.pressed.clear()
    this.states.clear()
  }

  private sync(): void {
    const vehicles = this.vehicles()
    const ids = new Set(vehicles.map((vehicle) => vehicle.id))
    for (const id of this.states.keys()) {
      if (!ids.has(id)) this.states.delete(id)
    }
    for (const vehicle of vehicles) {
      if (this.states.has(vehicle.id)) continue
      this.states.set(vehicle.id, {
        route: [],
        routeIndex: 0,
        position: vehicle.object.position.clone(),
        heading: vehicle.object.rotation.y,
        speed: 0,
      })
    }
  }

  private driveTraffic(
    vehicle: PlacedInstance,
    state: VehicleState,
    roads: ReadonlySet<string>,
    dt: number,
  ): void {
    if (state.routeIndex >= state.route.length) this.createRoute(state, roads)
    const targetCell = state.route[state.routeIndex]
    if (!targetCell) return

    const target = this.positionForCell(targetCell)
    const distance = state.position.distanceTo(target)
    if (distance < 0.08) {
      state.position.copy(target)
      state.routeIndex += 1
      return
    }

    const yieldFactor = this.trafficFactor(vehicle.id, state, targetCell, roads)
    const speed = TRAFFIC_SPEED * yieldFactor
    this.moveToward(vehicle, state, target, Math.min(distance, speed * dt))
  }

  private driveSelected(vehicle: PlacedInstance, state: VehicleState, dt: number): void {
    const forward = Number(this.pressed.has('arrowup')) - Number(this.pressed.has('arrowdown'))
    const turn = Number(this.pressed.has('arrowright')) - Number(this.pressed.has('arrowleft'))
    state.speed = THREE.MathUtils.damp(state.speed, forward * 2.1, 7, dt)
    state.heading -= turn * CONTROL_TURN_SPEED * dt * (state.speed >= 0 ? 1 : -1)

    const direction = new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading))
    state.position.addScaledVector(direction, state.speed * dt)
    state.position.y =
      this.city.groundHeightAt(
        this.city.worldGrid.worldToCell(state.position.x, state.position.z) ??
          vehicle.record.anchor,
      ) + 0.035
    this.applyPose(vehicle, state)
  }

  private createRoute(state: VehicleState, roads: ReadonlySet<string>): void {
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
      if (otherId === id) continue
      if (other.position.distanceTo(state.position) < 0.9) return 0
    }

    // En una intersección, un id posterior cede a uno que ya se aproxima.
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
  ): void {
    const direction = target.clone().sub(state.position).setY(0).normalize()
    if (direction.lengthSq() === 0) return
    state.heading = Math.atan2(direction.x, direction.z)
    state.position.addScaledVector(direction, distance)
    state.position.y = target.y
    this.applyPose(vehicle, state)
  }

  private applyPose(vehicle: PlacedInstance, state: VehicleState): void {
    const rotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      state.heading,
    )
    this.physics.driveVehicle(vehicle.id, state.position, rotation)
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
        .filter((instance) => instance.item.category === 'path')
        .map((instance) => cellKey(instance.record.anchor)),
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
