import type { GridCell, WorldGrid } from '@/world/WorldGrid'

/**
 * Mapa de ocupación de celdas. Una celda solo puede pertenecer a un item, y
 * las claves usan el mismo formato estable que `WorldGrid.cellKey`.
 */
export class OccupancyMap {
  private readonly cells = new Map<string, string>()

  constructor(private readonly grid: WorldGrid) {}

  get occupiedCount(): number {
    return this.cells.size
  }

  idAt(cell: GridCell): string | undefined {
    return this.cells.get(this.grid.cellKey(cell))
  }

  isFree(cell: GridCell, ignoreId?: string): boolean {
    const id = this.idAt(cell)
    return id === undefined || id === ignoreId
  }

  canOccupy(cells: readonly GridCell[], ignoreId?: string): boolean {
    return cells.every((cell) => this.grid.contains(cell) && this.isFree(cell, ignoreId))
  }

  occupy(cells: readonly GridCell[], id: string): void {
    for (const cell of cells) {
      this.cells.set(this.grid.cellKey(cell), id)
    }
  }

  release(cells: readonly GridCell[]): void {
    for (const cell of cells) {
      this.cells.delete(this.grid.cellKey(cell))
    }
  }

  clear(): void {
    this.cells.clear()
  }
}
