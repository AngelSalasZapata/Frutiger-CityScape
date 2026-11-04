import type { GridCell } from '@/world/WorldGrid'

export type Rotation = 0 | 1 | 2 | 3

export interface FootprintSize {
  readonly width: number
  readonly depth: number
}

export interface FootprintPlacement extends FootprintSize {
  readonly anchor: GridCell
  readonly rotation: Rotation
  readonly cells: readonly GridCell[]
  readonly minX: number
  readonly minZ: number
  readonly maxX: number
  readonly maxZ: number
  readonly centerX: number
  readonly centerZ: number
}

export function normalizeRotation(value: number): Rotation {
  const normalized = ((Math.round(value) % 4) + 4) % 4
  return normalized as Rotation
}

export function rotateStep(rotation: Rotation, delta: number): Rotation {
  return normalizeRotation(rotation + delta)
}

/** Los pasos impares intercambian ancho y profundidad. */
export function rotatedFootprint(
  footprint: readonly [number, number],
  rotation: Rotation,
): FootprintSize {
  const [width, depth] = footprint
  return rotation % 2 === 0 ? { width, depth } : { width: depth, depth: width }
}

/**
 * Celdas ocupadas por un item cuyo cursor apunta a la celda central. Para
 * footprints pares el cursor queda en la celda izquierda/superior del centro.
 */
export function footprintCells(
  anchor: GridCell,
  footprint: readonly [number, number],
  rotation: Rotation,
): readonly GridCell[] {
  const { width, depth } = rotatedFootprint(footprint, rotation)
  const minX = anchor.x - Math.floor((width - 1) / 2)
  const minZ = anchor.z - Math.floor((depth - 1) / 2)
  const cells: GridCell[] = []

  for (let z = minZ; z < minZ + depth; z += 1) {
    for (let x = minX; x < minX + width; x += 1) {
      cells.push({ x, z })
    }
  }

  return cells
}

export function describeFootprint(
  anchor: GridCell,
  footprint: readonly [number, number],
  rotation: Rotation,
): FootprintPlacement {
  const { width, depth } = rotatedFootprint(footprint, rotation)
  const minX = anchor.x - Math.floor((width - 1) / 2)
  const minZ = anchor.z - Math.floor((depth - 1) / 2)
  const maxX = minX + width - 1
  const maxZ = minZ + depth - 1

  return {
    anchor,
    rotation,
    width,
    depth,
    cells: footprintCells(anchor, footprint, rotation),
    minX,
    minZ,
    maxX,
    maxZ,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
  }
}

export function cellsInsideGrid(cells: readonly GridCell[], size: number): boolean {
  return cells.every(
    (cell) =>
      Number.isInteger(cell.x) &&
      Number.isInteger(cell.z) &&
      cell.x >= 0 &&
      cell.z >= 0 &&
      cell.x < size &&
      cell.z < size,
  )
}
