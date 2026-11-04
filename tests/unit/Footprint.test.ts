import { describe, expect, it } from 'vitest'

import {
  cellsInsideGrid,
  describeFootprint,
  footprintCells,
  normalizeRotation,
  rotateStep,
  rotatedFootprint,
} from '@/building/Footprint'

describe('Footprint', () => {
  it('usa la celda del cursor para un footprint 1 × 1', () => {
    expect(footprintCells({ x: 4, z: 7 }, [1, 1], 0)).toEqual([{ x: 4, z: 7 }])
  })

  it('crece hacia la derecha y abajo desde la celda ancla', () => {
    expect(footprintCells({ x: 5, z: 5 }, [2, 2], 0)).toEqual([
      { x: 5, z: 5 },
      { x: 6, z: 5 },
      { x: 5, z: 6 },
      { x: 6, z: 6 },
    ])
  })

  it('centra los footprints impares en el ancla', () => {
    const placement = describeFootprint({ x: 5, z: 5 }, [3, 3], 0)

    expect(placement.minX).toBe(4)
    expect(placement.maxX).toBe(6)
    expect(placement.centerX).toBe(5)
    expect(placement.centerZ).toBe(5)
    expect(placement.cells).toHaveLength(9)
  })

  it('intercambia ancho y profundidad al rotar 90°', () => {
    expect(rotatedFootprint([4, 2], 0)).toEqual({ width: 4, depth: 2 })
    expect(rotatedFootprint([4, 2], 1)).toEqual({ width: 2, depth: 4 })
    expect(rotatedFootprint([4, 2], 2)).toEqual({ width: 4, depth: 2 })
    expect(rotatedFootprint([4, 2], 3)).toEqual({ width: 2, depth: 4 })

    expect(footprintCells({ x: 3, z: 3 }, [3, 2], 1)).toHaveLength(6)
  })

  it('normaliza rotaciones negativas o fuera de rango', () => {
    expect(normalizeRotation(-1)).toBe(3)
    expect(normalizeRotation(4)).toBe(0)
    expect(normalizeRotation(7)).toBe(3)
    expect(rotateStep(0, -1)).toBe(3)
    expect(rotateStep(3, 1)).toBe(0)
  })

  it('detecta celdas fuera de la grilla y valores no enteros', () => {
    expect(
      cellsInsideGrid(
        [
          { x: 0, z: 0 },
          { x: 7, z: 7 },
        ],
        8,
      ),
    ).toBe(true)
    expect(cellsInsideGrid([{ x: 8, z: 0 }], 8)).toBe(false)
    expect(cellsInsideGrid([{ x: -1, z: 0 }], 8)).toBe(false)
    expect(cellsInsideGrid([{ x: 1.5, z: 0 }], 8)).toBe(false)
  })
})
