import type { GridCell } from '@/world/WorldGrid'

export function cellKey(cell: GridCell): string {
  return `${cell.x}:${cell.z}`
}

/** Vecinos ortogonales transitables de una celda de camino. */
export function roadNeighbors(cell: GridCell, roads: ReadonlySet<string>): GridCell[] {
  const candidates: GridCell[] = [
    { x: cell.x, z: cell.z - 1 },
    { x: cell.x + 1, z: cell.z },
    { x: cell.x, z: cell.z + 1 },
    { x: cell.x - 1, z: cell.z },
  ]
  return candidates.filter((candidate) => roads.has(cellKey(candidate)))
}

/**
 * Elige el siguiente tramo sin volver inmediatamente atrás cuando existe otra
 * salida. En un final de calle permite regresar para que el tráfico no quede
 * detenido permanentemente.
 */
export function nextRoadCell(
  current: GridCell,
  previous: GridCell | null,
  roads: ReadonlySet<string>,
  random = Math.random,
): GridCell | null {
  const neighbors = roadNeighbors(current, roads)
  if (neighbors.length === 0) return null

  const forward = previous
    ? neighbors.filter((neighbor) => neighbor.x !== previous.x || neighbor.z !== previous.z)
    : neighbors
  const choices = forward.length > 0 ? forward : neighbors
  return choices[Math.floor(random() * choices.length)] ?? null
}
