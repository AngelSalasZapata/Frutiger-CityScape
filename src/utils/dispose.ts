import * as THREE from 'three'

/**
 * Libera geometrías y materiales de un subárbol. Se usa al desmontar la escena
 * y al descartar el entorno temporal de reflejos.
 */
export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (
      child instanceof THREE.Mesh ||
      child instanceof THREE.LineSegments ||
      child instanceof THREE.Points
    ) {
      child.geometry.dispose()

      const materials = Array.isArray(child.material) ? child.material : [child.material]
      for (const material of materials) {
        material.dispose()
      }
    }
  })
}
