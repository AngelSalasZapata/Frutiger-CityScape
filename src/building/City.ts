import * as THREE from 'three'

import { DEFAULT_THEME } from '@/render/theme'
import { resolveTheme, type ThemeDefinition } from '@/render/theme'
import { ThemeMaterialLibrary } from '@/render/ThemeMaterials'
import type { World } from '@/world/World'
import type { GridCell, WorldGrid } from '@/world/WorldGrid'

import type { AutoTileVariant } from './AssetLibrary'
import type { AssetLibrary } from './AssetLibrary'
import type { CatalogItem, CatalogPhysics, PaletteRole } from './Catalog'
import { resolveCatalogItem } from './Catalog'
import type { FootprintPlacement, Rotation } from './Footprint'
import { describeFootprint, footprintCells, rotateStep } from './Footprint'
import { OccupancyMap } from './OccupancyMap'

interface AutoDirection {
  readonly dx: number
  readonly dz: number
  readonly bit: number
}

const AUTO_DIRECTIONS: readonly AutoDirection[] = [
  { dx: 0, dz: -1, bit: 1 },
  { dx: 1, dz: 0, bit: 2 },
  { dx: 0, dz: 1, bit: 4 },
  { dx: -1, dz: 0, bit: 8 },
]

const BASE_VARIANT_BITS: Readonly<Record<AutoTileVariant, number>> = {
  dot: 0,
  end: 4,
  straight: 5,
  corner: 6,
  tee: 14,
  cross: 15,
}

export interface PlacementRecord {
  readonly id: string
  readonly itemId: string
  readonly anchor: GridCell
  readonly rotation: Rotation
  /** Color elegido para la composición principal del objeto. */
  readonly color?: string
  /** Perfil físico elegido para esta instancia, independiente del valor recomendado del catálogo. */
  readonly physics?: CatalogPhysics
}

export interface PlacementState {
  readonly anchor: GridCell
  readonly rotation: Rotation
}

export interface PlacedInstance {
  readonly id: string
  readonly item: CatalogItem
  record: PlacementRecord
  readonly object: THREE.Group
  readonly modelHolder: THREE.Group
  cells: readonly GridCell[]
  variant: AutoTileVariant | undefined
  variantRotation: number
}

function rotateMask(mask: number, steps: number): number {
  let result = 0

  for (const direction of AUTO_DIRECTIONS) {
    if ((mask & direction.bit) === 0) continue
    const index = AUTO_DIRECTIONS.indexOf(direction)
    const rotatedIndex = (index - steps + 4) % 4
    result |= AUTO_DIRECTIONS[rotatedIndex]!.bit
  }

  return result
}

export function resolveAutoTile(mask: number): { variant: AutoTileVariant; rotation: number } {
  if (mask === 0) return { variant: 'dot', rotation: 0 }

  for (const variant of Object.keys(BASE_VARIANT_BITS) as AutoTileVariant[]) {
    const base = BASE_VARIANT_BITS[variant]

    for (let steps = 0; steps < 4; steps += 1) {
      if (rotateMask(base, steps) === mask) {
        return { variant, rotation: (steps * Math.PI) / 2 }
      }
    }
  }

  return { variant: 'cross', rotation: 0 }
}

/**
 * Ciudad en construcción: mantiene las instancias colocadas, su ocupación de
 * celdas y los modelos instanciados. Las operaciones son transaccionales por
 * fuera (comandos), así que aquí no se registra historia.
 */
export class City {
  readonly object = new THREE.Group()
  readonly instancesObject = new THREE.Group()

  private grid: WorldGrid
  private occupancy: OccupancyMap
  private materials: ThemeMaterialLibrary
  private readonly instances = new Map<string, PlacedInstance>()
  private selectedId: string | null = null
  private nextId = 1

  constructor(
    private world: World,
    private theme: ThemeDefinition,
    private readonly library: AssetLibrary,
  ) {
    this.grid = world.grid
    this.occupancy = new OccupancyMap(this.grid)
    // Los objetos mantienen su paleta al cambiar el tema del entorno.
    this.materials = new ThemeMaterialLibrary(DEFAULT_THEME)

    this.object.name = 'city'
    this.instancesObject.name = 'city-instances'
    this.object.add(this.instancesObject)
  }

  get worldGrid(): WorldGrid {
    return this.grid
  }

  get materialLibrary(): ThemeMaterialLibrary {
    return this.materials
  }

  get activeTheme(): ThemeDefinition {
    return this.theme
  }

  get placedCount(): number {
    return this.instances.size
  }

  get selectionId(): string | null {
    return this.selectedId
  }

  get selected(): PlacedInstance | null {
    return this.selectedId ? (this.instances.get(this.selectedId) ?? null) : null
  }

  all(): readonly PlacedInstance[] {
    return [...this.instances.values()]
  }

  instance(id: string): PlacedInstance | undefined {
    return this.instances.get(id)
  }

  instanceAt(cell: GridCell): PlacedInstance | undefined {
    const id = this.occupancy.idAt(cell)
    return id ? this.instances.get(id) : undefined
  }

  canPlace(itemId: string, anchor: GridCell, rotation: Rotation, ignoreId?: string): boolean {
    const item = resolveCatalogItem(itemId)
    const placement = describeFootprint(anchor, item.footprint, rotation)
    return this.canOccupyPlacement(placement, ignoreId)
  }

  canOccupyPlacement(placement: FootprintPlacement, ignoreId?: string): boolean {
    return placement.cells.every(
      (cell) => this.grid.contains(cell) && this.occupancy.isFree(cell, ignoreId),
    )
  }

  cellIsFree(cell: GridCell, ignoreId?: string): boolean {
    return this.grid.contains(cell) && this.occupancy.isFree(cell, ignoreId)
  }

  groundHeightAt(cell: GridCell): number {
    const point = this.grid.cellToWorld(cell)
    return this.world.heightAt(point.x, point.z)
  }

  groundHeightFor(placement: FootprintPlacement): number {
    const half = this.grid.halfSize
    return this.world.heightAt(placement.centerX + 0.5 - half, placement.centerZ + 0.5 - half)
  }

  createRecord(itemId: string, anchor: GridCell, rotation: Rotation): PlacementRecord | null {
    if (!this.canPlace(itemId, anchor, rotation)) return null
    const item = resolveCatalogItem(itemId)

    return {
      id: `${itemId}-${this.nextId++}`,
      itemId,
      anchor: { ...anchor },
      rotation,
      color: this.defaultColorFor(item),
      physics: item.physics,
    }
  }

  setColor(id: string, color: string | undefined): boolean {
    const instance = this.instances.get(id)
    if (!instance) return false
    instance.record = { ...instance.record, ...(color ? { color } : { color: undefined }) }
    this.rebuildModel(instance)
    return true
  }

  setPhysics(id: string, physics: CatalogPhysics): boolean {
    const instance = this.instances.get(id)
    if (!instance || instance.record.physics === physics) return false
    instance.record = { ...instance.record, physics }
    return true
  }

  /** Sincroniza la pose renderizada de un cuerpo dinámico sin tocar la grilla lógica. */
  setPhysicsPose(id: string, position: THREE.Vector3, rotation: THREE.Quaternion): void {
    const instance = this.instances.get(id)
    if (!instance) return
    instance.object.position.copy(position)
    instance.object.quaternion.copy(rotation)
  }

  /** Restaura los objetos físicos a sus posiciones de construcción al volver a editar. */
  resetPhysicalPoses(): void {
    for (const instance of this.instances.values()) {
      instance.object.quaternion.identity()
      this.positionInstance(instance)
    }
  }

  insert(record: PlacementRecord): PlacedInstance | null {
    const existing = this.instances.get(record.id)
    if (existing) return existing

    const item = resolveCatalogItem(record.itemId)
    const placement = describeFootprint(record.anchor, item.footprint, record.rotation)

    if (!this.canOccupyPlacement(placement)) return null

    const object = new THREE.Group()
    object.name = `instance-${record.id}`
    object.userData.instanceId = record.id

    const modelHolder = new THREE.Group()
    modelHolder.name = 'model'
    object.add(modelHolder)

    const instance: PlacedInstance = {
      id: record.id,
      item,
      record: { ...record, anchor: { ...record.anchor } },
      object,
      modelHolder,
      cells: placement.cells,
      variant: undefined,
      variantRotation: record.rotation * (Math.PI / 2),
    }

    this.instances.set(record.id, instance)
    this.instancesObject.add(object)
    this.occupancy.occupy(placement.cells, record.id)
    this.positionInstance(instance)

    if (item.autoTile) {
      this.refreshAutoTileAround(placement.anchor, item.autoTile)
    } else {
      this.rebuildModel(instance)
    }

    return instance
  }

  remove(id: string): boolean {
    const instance = this.instances.get(id)
    if (!instance) return false

    this.occupancy.release(instance.cells)
    this.instancesObject.remove(instance.object)
    this.instances.delete(id)

    if (this.selectedId === id) this.selectedId = null

    if (instance.item.autoTile) {
      this.refreshAutoTileAround(instance.record.anchor, instance.item.autoTile)
    }

    return true
  }

  move(id: string, anchor: GridCell, rotation: Rotation): boolean {
    const instance = this.instances.get(id)
    if (!instance) return false

    const placement = describeFootprint(anchor, instance.item.footprint, rotation)
    if (!this.canOccupyPlacement(placement, id)) return false

    const previousAnchor = instance.record.anchor
    this.occupancy.release(instance.cells)
    this.occupancy.occupy(placement.cells, id)

    instance.record = {
      ...instance.record,
      anchor: { ...anchor },
      rotation,
    }
    instance.cells = placement.cells
    this.positionInstance(instance)

    if (instance.item.autoTile) {
      this.refreshAutoTileAround(previousAnchor, instance.item.autoTile)
      this.refreshAutoTileAround(anchor, instance.item.autoTile)
    } else {
      instance.variantRotation = rotation * (Math.PI / 2)
      this.rebuildModel(instance)
    }

    return true
  }

  rotate(id: string, delta: number): boolean {
    const instance = this.instances.get(id)
    if (!instance) return false

    const rotation = rotateStep(instance.record.rotation, delta)
    return this.move(id, instance.record.anchor, rotation)
  }

  rotateTo(id: string, rotation: Rotation): boolean {
    const instance = this.instances.get(id)
    if (!instance) return false

    return this.move(id, instance.record.anchor, rotation)
  }

  select(id: string | null): void {
    this.selectedId = id && this.instances.has(id) ? id : null
  }

  instanceFromObject(object: THREE.Object3D | null): PlacedInstance | null {
    let current: THREE.Object3D | null = object

    while (current) {
      const id = current.userData.instanceId as string | undefined
      if (id) return this.instances.get(id) ?? null
      current = current.parent
    }

    return null
  }

  setWorld(world: World): void {
    const previousSize = this.grid.size
    const nextSize = world.grid.size
    const delta = Math.round((nextSize - previousSize) / 2)

    this.grid = world.grid
    this.world = world
    this.occupancy = new OccupancyMap(this.grid)

    const kept: PlacedInstance[] = []

    for (const instance of this.instances.values()) {
      const nextAnchor = {
        x: instance.record.anchor.x + delta,
        z: instance.record.anchor.z + delta,
      }
      const cells = footprintCells(nextAnchor, instance.item.footprint, instance.record.rotation)

      if (cells.every((cell) => this.grid.contains(cell))) {
        instance.record = { ...instance.record, anchor: nextAnchor }
        instance.cells = cells
        kept.push(instance)
      } else {
        this.instancesObject.remove(instance.object)
        this.instances.delete(instance.id)
        if (this.selectedId === instance.id) this.selectedId = null
      }
    }

    for (const instance of kept) {
      this.occupancy.occupy(instance.cells, instance.id)
      this.positionInstance(instance)
    }

    for (const instance of kept) {
      if (instance.item.autoTile) {
        this.refreshAutoTileAround(instance.record.anchor, instance.item.autoTile)
      }
    }
  }

  applyTheme(theme: ThemeDefinition): void {
    if (this.theme.id === theme.id) return

    this.theme = theme
  }

  private defaultColorFor(item: CatalogItem): string {
    const originThemeId = item.themes.find((themeId) => themeId !== '*')
    const palette = originThemeId ? resolveTheme(originThemeId).palette : DEFAULT_THEME.palette
    return palette[item.palette as PaletteRole]
  }

  /** Reconstruye todos los modelos, por ejemplo cuando termina la carga de glTF. */
  refreshModels(): void {
    for (const instance of this.instances.values()) {
      if (instance.item.autoTile) {
        const mask = this.autoTileMask(instance.record.anchor, instance.item.autoTile)
        const resolved = resolveAutoTile(mask)
        instance.variant = resolved.variant
        instance.variantRotation = resolved.rotation + instance.record.rotation * (Math.PI / 2)
      } else {
        instance.variantRotation = instance.record.rotation * (Math.PI / 2)
      }

      this.rebuildModel(instance)
    }
  }

  dispose(): void {
    for (const instance of this.instances.values()) {
      this.instancesObject.remove(instance.object)
    }

    this.instances.clear()
    this.materials.dispose()
    this.object.clear()
  }

  private positionInstance(instance: PlacedInstance): void {
    const placement = describeFootprint(
      instance.record.anchor,
      instance.item.footprint,
      instance.record.rotation,
    )
    const half = this.grid.halfSize
    const y = this.worldHeightAt(placement.centerX + 0.5 - half, placement.centerZ + 0.5 - half)
    const offset = instance.item.category === 'path' ? 0.045 : 0.035

    instance.object.position.set(
      placement.centerX + 0.5 - half,
      y + offset,
      placement.centerZ + 0.5 - half,
    )
  }

  private rebuildModel(instance: PlacedInstance): void {
    instance.modelHolder.clear()

    const model = this.library.createInstanceModel(
      instance.item,
      instance.variant,
      this.materials,
      instance.record.color,
    )
    model.position.y = instance.item.groundOffset ?? 0
    model.rotation.y = instance.variantRotation
    instance.modelHolder.add(model)
  }

  private refreshAutoTileAround(cell: GridCell, style: string): void {
    const ids = new Set<string>()
    const centerId = this.occupancy.idAt(cell)
    if (centerId) ids.add(centerId)

    for (const direction of AUTO_DIRECTIONS) {
      const neighbor = { x: cell.x + direction.dx, z: cell.z + direction.dz }
      const id = this.occupancy.idAt(neighbor)
      if (id) ids.add(id)
    }

    for (const id of ids) {
      const instance = this.instances.get(id)
      if (instance?.item.autoTile !== style) continue
      this.updateAutoTile(instance, style)
    }
  }

  private updateAutoTile(instance: PlacedInstance, style: string): void {
    const mask = this.autoTileMask(instance.record.anchor, style)
    const resolved = resolveAutoTile(mask)
    const rotation = resolved.rotation + instance.record.rotation * (Math.PI / 2)

    if (instance.variant === resolved.variant && instance.variantRotation === rotation) {
      return
    }

    instance.variant = resolved.variant
    instance.variantRotation = rotation
    this.rebuildModel(instance)
  }

  private worldHeightAt(x: number, z: number): number {
    return this.world.heightAt(x, z)
  }

  private autoTileMask(cell: GridCell, style: string): number {
    let mask = 0

    for (const direction of AUTO_DIRECTIONS) {
      const neighbor = { x: cell.x + direction.dx, z: cell.z + direction.dz }
      const instance = this.instanceAt(neighbor)
      if (instance?.item.autoTile === style) mask |= direction.bit
    }

    return mask
  }
}
