import { describe, expect, it } from 'vitest'

import { ChunkGrid } from '@/world/ChunkGrid'

describe('ChunkGrid', () => {
  it('divide un mundo pequeño en cuatro chunks', () => {
    const chunks = new ChunkGrid(32, 16)

    expect(chunks.chunksPerAxis).toBe(2)
    expect(chunks.count).toBe(4)
    expect(chunks.chunks.map((chunk) => chunk.key)).toEqual(['0:0', '1:0', '0:1', '1:1'])
  })

  it('encuentra el chunk de una celda y sus límites inclusivos', () => {
    const chunks = new ChunkGrid(32, 16)

    const first = chunks.chunkAt({ x: 0, z: 0 })
    expect(first?.coord).toEqual({ cx: 0, cz: 0 })
    expect(first?.bounds).toEqual({ minX: 0, minZ: 0, maxX: 15, maxZ: 15 })

    const last = chunks.chunkAt({ x: 31, z: 31 })
    expect(last?.coord).toEqual({ cx: 1, cz: 1 })
    expect(last?.bounds).toEqual({ minX: 16, minZ: 16, maxX: 31, maxZ: 31 })
  })

  it('devuelve null fuera del mundo', () => {
    const chunks = new ChunkGrid(32, 16)

    expect(chunks.chunkAt({ x: 32, z: 0 })).toBeNull()
    expect(chunks.chunkAt({ x: -1, z: 0 })).toBeNull()
  })

  it('cubre el área completa del mundo sin solapamientos', () => {
    const chunks = new ChunkGrid(128, 16)
    const covered = chunks.chunks.reduce((total, chunk) => {
      const width = chunk.bounds.maxX - chunk.bounds.minX + 1
      const depth = chunk.bounds.maxZ - chunk.bounds.minZ + 1
      return total + width * depth
    }, 0)

    expect(chunks.count).toBe(64)
    expect(covered).toBe(128 * 128)
    expect(new Set(chunks.chunks.map((chunk) => chunk.key)).size).toBe(chunks.count)
  })

  it('expone chunks por coordenadas', () => {
    const chunks = new ChunkGrid(64, 16)

    expect(chunks.get(3, 3)?.bounds).toEqual({ minX: 48, minZ: 48, maxX: 63, maxZ: 63 })
    expect(chunks.get(4, 0)).toBeUndefined()
    expect(ChunkGrid.chunkKey(2, 1)).toBe('2:1')
  })

  it('rechaza tamaños inválidos o no divisibles', () => {
    expect(() => new ChunkGrid(0, 16)).toThrow(RangeError)
    expect(() => new ChunkGrid(32, 0)).toThrow(RangeError)
    expect(() => new ChunkGrid(30, 16)).toThrow(/dividir exactamente/)
  })
})
