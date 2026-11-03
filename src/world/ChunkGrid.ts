import type { GridCell } from './WorldGrid'

/**
 * Partición de la grilla lógica en chunks cuadrados. Aún no hay streaming de
 * malla: los chunks son metadatos estables para que en fases posteriores el
 * render, la simulación y el guardado puedan operar por región sin recalcular
 * índices. Las claves tienen la forma `"cx:cz"`.
 */
export interface ChunkCoord {
  readonly cx: number
  readonly cz: number
}

export interface ChunkBounds {
  /** Celda mínima incluida, en coordenadas de grilla. */
  readonly minX: number
  readonly minZ: number
  /** Celda máxima incluida, en coordenadas de grilla. */
  readonly maxX: number
  readonly maxZ: number
}

export interface Chunk {
  readonly key: string
  readonly index: number
  readonly coord: ChunkCoord
  readonly bounds: ChunkBounds
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} debe ser un entero mayor que 0 (recibido: ${value})`)
  }
}

export class ChunkGrid {
  readonly chunksPerAxis: number
  readonly count: number
  readonly chunks: readonly Chunk[]

  private readonly byKey = new Map<string, Chunk>()

  constructor(
    readonly size: number,
    readonly chunkSize: number,
  ) {
    assertPositiveInteger(size, 'size')
    assertPositiveInteger(chunkSize, 'chunkSize')

    if (size % chunkSize !== 0) {
      throw new RangeError(
        `chunkSize (${chunkSize}) debe dividir exactamente el tamaño del mundo (${size})`,
      )
    }

    this.chunksPerAxis = size / chunkSize
    this.count = this.chunksPerAxis * this.chunksPerAxis

    const chunks: Chunk[] = []

    for (let cz = 0; cz < this.chunksPerAxis; cz += 1) {
      for (let cx = 0; cx < this.chunksPerAxis; cx += 1) {
        const minX = cx * chunkSize
        const minZ = cz * chunkSize
        const chunk: Chunk = Object.freeze({
          key: ChunkGrid.chunkKey(cx, cz),
          index: cz * this.chunksPerAxis + cx,
          coord: Object.freeze({ cx, cz }),
          bounds: Object.freeze({
            minX,
            minZ,
            maxX: minX + chunkSize - 1,
            maxZ: minZ + chunkSize - 1,
          }),
        })

        chunks.push(chunk)
        this.byKey.set(chunk.key, chunk)
      }
    }

    this.chunks = Object.freeze(chunks)
  }

  static chunkKey(cx: number, cz: number): string {
    return `${cx}:${cz}`
  }

  /** Chunk que contiene una celda, o `null` si la celda está fuera del mundo. */
  chunkAt(cell: GridCell): Chunk | null {
    if (!this.containsCell(cell)) return null

    return (
      this.get(Math.floor(cell.x / this.chunkSize), Math.floor(cell.z / this.chunkSize)) ?? null
    )
  }

  get(cx: number, cz: number): Chunk | undefined {
    return this.byKey.get(ChunkGrid.chunkKey(cx, cz))
  }

  private containsCell(cell: GridCell): boolean {
    return (
      Number.isInteger(cell.x) &&
      Number.isInteger(cell.z) &&
      cell.x >= 0 &&
      cell.z >= 0 &&
      cell.x < this.size &&
      cell.z < this.size
    )
  }
}
