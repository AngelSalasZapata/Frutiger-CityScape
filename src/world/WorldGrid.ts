/**
 * Coordenadas de la grilla lógica del diorama.
 *
 * El mundo se centra en el origen: para un tamaño `N` y celdas de lado 1, la
 * celda `0` ocupa el intervalo `[-N/2, -N/2 + 1)` y la celda `N - 1` termina
 * en `N/2`. Toda conversión entre mundo y celda vive aquí para que el
 * renderer, la construcción y los NPCs compartan la misma definición.
 */
export interface GridCell {
  readonly x: number
  readonly z: number
}

export interface WorldPoint {
  readonly x: number
  readonly z: number
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} debe ser un entero mayor que 0 (recibido: ${value})`)
  }
}

export class WorldGrid {
  /** Cantidad de celdas por lado. */
  readonly size: number
  /** Tamaño de cada celda en unidades del mundo. */
  readonly cellSize: number
  /** Distancia desde el centro hasta el borde de la grilla. */
  readonly halfSize: number
  /** Total de celdas de la grilla. */
  readonly cellCount: number

  constructor(size: number, cellSize = 1) {
    assertPositiveInteger(size, 'size')

    if (!Number.isFinite(cellSize) || cellSize <= 0) {
      throw new RangeError(`cellSize debe ser mayor que 0 (recibido: ${cellSize})`)
    }

    this.size = size
    this.cellSize = cellSize
    this.halfSize = (size * cellSize) / 2
    this.cellCount = size * size
  }

  /**
   * Convierte un punto del mundo a la celda que lo contiene, o `null` si cae
   * fuera del diorama. Los bordes negativos pertenecen a la primera celda y
   * el borde positivo queda fuera (el intervalo es semiabierto).
   */
  worldToCell(x: number, z: number): GridCell | null {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null

    const cellX = Math.floor((x + this.halfSize) / this.cellSize)
    const cellZ = Math.floor((z + this.halfSize) / this.cellSize)
    const cell = { x: cellX, z: cellZ }

    return this.contains(cell) ? cell : null
  }

  /** Centro del mundo de una celda. No valida los límites. */
  cellToWorld(cell: GridCell): WorldPoint {
    return {
      x: (cell.x + 0.5) * this.cellSize - this.halfSize,
      z: (cell.z + 0.5) * this.cellSize - this.halfSize,
    }
  }

  contains(cell: GridCell): boolean {
    return (
      Number.isInteger(cell.x) &&
      Number.isInteger(cell.z) &&
      cell.x >= 0 &&
      cell.z >= 0 &&
      cell.x < this.size &&
      cell.z < this.size
    )
  }

  cellKey(cell: GridCell): string {
    return `${cell.x}:${cell.z}`
  }
}
