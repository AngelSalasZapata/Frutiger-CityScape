import * as THREE from 'three'

import type { MaterialSlot, ThemeDefinition, ThemeMaterialDefinition } from './theme'
import { resolveThemeMaterial } from './theme'

const MATERIAL_SLOTS: readonly MaterialSlot[] = [
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

function isMaterialSlot(value: string | undefined): value is MaterialSlot {
  return value !== undefined && MATERIAL_SLOTS.includes(value as MaterialSlot)
}

export function normalizeSlot(name: string | undefined): MaterialSlot {
  return isMaterialSlot(name) ? name : 'solid'
}

function createMaterial(slot: MaterialSlot, definition: ThemeMaterialDefinition) {
  const transmission = definition.transmission ?? 0
  const opacity = definition.opacity ?? 1

  return new THREE.MeshPhysicalMaterial({
    name: slot,
    color: definition.color,
    roughness: definition.roughness ?? 0.4,
    metalness: definition.metalness ?? 0,
    clearcoat: definition.clearcoat ?? 0.35,
    clearcoatRoughness: definition.clearcoatRoughness ?? 0.2,
    transmission,
    thickness: definition.thickness ?? 0.5,
    ior: definition.ior ?? 1.45,
    iridescence: definition.iridescence ?? 0,
    iridescenceIOR: definition.iridescenceIOR ?? 1.3,
    emissive: definition.emissive ?? '#000000',
    emissiveIntensity: definition.emissiveIntensity ?? 0,
    opacity,
    transparent: definition.transparent ?? opacity < 1,
    side: definition.side === 'double' ? THREE.DoubleSide : THREE.FrontSide,
    envMapIntensity: 1.1,
  })
}

/**
 * Materiales de un tema, cacheados por ranura. Todos los modelos del catálogo
 * usan nombres de material (`glass`, `wood`, `emissive`...) y aquí se traducen
 * a la paleta activa.
 */
export class ThemeMaterialLibrary {
  private readonly cache = new Map<MaterialSlot, THREE.MeshPhysicalMaterial>()
  private readonly coloredCache = new Map<string, THREE.MeshPhysicalMaterial>()

  constructor(readonly theme: ThemeDefinition) {}

  get(slot: MaterialSlot): THREE.MeshPhysicalMaterial {
    let material = this.cache.get(slot)

    if (!material) {
      material = createMaterial(slot, resolveThemeMaterial(this.theme, slot))
      this.cache.set(slot, material)
    }

    return material
  }

  getColored(slot: MaterialSlot, color?: string): THREE.MeshPhysicalMaterial {
    if (!color) return this.get(slot)
    const key = `${slot}:${color}`
    let material = this.coloredCache.get(key)
    if (!material) {
      material = this.get(slot).clone()
      material.color.set(color)
      if (slot === 'emissive') material.emissive.set(color)
      this.coloredCache.set(key, material)
    }
    return material
  }

  dispose(): void {
    for (const material of this.cache.values()) material.dispose()
    for (const material of this.coloredCache.values()) material.dispose()
    this.cache.clear()
    this.coloredCache.clear()
  }
}

/** Reemplaza los materiales del GLB por los del tema, conservando geometrías. */
export function applyThemeMaterials(
  root: THREE.Object3D,
  library: ThemeMaterialLibrary,
  color?: string,
): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return

    object.castShadow = true
    object.receiveShadow = true

    const current = object.material
    const source = Array.isArray(current) ? current[0] : current

    if (Array.isArray(current)) {
      object.material = current.map((material) =>
        library.getColored(normalizeSlot(material.name), color),
      )
    } else {
      object.material = library.getColored(normalizeSlot(source?.name), color)
    }
  })
}
