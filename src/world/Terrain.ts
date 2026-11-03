import * as THREE from 'three'

import type { ThemeDefinition } from '@/render/theme'

import type { WorldPreset } from './WorldConfig'

/**
 * Terreno plano del diorama con grilla lógica superpuesta.
 * En la Fase 2 se sustituirá por la isla con agua y chunks.
 */
export class Terrain {
  readonly object = new THREE.Group()

  private readonly grid: THREE.GridHelper

  constructor(preset: WorldPreset, theme: ThemeDefinition) {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(preset.size, preset.size),
      new THREE.MeshStandardMaterial({
        color: theme.ground.grass,
        roughness: 0.82,
        metalness: 0,
      }),
    )
    ground.name = 'terrain-ground'
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true

    this.grid = new THREE.GridHelper(
      preset.size,
      preset.size,
      theme.ground.gridCenter,
      theme.ground.grid,
    )
    this.grid.name = 'terrain-grid'
    this.grid.position.y = 0.02

    const gridMaterial = this.grid.material as THREE.LineBasicMaterial
    gridMaterial.transparent = true
    gridMaterial.opacity = 0.22
    gridMaterial.depthWrite = false

    this.object.name = 'terrain'
    this.object.add(ground, this.grid)
  }

  get gridVisible(): boolean {
    return this.grid.visible
  }

  toggleGrid(): boolean {
    this.grid.visible = !this.grid.visible
    return this.grid.visible
  }

  dispose(): void {
    this.object.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose())
        } else {
          child.material.dispose()
        }
      }
    })
  }
}
