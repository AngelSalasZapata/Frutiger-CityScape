import { describe, expect, it } from 'vitest'

import { cellKey, nextRoadCell, roadNeighbors } from '@/vehicles/RoadNetwork'

describe('Red de caminos para vehículos', () => {
  const roads = new Set(['1:0', '1:1', '1:2', '0:1', '2:1'])

  it('encuentra las conexiones ortogonales transitables', () => {
    expect(roadNeighbors({ x: 1, z: 1 }, roads)).toEqual([
      { x: 1, z: 0 },
      { x: 2, z: 1 },
      { x: 1, z: 2 },
      { x: 0, z: 1 },
    ])
  })

  it('evita invertir la marcha en un cruce cuando hay otra salida', () => {
    expect(nextRoadCell({ x: 1, z: 1 }, { x: 1, z: 0 }, roads, () => 0)).toEqual({
      x: 2,
      z: 1,
    })
  })

  it('permite volver al llegar a un final de calle', () => {
    const endRoads = new Set([cellKey({ x: 0, z: 0 }), cellKey({ x: 1, z: 0 })])
    expect(nextRoadCell({ x: 1, z: 0 }, { x: 0, z: 0 }, endRoads)).toEqual({ x: 0, z: 0 })
  })
})
