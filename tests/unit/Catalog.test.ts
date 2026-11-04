import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { AUTO_TILE_VARIANTS } from '@/building/AssetLibrary'
import {
  CATALOG_CATEGORIES,
  CATALOG_ITEMS,
  isItemAvailable,
  itemsForTheme,
  resolveCatalogItem,
  validateCatalog,
} from '@/building/Catalog'
import { THEMES } from '@/render/theme'

const PUBLIC_ROOT = join(process.cwd(), 'public')

function assetExists(relativePath: string): boolean {
  return existsSync(join(PUBLIC_ROOT, relativePath))
}

describe('Catálogo', () => {
  it('carga los archivos de categoría sin ids duplicados', () => {
    expect(CATALOG_ITEMS.length).toBeGreaterThan(30)

    const ids = new Set(CATALOG_ITEMS.map((item) => item.id))
    expect(ids.size).toBe(CATALOG_ITEMS.length)
  })

  it('incluye todas las categorías previstas', () => {
    const categories = new Set(CATALOG_ITEMS.map((item) => item.category))

    for (const category of CATALOG_CATEGORIES) {
      expect(categories.has(category)).toBe(true)
    }
  })

  it('referencia temas existentes o el comodín global', () => {
    const themeIds = new Set(THEMES.map((theme) => theme.id))

    for (const item of CATALOG_ITEMS) {
      for (const theme of item.themes) {
        if (theme === '*') continue
        expect(themeIds.has(theme), `${item.id} apunta al tema ${theme}`).toBe(true)
      }
    }
  })

  it('tiene el modelo o los seis variantes de auto-tile en disco', () => {
    for (const item of CATALOG_ITEMS) {
      if (item.autoTile) {
        for (const variant of AUTO_TILE_VARIANTS) {
          const path = `assets/models/autotile/${item.autoTile}_${variant}.glb`
          expect(assetExists(path), path).toBe(true)
        }
        continue
      }

      expect(item.model, item.id).toBeDefined()
      expect(assetExists(item.model!), item.model).toBe(true)
    }
  })

  it('resuelve items por id y falla con ids desconocidos', () => {
    expect(resolveCatalogItem('aero_tower').category).toBe('building')
    expect(() => resolveCatalogItem('no-existe')).toThrow(/no existe/)
  })

  it('filtra por tema', () => {
    expect(isItemAvailable(resolveCatalogItem('aero_tower'), 'dark_aero')).toBe(true)
    expect(isItemAvailable(resolveCatalogItem('eco_tower'), 'dark_aero')).toBe(false)
    expect(itemsForTheme('frutiger_eco').some((item) => item.id === 'eco_tower')).toBe(true)
    expect(itemsForTheme('dark_aero').some((item) => item.id === 'eco_tower')).toBe(false)
  })

  it('rechaza catálogos inválidos', () => {
    const valid = resolveCatalogItem('kiosk')

    expect(() => validateCatalog([valid, valid])).toThrow(/duplicado/)
    expect(() => validateCatalog([{ ...valid, footprint: [0, 1] }])).toThrow(/Footprint/)
    expect(() => validateCatalog([{ ...valid, themes: [] }])).toThrow(/temas/)
    expect(() => validateCatalog([{ ...valid, model: undefined }])).toThrow(/model/)
    expect(() => validateCatalog([{ ...valid, category: 'path' }])).toThrow(/autoTile/)
  })
})
