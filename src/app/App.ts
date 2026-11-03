import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

import { EventBus } from '@/core/EventBus'
import { GameLoop } from '@/core/GameLoop'
import { CameraRig } from '@/render/CameraRig'
import { Lighting } from '@/render/Lighting'
import { Renderer } from '@/render/Renderer'
import { SkyDome } from '@/render/SkyDome'
import { AERO_CLASSIC_THEME } from '@/render/theme'
import { Hud } from '@/ui/Hud'
import { disposeObject3D } from '@/utils/dispose'
import { PreviewStage } from '@/world/PreviewStage'
import { World } from '@/world/World'
import {
  DEFAULT_WORLD_PRESET,
  resolveWorldPreset,
  worldScale,
  WORLD_PRESETS,
} from '@/world/WorldConfig'
import type { WorldPreset } from '@/world/WorldConfig'

import type { AppEvents } from './events'

const KEYBOARD_PRESETS: Readonly<Record<string, string>> = {
  '1': 'small',
  '2': 'medium',
  '3': 'large',
}

/**
 * Composición de la aplicación: render, mundo, UI y bucle. Mantiene el orden
 * de dependencias de la arquitectura (core → simulación → presentación → UI).
 */
export class App {
  private readonly bus = new EventBus<AppEvents>()
  private readonly container: HTMLElement
  private readonly theme = AERO_CLASSIC_THEME
  private readonly scene = new THREE.Scene()
  private readonly renderer: Renderer
  private readonly cameraRig: CameraRig
  private readonly sky: SkyDome
  private readonly lighting: Lighting
  private readonly preview: PreviewStage
  private readonly hud: Hud
  private readonly loop: GameLoop
  private readonly resizeObserver: ResizeObserver
  private readonly environmentTexture: THREE.Texture
  private readonly unsubscribePresetSelected: () => void

  private world: World
  private activePreset: WorldPreset

  constructor(container: HTMLElement) {
    this.container = container

    this.renderer = new Renderer(container)
    this.scene.fog = new THREE.Fog(this.theme.fog.color, this.theme.fog.near, this.theme.fog.far)

    this.cameraRig = new CameraRig(this.renderer.instance.domElement)
    this.sky = new SkyDome(this.theme)
    this.lighting = new Lighting(this.theme)
    this.preview = new PreviewStage()

    this.activePreset = DEFAULT_WORLD_PRESET
    this.world = new World(this.activePreset, this.theme)

    this.scene.add(this.sky.object, this.lighting.object, this.world.object, this.preview.object)
    this.environmentTexture = this.createEnvironment()

    this.hud = new Hud(container, this.bus, {
      presets: WORLD_PRESETS,
      selectedPresetId: this.activePreset.id,
    })

    this.unsubscribePresetSelected = this.bus.on('worldPresetSelected', (event) => {
      this.selectWorldPreset(event.id)
    })

    this.applyWorldMetrics(this.activePreset)
    this.publishWorldChanged()

    this.loop = new GameLoop({
      fixedHz: 60,
      onFixedUpdate: (dt) => this.fixedUpdate(dt),
      onRender: (alpha, frameDelta) => this.render(alpha, frameDelta),
    })

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)

    this.renderer.instance.domElement.addEventListener('contextmenu', this.preventContextMenu)
    window.addEventListener('keydown', this.handleKeyDown)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)

    this.resize()
  }

  start(): void {
    this.loop.start()
  }

  dispose(): void {
    this.loop.stop()
    this.unsubscribePresetSelected()
    this.resizeObserver.disconnect()
    this.renderer.instance.domElement.removeEventListener('contextmenu', this.preventContextMenu)
    window.removeEventListener('keydown', this.handleKeyDown)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)

    this.hud.dispose()
    this.bus.clear()

    this.scene.environment = null
    this.environmentTexture.dispose()
    this.sky.dispose()
    this.world.dispose()
    this.preview.dispose()
    this.lighting.dispose()
    this.cameraRig.dispose()
    this.renderer.dispose()
  }

  private createEnvironment(): THREE.Texture {
    const generator = new THREE.PMREMGenerator(this.renderer.instance)
    const room = new RoomEnvironment()
    const texture = generator.fromScene(room, 0.04).texture

    disposeObject3D(room)
    generator.dispose()

    // Reflejos neutros de estudio como base provisional; en la Fase 4 se
    // sustituirán por HDRI por tema.
    this.scene.environment = texture
    return texture
  }

  private selectWorldPreset(id: string): void {
    const preset = resolveWorldPreset(id)
    if (preset.id === this.activePreset.id) return

    this.scene.remove(this.world.object)
    this.world.dispose()

    this.world = new World(preset, this.theme)
    this.activePreset = preset
    this.scene.add(this.world.object)

    this.applyWorldMetrics(preset)
    this.publishWorldChanged()
  }

  /** Ajusta cámara, niebla y sombras al tamaño del diorama activo. */
  private applyWorldMetrics(preset: WorldPreset): void {
    const fog = this.scene.fog
    if (fog instanceof THREE.Fog) {
      const scale = worldScale(preset.size)
      fog.near = this.theme.fog.near * scale
      fog.far = this.theme.fog.far * scale
    }

    this.lighting.setWorldSize(preset.size)
    this.cameraRig.frameWorld(preset.size)
  }

  private publishWorldChanged(): void {
    this.bus.emit('worldChanged', {
      preset: this.activePreset,
      cells: this.activePreset.size * this.activePreset.size,
      chunks: this.world.chunks.count,
    })
  }

  private fixedUpdate(dt: number): void {
    this.world.update(dt)
    this.preview.update(dt)
  }

  private render(alpha: number, frameDelta: number): void {
    this.cameraRig.update()
    this.renderer.render(this.scene, this.cameraRig.camera)

    const info = this.renderer.instance.info.render
    this.bus.emit('frame', {
      frameDelta,
      alpha,
      drawCalls: info.calls,
      triangles: info.triangles,
    })
  }

  private resize(): void {
    const width = this.container.clientWidth || window.innerWidth
    const height = this.container.clientHeight || window.innerHeight

    if (width === 0 || height === 0) return

    this.renderer.setSize(width, height)
    this.cameraRig.setAspect(width / height)
    this.cameraRig.ensureWorldFits(this.activePreset.size)
  }

  private readonly preventContextMenu = (event: Event): void => {
    event.preventDefault()
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return

    const key = event.key.toLowerCase()

    if (key === 'g') {
      this.world.toggleGrid()
      return
    }

    if (key === 'c') {
      this.world.toggleChunks()
      return
    }

    const presetId = KEYBOARD_PRESETS[key]
    if (presetId) {
      this.bus.emit('worldPresetSelected', { id: presetId })
    }
  }

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.loop.stop()
    } else {
      this.loop.start()
    }
  }
}
