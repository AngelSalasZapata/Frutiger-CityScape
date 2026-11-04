import { describe, expect, it } from 'vitest'

import { OccupancyMap } from '@/building/OccupancyMap'
import { WorldGrid } from '@/world/WorldGrid'

describe('OccupancyMap', () => {
  it('marca y libera celdas', () => {
    const map = new OccupancyMap(new WorldGrid(8))

    map.occupy(
      [
        { x: 1, z: 1 },
        { x: 1, z: 2 },
      ],
      'a',
    )

    expect(map.occupiedCount).toBe(2)
    expect(map.idAt({ x: 1, z: 1 })).toBe('a')
    expect(map.isFree({ x: 1, z: 1 })).toBe(false)
    expect(map.isFree({ x: 2, z: 1 })).toBe(true)

    map.release([
      { x: 1, z: 1 },
      { x: 1, z: 2 },
    ])

    expect(map.occupiedCount).toBe(0)
    expect(map.idAt({ x: 1, z: 1 })).toBeUndefined()
  })

  it('permite ignorar el id que se está moviendo', () => {
    const map = new OccupancyMap(new WorldGrid(8))

    map.occupy([{ x: 3, z: 3 }], 'mover')

    expect(map.canOccupy([{ x: 3, z: 3 }])).toBe(false)
    expect(map.canOccupy([{ x: 3, z: 3 }], 'mover')).toBe(true)
    expect(map.canOccupy([{ x: 3, z: 3 }], 'otro')).toBe(false)
  })

  it('rechaza celdas fuera de la grilla', () => {
    const map = new OccupancyMap(new WorldGrid(4))

    expect(map.canOccupy([{ x: 0, z: 0 }])).toBe(true)
    expect(map.canOccupy([{ x: 4, z: 0 }])).toBe(false)
    expect(map.canOccupy([{ x: -1, z: 0 }])).toBe(false)
  })

  it('puede vaciarse por completo', () => {
    const map = new OccupancyMap(new WorldGrid(4))

    map.occupy([{ x: 0, z: 0 }], 'a')
    map.occupy([{ x: 1, z: 0 }], 'b')
    map.clear()

    expect(map.occupiedCount).toBe(0)
  })
})
