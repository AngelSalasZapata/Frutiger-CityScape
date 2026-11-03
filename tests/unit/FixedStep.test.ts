import { describe, expect, it } from 'vitest'

import { FixedStepAccumulator } from '@/core/FixedStep'

describe('FixedStepAccumulator', () => {
  it('genera dos pasos de 60 Hz a partir de un frame de 1/30 s', () => {
    const accumulator = new FixedStepAccumulator(1 / 60)

    expect(accumulator.push(1 / 30)).toBe(2)
    expect(accumulator.alpha).toBeCloseTo(0)
  })

  it('conserva el resto para el siguiente frame', () => {
    const accumulator = new FixedStepAccumulator(1 / 60)

    expect(accumulator.push(1 / 120)).toBe(0)
    expect(accumulator.alpha).toBeCloseTo(0.5)

    expect(accumulator.push(1 / 120)).toBe(1)
    expect(accumulator.alpha).toBeCloseTo(0)
  })

  it('limita frames largos para evitar el spiral of death', () => {
    const accumulator = new FixedStepAccumulator(1 / 60, 0.1)

    expect(accumulator.push(10)).toBe(6)
  })

  it('mantiene alpha dentro de 0..1', () => {
    const accumulator = new FixedStepAccumulator(1 / 60)

    accumulator.push(1 / 60 / 3)
    expect(accumulator.alpha).toBeGreaterThanOrEqual(0)
    expect(accumulator.alpha).toBeLessThanOrEqual(1)
  })

  it('reinicia el acumulador', () => {
    const accumulator = new FixedStepAccumulator(1 / 60)

    accumulator.push(1 / 120)
    accumulator.reset()

    expect(accumulator.alpha).toBe(0)
  })

  it('rechaza configuraciones inválidas', () => {
    expect(() => new FixedStepAccumulator(0)).toThrow(RangeError)
    expect(() => new FixedStepAccumulator(1 / 60, 0)).toThrow(RangeError)
  })
})
