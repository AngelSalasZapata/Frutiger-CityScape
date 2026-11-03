import themeJson from '@data/themes/aero_classic.json'

export interface ThemeDefinition {
  id: string
  name: string
  sky: {
    top: string
    horizon: string
    sun: string
    sunDirection: [number, number, number]
  }
  fog: {
    color: string
    near: number
    far: number
  }
  ground: {
    grass: string
    grid: string
    gridCenter: string
  }
  lighting: {
    hemisphereSky: string
    hemisphereGround: string
    hemisphereIntensity: number
    sun: string
    sunIntensity: number
  }
}

/**
 * Los temas viven en `data/themes/*.json`. En la Fase 4 se añadirán el resto
 * de variantes (Frutiger Eco, Dorfic...) sin tocar código.
 */
export const AERO_CLASSIC_THEME = themeJson as unknown as ThemeDefinition
