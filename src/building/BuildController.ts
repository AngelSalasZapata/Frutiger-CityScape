import * as THREE from 'three'

import type { AppEvents } from '@/app/events'
import type { EventBus } from '@/core/EventBus'
import type { ThemeDefinition } from '@/render/theme'
import type { GridCell } from '@/world/WorldGrid'

import type { AssetLibrary } from './AssetLibrary'
import { BuildHistory } from './BuildHistory'
import { allCatalogItems, resolveCatalogItem } from './Catalog'
import type { CatalogPhysics } from './Catalog'
import type { City, PlacedInstance, PlacementRecord } from './City'
import {
  ColorCommand,
  MoveCommand,
  PhysicsCommand,
  PlaceCommand,
  RemoveCommand,
  RotateCommand,
} from './commands'
import type { Rotation } from './Footprint'
import { describeFootprint, rotateStep } from './Footprint'
import { GhostPreview } from './GhostPreview'
import type { BuildTool } from './tools'
import { TOOL_HINTS } from './tools'

interface BuildControllerOptions {
  scene: THREE.Scene
  camera: THREE.Camera
  domElement: HTMLElement
  city: City
  library: AssetLibrary
  bus: EventBus<AppEvents>
  theme: ThemeDefinition
}

interface MovingState {
  id: string
  itemName: string
  from: PlacementRecord
}

/**
 * Controlador de construcción. Traduce eventos de mouse y teclado a comandos
 * reversibles sobre `City` y mantiene actualizada la previsualización. Es el
 * único lugar donde se decide qué significa "arrastrar" para cada herramienta.
 */
export class BuildController {
  readonly history = new BuildHistory()

  private readonly ghost: GhostPreview
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2()
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  private readonly intersection = new THREE.Vector3()
  private readonly disposers: (() => void)[] = []

  private tool: BuildTool = 'select'
  private itemId: string | null = null
  private rotation: Rotation = 0

  private hoverCell: GridCell | null = null
  private placing = false
  private strokeItemName = ''
  private strokeCount = 0
  private lastStrokeCell: GridCell | null = null
  private moving: MovingState | null = null
  private activePointerId: number | null = null
  private interactionEnabled = true

  constructor(private readonly options: BuildControllerOptions) {
    this.ghost = new GhostPreview(options.library, options.theme)
    options.scene.add(this.ghost.object, this.ghost.selectionObject)

    const element = options.domElement
    element.addEventListener('pointerdown', this.handlePointerDown)
    element.addEventListener('pointermove', this.handlePointerMove)
    element.addEventListener('pointerup', this.handlePointerUp)
    element.addEventListener('pointercancel', this.handlePointerUp)
    element.addEventListener('pointerleave', this.handlePointerLeave)
    window.addEventListener('keydown', this.handleKeyDown)

    this.disposers.push(
      options.bus.on('toolSelected', (event) => {
        this.setTool(event.tool)
      }),
      options.bus.on('catalogItemSelected', (event) => {
        this.setItem(event.id)
      }),
      options.bus.on('buildAction', (event) => {
        if (event.action === 'rotate') this.rotateAction()
        if (event.action === 'duplicate') this.duplicateSelected()
        if (event.action === 'delete') this.deleteSelected()
        if (event.action === 'cancel') this.cancelAction()
      }),
      options.bus.on('historyRequest', (event) => {
        if (event.action === 'undo') this.undo()
        if (event.action === 'redo') this.redo()
      }),
      options.bus.on('objectColorSelected', (event) => {
        this.colorSelected(event.color)
      }),
      options.bus.on('objectPhysicsSelected', (event) => {
        this.physicsSelected(event.physics)
      }),
    )

    this.emitState()
  }

  get activeTool(): BuildTool {
    return this.tool
  }

  get activeItemId(): string | null {
    return this.itemId
  }

  setInteractionEnabled(enabled: boolean): void {
    this.interactionEnabled = enabled
    if (!enabled) this.cancelInteraction()
    this.refreshGhost()
  }

  applyTheme(theme: ThemeDefinition): void {
    this.ghost.applyTheme(theme)
    this.refreshGhost()
  }

  setTool(tool: BuildTool): void {
    if (tool === this.tool) {
      this.emitState()
      return
    }

    this.cancelInteraction()
    this.tool = tool

    if (tool === 'place') {
      this.ensurePlacementItem()
    }

    this.refreshGhost()
    this.emitState()
  }

  setItem(id: string | null): void {
    this.cancelInteraction()

    if (!id) {
      this.itemId = null
      this.ghost.hideGhost()
      this.emitState()
      return
    }

    resolveCatalogItem(id)

    this.itemId = id
    this.rotation = 0
    this.tool = 'place'
    this.refreshGhost()
    this.emitState()
  }

  /** Refresca la huella del objeto seleccionado cuando el mundo cambia de tamaño. */
  refreshSelection(): void {
    const selected = this.options.city.selected
    if (!selected) {
      this.ghost.hideSelection()
      this.emitSelection()
      return
    }

    if (this.moving) {
      this.ghost.hideSelection()
      return
    }

    const placement = describeFootprint(
      selected.record.anchor,
      selected.item.footprint,
      selected.record.rotation,
    )
    this.ghost.showSelection(
      placement,
      selected.item.height,
      this.options.city.worldGrid.halfSize,
      this.options.city.groundHeightFor(placement),
    )
    this.emitSelection()
  }

  /** Sincroniza el controlador después de reemplazar el mundo por otro preset. */
  syncAfterWorldChange(): void {
    this.cancelInteraction()
    this.hoverCell = null
    this.ghost.hideGhost()
    this.refreshSelection()
    this.refreshGhost()
    this.emitState()
  }

  dispose(): void {
    const element = this.options.domElement
    element.removeEventListener('pointerdown', this.handlePointerDown)
    element.removeEventListener('pointermove', this.handlePointerMove)
    element.removeEventListener('pointerup', this.handlePointerUp)
    element.removeEventListener('pointercancel', this.handlePointerUp)
    element.removeEventListener('pointerleave', this.handlePointerLeave)
    window.removeEventListener('keydown', this.handleKeyDown)

    for (const dispose of this.disposers) dispose()
    this.disposers.length = 0
    this.history.clear()
    this.ghost.dispose()
  }

  private ensurePlacementItem(): void {
    if (this.itemId) return

    const first = allCatalogItems()[0]
    if (!first) return

    this.itemId = first.id
    this.rotation = 0
  }

  private refreshGhost(): void {
    const city = this.options.city
    const cell = this.hoverCell

    if (!cell) {
      this.ghost.hideGhost()
      return
    }

    if (this.moving) {
      const instance = city.instance(this.moving.id)
      if (!instance) {
        this.ghost.hideGhost()
        return
      }

      const placement = describeFootprint(cell, instance.item.footprint, instance.record.rotation)
      const valid = city.canOccupyPlacement(placement, instance.id)
      this.ghost.showGhost(
        instance.item,
        placement,
        valid,
        city.worldGrid.halfSize,
        city.groundHeightFor(placement),
      )
      return
    }

    if (this.tool !== 'place' || !this.itemId) {
      this.ghost.hideGhost()
      return
    }

    const item = resolveCatalogItem(this.itemId)

    const placement = describeFootprint(cell, item.footprint, this.rotation)
    const valid = city.canOccupyPlacement(placement)
    this.ghost.showGhost(
      item,
      placement,
      valid,
      city.worldGrid.halfSize,
      city.groundHeightFor(placement),
    )
  }

  private updatePointer(event: PointerEvent): void {
    const rect = this.options.domElement.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.options.camera)
  }

  private cellFromPointer(): GridCell | null {
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, this.intersection)) return null
    return this.options.city.worldGrid.worldToCell(this.intersection.x, this.intersection.z)
  }

  private instanceAtPointer(): PlacedInstance | null {
    const hits = this.raycaster.intersectObjects(this.options.city.instancesObject.children, true)

    for (const hit of hits) {
      const instance = this.options.city.instanceFromObject(hit.object)
      if (instance) return instance
    }

    return null
  }

  private instanceAt(cell: GridCell): PlacedInstance | null {
    return this.options.city.instanceAt(cell) ?? null
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.interactionEnabled) return
    if (event.button !== 0) return

    this.updatePointer(event)
    const cell = this.cellFromPointer()
    if (!cell) return

    event.preventDefault()

    switch (this.tool) {
      case 'select':
        this.selectAt(cell)
        break
      case 'place':
        this.beginStroke(cell, event)
        break
      case 'move':
        this.beginMove(cell, event)
        break
      case 'rotate':
        this.rotateAt(cell)
        break
      case 'duplicate':
        this.duplicateAt(cell)
        break
      case 'delete':
        this.deleteAt(cell)
        break
    }
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.interactionEnabled) return
    this.updatePointer(event)

    const cell = this.cellFromPointer()
    this.hoverCell = cell

    if (this.placing && cell && !this.sameCell(cell, this.lastStrokeCell)) {
      this.placeStrokeTo(cell)
    }

    this.refreshGhost()
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (!this.interactionEnabled) return
    if (event.button !== 0 && event.type !== 'pointercancel') return

    this.updatePointer(event)

    if (this.placing) {
      this.finishStroke()
      return
    }

    if (this.moving) {
      this.finishMove(this.cellFromPointer())
    }
  }

  private readonly handlePointerLeave = (): void => {
    if (this.placing || this.moving) return

    this.hoverCell = null
    this.ghost.hideGhost()
  }

  private beginStroke(cell: GridCell, event: PointerEvent): void {
    if (this.history.transactionActive) return

    if (!this.itemId) {
      this.options.bus.emit('notice', {
        message: 'Elegí un item del catálogo antes de construir.',
        tone: 'info',
      })
      return
    }

    const item = resolveCatalogItem(this.itemId)

    this.history.beginTransaction(`Construir ${item.name}`)
    this.placing = true
    this.strokeItemName = item.name
    this.strokeCount = 0
    this.lastStrokeCell = null
    this.activePointerId = event.pointerId
    this.capturePointer(event.pointerId)

    this.hoverCell = cell
    this.placeStrokeTo(cell)
    this.refreshGhost()
    this.emitState()
  }

  private placeStrokeTo(cell: GridCell): void {
    const from = this.lastStrokeCell ?? cell
    let placed = 0

    for (const anchor of this.lineBetween(from, cell)) {
      if (this.tryPlace(anchor)) placed += 1
    }

    this.lastStrokeCell = cell
    this.strokeCount += placed

    if (placed > 0) {
      this.emitState()
      this.refreshSelection()
    }
  }

  private tryPlace(anchor: GridCell): boolean {
    if (!this.itemId) return false

    const city = this.options.city
    const item = resolveCatalogItem(this.itemId)
    const placement = describeFootprint(anchor, item.footprint, this.rotation)

    if (!city.canOccupyPlacement(placement)) return false

    const record = city.createRecord(item.id, anchor, this.rotation)
    if (!record) return false

    this.history.execute(new PlaceCommand(city, record, `Colocar ${item.name}`))
    city.select(record.id)
    return true
  }

  private finishStroke(): void {
    const label = this.history.commitTransaction()
    const count = this.strokeCount
    const itemName = this.strokeItemName

    this.placing = false
    this.strokeCount = 0
    this.lastStrokeCell = null
    this.strokeItemName = ''
    this.releasePointer()

    if (label && count > 0) {
      this.options.bus.emit('notice', {
        message: `Colocaste ${count} × ${itemName}.`,
        tone: 'success',
      })
    }

    this.refreshSelection()
    this.refreshGhost()
    this.emitState()
  }

  private beginMove(cell: GridCell, event: PointerEvent): void {
    if (this.history.transactionActive) return

    const instance = this.instanceAtPointer() ?? this.instanceAt(cell)
    if (!instance) {
      this.options.bus.emit('notice', {
        message: 'Arrastrá un objeto colocado para moverlo.',
        tone: 'info',
      })
      return
    }

    this.history.beginTransaction(`Mover ${instance.item.name}`)
    this.moving = {
      id: instance.id,
      itemName: instance.item.name,
      from: {
        ...instance.record,
        anchor: { ...instance.record.anchor },
      },
    }

    this.activePointerId = event.pointerId
    this.capturePointer(event.pointerId)
    this.options.city.select(instance.id)
    this.refreshSelection()
    this.refreshGhost()
    this.emitState()
  }

  private finishMove(cell: GridCell | null): void {
    const moving = this.moving
    this.moving = null
    this.releasePointer()

    if (!moving) return

    const instance = this.options.city.instance(moving.id)
    if (!instance || !cell) {
      this.history.commitTransaction()
      this.refreshGhost()
      this.emitState()
      return
    }

    const placement = describeFootprint(cell, instance.item.footprint, instance.record.rotation)
    const sameCell = cell.x === moving.from.anchor.x && cell.z === moving.from.anchor.z

    if (sameCell) {
      this.history.commitTransaction()
      this.refreshGhost()
      this.emitState()
      return
    }

    if (!this.options.city.canOccupyPlacement(placement, moving.id)) {
      this.history.commitTransaction()
      this.options.bus.emit('notice', {
        message: 'Esa celda no tiene espacio suficiente.',
        tone: 'error',
      })
      this.refreshGhost()
      this.emitState()
      return
    }

    this.history.execute(
      new MoveCommand(
        this.options.city,
        moving.id,
        { anchor: moving.from.anchor, rotation: moving.from.rotation },
        { anchor: cell, rotation: moving.from.rotation },
      ),
    )
    this.history.commitTransaction()

    this.options.bus.emit('notice', {
      message: `Moviste ${moving.itemName}.`,
      tone: 'success',
    })

    this.refreshSelection()
    this.refreshGhost()
    this.emitState()
  }

  private selectAt(cell: GridCell): void {
    const instance = this.instanceAtPointer() ?? this.instanceAt(cell)
    this.options.city.select(instance?.id ?? null)
    this.refreshSelection()
    this.emitState()
  }

  private rotateAt(cell: GridCell): void {
    const instance = this.instanceAtPointer() ?? this.instanceAt(cell)
    if (!instance) return

    const from = instance.record.rotation
    const to = rotateStep(from, 1)

    this.history.execute(new RotateCommand(this.options.city, instance.id, from, to))
    this.options.city.select(instance.id)
    this.refreshSelection()
    this.options.bus.emit('notice', {
      message: `Rotaste ${instance.item.name}.`,
      tone: 'info',
    })
    this.emitState()
  }

  private duplicateAt(cell: GridCell): void {
    const instance = this.instanceAtPointer() ?? this.instanceAt(cell)
    if (!instance) return

    this.options.city.select(instance.id)
    this.duplicateSelected()
  }

  private deleteAt(cell: GridCell): void {
    const instance = this.instanceAtPointer() ?? this.instanceAt(cell)
    if (!instance) return

    this.options.city.select(instance.id)
    this.deleteSelected()
  }

  private rotateAction(): void {
    if (this.tool === 'place' && this.itemId) {
      this.rotation = rotateStep(this.rotation, 1)
      this.refreshGhost()
      this.emitState()
      return
    }

    const selected = this.options.city.selected

    if (!selected) {
      this.rotation = rotateStep(this.rotation, 1)
      this.refreshGhost()
      this.emitState()
      return
    }

    const from = selected.record.rotation
    const to = rotateStep(from, 1)
    this.history.execute(new RotateCommand(this.options.city, selected.id, from, to))
    this.refreshSelection()
    this.options.bus.emit('notice', {
      message: `Rotaste ${selected.item.name}.`,
      tone: 'info',
    })
    this.emitState()
  }

  private colorSelected(color: string): void {
    const selected = this.options.city.selected
    if (!selected) {
      this.options.bus.emit('notice', {
        message: 'Seleccioná un objeto para cambiar su color.',
        tone: 'info',
      })
      return
    }
    if (selected.record.color === color) return
    this.history.execute(
      new ColorCommand(this.options.city, selected.id, selected.record.color, color),
    )
    this.refreshSelection()
    this.emitState()
  }

  private physicsSelected(physics: CatalogPhysics): void {
    const selected = this.options.city.selected
    if (!selected) {
      this.options.bus.emit('notice', {
        message: 'Seleccioná un objeto para cambiar su física.',
        tone: 'info',
      })
      return
    }

    const current = selected.record.physics ?? selected.item.physics
    if (current === physics) return
    this.history.execute(new PhysicsCommand(this.options.city, selected.id, current, physics))
    this.refreshSelection()
    this.emitState()
  }

  private duplicateSelected(): void {
    const selected = this.options.city.selected
    if (!selected) {
      this.options.bus.emit('notice', {
        message: 'Seleccioná un objeto para duplicarlo.',
        tone: 'info',
      })
      return
    }

    const item = selected.item
    const anchor = selected.record.anchor
    const rotation = selected.record.rotation

    for (let radius = 1; radius <= 8; radius += 1) {
      for (let dz = -radius; dz <= radius; dz += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue

          const candidate = { x: anchor.x + dx, z: anchor.z + dz }
          if (!this.options.city.canPlace(item.id, candidate, rotation)) continue

          const freshRecord = this.options.city.createRecord(item.id, candidate, rotation)
          if (!freshRecord) continue
          const record: PlacementRecord = {
            ...freshRecord,
            color: selected.record.color,
            physics: selected.record.physics ?? selected.item.physics,
          }

          this.history.execute(new PlaceCommand(this.options.city, record, `Duplicar ${item.name}`))
          this.options.city.select(record.id)
          this.refreshSelection()
          this.options.bus.emit('notice', {
            message: `Duplicaste ${item.name}.`,
            tone: 'success',
          })
          this.emitState()
          return
        }
      }
    }

    this.options.bus.emit('notice', {
      message: 'No hay celdas libres cerca para duplicar.',
      tone: 'error',
    })
  }

  private deleteSelected(): void {
    const selected = this.options.city.selected
    if (!selected) {
      this.options.bus.emit('notice', {
        message: 'Seleccioná un objeto para eliminarlo.',
        tone: 'info',
      })
      return
    }

    const record: PlacementRecord = {
      ...selected.record,
      anchor: { ...selected.record.anchor },
    }
    const name = selected.item.name

    this.history.execute(new RemoveCommand(this.options.city, record))
    this.refreshSelection()
    this.ghost.hideSelection()
    this.options.bus.emit('notice', {
      message: `Eliminaste ${name}.`,
      tone: 'info',
    })
    this.emitState()
  }

  private undo(): void {
    try {
      const label = this.history.undo()
      this.refreshSelection()
      this.refreshGhost()
      this.emitState()

      if (label) {
        this.options.bus.emit('notice', { message: `Deshecho: ${label}.`, tone: 'info' })
      } else {
        this.options.bus.emit('notice', { message: 'No hay acciones para deshacer.', tone: 'info' })
      }
    } catch (error) {
      this.options.bus.emit('notice', {
        message: `No se pudo deshacer: ${(error as Error).message}`,
        tone: 'error',
      })
    }
  }

  private redo(): void {
    try {
      const label = this.history.redo()
      this.refreshSelection()
      this.refreshGhost()
      this.emitState()

      if (label) {
        this.options.bus.emit('notice', { message: `Rehecho: ${label}.`, tone: 'success' })
      } else {
        this.options.bus.emit('notice', { message: 'No hay acciones para rehacer.', tone: 'info' })
      }
    } catch (error) {
      this.options.bus.emit('notice', {
        message: `No se pudo rehacer: ${(error as Error).message}`,
        tone: 'error',
      })
    }
  }

  private cancelAction(): void {
    if (this.cancelInteraction()) {
      this.emitState()
      return
    }

    const hadSelection = this.options.city.selected !== null
    this.options.city.select(null)
    this.hoverCell = null
    this.ghost.hideGhost()
    this.refreshSelection()

    if (hadSelection) {
      this.options.bus.emit('notice', { message: 'Selección cancelada.', tone: 'info' })
    }

    this.emitState()
  }

  /** Cancela arrastres en curso deshaciendo la transacción abierta. */
  private cancelInteraction(): boolean {
    if (!this.placing && !this.moving) return false

    this.history.cancelTransaction()
    this.placing = false
    this.moving = null
    this.strokeCount = 0
    this.lastStrokeCell = null
    this.releasePointer()
    this.refreshGhost()
    return true
  }

  private lineBetween(from: GridCell, to: GridCell): readonly GridCell[] {
    const cells: GridCell[] = []
    let x = from.x
    let z = from.z
    const dx = Math.abs(to.x - x)
    const dz = Math.abs(to.z - z)
    const stepX = x < to.x ? 1 : -1
    const stepZ = z < to.z ? 1 : -1
    let error = dx - dz

    while (true) {
      cells.push({ x, z })
      if (x === to.x && z === to.z) break

      const doubled = error * 2
      if (doubled > -dz) {
        error -= dz
        x += stepX
      }
      if (doubled < dx) {
        error += dx
        z += stepZ
      }
    }

    return cells
  }

  private sameCell(a: GridCell, b: GridCell | null): boolean {
    return b !== null && a.x === b.x && a.z === b.z
  }

  private capturePointer(pointerId: number): void {
    try {
      this.options.domElement.setPointerCapture(pointerId)
    } catch {
      this.activePointerId = null
    }
  }

  private releasePointer(): void {
    if (this.activePointerId === null) return

    try {
      if (this.options.domElement.hasPointerCapture(this.activePointerId)) {
        this.options.domElement.releasePointerCapture(this.activePointerId)
      }
    } catch {
      // El puntero ya no existe; no hay nada que liberar.
    }

    this.activePointerId = null
  }

  private emitSelection(): void {
    const selected = this.options.city.selected

    if (!selected) {
      this.options.bus.emit('selectionChanged', {
        id: null,
        name: null,
        description: null,
        category: null,
        footprint: null,
        rotation: this.rotation,
        color: null,
        physics: null,
      })
      return
    }

    this.options.bus.emit('selectionChanged', {
      id: selected.id,
      name: selected.item.name,
      description: selected.item.description,
      category: selected.item.category,
      footprint: [...selected.item.footprint] as [number, number],
      rotation: selected.record.rotation,
      color: selected.record.color ?? '#f4faff',
      physics: selected.record.physics ?? selected.item.physics,
    })
  }

  private emitState(): void {
    const selected = this.options.city.selected

    this.options.bus.emit('buildStateChanged', {
      placedCount: this.options.city.placedCount,
      tool: this.tool,
      itemId: this.itemId,
      rotation: selected?.record.rotation ?? this.rotation,
      canUndo: this.history.canUndo,
      canRedo: this.history.canRedo,
      undoLabel: this.history.undoLabel,
      redoLabel: this.history.redoLabel,
      hint: TOOL_HINTS[this.tool],
    })
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.interactionEnabled) return
    if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase()

      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        this.undo()
        return
      }

      if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault()
        this.redo()
      }
      return
    }

    if (event.repeat || event.altKey) return

    switch (event.key.toLowerCase()) {
      case 'escape':
        event.preventDefault()
        this.cancelAction()
        break
      case 'r':
        event.preventDefault()
        this.rotateAction()
        break
      case 'delete':
      case 'backspace':
        event.preventDefault()
        this.deleteSelected()
        break
      case 'v':
        event.preventDefault()
        this.duplicateSelected()
        break
      case 'q':
        event.preventDefault()
        this.setTool('select')
        break
    }
  }
}
