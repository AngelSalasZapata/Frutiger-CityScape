import { describe, expect, it } from 'vitest'

import type { BuildCommand } from '@/building/BuildHistory'
import { BuildHistory } from '@/building/BuildHistory'

class FakeCommand implements BuildCommand {
  executed = 0
  undone = 0

  constructor(
    readonly label: string,
    private readonly log: string[] = [],
  ) {}

  execute(): void {
    this.executed += 1
    this.log.push(`do:${this.label}`)
  }

  undo(): void {
    this.undone += 1
    this.log.push(`undo:${this.label}`)
  }
}

describe('BuildHistory', () => {
  it('ejecuta y deshace comandos individuales', () => {
    const history = new BuildHistory()
    const command = new FakeCommand('colocar')

    history.execute(command)
    expect(command.executed).toBe(1)
    expect(history.canUndo).toBe(true)
    expect(history.undoLabel).toBe('colocar')

    expect(history.undo()).toBe('colocar')
    expect(command.undone).toBe(1)
    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(true)

    expect(history.redo()).toBe('colocar')
    expect(command.executed).toBe(2)
    expect(history.canRedo).toBe(false)
  })

  it('deshace una transacción completa en orden inverso', () => {
    const history = new BuildHistory()
    const log: string[] = []
    const first = new FakeCommand('uno', log)
    const second = new FakeCommand('dos', log)

    history.beginTransaction('Construir calle')
    history.execute(first)
    history.execute(second)
    expect(history.transactionActive).toBe(true)
    expect(history.canUndo).toBe(false)

    expect(history.commitTransaction()).toBe('Construir calle')
    expect(history.transactionActive).toBe(false)
    expect(history.undoLabel).toBe('Construir calle')

    history.undo()

    expect(first.undone).toBe(1)
    expect(second.undone).toBe(1)
    expect(log).toEqual(['do:uno', 'do:dos', 'undo:dos', 'undo:uno'])
  })

  it('no agrega entradas vacías al historial', () => {
    const history = new BuildHistory()

    history.beginTransaction('sin cambios')
    expect(history.commitTransaction()).toBeNull()
    expect(history.canUndo).toBe(false)
  })

  it('cancela una transacción deshaciendo lo ejecutado', () => {
    const history = new BuildHistory()
    const command = new FakeCommand('temporal')

    history.beginTransaction('cancelable')
    history.execute(command)
    history.cancelTransaction()

    expect(command.undone).toBe(1)
    expect(history.canUndo).toBe(false)
    expect(history.transactionActive).toBe(false)
  })

  it('rechaza transacciones anidadas y limpia el redo al ejecutar', () => {
    const history = new BuildHistory()
    const first = new FakeCommand('primero')
    const second = new FakeCommand('segundo')

    history.execute(first)
    history.undo()
    expect(history.canRedo).toBe(true)

    history.execute(second)
    expect(history.canRedo).toBe(false)

    history.beginTransaction('abierta')
    expect(() => history.beginTransaction('otra')).toThrow()
    history.cancelTransaction()
  })

  it('devuelve null cuando no hay nada que deshacer o rehacer', () => {
    const history = new BuildHistory()

    expect(history.undo()).toBeNull()
    expect(history.redo()).toBeNull()
    expect(history.undoLabel).toBeNull()
    expect(history.redoLabel).toBeNull()
  })

  it('puede limpiarse por completo', () => {
    const history = new BuildHistory()

    history.execute(new FakeCommand('algo'))
    history.clear()

    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)
  })
})
