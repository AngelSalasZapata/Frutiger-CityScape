import buildingsJson from '@data/catalog/buildings.json'
import natureJson from '@data/catalog/nature.json'
import npcsJson from '@data/catalog/npcs.json'
import pathsJson from '@data/catalog/paths.json'
import propsJson from '@data/catalog/props.json'
import vehiclesJson from '@data/catalog/vehicles.json'

export type CatalogCategory = 'building' | 'nature' | 'npc' | 'prop' | 'vehicle' | 'path' | 'fence'
export type CatalogPhysics = 'static' | 'dynamic' | 'kinematic'
export type PaletteRole = 'primary' | 'secondary' | 'accent' | 'neutral'

export interface CatalogInteraction {
  id: string
  offset: [number, number, number]
  duration: number
}

export interface CatalogItem {
  id: string
  name: string
  category: CatalogCategory
  themes: string[]
  model?: string
  autoTile?: string
  footprint: [number, number]
  height: number
  scale?: number
  groundOffset?: number
  physics: CatalogPhysics
  palette: PaletteRole
  description: string
  interactions?: CatalogInteraction[]
}

interface CatalogFile {
  version: number
  items: CatalogItem[]
}

const CATALOG_FILES = [
  buildingsJson,
  natureJson,
  npcsJson,
  propsJson,
  vehiclesJson,
  pathsJson,
] as unknown as readonly CatalogFile[]

export const CATALOG_CATEGORIES: readonly CatalogCategory[] = [
  'building',
  'nature',
  'npc',
  'prop',
  'vehicle',
  'path',
  'fence',
]

export const CATEGORY_LABELS: Readonly<Record<CatalogCategory, string>> = {
  building: 'Edificios',
  nature: 'Naturaleza',
  npc: 'NPCs',
  prop: 'Props',
  vehicle: 'Vehículos',
  path: 'Caminos',
  fence: 'Cercas',
}

const CATALOG_PHYSICS: readonly CatalogPhysics[] = ['static', 'dynamic', 'kinematic']
const CATALOG_PALETTES: readonly PaletteRole[] = ['primary', 'secondary', 'accent', 'neutral']

export function validateCatalog(items: readonly CatalogItem[]): void {
  const ids = new Set<string>()

  for (const item of items) {
    if (ids.has(item.id)) {
      throw new Error(`El catálogo tiene un id duplicado: ${item.id}`)
    }

    ids.add(item.id)

    if (!CATALOG_CATEGORIES.includes(item.category)) {
      throw new Error(`Categoría desconocida en "${item.id}": ${item.category}`)
    }

    if (!item.name || !item.description) {
      throw new Error(`El item "${item.id}" necesita nombre y descripción`)
    }

    const [width, depth] = item.footprint
    if (!Number.isInteger(width) || !Number.isInteger(depth) || width < 1 || depth < 1) {
      throw new Error(`Footprint inválido en "${item.id}": ${item.footprint.join(' × ')}`)
    }

    if (item.scale !== undefined && (!(item.scale > 0) || !Number.isFinite(item.scale))) {
      throw new Error(`Escala inválida en "${item.id}"`)
    }

    if (
      item.groundOffset !== undefined &&
      (!Number.isFinite(item.groundOffset) || item.groundOffset < 0)
    ) {
      throw new Error(`Elevación inválida en "${item.id}"`)
    }

    if (!CATALOG_PHYSICS.includes(item.physics)) {
      throw new Error(`Física desconocida en "${item.id}": ${item.physics}`)
    }

    if (!CATALOG_PALETTES.includes(item.palette)) {
      throw new Error(`Paleta desconocida en "${item.id}": ${item.palette}`)
    }

    if (!item.model && !item.autoTile) {
      throw new Error(`El item "${item.id}" no declara model ni autoTile`)
    }

    if ((item.category === 'path' || item.category === 'fence') && !item.autoTile) {
      throw new Error(`El item "${item.id}" es de tipo ${item.category} y necesita autoTile`)
    }

    if (!Array.isArray(item.themes) || item.themes.length === 0) {
      throw new Error(`El item "${item.id}" no declara temas`)
    }
  }
}

export const CATALOG_ITEMS: readonly CatalogItem[] = CATALOG_FILES.flatMap((file) => file.items)

validateCatalog(CATALOG_ITEMS)

const CATALOG_BY_ID = new Map(CATALOG_ITEMS.map((item) => [item.id, item]))

export function resolveCatalogItem(id: string): CatalogItem {
  const item = CATALOG_BY_ID.get(id)
  if (!item) {
    throw new Error(`El item de catálogo "${id}" no existe`)
  }
  return item
}

export function isItemAvailable(item: CatalogItem, themeId: string): boolean {
  return item.themes.includes('*') || item.themes.includes(themeId)
}

/** Todos los assets permanecen disponibles; los temas solo identifican su paleta de origen. */
export function allCatalogItems(category?: CatalogCategory): readonly CatalogItem[] {
  return category ? CATALOG_ITEMS.filter((item) => item.category === category) : CATALOG_ITEMS
}

export function itemsForTheme(themeId: string, category?: CatalogCategory): readonly CatalogItem[] {
  return CATALOG_ITEMS.filter(
    (item) => isItemAvailable(item, themeId) && (!category || item.category === category),
  )
}

export function availableCategories(themeId: string): readonly CatalogCategory[] {
  const categories = new Set(itemsForTheme(themeId).map((item) => item.category))
  return CATALOG_CATEGORIES.filter((category) => categories.has(category))
}
