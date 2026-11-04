import type { BuildCommand } from './BuildHistory'
import type { City, PlacementRecord, PlacementState } from './City'
import type { Rotation } from './Footprint'

/**
 * Comandos de construcción. Todos son reversibles y no conocen el historial:
 * `BuildHistory` decide cuándo ejecutarlos y deshacerlos. Insertar un registro
 * existente es idempotente, así que rehacer una colocación es seguro.
 */
export class PlaceCommand implements BuildCommand {
  readonly label: string

  constructor(
    private readonly city: City,
    private readonly record: PlacementRecord,
    label?: string,
  ) {
    this.label = label ?? 'Colocar objeto'
  }

  execute(): void {
    const instance = this.city.insert(this.record)
    if (!instance) {
      throw new Error(`No se pudo colocar "${this.record.id}"`)
    }
  }

  undo(): void {
    this.city.remove(this.record.id)
  }
}

export class RemoveCommand implements BuildCommand {
  readonly label: string

  constructor(
    private readonly city: City,
    private readonly record: PlacementRecord,
  ) {
    this.label = `Eliminar ${record.itemId}`
  }

  execute(): void {
    this.city.remove(this.record.id)
  }

  undo(): void {
    const instance = this.city.insert(this.record)
    if (!instance) {
      throw new Error(`No se pudo restaurar "${this.record.id}"`)
    }
  }
}

export class MoveCommand implements BuildCommand {
  readonly label: string

  constructor(
    private readonly city: City,
    private readonly id: string,
    private readonly from: PlacementState,
    private readonly to: PlacementState,
    label = 'Mover objeto',
  ) {
    this.label = label
  }

  execute(): void {
    this.city.move(this.id, this.to.anchor, this.to.rotation)
  }

  undo(): void {
    this.city.move(this.id, this.from.anchor, this.from.rotation)
  }
}

export class RotateCommand implements BuildCommand {
  readonly label: string

  constructor(
    private readonly city: City,
    private readonly id: string,
    private readonly from: Rotation,
    private readonly to: Rotation,
  ) {
    this.label = 'Rotar objeto'
  }

  execute(): void {
    this.city.rotateTo(this.id, this.to)
  }

  undo(): void {
    this.city.rotateTo(this.id, this.from)
  }
}

export class ColorCommand implements BuildCommand {
  readonly label = 'Cambiar color del objeto'

  constructor(
    private readonly city: City,
    private readonly id: string,
    private readonly from: string | undefined,
    private readonly to: string,
  ) {}

  execute(): void {
    this.city.setColor(this.id, this.to)
  }

  undo(): void {
    this.city.setColor(this.id, this.from)
  }
}
