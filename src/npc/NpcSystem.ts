import * as THREE from 'three'

import type { City, PlacedInstance } from '@/building/City'
import type { PhysicsWorld } from '@/physics/PhysicsWorld'

interface NpcState {
  readonly bubble: THREE.Sprite
  readonly material: THREE.SpriteMaterial
  target: THREE.Vector3
  nextDecision: number
  nextHop: number
  hopUntil: number
  phase: number
  symbol: string
}

const SYMBOLS = ['🙂', '💬', '👋', '😉', '♥', '♫']

/** Habitantes pequeños que flotan, pasean y se expresan con pictogramas. */
export class NpcSystem {
  readonly object = new THREE.Group()

  private readonly states = new Map<string, NpcState>()
  private playing = false
  private elapsed = 0

  constructor(
    private readonly city: City,
    private readonly physics: PhysicsWorld,
  ) {
    this.object.name = 'npc-effects'
  }

  setPlaying(playing: boolean): void {
    this.playing = playing
    if (!playing) this.reset()
  }

  update(dt: number): void {
    this.elapsed += dt
    this.sync()
    if (!this.playing) return

    const npcs = this.npcs()
    for (const npc of npcs) {
      const state = this.states.get(npc.id)
      if (!state) continue
      this.updateNpc(npc, state, npcs, dt)
    }
  }

  dispose(): void {
    for (const state of this.states.values()) state.material.map?.dispose()
    this.states.clear()
    this.object.clear()
  }

  private sync(): void {
    const ids = new Set(this.npcs().map((npc) => npc.id))
    for (const [id, state] of this.states) {
      if (ids.has(id)) continue
      state.material.map?.dispose()
      this.object.remove(state.bubble)
      this.states.delete(id)
    }

    for (const npc of this.npcs()) {
      if (this.states.has(npc.id)) continue
      const material = new THREE.SpriteMaterial({ transparent: true, depthTest: false })
      const bubble = new THREE.Sprite(material)
      bubble.name = `npc-bubble-${npc.id}`
      bubble.scale.set(0.65, 0.45, 1)
      this.object.add(bubble)
      this.states.set(npc.id, {
        bubble,
        material,
        target: npc.object.position.clone(),
        nextDecision: 0,
        nextHop: 2 + Math.random() * 5,
        hopUntil: 0,
        phase: Math.random() * Math.PI * 2,
        symbol: '',
      })
    }
  }

  private updateNpc(
    npc: PlacedInstance,
    state: NpcState,
    npcs: readonly PlacedInstance[],
    dt: number,
  ): void {
    const position = npc.object.position
    const interaction = this.physics.npcInteraction(npc.id)
    const nearStructure = this.city
      .all()
      .some(
        (other) =>
          other.id !== npc.id &&
          other.item.category !== 'npc' &&
          other.object.position.distanceTo(position) < 1.35,
      )
    if (nearStructure && this.elapsed >= state.nextHop) {
      state.hopUntil = this.elapsed + 0.42
      state.nextHop = this.elapsed + 3 + Math.random() * 5
    }
    const hop =
      state.hopUntil > this.elapsed
        ? Math.sin(((state.hopUntil - this.elapsed) / 0.42) * Math.PI) * 0.16
        : 0
    const bob = 0.035 + Math.sin(this.elapsed * 3.2 + state.phase) * 0.025 + hop
    npc.modelHolder.position.y = bob

    if (!interaction.grabbed && this.elapsed >= state.nextDecision) {
      state.target
        .copy(position)
        .add(this.randomDirection().multiplyScalar(1.2 + Math.random() * 2.2))
      state.target.y = position.y
      state.nextDecision = this.elapsed + 2.5 + Math.random() * 3.5
    }

    if (!interaction.grabbed) this.physics.moveNpc(npc.id, state.target, dt)

    state.bubble.position.copy(position).add(new THREE.Vector3(0, npc.item.height + 0.62, 0))
    state.bubble.position.y += Math.sin(this.elapsed * 2 + state.phase) * 0.04
    const symbol = this.symbolFor(npc, interaction.grabbed, interaction.speed, npcs)
    if (symbol !== state.symbol) this.setBubbleSymbol(state, symbol)
  }

  private symbolFor(
    npc: PlacedInstance,
    grabbed: boolean,
    speed: number,
    npcs: readonly PlacedInstance[],
  ): string {
    if (grabbed) return '❓'
    if (speed > 5.4) return '😵'
    if (speed > 3.5) return '💢'

    const friend = npcs.some(
      (other) => other.id !== npc.id && other.object.position.distanceTo(npc.object.position) < 1.8,
    )
    if (friend) return SYMBOLS[Math.floor((this.elapsed + npc.id.length) % SYMBOLS.length)]!

    const nearby = this.city
      .all()
      .filter((other) => other.id !== npc.id && other.item.category !== 'npc')
      .find((other) => other.object.position.distanceTo(npc.object.position) < 1.35)
    if (!nearby) return '…'
    if (nearby.item.category === 'vehicle') return '🚗'
    if (nearby.item.category === 'building') return '🏢'
    if (nearby.item.category === 'nature') return '🌿'
    return '✨'
  }

  private setBubbleSymbol(state: NpcState, symbol: string): void {
    state.symbol = symbol
    state.material.map?.dispose()
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 96
    const context = canvas.getContext('2d')
    if (!context) return
    context.fillStyle = 'rgba(250, 254, 255, 0.92)'
    context.strokeStyle = '#2585ba'
    context.lineWidth = 5
    context.beginPath()
    context.roundRect(8, 6, 112, 68, 24)
    context.fill()
    context.stroke()
    context.beginPath()
    context.moveTo(49, 73)
    context.lineTo(58, 88)
    context.lineTo(68, 73)
    context.fill()
    context.stroke()
    context.font = '42px "Segoe UI Emoji", sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = '#084f7d'
    context.fillText(symbol, 64, 41)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    state.material.map = texture
    state.material.needsUpdate = true
  }

  private reset(): void {
    for (const npc of this.npcs()) {
      npc.modelHolder.position.y = 0
      npc.object.quaternion.identity()
    }
  }

  private npcs(): readonly PlacedInstance[] {
    return this.city.all().filter((instance) => instance.item.category === 'npc')
  }

  private randomDirection(): THREE.Vector3 {
    const angle = Math.random() * Math.PI * 2
    return new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
  }
}
