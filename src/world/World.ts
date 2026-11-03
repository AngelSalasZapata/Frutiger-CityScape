import * as THREE from 'three'

import type { ThemeDefinition } from '@/render/theme'

import { ChunkGrid } from './ChunkGrid'
import { Terrain } from './Terrain'
import { Water } from './Water'
import { WorldGrid } from './WorldGrid'
import type { WorldPreset } from './WorldConfig'

/**
 * Composición del mundo de una sesión. Mantiene juntos la grilla lógica, la
 * partición en chunks y las mallas del diorama para que reemplazar el tamaño
 * sea una operación atómica: se crea un mundo nuevo y se descarta el anterior.
 */
export class World {
  readonly object = new THREE.Group()
  readonly grid: WorldGrid
  readonly chunks: ChunkGrid

  private readonly terrain: Terrain
  private readonly water: Water

  constructor(
    readonly preset: WorldPreset,
    theme: ThemeDefinition,
  ) {
    this.grid = new WorldGrid(preset.size)
    this.chunks = new ChunkGrid(preset.size, preset.chunkSize)
    this.terrain = new Terrain(preset, theme, this.chunks)
    this.water = new Water(preset, theme)

    this.object.name = `world-${preset.id}`
    this.object.add(this.water.object, this.terrain.object)
  }

  get gridVisible(): boolean {
    return this.terrain.gridVisible
  }

  get chunksVisible(): boolean {
    return this.terrain.chunksVisible
  }

  update(dt: number): void {
    this.water.update(dt)
  }

  toggleGrid(): boolean {
    return this.terrain.toggleGrid()
  }

  toggleChunks(): boolean {
    return this.terrain.toggleChunks()
  }

  dispose(): void {
    this.water.dispose()
    this.terrain.dispose()
    this.object.clear()
  }
}
