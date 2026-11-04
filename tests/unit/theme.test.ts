import { describe, expect, it } from 'vitest'

import type { MaterialSlot } from '@/render/theme'
import {
  DEFAULT_THEME,
  resolveTheme,
  resolveThemeMaterial,
  THEMES,
  validateThemes,
} from '@/render/theme'

const SLOTS: readonly MaterialSlot[] = [
  'glass',
  'solid',
  'accent',
  'roof',
  'wood',
  'leaf',
  'stone',
  'metal',
  'emissive',
  'water',
  'fabric',
]

const REQUIRED_THEMES = [
  'aero_classic',
  'frutiger_eco',
  'frutiger_aurora',
  'frutiger_metro',
  'helvetica_aqua_aero',
  'dark_aero',
  'fotonight_web',
  'dorfic',
]

describe('Temas', () => {
  it('incluye los ocho temas pedidos', () => {
    expect(THEMES.map((theme) => theme.id)).toEqual(REQUIRED_THEMES)
  })

  it('usa Aero Classic como tema por defecto', () => {
    expect(DEFAULT_THEME.id).toBe('aero_classic')
    expect(resolveTheme('dark_aero').name).toBe('Dark Aero')
    expect(() => resolveTheme('no-existe')).toThrow(/no existe/)
  })

  it('resuelve una definición de material para cada ranura', () => {
    for (const theme of THEMES) {
      for (const slot of SLOTS) {
        const material = resolveThemeMaterial(theme, slot)
        expect(material.color, `${theme.id}.${slot}`).toMatch(/^#[0-9a-f]{6}$/i)
      }
    }
  })

  it('valida estructura y colores', () => {
    expect(() => validateThemes(THEMES)).not.toThrow()

    expect(() => validateThemes([THEMES[0]!, THEMES[0]!])).toThrow(/duplicado/)

    const withBadColor = {
      ...DEFAULT_THEME,
      id: 'tema-roto',
      palette: { ...DEFAULT_THEME.palette, primary: 'azul' },
    }
    expect(() => validateThemes([withBadColor])).toThrow(/Color inválido/)

    const withBadOpacity = {
      ...DEFAULT_THEME,
      id: 'tema-opaco',
      construction: { ...DEFAULT_THEME.construction, ghostOpacity: 4 },
    }
    expect(() => validateThemes([withBadOpacity])).toThrow(/ghostOpacity/)
  })
})
