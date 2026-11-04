import { describe, expect, it } from 'vitest'

import type { City, PlacementRecord } from '@/building/City'
import { MoveCommand, PlaceCommand, RemoveCommand, RotateCommand } from '@/building/commands'

const RECORD: PlacementRecord = {
  id: 'townhouse-1',
  itemId: 'townhouse',
  anchor: { x: 4, z: 5 },
  rotation: 0,
}

function createFakeCity() {
  const calls: string[] = []

  const fake = {
    insert(record: PlacementRecord) {
      calls.push(`insert:${record.id}:${record.anchor.x},${record.anchor.z}:${record.rotation}`)
      return { id: record.id }
    },
    remove(id: string) {
      calls.push(`remove:${id}`)
      return true
    },
    move(id: string, anchor: { x: number; z: number }, rotation: number) {
      calls.push(`move:${id}:${anchor.x},${anchor.z}:${rotation}`)
      return true
    },
    rotateTo(id: string, rotation: number) {
      calls.push(`rotate:${id}:${rotation}`)
      return true
    },
  }

  return { city: fake as unknown as City, calls }
}

describe('Comandos de construcción', () => {
  it('PlaceCommand inserta al ejecutar y elimina al deshacer', () => {
    const { city, calls } = createFakeCity()
    const command = new PlaceCommand(city, RECORD, 'Colocar casa')

    command.execute()
    command.undo()

    expect(command.label).toBe('Colocar casa')
    expect(calls).toEqual(['insert:townhouse-1:4,5:0', 'remove:townhouse-1'])
  })

  it('RemoveCommand elimina y restaura el registro', () => {
    const { city, calls } = createFakeCity()
    const command = new RemoveCommand(city, RECORD)

    command.execute()
    command.undo()

    expect(command.label).toContain('townhouse')
    expect(calls).toEqual(['remove:townhouse-1', 'insert:townhouse-1:4,5:0'])
  })

  it('MoveCommand intercambia origen y destino', () => {
    const { city, calls } = createFakeCity()
    const command = new MoveCommand(
      city,
      'townhouse-1',
      { anchor: { x: 4, z: 5 }, rotation: 0 },
      { anchor: { x: 8, z: 9 }, rotation: 2 },
    )

    command.execute()
    command.undo()

    expect(calls).toEqual(['move:townhouse-1:8,9:2', 'move:townhouse-1:4,5:0'])
  })

  it('RotateCommand restaura la rotación anterior', () => {
    const { city, calls } = createFakeCity()
    const command = new RotateCommand(city, 'townhouse-1', 0, 3)

    command.execute()
    command.undo()

    expect(command.label).toBe('Rotar objeto')
    expect(calls).toEqual(['rotate:townhouse-1:3', 'rotate:townhouse-1:0'])
  })
})
