import presetsJson from '@data/worlds/presets.json'

export interface WorldPreset {
  id: string
  label: string
  size: number
  chunkSize: number
}

export type TerrainMode = 'flat' | 'hills'

export interface TerrainSettings {
  mode: TerrainMode
  /** Número de colinas decorativas dentro del diorama. */
  density: number
  /** 0 = lomas bajas; 1 = relieve pronunciado. */
  prominence: number
}

export const DEFAULT_TERRAIN: TerrainSettings = {
  mode: 'flat',
  density: 4,
  prominence: 0.35,
}

export function normalizeTerrain(settings: TerrainSettings): TerrainSettings {
  return {
    mode: settings.mode === 'hills' ? 'hills' : 'flat',
    density: Math.max(1, Math.min(12, Math.round(settings.density))),
    prominence: Math.max(0, Math.min(1, settings.prominence)),
  }
}

interface WorldPresetFile {
  version: number
  default: string
  presets: WorldPreset[]
}

const presetFile = presetsJson as WorldPresetFile

export const WORLD_PRESETS: readonly WorldPreset[] = presetFile.presets

export function resolveWorldPreset(id: string): WorldPreset {
  const preset = WORLD_PRESETS.find((candidate) => candidate.id === id)
  if (!preset) {
    throw new Error(`El preset de mundo "${id}" no existe en data/worlds/presets.json`)
  }
  return preset
}

export const DEFAULT_WORLD_PRESET = resolveWorldPreset(presetFile.default)

/**
 * Factor de escala respecto al diorama pequeño. Se usa para adaptar niebla,
 * luces y cámara a presets más grandes sin valores mágicos repartidos.
 */
export const REFERENCE_WORLD_SIZE = 32

export function worldScale(size: number): number {
  return Math.max(size / REFERENCE_WORLD_SIZE, 1)
}
