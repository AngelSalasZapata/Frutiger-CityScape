import * as THREE from 'three'

import {
  box,
  cone,
  cylinder,
  group,
  hemisphere,
  mesh,
  place,
  roundedBox,
  sphere,
  torus,
} from './model-kit.mjs'

function cornerPosts(size, height, slot, thickness = 0.1) {
  const posts = []
  const offset = size / 2 - thickness / 2

  for (const x of [-offset, offset]) {
    for (const z of [-offset, offset]) {
      posts.push(place(box(thickness, height, thickness, slot), x, height / 2, z))
    }
  }

  return posts
}

export function aeroTower() {
  const bands = [1.5, 2.8, 4.1].map((y) =>
    place(roundedBox(1.24, 0.08, 1.24, 0.03, 'accent'), 0, y, 0),
  )

  return group('aero_tower', [
    place(roundedBox(1.72, 0.24, 1.72, 0.08, 'solid'), 0, 0.12, 0),
    place(roundedBox(1.12, 4.6, 1.12, 0.12, 'glass'), 0, 2.5, 0),
    ...cornerPosts(1.12, 4.6, 'metal', 0.12),
    ...bands,
    place(roundedBox(1.4, 0.2, 1.4, 0.06, 'roof'), 0, 4.9, 0),
    place(cylinder(0.04, 0.1, 0.9, 12, 'accent'), 0, 5.45, 0),
    place(sphere(0.11, 'emissive'), 0, 5.92, 0),
  ])
}

export function aeroDome() {
  const rings = [0.43, 1.95].map((y) =>
    place(torus(1.07, 0.055, 8, 48, 'metal'), 0, y, 0, Math.PI / 2),
  )

  return group('aero_dome', [
    place(cylinder(1.2, 1.32, 0.36, 40, 'solid'), 0, 0.18, 0),
    place(cylinder(1.05, 1.05, 1.6, 40, 'glass'), 0, 1.16, 0),
    ...rings,
    place(hemisphere(1.05, 'glass'), 0, 1.96, 0),
    place(torus(0.72, 0.04, 8, 40, 'accent'), 0, 2.16, 0, Math.PI / 2),
    place(sphere(0.14, 'emissive'), 0, 3.06, 0),
  ])
}

export function townhouse() {
  const windows = [-0.42, 0.42].map((x) => place(box(0.32, 0.46, 0.05, 'glass'), x, 1.55, 0.706))

  return group('townhouse', [
    place(roundedBox(1.72, 0.16, 1.72, 0.06, 'stone'), 0, 0.08, 0),
    place(roundedBox(1.4, 2.2, 1.4, 0.08, 'solid'), 0, 1.26, 0),
    place(box(0.38, 0.78, 0.06, 'accent'), 0, 0.55, 0.71),
    ...windows,
    place(cone(1.16, 0.86, 4, 'roof'), 0, 2.78, 0, 0, Math.PI / 4),
    place(box(0.16, 0.52, 0.16, 'metal'), 0.44, 3.05, -0.25),
    place(sphere(0.07, 'emissive'), -0.42, 2.15, 0.72),
  ])
}

export function kiosk() {
  return group('kiosk', [
    place(roundedBox(0.9, 0.14, 0.9, 0.05, 'stone'), 0, 0.07, 0),
    place(roundedBox(0.74, 1.15, 0.74, 0.06, 'solid'), 0, 0.72, 0),
    place(roundedBox(0.98, 0.14, 0.98, 0.05, 'roof'), 0, 1.38, 0),
    place(box(0.58, 0.16, 0.14, 'accent'), 0, 0.94, 0.4),
    place(box(0.5, 0.2, 0.06, 'emissive'), 0, 1.62, 0.35),
    place(box(0.42, 0.34, 0.05, 'glass'), 0, 1.1, 0.376),
  ])
}

export function greenhouse() {
  const plants = [
    place(sphere(0.24, 'leaf'), -0.34, 0.75, -0.22),
    place(sphere(0.2, 'leaf'), 0.32, 0.65, 0.18),
    place(cone(0.2, 0.5, 8, 'leaf'), 0.12, 0.92, -0.32),
  ]

  return group('greenhouse', [
    place(roundedBox(1.72, 0.14, 1.72, 0.05, 'wood'), 0, 0.07, 0),
    place(box(1.4, 1.5, 1.4, 'glass'), 0, 0.89, 0),
    ...plants,
    ...cornerPosts(1.4, 1.5, 'wood', 0.09),
    place(cone(1.1, 0.7, 4, 'glass'), 0, 1.94, 0, 0, Math.PI / 4),
    place(box(0.08, 1.5, 0.08, 'wood'), 0, 0.89, 0.7),
    place(box(0.08, 1.5, 0.08, 'wood'), 0, 0.89, -0.7),
    place(box(0.5, 0.5, 0.06, 'accent'), 0, 0.44, 0.71),
  ])
}

export function lighthouse() {
  const stripes = [0.85, 1.75, 2.65].map((y) =>
    place(cylinder(0.47, 0.53, 0.28, 24, 'accent'), 0, y, 0),
  )

  return group('lighthouse', [
    place(cylinder(0.62, 0.72, 0.26, 24, 'stone'), 0, 0.13, 0),
    place(cylinder(0.34, 0.56, 3.3, 24, 'solid'), 0, 1.88, 0),
    ...stripes,
    place(cylinder(0.58, 0.58, 0.14, 24, 'metal'), 0, 3.6, 0),
    place(cylinder(0.32, 0.36, 0.5, 20, 'glass'), 0, 3.92, 0),
    place(sphere(0.22, 'emissive'), 0, 3.92, 0),
    place(cone(0.46, 0.32, 20, 'roof'), 0, 4.3, 0),
  ])
}

export function ecoTower() {
  const terraces = [
    place(cylinder(0.9, 0.82, 0.18, 20, 'leaf'), -0.15, 1.35, 0),
    place(cylinder(0.78, 0.7, 0.18, 20, 'leaf'), 0.18, 2.55, 0.1),
    place(cylinder(0.64, 0.56, 0.18, 20, 'leaf'), -0.08, 3.65, -0.1),
  ]

  return group('eco_tower', [
    place(roundedBox(1.4, 0.2, 1.4, 0.07, 'stone'), 0, 0.1, 0),
    place(roundedBox(1.1, 4.0, 1.1, 0.1, 'wood'), 0, 2.1, 0),
    place(roundedBox(0.5, 4.3, 0.5, 0.08, 'glass'), 0, 2.2, 0),
    ...terraces,
    place(cylinder(0.56, 0.62, 0.3, 20, 'leaf'), 0, 4.36, 0),
    place(cylinder(0.04, 0.04, 0.6, 8, 'metal'), 0, 4.8, 0),
    place(sphere(0.1, 'emissive'), 0, 5.16, 0),
  ])
}

export function auroraObservatory() {
  return group('aurora_observatory', [
    place(cylinder(1.38, 1.5, 0.38, 40, 'metal'), 0, 0.19, 0),
    place(cylinder(1.1, 1.1, 1.5, 40, 'glass'), 0, 1.13, 0),
    place(torus(1.12, 0.06, 8, 48, 'metal'), 0, 0.44, 0, Math.PI / 2),
    place(torus(1.12, 0.06, 8, 48, 'metal'), 0, 1.9, 0, Math.PI / 2),
    place(hemisphere(1.1, 'glass'), 0, 1.9, 0),
    place(torus(0.86, 0.04, 8, 40, 'emissive'), 0, 1.95, 0, Math.PI / 2),
    place(cylinder(0.035, 0.06, 1.1, 10, 'metal'), 0, 3.1, 0),
    place(sphere(0.12, 'emissive'), 0, 3.72, 0),
  ])
}

export function metroBlock() {
  return group('metro_block', [
    place(roundedBox(1.86, 0.16, 1.86, 0.05, 'solid'), 0, 0.08, 0),
    place(roundedBox(1.54, 1.2, 1.54, 0.06, 'accent'), 0, 0.76, 0),
    place(roundedBox(1.22, 1.0, 1.22, 0.06, 'roof'), 0, 1.86, 0),
    place(roundedBox(0.9, 0.82, 0.9, 0.05, 'accent'), 0, 2.77, 0),
    place(sphere(0.15, 'emissive'), 0, 3.28, 0),
    place(sphere(0.12, 'secondary'), -0.62, 1.52, 0.62),
    place(sphere(0.12, 'secondary'), 0.62, 1.52, -0.62),
    place(torus(0.72, 0.05, 8, 32, 'accent'), 0, 1.34, 0, Math.PI / 2),
  ])
}

export function aquaDome() {
  return group('aqua_dome', [
    place(cylinder(1.28, 1.48, 0.34, 40, 'stone'), 0, 0.17, 0),
    place(sphere(1.12, 'water'), 0, 1.45, 0),
    place(sphere(1.3, 'glass'), 0, 1.5, 0),
    place(torus(1.3, 0.055, 8, 48, 'metal'), 0, 1.5, 0, Math.PI / 2),
    place(cylinder(0.3, 0.36, 0.3, 20, 'stone'), 0, 0.47, 0),
    place(sphere(0.22, 'leaf'), -0.45, 0.56, 0.28),
    place(sphere(0.18, 'accent'), 0.42, 0.52, -0.2),
    place(cylinder(0.1, 0.14, 0.7, 12, 'accent'), 0.2, 0.75, 0.3),
    place(sphere(0.08, 'emissive'), 0, 2.84, 0),
  ])
}

export function aquaTunnel() {
  const frames = [-1.0, 0, 1.0].map((x) =>
    place(torus(0.62, 0.055, 8, 32, 'metal'), x, 0.78, 0, 0, Math.PI / 2),
  )

  return group('aqua_tunnel', [
    place(roundedBox(2.7, 0.14, 1.6, 0.05, 'stone'), 0, 0.07, 0),
    place(box(2.4, 0.06, 1.2, 'water'), 0, 0.14, 0),
    place(meshHalfCylinder(0.78, 2.5, 'glass'), -0.0, 0.17, 0),
    ...frames,
    place(sphere(0.1, 'emissive'), -0.7, 0.7, 0.28),
    place(sphere(0.08, 'emissive'), 0.55, 0.9, -0.24),
    place(sphere(0.06, 'emissive'), 0.9, 0.52, 0.3),
  ])
}

function meshHalfCylinder(radius, length, slot) {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 28, 1, true, 0, Math.PI)
  geometry.rotateZ(Math.PI / 2)
  return mesh(geometry, slot, 'tunnel-shell')
}

export function darkSpire() {
  const strips = [-0.26, 0.26].map((x) => place(box(0.05, 3.8, 0.04, 'emissive'), x, 3.0, 0.612))

  return group('dark_spire', [
    place(roundedBox(1.72, 0.2, 1.72, 0.06, 'metal'), 0, 0.1, 0),
    place(roundedBox(1.24, 5.2, 1.24, 0.08, 'glass'), 0, 2.8, 0),
    ...cornerPosts(1.24, 5.2, 'metal', 0.1),
    ...strips,
    place(roundedBox(1.46, 0.18, 1.46, 0.05, 'metal'), 0, 5.5, 0),
    place(roundedBox(0.82, 0.7, 0.82, 0.06, 'roof'), 0, 5.9, 0),
    place(cylinder(0.03, 0.08, 0.9, 10, 'emissive'), 0, 6.55, 0),
  ])
}

export function fotonightTower() {
  return group('fotonight_tower', [
    place(roundedBox(1.66, 0.2, 1.66, 0.06, 'solid'), 0, 0.1, 0),
    place(roundedBox(1.14, 3.6, 1.14, 0.07, 'solid'), 0.06, 2.0, 0, 0, 0.18),
    place(roundedBox(0.84, 1.5, 0.84, 0.06, 'accent'), -0.12, 4.2, 0.05, 0, -0.26),
    place(roundedBox(0.62, 0.62, 0.62, 0.05, 'roof'), 0.2, 5.05, -0.08, 0, 0.4),
    place(box(0.7, 0.28, 0.05, 'emissive'), 0.02, 2.9, 0.62),
    place(box(0.54, 0.2, 0.05, 'emissive'), -0.2, 3.7, -0.5),
    place(sphere(0.18, 'emissive'), 0.3, 5.62, 0.2),
    place(box(0.1, 1.0, 0.1, 'metal'), -0.45, 2.2, -0.45, 0, 0, 0.35),
  ])
}

export function dorfPavilion() {
  return group('dorf_pavilion', [
    place(roundedBox(2.5, 0.2, 2.5, 0.07, 'solid'), 0, 0.1, 0),
    place(roundedBox(2.1, 0.16, 2.1, 0.05, 'neutral'), 0, 0.28, 0),
    place(roundedBox(1.6, 2.6, 0.38, 0.07, 'solid'), 0, 1.7, -0.65),
    place(roundedBox(2.2, 0.18, 2.2, 0.05, 'solid'), 0, 3.04, 0),
    place(box(1.1, 0.08, 0.04, 'emissive'), 0, 1.05, -0.45),
    place(box(1.1, 0.08, 0.04, 'emissive'), 0, 1.75, -0.45),
    place(box(1.1, 0.08, 0.04, 'emissive'), 0, 2.45, -0.45),
    place(cylinder(0.36, 0.46, 0.34, 20, 'accent'), 0.7, 0.5, 0.7),
    place(sphere(0.28, 'emissive'), 0.7, 0.92, 0.7),
  ])
}
