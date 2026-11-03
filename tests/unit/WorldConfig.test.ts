import { describe, expect, it } from 'vitest'

import { DEFAULT_WORLD_PRESET, resolveWorldPreset, WORLD_PRESETS } from '@/world/WorldConfig'

describe('WorldConfig', () => {
  it('expone los tres presets del documento', () => {
    expect(WORLD_PRESETS.map((preset) => preset.id)).toEqual(['small', 'medium', 'large'])
  })

  it('usa el preset pequeño por defecto', () => {
    expect(DEFAULT_WORLD_PRESET.id).toBe('small')
    expect(DEFAULT_WORLD_PRESET.size).toBe(32)
  })

  it('mantiene chunks que dividen exactamente el tamaño', () => {
    for (const preset of WORLD_PRESETS) {
      expect(preset.size % preset.chunkSize).toBe(0)
      expect(preset.chunkSize).toBe(16)
    }
  })

  it('falla con un preset desconocido', () => {
    expect(() => resolveWorldPreset('gigante')).toThrow(/no existe/)
  })
})
