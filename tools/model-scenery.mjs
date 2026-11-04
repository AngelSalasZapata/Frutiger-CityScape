import { box, cone, cylinder, group, place, roundedBox, sphere, torus } from './model-kit.mjs'

export function treeRound() {
  return group('tree_round', [
    place(cylinder(0.12, 0.18, 1.0, 12, 'wood'), 0, 0.5, 0),
    place(sphere(0.68, 'leaf'), 0, 1.45, 0),
    place(sphere(0.46, 'leaf'), 0.34, 1.82, 0.12),
    place(sphere(0.4, 'leaf'), -0.3, 1.72, -0.16),
    place(sphere(0.3, 'leaf'), 0.02, 2.05, -0.08),
  ])
}

export function palmTree() {
  const fronds = []

  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * Math.PI * 2
    const frond = box(0.95, 0.05, 0.2, 'leaf')
    place(frond, Math.sin(angle) * 0.42, 2.2, Math.cos(angle) * 0.42, 0, angle, -0.18)
    fronds.push(frond)
  }

  return group('palm_tree', [
    place(cylinder(0.09, 0.16, 2.2, 12, 'wood'), 0, 1.1, 0, 0, 0, 0.06),
    ...fronds,
    place(sphere(0.1, 'wood'), 0.12, 2.08, 0.08),
    place(sphere(0.09, 'wood'), -0.1, 2.05, -0.1),
    place(sphere(0.08, 'wood'), 0.02, 2.02, 0.14),
  ])
}

export function flowerBed() {
  const flowers = []

  for (let index = 0; index < 9; index += 1) {
    const angle = (index / 9) * Math.PI * 2
    const radius = 0.14 + (index % 3) * 0.09
    const x = Math.sin(angle) * radius
    const z = Math.cos(angle) * radius
    const stem = cylinder(0.012, 0.014, 0.24, 6, 'leaf')
    place(stem, x, 0.24, z)
    const bloom = sphere(0.055, index % 2 === 0 ? 'accent' : 'emissive')
    place(bloom, x, 0.38, z)
    flowers.push(stem, bloom)
  }

  return group('flower_bed', [
    place(cylinder(0.45, 0.5, 0.08, 20, 'stone'), 0, 0.04, 0),
    place(cylinder(0.4, 0.42, 0.12, 20, 'leaf'), 0, 0.13, 0),
    ...flowers,
  ])
}

export function hedge() {
  return group('hedge', [
    place(roundedBox(0.86, 0.62, 0.86, 0.12, 'leaf'), 0, 0.38, 0),
    place(roundedBox(0.68, 0.32, 0.68, 0.1, 'leaf'), 0, 0.8, 0),
    place(sphere(0.18, 'accent'), 0.22, 0.64, 0.22),
    place(sphere(0.13, 'accent'), -0.2, 0.56, -0.18),
  ])
}

export function auroraPine() {
  return group('aurora_pine', [
    place(cylinder(0.09, 0.14, 0.9, 10, 'wood'), 0, 0.45, 0),
    place(cone(0.55, 1.1, 8, 'leaf'), 0, 1.15, 0),
    place(cone(0.42, 0.95, 8, 'leaf'), 0, 1.75, 0),
    place(cone(0.3, 0.8, 8, 'leaf'), 0, 2.3, 0),
    place(sphere(0.06, 'emissive'), 0, 2.74, 0),
    place(sphere(0.045, 'emissive'), 0.24, 1.5, 0.18),
    place(sphere(0.045, 'emissive'), -0.2, 2.08, -0.14),
  ])
}

export function coralCluster() {
  const branches = [
    place(cylinder(0.05, 0.09, 0.8, 8, 'accent'), 0.05, 0.55, 0, 0, 0, 0.12),
    place(cylinder(0.04, 0.08, 0.65, 8, 'accent'), -0.18, 0.48, 0.1, 0, 0, -0.3),
    place(cylinder(0.035, 0.07, 0.55, 8, 'emissive'), 0.2, 0.42, -0.12, 0.25, 0, 0.22),
    place(sphere(0.1, 'accent'), 0.1, 0.94, 0),
    place(sphere(0.08, 'emissive'), -0.31, 0.82, 0.1),
    place(sphere(0.06, 'accent'), 0.24, 0.68, -0.14),
  ]

  return group('coral_cluster', [place(sphere(0.34, 'stone'), 0, 0.12, 0, 0, 0, 0), ...branches])
}

export function bench() {
  return group('bench', [
    place(roundedBox(1.24, 0.1, 0.4, 0.04, 'wood'), 0, 0.46, 0),
    place(roundedBox(1.24, 0.42, 0.08, 0.03, 'wood'), 0, 0.76, -0.18, -0.08),
    place(box(0.08, 0.44, 0.36, 'metal'), -0.5, 0.23, 0),
    place(box(0.08, 0.44, 0.36, 'metal'), 0.5, 0.23, 0),
    place(box(0.08, 0.5, 0.08, 'metal'), -0.5, 0.52, -0.16),
    place(box(0.08, 0.5, 0.08, 'metal'), 0.5, 0.52, -0.16),
  ])
}

export function streetLamp() {
  return group('street_lamp', [
    place(cylinder(0.13, 0.2, 0.14, 14, 'metal'), 0, 0.07, 0),
    place(cylinder(0.045, 0.06, 2.0, 12, 'metal'), 0, 1.13, 0),
    place(box(0.4, 0.06, 0.06, 'metal'), 0.16, 2.1, 0),
    place(sphere(0.2, 'emissive'), 0.36, 2.03, 0),
    place(torus(0.16, 0.025, 6, 20, 'metal'), 0.36, 2.03, 0, Math.PI / 2),
  ])
}

export function bubbleGarden() {
  const stems = [
    place(cylinder(0.018, 0.022, 0.5, 6, 'metal'), -0.12, 0.32, 0.05),
    place(cylinder(0.016, 0.02, 0.9, 6, 'metal'), 0.16, 0.52, -0.08),
    place(cylinder(0.014, 0.018, 1.2, 6, 'metal'), 0.02, 0.66, 0.16),
  ]

  return group('bubble_garden', [
    place(roundedBox(0.7, 0.12, 0.7, 0.05, 'stone'), 0, 0.06, 0),
    ...stems,
    place(sphere(0.28, 'glass'), 0, 0.62, 0),
    place(sphere(0.2, 'glass'), -0.18, 1.12, 0.06),
    place(sphere(0.14, 'glass'), 0.2, 1.42, -0.04),
    place(sphere(0.06, 'accent'), 0, 0.62, 0),
    place(sphere(0.045, 'emissive'), -0.18, 1.12, 0.06),
    place(sphere(0.035, 'accent'), 0.2, 1.42, -0.04),
  ])
}

export function plazaFountain() {
  return group('plaza_fountain', [
    place(cylinder(1.04, 1.12, 0.22, 32, 'stone'), 0, 0.11, 0),
    place(cylinder(0.86, 0.9, 0.28, 32, 'stone'), 0, 0.34, 0),
    place(cylinder(0.78, 0.78, 0.08, 32, 'water'), 0, 0.5, 0),
    place(cylinder(0.13, 0.18, 0.72, 16, 'stone'), 0, 0.82, 0),
    place(cylinder(0.44, 0.26, 0.16, 24, 'stone'), 0, 1.2, 0),
    place(cylinder(0.36, 0.36, 0.07, 24, 'water'), 0, 1.31, 0),
    place(sphere(0.16, 'water'), 0, 1.52, 0),
    place(torus(0.52, 0.035, 8, 32, 'emissive'), 0, 0.9, 0, Math.PI / 2),
  ])
}

export function billboard() {
  return group('billboard', [
    place(box(0.09, 2.1, 0.09, 'metal'), -0.36, 1.05, 0),
    place(box(0.09, 2.1, 0.09, 'metal'), 0.36, 1.05, 0),
    place(roundedBox(1.25, 0.74, 0.12, 0.04, 'metal'), 0, 1.78, 0),
    place(box(1.08, 0.58, 0.04, 'emissive'), 0, 1.78, 0.08),
    place(box(0.42, 0.09, 0.03, 'accent'), 0, 1.94, 0.105),
    place(box(0.58, 0.06, 0.03, 'glass'), 0, 1.66, 0.105),
    place(roundedBox(1.3, 0.12, 0.2, 0.04, 'solid'), 0, 2.19, 0),
  ])
}

export function solarPanel() {
  return group('solar_panel', [
    place(cylinder(0.09, 0.14, 0.12, 12, 'metal'), 0, 0.06, 0),
    place(cylinder(0.045, 0.055, 1.0, 10, 'metal'), 0, 0.6, 0),
    place(roundedBox(1.1, 0.05, 0.78, 0.02, 'glass'), 0, 1.18, 0, -0.42),
    place(box(1.16, 0.03, 0.06, 'metal'), 0, 1.25, 0.4, -0.42),
    place(box(1.16, 0.03, 0.06, 'metal'), 0, 0.98, -0.4, -0.42),
  ])
}

export function windTurbine() {
  const rotor = group('rotor', [
    place(sphere(0.2, 'metal'), 0, 0, 0),
    ...Array.from({ length: 3 }, (_, index) => {
      const blade = box(0.13, 1.55, 0.04, 'accent')
      place(blade, 0, 0.78, 0)
      const holder = group('blade', [blade])
      holder.rotation.z = (index / 3) * Math.PI * 2
      return holder
    }),
  ])
  place(rotor, 0, 4.08, 0.42)

  return group('wind_turbine', [
    place(cylinder(0.5, 0.68, 0.28, 24, 'solid'), 0, 0.14, 0),
    place(cylinder(0.11, 0.28, 3.9, 20, 'solid'), 0, 2.1, 0),
    place(roundedBox(0.5, 0.32, 0.7, 0.08, 'solid'), 0, 4.08, 0.05),
    rotor,
  ])
}

export function bridge() {
  const posts = []

  for (const x of [-1.55, -0.52, 0.52, 1.55]) {
    for (const z of [-0.4, 0.4]) {
      posts.push(place(box(0.09, 0.55, 0.09, 'metal'), x, 0.62, z))
    }
  }

  return group('bridge', [
    place(roundedBox(3.7, 0.16, 0.9, 0.05, 'wood'), 0, 0.3, 0),
    ...posts,
    place(box(3.7, 0.08, 0.08, 'wood'), 0, 0.9, -0.4),
    place(box(3.7, 0.08, 0.08, 'wood'), 0, 0.9, 0.4),
    place(box(0.06, 1.1, 0.06, 'metal'), -1.75, 0.62, 0, 0, 0, 0.5),
    place(box(0.06, 1.1, 0.06, 'metal'), 1.75, 0.62, 0, 0, 0, -0.5),
  ])
}

export function neonSign() {
  return group('neon_sign', [
    place(cylinder(0.09, 0.13, 0.1, 12, 'metal'), 0, 0.05, 0),
    place(cylinder(0.05, 0.06, 1.7, 10, 'metal'), 0, 0.85, 0),
    place(roundedBox(0.82, 0.66, 0.1, 0.05, 'metal'), 0, 1.75, 0),
    place(torus(0.25, 0.04, 8, 32, 'emissive'), 0, 1.75, 0.07),
    place(box(0.44, 0.06, 0.03, 'accent'), 0, 1.48, 0.07),
    place(box(0.3, 0.05, 0.03, 'emissive'), 0, 2.0, 0.07),
  ])
}

export function dorfOrb() {
  return group('dorf_orb', [
    place(cylinder(0.3, 0.38, 0.18, 20, 'solid'), 0, 0.09, 0),
    place(cylinder(0.16, 0.22, 0.62, 16, 'solid'), 0, 0.49, 0),
    place(sphere(0.42, 'emissive'), 0, 1.2, 0),
    place(torus(0.58, 0.035, 8, 36, 'metal'), 0, 1.2, 0, Math.PI / 2),
    place(torus(0.58, 0.035, 8, 36, 'accent'), 0, 1.2, 0, 0, Math.PI / 2),
  ])
}

export function metroArch() {
  return group('metro_arch', [
    place(roundedBox(0.3, 2.2, 0.32, 0.05, 'accent'), -1.1, 1.1, 0),
    place(roundedBox(0.3, 2.2, 0.32, 0.05, 'accent'), 1.1, 1.1, 0),
    place(roundedBox(2.65, 0.32, 0.34, 0.06, 'roof'), 0, 2.25, 0),
    place(sphere(0.16, 'emissive'), 0, 2.58, 0),
    place(sphere(0.1, 'secondary'), -0.8, 2.46, 0),
    place(sphere(0.1, 'secondary'), 0.8, 2.46, 0),
  ])
}

export function carAero() {
  const wheels = []

  for (const x of [-0.5, 0.5]) {
    for (const z of [-0.34, 0.34]) {
      wheels.push(place(cylinder(0.18, 0.18, 0.12, 16, 'metal'), x, 0.2, z, 0, 0, Math.PI / 2))
    }
  }

  return group('car_aero', [
    place(roundedBox(1.64, 0.34, 0.76, 0.16, 'solid'), 0, 0.38, 0),
    place(roundedBox(0.94, 0.36, 0.64, 0.14, 'glass'), -0.02, 0.7, 0),
    place(box(0.6, 0.06, 0.6, 'accent'), 0, 0.93, 0),
    ...wheels,
    place(box(0.08, 0.12, 0.5, 'emissive'), 0.83, 0.4, 0),
    place(box(0.06, 0.1, 0.4, 'accent'), -0.83, 0.38, 0),
  ])
}

export function busAero() {
  const wheels = []

  for (const x of [-0.85, 0, 0.85]) {
    for (const z of [-0.36, 0.36]) {
      wheels.push(place(cylinder(0.2, 0.2, 0.12, 16, 'metal'), x, 0.22, z, 0, 0, Math.PI / 2))
    }
  }

  return group('bus_aero', [
    place(roundedBox(2.55, 0.9, 0.84, 0.14, 'solid'), 0, 0.68, 0),
    place(box(2.3, 0.38, 0.72, 'glass'), 0, 0.86, 0),
    place(box(2.3, 0.08, 0.7, 'accent'), 0, 1.24, 0),
    ...wheels,
    place(box(0.08, 0.18, 0.5, 'emissive'), 1.29, 0.62, 0),
    place(box(0.06, 0.16, 0.4, 'accent'), -1.29, 0.6, 0),
    place(cylinder(0.035, 0.05, 0.4, 8, 'metal'), -0.7, 1.44, 0),
  ])
}

export function boatAero() {
  return group('boat_aero', [
    place(roundedBox(1.65, 0.3, 0.72, 0.14, 'wood'), 0, 0.24, 0),
    place(box(1.45, 0.08, 0.58, 'wood'), 0, 0.43, 0),
    place(roundedBox(0.62, 0.4, 0.52, 0.08, 'solid'), -0.2, 0.67, 0),
    place(box(0.56, 0.22, 0.04, 'glass'), -0.2, 0.74, 0.27),
    place(cylinder(0.025, 0.035, 0.9, 8, 'metal'), 0.45, 0.9, 0),
    place(box(0.3, 0.18, 0.02, 'accent'), 0.62, 1.25, 0),
    place(box(0.06, 0.08, 0.6, 'accent'), -0.82, 0.32, 0),
  ])
}
