import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

import type { ThemeMaterialLibrary } from '@/render/ThemeMaterials'
import { applyThemeMaterials } from '@/render/ThemeMaterials'

import type { CatalogItem } from './Catalog'

export const AUTO_TILE_VARIANTS = ['dot', 'end', 'straight', 'corner', 'tee', 'cross'] as const
export type AutoTileVariant = (typeof AUTO_TILE_VARIANTS)[number]

export interface AssetLoadResult {
  loaded: number
  failed: readonly string[]
}

function isAutoTileCategory(category: CatalogItem['category']): boolean {
  return category === 'path' || category === 'fence'
}

function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  return `${normalizedBase}${path.replace(/^\/+/, '')}`
}

export class AssetLibrary {
  private readonly loader = new GLTFLoader()
  private readonly sources = new Map<string, THREE.Group>()
  private readonly failures = new Set<string>()

  get loadedCount(): number {
    return this.sources.size
  }

  get failureCount(): number {
    return this.failures.size
  }

  async load(items: readonly CatalogItem[]): Promise<AssetLoadResult> {
    await Promise.all(items.map((item) => this.loadItem(item)))

    return {
      loaded: this.sources.size,
      failed: [...this.failures],
    }
  }

  getSource(itemId: string, variant?: AutoTileVariant): THREE.Group | null {
    return this.sources.get(this.keyFor(itemId, variant)) ?? null
  }

  createInstanceModel(
    item: CatalogItem,
    variant: AutoTileVariant | undefined,
    materials: ThemeMaterialLibrary,
    color?: string,
  ): THREE.Object3D {
    const source = this.getSource(item.id, variant)
    if (!source) return this.createFallback(item, materials)

    const model = source.clone(true)
    applyThemeMaterials(model, materials, color)
    if (item.scale !== undefined) model.scale.setScalar(item.scale)
    return model
  }

  createGhostModel(item: CatalogItem, material: THREE.Material): THREE.Object3D | null {
    const source = this.getSource(item.id, isAutoTileCategory(item.category) ? 'end' : undefined)
    if (!source) return null

    const model = source.clone(true)
    if (item.scale !== undefined) model.scale.setScalar(item.scale)
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) object.material = material
    })
    return model
  }

  dispose(): void {
    for (const source of this.sources.values()) {
      source.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.geometry.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        for (const material of materials) material.dispose()
      })
    }

    this.sources.clear()
    this.failures.clear()
  }

  private keyFor(itemId: string, variant?: AutoTileVariant): string {
    return variant ? `${itemId}:${variant}` : itemId
  }

  private async loadItem(item: CatalogItem): Promise<void> {
    const paths = this.pathsForItem(item)

    for (const { variant, path } of paths) {
      try {
        const gltf = await this.loader.loadAsync(assetUrl(path))
        this.sources.set(this.keyFor(item.id, variant), gltf.scene)
      } catch (error) {
        this.failures.add(item.id)
        console.warn(`No se pudo cargar el modelo de "${item.id}" (${path})`, error)
      }
    }
  }

  private pathsForItem(
    item: CatalogItem,
  ): readonly { variant: AutoTileVariant | undefined; path: string }[] {
    if (item.autoTile || isAutoTileCategory(item.category)) {
      const style = item.autoTile ?? item.id
      return AUTO_TILE_VARIANTS.map((variant) => ({
        variant,
        path: `assets/models/autotile/${style}_${variant}.glb`,
      }))
    }

    if (!item.model) return []
    return [{ variant: undefined, path: item.model }]
  }

  private createFallback(item: CatalogItem, materials: ThemeMaterialLibrary): THREE.Object3D {
    const group = new THREE.Group()
    group.name = `${item.id}-fallback`

    const [width, depth] = item.footprint
    const height = Math.max(item.height * 0.5, 0.6)
    const geometry = new THREE.BoxGeometry(
      Math.max(width - 0.18, 0.4),
      height,
      Math.max(depth - 0.18, 0.4),
    )
    const mesh = new THREE.Mesh(geometry, materials.get('accent'))
    mesh.position.y = height / 2
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)

    return group
  }
}
