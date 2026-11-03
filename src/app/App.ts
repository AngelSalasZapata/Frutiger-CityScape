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
import { DEFAULT_WORLD_PRESET } from '@/world/WorldConfig'
import { PreviewStage } from '@/world/PreviewStage'
import { Terrain } from '@/world/Terrain'

import type { AppEvents } from './events'

/**
 * Composición de la aplicación: render, mundo, UI y bucle. Mantiene el orden
 * de dependencias de la arquitectura (core → simulación → presentación → UI).
 */
export class App {
  private readonly bus = new EventBus<AppEvents>()
  private readonly container: HTMLElement
  private readonly scene = new THREE.Scene()
  private readonly renderer: Renderer
  private readonly cameraRig: CameraRig
  private readonly sky: SkyDome
  private readonly lighting: Lighting
  private readonly terrain: Terrain
  private readonly preview: PreviewStage
  private readonly hud: Hud
  private readonly loop: GameLoop
  private readonly resizeObserver: ResizeObserver
  private readonly environmentTexture: THREE.Texture

  constructor(container: HTMLElement) {
    this.container = container

    const theme = AERO_CLASSIC_THEME

    this.renderer = new Renderer(container)
    this.scene.fog = new THREE.Fog(theme.fog.color, theme.fog.near, theme.fog.far)

    this.cameraRig = new CameraRig(this.renderer.instance.domElement)
    this.sky = new SkyDome(theme)
    this.lighting = new Lighting(theme)
    this.terrain = new Terrain(DEFAULT_WORLD_PRESET, theme)
    this.preview = new PreviewStage()

    this.scene.add(this.sky.object, this.lighting.object, this.terrain.object, this.preview.object)
    this.environmentTexture = this.createEnvironment()

    this.hud = new Hud(container, this.bus)

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
    this.resizeObserver.disconnect()
    this.renderer.instance.domElement.removeEventListener('contextmenu', this.preventContextMenu)
    window.removeEventListener('keydown', this.handleKeyDown)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)

    this.hud.dispose()
    this.bus.clear()

    this.scene.environment = null
    this.environmentTexture.dispose()
    this.sky.dispose()
    this.terrain.dispose()
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

  private fixedUpdate(dt: number): void {
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
  }

  private readonly preventContextMenu = (event: Event): void => {
    event.preventDefault()
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return

    if (event.key.toLowerCase() === 'g') {
      this.terrain.toggleGrid()
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
