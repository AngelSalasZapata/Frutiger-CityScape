import { describe, expect, it } from 'vitest'

import { resolveAutoTile } from '@/building/City'

const NORTH = 1
const EAST = 2
const SOUTH = 4
const WEST = 8

describe('resolveAutoTile', () => {
  it('usa el punto cuando no hay vecinos', () => {
    expect(resolveAutoTile(0)).toEqual({ variant: 'dot', rotation: 0 })
  })

  it('elige extremos en las cuatro orientaciones', () => {
    expect(resolveAutoTile(SOUTH)).toEqual({ variant: 'end', rotation: 0 })
    expect(resolveAutoTile(NORTH)).toEqual({ variant: 'end', rotation: Math.PI })
    expect(resolveAutoTile(EAST)).toEqual({ variant: 'end', rotation: Math.PI / 2 })
    expect(resolveAutoTile(WEST)).toEqual({ variant: 'end', rotation: (Math.PI * 3) / 2 })
  })

  it('usa recta para conexiones opuestas', () => {
    expect(resolveAutoTile(NORTH | SOUTH)).toEqual({ variant: 'straight', rotation: 0 })
    expect(resolveAutoTile(EAST | WEST)).toEqual({
      variant: 'straight',
      rotation: Math.PI / 2,
    })
  })

  it('detecta esquinas y su rotación', () => {
    expect(resolveAutoTile(EAST | SOUTH)).toEqual({ variant: 'corner', rotation: 0 })
    expect(resolveAutoTile(NORTH | EAST)).toEqual({ variant: 'corner', rotation: Math.PI / 2 })
  })

  it('detecta tees y cruces', () => {
    expect(resolveAutoTile(EAST | SOUTH | WEST)).toEqual({ variant: 'tee', rotation: 0 })
    expect(resolveAutoTile(NORTH | SOUTH | WEST)).toEqual({
      variant: 'tee',
      rotation: (Math.PI * 3) / 2,
    })
    expect(resolveAutoTile(NORTH | EAST | SOUTH | WEST)).toEqual({
      variant: 'cross',
      rotation: 0,
    })
  })

  it('siempre devuelve una variante para cualquier máscara de 4 bits', () => {
    for (let mask = 0; mask < 16; mask += 1) {
      const resolved = resolveAutoTile(mask)
      expect(['dot', 'end', 'straight', 'corner', 'tee', 'cross']).toContain(resolved.variant)
      expect(Number.isFinite(resolved.rotation)).toBe(true)
    }
  })
})
