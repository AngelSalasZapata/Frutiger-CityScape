import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

const materialCache = new Map()

/** Materiales de ranura: el nombre viaja en el GLB y el runtime lo reemplaza por tema. */
export function slotMaterial(slot) {
  let material = materialCache.get(slot)

  if (!material) {
    material = new THREE.MeshStandardMaterial({
      name: slot,
      color: 0xffffff,
      roughness: 0.45,
      metalness: 0,
    })
    materialCache.set(slot, material)
  }

  return material
}

export function mesh(geometry, slot, name = slot) {
  const result = new THREE.Mesh(geometry, slotMaterial(slot))
  result.name = name
  return result
}

export function box(width, height, depth, slot, name = slot) {
  return mesh(new THREE.BoxGeometry(width, height, depth), slot, name)
}

export function roundedBox(width, height, depth, radius, slot, name = slot) {
  return mesh(new RoundedBoxGeometry(width, height, depth, 4, radius), slot, name)
}

export function cylinder(top, bottom, height, segments, slot, name = slot) {
  return mesh(new THREE.CylinderGeometry(top, bottom, height, segments), slot, name)
}

export function sphere(radius, slot, name = slot, widthSegments = 24, heightSegments = 16) {
  return mesh(new THREE.SphereGeometry(radius, widthSegments, heightSegments), slot, name)
}

export function hemisphere(radius, slot, name = slot) {
  return mesh(new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), slot, name)
}

export function cone(radius, height, segments, slot, name = slot) {
  return mesh(new THREE.ConeGeometry(radius, height, segments), slot, name)
}

export function torus(radius, tube, radialSegments, tubularSegments, slot, name = slot) {
  return mesh(new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments), slot, name)
}

export function place(object, x = 0, y = 0, z = 0, rotationX = 0, rotationY = 0, rotationZ = 0) {
  object.position.set(x, y, z)
  object.rotation.set(rotationX, rotationY, rotationZ)
  return object
}

export function group(name, children = []) {
  const result = new THREE.Group()
  result.name = name
  for (const child of children) result.add(child)
  return result
}

export function mirrorPair(object, axis = 'x') {
  const clone = object.clone()
  if (axis === 'x') clone.position.x *= -1
  if (axis === 'z') clone.position.z *= -1
  return clone
}
