import { box, group, place, sphere } from './model-kit.mjs'

const DIRECTIONS = {
  north: { x: 0, z: -1 },
  east: { x: 1, z: 0 },
  south: { x: 0, z: 1 },
  west: { x: -1, z: 0 },
}

const VARIANTS = {
  dot: [],
  end: ['south'],
  straight: ['south', 'north'],
  corner: ['south', 'east'],
  tee: ['south', 'east', 'west'],
  cross: ['south', 'east', 'west', 'north'],
}

function pathArm(direction) {
  const { x, z } = DIRECTIONS[direction]

  if (x !== 0) {
    return place(box(0.58, 0.04, 0.38, 'stone'), x * 0.27, 0.05, 0)
  }

  return place(box(0.38, 0.04, 0.58, 'stone'), 0, 0.05, z * 0.27)
}

function fenceArm(direction) {
  const { x, z } = DIRECTIONS[direction]
  const pieces = []

  for (const y of [0.32, 0.58]) {
    if (x !== 0) {
      pieces.push(place(box(0.55, 0.06, 0.08, 'solid'), x * 0.27, y, 0))
    } else {
      pieces.push(place(box(0.08, 0.06, 0.55, 'solid'), 0, y, z * 0.27))
    }
  }

  return pieces
}

export function buildAutoTile(style, variant) {
  const directions = VARIANTS[variant]

  if (!directions) {
    throw new Error(`Variante de auto-tile desconocida: ${variant}`)
  }

  if (style === 'path_stone') {
    return group(`path_stone_${variant}`, [
      place(box(0.94, 0.06, 0.94, 'stone'), 0, 0.03, 0),
      ...directions.map((direction) => pathArm(direction)),
      place(box(0.84, 0.012, 0.84, 'accent'), 0, 0.062, 0),
    ])
  }

  if (style === 'fence_white') {
    return group(`fence_white_${variant}`, [
      place(box(0.18, 0.04, 0.18, 'metal'), 0, 0.02, 0),
      place(box(0.1, 0.8, 0.1, 'solid'), 0, 0.4, 0),
      place(sphere(0.085, 'accent'), 0, 0.86, 0),
      ...directions.flatMap((direction) => fenceArm(direction)),
    ])
  }

  throw new Error(`Estilo de auto-tile desconocido: ${style}`)
}

export const AUTO_TILE_VARIANTS = Object.keys(VARIANTS)
