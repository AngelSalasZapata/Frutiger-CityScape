import aeroClassicJson from '@data/themes/aero_classic.json'
import darkAeroJson from '@data/themes/dark_aero.json'
import dorficJson from '@data/themes/dorfic.json'
import fotonightWebJson from '@data/themes/fotonight_web.json'
import frutigerAuroraJson from '@data/themes/frutiger_aurora.json'
import frutigerEcoJson from '@data/themes/frutiger_eco.json'
import frutigerMetroJson from '@data/themes/frutiger_metro.json'
import helveticaAquaAeroJson from '@data/themes/helvetica_aqua_aero.json'

export type MaterialSlot =
  | 'glass'
  | 'solid'
  | 'accent'
  | 'roof'
  | 'wood'
  | 'leaf'
  | 'stone'
  | 'metal'
  | 'emissive'
  | 'water'
  | 'fabric'

export interface ThemeMaterialDefinition {
  color: string
  roughness?: number
  metalness?: number
  transmission?: number
  thickness?: number
  ior?: number
  clearcoat?: number
  clearcoatRoughness?: number
  iridescence?: number
  iridescenceIOR?: number
  emissive?: string
  emissiveIntensity?: number
  opacity?: number
  transparent?: boolean
  side?: 'front' | 'double'
}

export interface ThemeDefinition {
  id: string
  name: string
  tagline: string
  /** Fuerza el HUD en modo oscuro; si falta se deduce de la atmósfera. */
  dark?: boolean
  palette: {
    primary: string
    secondary: string
    accent: string
    neutral: string
    atmosphere: string
  }
  sky: {
    top: string
    horizon: string
    sun: string
    sunDirection: [number, number, number]
    stars?: number
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
    chunk: string
    shore: string
    cliff: string
  }
  water: {
    deep: string
    shallow: string
    sky: string
    foam: string
  }
  lighting: {
    hemisphereSky: string
    hemisphereGround: string
    hemisphereIntensity: number
    sun: string
    sunIntensity: number
  }
  construction: {
    valid: string
    invalid: string
    selection: string
    ghostOpacity: number
  }
  materials: Partial<Record<MaterialSlot, ThemeMaterialDefinition>>
}

/**
 * Los temas viven en `data/themes/*.json`. La escena consume únicamente esta
 * definición, así que agregar una variante nueva es sumar un archivo y una
 * entrada al registro.
 */
const THEME_FILES: readonly ThemeDefinition[] = [
  aeroClassicJson,
  frutigerEcoJson,
  frutigerAuroraJson,
  frutigerMetroJson,
  helveticaAquaAeroJson,
  darkAeroJson,
  fotonightWebJson,
  dorficJson,
] as unknown as readonly ThemeDefinition[]

export const THEMES: readonly ThemeDefinition[] = THEME_FILES

const HEX_COLOR = /^#[0-9a-f]{6}$/i

function assertColor(value: string, context: string): void {
  if (!HEX_COLOR.test(value)) {
    throw new Error(`Color inválido en ${context}: ${value}`)
  }
}

/** Valida la forma mínima de los temas al cargarlos desde JSON. */
export function validateThemes(themes: readonly ThemeDefinition[]): void {
  const ids = new Set<string>()

  for (const theme of themes) {
    if (ids.has(theme.id)) {
      throw new Error(`El tema "${theme.id}" está duplicado`)
    }

    ids.add(theme.id)

    if (!theme.name || !theme.tagline) {
      throw new Error(`El tema "${theme.id}" necesita nombre y tagline`)
    }

    for (const [key, value] of Object.entries(theme.palette)) {
      assertColor(value, `${theme.id}.palette.${key}`)
    }

    for (const [key, value] of Object.entries(theme.ground)) {
      assertColor(value, `${theme.id}.ground.${key}`)
    }

    for (const [key, value] of Object.entries(theme.water)) {
      assertColor(value, `${theme.id}.water.${key}`)
    }

    assertColor(theme.sky.top, `${theme.id}.sky.top`)
    assertColor(theme.sky.horizon, `${theme.id}.sky.horizon`)
    assertColor(theme.sky.sun, `${theme.id}.sky.sun`)
    assertColor(theme.fog.color, `${theme.id}.fog.color`)
    assertColor(theme.lighting.hemisphereSky, `${theme.id}.lighting.hemisphereSky`)
    assertColor(theme.lighting.hemisphereGround, `${theme.id}.lighting.hemisphereGround`)
    assertColor(theme.lighting.sun, `${theme.id}.lighting.sun`)
    assertColor(theme.construction.valid, `${theme.id}.construction.valid`)
    assertColor(theme.construction.invalid, `${theme.id}.construction.invalid`)
    assertColor(theme.construction.selection, `${theme.id}.construction.selection`)

    if (theme.construction.ghostOpacity < 0 || theme.construction.ghostOpacity > 1) {
      throw new Error(`ghostOpacity fuera de rango en "${theme.id}"`)
    }

    if (theme.sky.sunDirection.length !== 3) {
      throw new Error(`sunDirection inválida en "${theme.id}"`)
    }
  }
}

validateThemes(THEMES)

export const DEFAULT_THEME = THEMES[0] as ThemeDefinition

export function resolveTheme(id: string): ThemeDefinition {
  const theme = THEMES.find((candidate) => candidate.id === id)
  if (!theme) {
    throw new Error(`El tema "${id}" no existe en data/themes`)
  }
  return theme
}

/**
 * Completa los materiales que un tema no define explícitamente. Así cada JSON
 * puede describir solo sus rasgos distintivos sin repetir toda la matriz.
 */
export function resolveThemeMaterial(
  theme: ThemeDefinition,
  slot: MaterialSlot,
): ThemeMaterialDefinition {
  const explicit = theme.materials[slot]
  if (explicit) return explicit

  switch (slot) {
    case 'glass':
      return {
        color: theme.palette.primary,
        roughness: 0.08,
        transmission: 0.85,
        thickness: 0.6,
        ior: 1.45,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
      }
    case 'accent':
      return { color: theme.palette.accent, roughness: 0.28, clearcoat: 0.8 }
    case 'roof':
      return { color: theme.palette.primary, roughness: 0.38, clearcoat: 0.5 }
    case 'wood':
      return { color: theme.palette.secondary, roughness: 0.52, clearcoat: 0.2 }
    case 'leaf':
      return { color: theme.ground.grass, roughness: 0.58, clearcoat: 0.35 }
    case 'stone':
      return { color: theme.ground.shore, roughness: 0.62, clearcoat: 0.15 }
    case 'metal':
      return { color: theme.palette.neutral, roughness: 0.26, metalness: 0.88 }
    case 'emissive':
      return {
        color: theme.palette.accent,
        emissive: theme.palette.accent,
        emissiveIntensity: 1.6,
        roughness: 0.24,
      }
    case 'water':
      return {
        color: theme.water.shallow,
        roughness: 0.08,
        transmission: 0.9,
        thickness: 0.5,
        ior: 1.33,
      }
    case 'fabric':
      return { color: theme.palette.secondary, roughness: 0.8 }
    case 'solid':
    default:
      return {
        color: theme.palette.neutral,
        roughness: 0.32,
        metalness: 0.04,
        clearcoat: 0.7,
        clearcoatRoughness: 0.15,
      }
  }
}
