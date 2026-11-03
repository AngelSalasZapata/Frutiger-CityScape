import { describe, expect, it } from 'vitest'

import { EventBus } from '@/core/EventBus'

interface TestEvents {
  ping: { value: number }
  pong: string
}

describe('EventBus', () => {
  it('entrega el payload a los suscriptores', () => {
    const bus = new EventBus<TestEvents>()
    const received: number[] = []

    bus.on('ping', (payload) => received.push(payload.value))
    bus.emit('ping', { value: 7 })

    expect(received).toEqual([7])
  })

  it('deja de notificar tras desuscribirse', () => {
    const bus = new EventBus<TestEvents>()
    const received: number[] = []
    const unsubscribe = bus.on('ping', (payload) => received.push(payload.value))

    bus.emit('ping', { value: 1 })
    unsubscribe()
    bus.emit('ping', { value: 2 })

    expect(received).toEqual([1])
  })

  it('tolera desuscripciones durante un emit', () => {
    const bus = new EventBus<TestEvents>()
    const received: string[] = []

    const unsubscribe = bus.on('pong', () => {
      received.push('a')
      unsubscribe()
    })
    bus.on('pong', () => received.push('b'))

    bus.emit('pong', 'hola')

    expect(received).toEqual(['a', 'b'])
  })

  it('ignora eventos sin suscriptores', () => {
    const bus = new EventBus<TestEvents>()

    expect(() => bus.emit('pong', 'silencio')).not.toThrow()
  })
})
