import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

import { disposeObject3D } from '@/utils/dispose'

/**
 * Muestra temporal de materiales para validar el "look" Aero antes de tener
 * assets glTF (paso 5 de la semana 1 del documento). Se retira en la Fase 3/4.
 */
export class PreviewStage {
  readonly object = new THREE.Group()

  private readonly spinner = new THREE.Group()
  private elapsed = 0

  constructor() {
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xd9f7ff,
      roughness: 0.06,
      metalness: 0,
      transmission: 1,
      thickness: 1.4,
      ior: 1.42,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.1,
    })

    const glossy = new THREE.MeshPhysicalMaterial({
      color: 0x2fb7ff,
      roughness: 0.18,
      metalness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 0.9,
    })

    const chrome = new THREE.MeshPhysicalMaterial({
      color: 0xe8f6ff,
      roughness: 0.12,
      metalness: 1,
      envMapIntensity: 0.9,
    })

    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.15, 64, 48), glass)
    sphere.position.set(-2.7, 1.4, 0)
    sphere.castShadow = true

    const cube = new THREE.Mesh(new RoundedBoxGeometry(2, 2, 2, 6, 0.38), glossy)
    cube.position.set(0, 1.2, 0)
    cube.castShadow = true

    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.28, 32, 96), chrome)
    torus.position.set(2.7, 1.5, 0)
    torus.rotation.set(Math.PI / 2.6, 0.3, 0)
    torus.castShadow = true

    this.spinner.add(sphere, cube, torus)
    this.object.add(this.spinner)

    const pedestalMaterial = new THREE.MeshStandardMaterial({
      color: 0xe9fbff,
      roughness: 0.3,
      metalness: 0.05,
    })

    for (const x of [-2.7, 0, 2.7]) {
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(1.05, 1.2, 0.22, 48),
        pedestalMaterial,
      )
      pedestal.position.set(x, 0.11, 0)
      pedestal.castShadow = true
      pedestal.receiveShadow = true
      this.object.add(pedestal)
    }

    this.object.name = 'preview-stage'
  }

  update(dt: number): void {
    this.elapsed += dt
    this.spinner.rotation.y = this.elapsed * 0.35
    this.spinner.position.y = Math.sin(this.elapsed * 0.9) * 0.06
  }

  dispose(): void {
    disposeObject3D(this.object)
  }
}
