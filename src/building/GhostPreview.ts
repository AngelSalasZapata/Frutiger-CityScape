import * as THREE from 'three'

import type { ThemeDefinition } from '@/render/theme'

import type { AssetLibrary } from './AssetLibrary'
import type { CatalogItem } from './Catalog'
import type { FootprintPlacement } from './Footprint'

const CELL_GEOMETRY = new THREE.PlaneGeometry(0.92, 0.92)

function cellKey(placement: FootprintPlacement): string {
  return placement.cells.map((cell) => `${cell.x}:${cell.z}`).join('|')
}

/**
 * Previsualización de la construcción: huella de celdas coloreada según
 * validez, modelo fantasma translúcido y contorno del objeto seleccionado.
 * No conoce el historial ni la lógica de ocupación; solo dibuja lo que el
 * controlador le indica.
 */
export class GhostPreview {
  /** Raíz del fantasma (huella + modelo translúcido). */
  readonly object = new THREE.Group()
  /** Raíz independiente del contorno de selección: no se oculta con el fantasma. */
  readonly selectionObject = new THREE.Group()

  private readonly modelHolder = new THREE.Group()
  private readonly footprintGroup = new THREE.Group()
  private readonly selectionGroup = new THREE.Group()

  private readonly ghostMaterial = new THREE.MeshBasicMaterial({
    color: '#b6e34b',
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    side: THREE.DoubleSide,
  })

  private readonly footprintMaterial = new THREE.MeshBasicMaterial({
    color: '#b6e34b',
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    side: THREE.DoubleSide,
  })

  private readonly selectionMaterial = new THREE.LineBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  })

  private ghostItemId: string | null = null
  private footprintKey = ''
  private ghostModel: THREE.Object3D | null = null
  private selectionGeometry: THREE.BufferGeometry | null = null

  constructor(
    private readonly library: AssetLibrary,
    private theme: ThemeDefinition,
  ) {
    this.object.name = 'build-preview'
    this.object.visible = false
    this.footprintGroup.name = 'ghost-footprint'
    this.modelHolder.name = 'ghost-model'
    this.selectionGroup.name = 'selection-marker'
    this.selectionGroup.visible = false
    this.selectionObject.name = 'selection-root'
    this.selectionObject.visible = false

    this.object.add(this.footprintGroup, this.modelHolder)
    this.selectionObject.add(this.selectionGroup)
    this.applyTheme(theme)
  }

  showGhost(
    item: CatalogItem,
    placement: FootprintPlacement,
    valid: boolean,
    halfSize: number,
  ): void {
    this.object.visible = true

    const color = valid ? this.theme.construction.valid : this.theme.construction.invalid
    this.ghostMaterial.color.set(color)
    this.footprintMaterial.color.set(color)

    if (this.ghostItemId !== item.id) {
      this.rebuildGhostModel(item)
    }

    this.modelHolder.position.set(0, 0, 0)
    this.modelHolder.rotation.y = placement.rotation * (Math.PI / 2)
    this.object.position.set(
      placement.centerX + 0.5 - halfSize,
      item.category === 'path' ? 0.085 : 0.075,
      placement.centerZ + 0.5 - halfSize,
    )

    this.rebuildFootprint(placement, halfSize)
  }

  hideGhost(): void {
    this.object.visible = false
  }

  showSelection(placement: FootprintPlacement, height: number, halfSize: number): void {
    this.selectionObject.visible = true
    this.selectionGroup.visible = true

    this.selectionGeometry?.dispose()
    this.selectionGroup.clear()

    const centerX = placement.centerX + 0.5 - halfSize
    const centerZ = placement.centerZ + 0.5 - halfSize
    const halfWidth = placement.width / 2
    const halfDepth = placement.depth / 2
    const bottom = 0.08
    const top = Math.max(height + 0.12, bottom + 0.4)

    const points: THREE.Vector3[] = []
    const corners: [number, number][] = [
      [-halfWidth, -halfDepth],
      [halfWidth, -halfDepth],
      [halfWidth, halfDepth],
      [-halfWidth, halfDepth],
    ]

    for (let index = 0; index < corners.length; index += 1) {
      const current = corners[index]!
      const next = corners[(index + 1) % corners.length]!
      points.push(new THREE.Vector3(current[0], bottom, current[1]))
      points.push(new THREE.Vector3(next[0], bottom, next[1]))
      points.push(new THREE.Vector3(current[0], bottom, current[1]))
      points.push(new THREE.Vector3(current[0], top, current[1]))
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    this.selectionGeometry = geometry

    const lines = new THREE.LineSegments(geometry, this.selectionMaterial)
    lines.position.set(centerX, 0, centerZ)
    this.selectionGroup.add(lines)
  }

  hideSelection(): void {
    this.selectionGroup.visible = false
    this.selectionObject.visible = false
  }

  applyTheme(theme: ThemeDefinition): void {
    this.theme = theme
    this.selectionMaterial.color.set(theme.construction.selection)
    this.ghostMaterial.opacity = theme.construction.ghostOpacity
    this.footprintMaterial.opacity = Math.min(0.34, theme.construction.ghostOpacity * 0.6)
  }

  dispose(): void {
    this.ghostModel = null
    this.selectionGeometry?.dispose()
    this.selectionGeometry = null
    this.selectionGroup.clear()
    this.footprintGroup.clear()
    this.modelHolder.clear()
    this.ghostMaterial.dispose()
    this.footprintMaterial.dispose()
    this.selectionMaterial.dispose()
    this.object.clear()
    this.selectionObject.clear()
  }

  private rebuildGhostModel(item: CatalogItem): void {
    this.modelHolder.clear()
    this.ghostModel = this.library.createGhostModel(item, this.ghostMaterial)
    this.ghostItemId = item.id

    if (this.ghostModel) this.modelHolder.add(this.ghostModel)
  }

  private rebuildFootprint(placement: FootprintPlacement, halfSize: number): void {
    const nextKey = cellKey(placement)
    if (nextKey === this.footprintKey) return

    this.footprintKey = nextKey
    this.footprintGroup.clear()

    for (const cell of placement.cells) {
      const tile = new THREE.Mesh(CELL_GEOMETRY, this.footprintMaterial)
      tile.rotation.x = -Math.PI / 2
      tile.position.set(
        cell.x + 0.5 - halfSize - this.object.position.x,
        0.07,
        cell.z + 0.5 - halfSize - this.object.position.z,
      )
      this.footprintGroup.add(tile)
    }
  }
}
