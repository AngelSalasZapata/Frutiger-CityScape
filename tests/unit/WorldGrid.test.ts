import { describe, expect, it } from 'vitest'

import { WorldGrid } from '@/world/WorldGrid'

describe('WorldGrid', () => {
  it('centra la grilla en el origen', () => {
    const grid = new WorldGrid(32)

    expect(grid.worldToCell(0, 0)).toEqual({ x: 16, z: 16 })
    expect(grid.cellToWorld({ x: 0, z: 0 })).toEqual({ x: -15.5, z: -15.5 })
    expect(grid.cellToWorld({ x: 31, z: 31 })).toEqual({ x: 15.5, z: 15.5 })
  })

  it('trata el borde positivo como fuera del mundo', () => {
    const grid = new WorldGrid(32)

    expect(grid.worldToCell(-16, -16)).toEqual({ x: 0, z: 0 })
    expect(grid.worldToCell(15.999, 15.999)).toEqual({ x: 31, z: 31 })
    expect(grid.worldToCell(16, 0)).toBeNull()
    expect(grid.worldToCell(-16.001, 0)).toBeNull()
  })

  it('rechaza puntos no finitos y celdas fuera de rango', () => {
    const grid = new WorldGrid(32)

    expect(grid.worldToCell(Number.NaN, 0)).toBeNull()
    expect(grid.worldToCell(0, Number.POSITIVE_INFINITY)).toBeNull()
    expect(grid.contains({ x: -1, z: 0 })).toBe(false)
    expect(grid.contains({ x: 32, z: 0 })).toBe(false)
    expect(grid.contains({ x: 1.5, z: 0 })).toBe(false)
  })

  it('soporta celdas de tamaño distinto de uno', () => {
    const grid = new WorldGrid(4, 2)

    expect(grid.cellCount).toBe(16)
    expect(grid.halfSize).toBe(4)
    expect(grid.worldToCell(0, 0)).toEqual({ x: 2, z: 2 })
    expect(grid.cellToWorld({ x: 0, z: 0 })).toEqual({ x: -3, z: -3 })
  })

  it('genera claves estables por celda', () => {
    const grid = new WorldGrid(8)

    expect(grid.cellKey({ x: 3, z: 7 })).toBe('3:7')
  })

  it('rechaza configuraciones inválidas', () => {
    expect(() => new WorldGrid(0)).toThrow(RangeError)
    expect(() => new WorldGrid(8.5)).toThrow(RangeError)
    expect(() => new WorldGrid(8, 0)).toThrow(RangeError)
  })
})
