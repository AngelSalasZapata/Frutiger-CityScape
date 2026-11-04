import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

import type { ThemeDefinition } from '@/render/theme'
import { disposeObject3D } from '@/utils/dispose'

import type { ChunkGrid } from './ChunkGrid'
import { normalizeTerrain } from './WorldConfig'
import type { TerrainSettings, WorldPreset } from './WorldConfig'

interface Hill {
  x: number
  z: number
  radius: number
  height: number
}

function makeHills(size: number, settings: TerrainSettings): readonly Hill[] {
  if (settings.mode !== 'hills') return []

  const hills: Hill[] = []
  const count = settings.density
  const radius = Math.max(3.5, size / Math.max(3, Math.sqrt(count) * 2.2))
  const height = 0.35 + settings.prominence * 2.85

  for (let index = 0; index < count; index += 1) {
    const seed = index + 1
    const x = Math.sin(seed * 79.31) * 0.5 * size * 0.72
    const z = Math.cos(seed * 43.17) * 0.5 * size * 0.72
    hills.push({
      x,
      z,
      radius: radius * (0.72 + ((seed * 37) % 29) / 70),
      height: height * (0.65 + ((seed * 17) % 31) / 75),
    })
  }

  return hills
}

/**
 * `GridHelper` guarda los colores en un atributo por vértice, no en el
 * material. Esta función reescribe ese atributo respetando las líneas
 * centrales para poder cambiar de tema sin reconstruir la malla.
 */
function recolorGrid(grid: THREE.GridHelper, centerHex: string, lineHex: string): void {
  const position = grid.geometry.getAttribute('position')
  const color = grid.geometry.getAttribute('color')
  if (!position || !color) return

  const center = new THREE.Color(centerHex)
  const line = new THREE.Color(lineHex)

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = position.getZ(index)
    const isCenter = Math.abs(x) < 1e-5 || Math.abs(z) < 1e-5
    const chosen = isCenter ? center : line
    color.setXYZ(index, chosen.r, chosen.g, chosen.b)
  }

  color.needsUpdate = true
}

/**
 * Isla del diorama: una base de plástico con borde de arena, la superficie de
 * césped y dos retículas superpuestas (celdas y chunks). El agua se construye
 * aparte en `Water` para mantener este archivo enfocado en la tierra.
 */
export class Terrain {
  readonly object = new THREE.Group()

  private readonly cliffMaterial: THREE.MeshPhysicalMaterial
  private readonly shoreMaterial: THREE.MeshStandardMaterial
  private readonly groundMaterial: THREE.MeshStandardMaterial
  private readonly grid: THREE.GridHelper
  private readonly chunkOverlay: THREE.GridHelper
  private readonly hills: readonly Hill[]

  constructor(
    preset: WorldPreset,
    theme: ThemeDefinition,
    chunkGrid: ChunkGrid,
    terrainSettings: TerrainSettings,
  ) {
    const size = preset.size
    this.hills = makeHills(size, normalizeTerrain(terrainSettings))
    const baseHeight = 2.8
    const shoreThickness = 0.3

    this.cliffMaterial = new THREE.MeshPhysicalMaterial({
      color: theme.ground.cliff,
      roughness: 0.42,
      metalness: 0,
      clearcoat: 0.45,
      clearcoatRoughness: 0.3,
    })

    const base = new THREE.Mesh(
      new RoundedBoxGeometry(size + 0.9, baseHeight, size + 0.9, 4, 0.6),
      this.cliffMaterial,
    )
    base.name = 'terrain-base'
    base.position.y = -baseHeight / 2
    base.castShadow = true
    base.receiveShadow = true

    this.shoreMaterial = new THREE.MeshStandardMaterial({
      color: theme.ground.shore,
      roughness: 0.72,
      metalness: 0,
    })

    const shore = new THREE.Mesh(
      new RoundedBoxGeometry(size + 1.4, shoreThickness, size + 1.4, 3, 0.45),
      this.shoreMaterial,
    )
    shore.name = 'terrain-shore'
    shore.position.y = -shoreThickness / 2 + 0.01
    shore.castShadow = true
    shore.receiveShadow = true

    this.groundMaterial = new THREE.MeshStandardMaterial({
      color: theme.ground.grass,
      roughness: 0.82,
      metalness: 0,
    })

    const groundGeometry = new THREE.PlaneGeometry(size, size, 64, 64)
    groundGeometry.rotateX(-Math.PI / 2)
    const positions = groundGeometry.getAttribute('position')
    for (let index = 0; index < positions.count; index += 1) {
      positions.setY(index, this.heightAt(positions.getX(index), positions.getZ(index)))
    }
    positions.needsUpdate = true
    groundGeometry.computeVertexNormals()

    const ground = new THREE.Mesh(groundGeometry, this.groundMaterial)
    ground.name = 'terrain-ground'
    ground.position.y = 0.03
    ground.receiveShadow = true

    this.grid = new THREE.GridHelper(size, size, theme.ground.gridCenter, theme.ground.grid)
    this.grid.name = 'terrain-grid'
    this.grid.position.y = 0.05

    const gridMaterial = this.grid.material as THREE.LineBasicMaterial
    gridMaterial.transparent = true
    gridMaterial.opacity = size <= 32 ? 0.22 : size <= 64 ? 0.15 : 0.1
    gridMaterial.depthWrite = false

    this.chunkOverlay = new THREE.GridHelper(
      size,
      chunkGrid.chunksPerAxis,
      theme.ground.chunk,
      theme.ground.chunk,
    )
    this.chunkOverlay.name = 'terrain-chunks'
    this.chunkOverlay.position.y = 0.065

    const chunkMaterial = this.chunkOverlay.material as THREE.LineBasicMaterial
    chunkMaterial.transparent = true
    chunkMaterial.opacity = 0.5
    chunkMaterial.depthWrite = false

    this.object.name = 'terrain'
    this.object.add(base, shore, ground, this.grid, this.chunkOverlay)
  }

  heightAt(x: number, z: number): number {
    let elevation = 0
    for (const hill of this.hills) {
      const dx = x - hill.x
      const dz = z - hill.z
      const distance = Math.hypot(dx, dz)
      if (distance >= hill.radius) continue
      const falloff = 1 - distance / hill.radius
      elevation += hill.height * falloff * falloff
    }
    return Number.isFinite(elevation) ? elevation : 0
  }

  get gridVisible(): boolean {
    return this.grid.visible
  }

  get chunksVisible(): boolean {
    return this.chunkOverlay.visible
  }

  applyTheme(theme: ThemeDefinition): void {
    this.cliffMaterial.color.set(theme.ground.cliff)
    this.shoreMaterial.color.set(theme.ground.shore)
    this.groundMaterial.color.set(theme.ground.grass)
    recolorGrid(this.grid, theme.ground.gridCenter, theme.ground.grid)
    recolorGrid(this.chunkOverlay, theme.ground.chunk, theme.ground.chunk)
  }

  toggleGrid(): boolean {
    this.grid.visible = !this.grid.visible
    return this.grid.visible
  }

  toggleChunks(): boolean {
    this.chunkOverlay.visible = !this.chunkOverlay.visible
    return this.chunkOverlay.visible
  }

  dispose(): void {
    disposeObject3D(this.object)
  }
}
