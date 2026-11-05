import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

import { AssetLibrary } from '@/building/AssetLibrary'
import { BuildController } from '@/building/BuildController'
import { CATALOG_ITEMS } from '@/building/Catalog'
import { City } from '@/building/City'
import { EventBus } from '@/core/EventBus'
import { GameLoop } from '@/core/GameLoop'
import { CameraRig } from '@/render/CameraRig'
import { DayCycle } from '@/render/DayCycle'
import { Lighting } from '@/render/Lighting'
import { PostProcessing } from '@/render/PostProcessing'
import { Renderer } from '@/render/Renderer'
import { SkyDome } from '@/render/SkyDome'
import { DEFAULT_THEME, resolveTheme, THEMES } from '@/render/theme'
import type { ThemeDefinition } from '@/render/theme'
import { Hud } from '@/ui/Hud'
import { disposeObject3D } from '@/utils/dispose'
import { AeroParticles } from '@/fx/AeroParticles'
import { PhysicsWorld } from '@/physics/PhysicsWorld'
import { NpcSystem } from '@/npc/NpcSystem'
import { World } from '@/world/World'
import {
  DEFAULT_WORLD_PRESET,
  DEFAULT_TERRAIN,
  normalizeTerrain,
  resolveWorldPreset,
  worldScale,
  WORLD_PRESETS,
} from '@/world/WorldConfig'
import type { TerrainSettings, WorldPreset } from '@/world/WorldConfig'

import type { AppEvents } from './events'

const KEYBOARD_PRESETS: Readonly<Record<string, string>> = {
  '1': 'small',
  '2': 'medium',
  '3': 'large',
}

/**
 * Composición de la aplicación: render, mundo, construcción, UI y bucle.
 * Mantiene el orden de dependencias de la arquitectura
 * (core → simulación → presentación → UI).
 */
export class App {
  private readonly bus = new EventBus<AppEvents>()
  private readonly container: HTMLElement
  private readonly scene = new THREE.Scene()
  private readonly renderer: Renderer
  private readonly cameraRig: CameraRig
  private readonly sky: SkyDome
  private readonly lighting: Lighting
  private readonly hud: Hud
  private readonly loop: GameLoop
  private readonly resizeObserver: ResizeObserver
  private readonly environmentTexture: THREE.Texture
  private readonly postProcessing: PostProcessing
  private readonly dayCycle: DayCycle
  private readonly library = new AssetLibrary()
  private readonly city: City
  private readonly build: BuildController
  private readonly physics: PhysicsWorld
  private readonly npcs: NpcSystem
  private readonly subscriptions: (() => void)[] = []

  private world: World
  private particles: AeroParticles
  private activePreset: WorldPreset
  private theme: ThemeDefinition
  private terrain: TerrainSettings = DEFAULT_TERRAIN

  constructor(container: HTMLElement) {
    this.container = container
    this.theme = DEFAULT_THEME

    this.renderer = new Renderer(container)
    this.scene.fog = new THREE.Fog(this.theme.fog.color, this.theme.fog.near, this.theme.fog.far)

    this.cameraRig = new CameraRig(this.renderer.instance.domElement)
    this.sky = new SkyDome(this.theme)
    this.lighting = new Lighting(this.theme)

    this.activePreset = DEFAULT_WORLD_PRESET
    this.world = new World(this.activePreset, this.theme, this.terrain)

    this.scene.add(this.sky.object, this.lighting.object, this.world.object)
    this.environmentTexture = this.createEnvironment()
    this.postProcessing = new PostProcessing(
      this.renderer.instance,
      this.scene,
      this.cameraRig.camera,
    )
    this.postProcessing.applyTheme(this.theme)
    this.dayCycle = new DayCycle(this.theme)
    this.particles = new AeroParticles(this.activePreset.size, this.theme)
    this.scene.add(this.particles.object)

    this.city = new City(this.world, this.theme, this.library)
    this.scene.add(this.city.object)

    this.hud = new Hud(container, this.bus, {
      presets: WORLD_PRESETS,
      selectedPresetId: this.activePreset.id,
      themes: THEMES,
      selectedThemeId: this.theme.id,
      items: CATALOG_ITEMS,
    })

    this.build = new BuildController({
      scene: this.scene,
      camera: this.cameraRig.camera,
      domElement: this.renderer.instance.domElement,
      city: this.city,
      library: this.library,
      bus: this.bus,
      theme: this.theme,
    })
    this.physics = new PhysicsWorld(
      this.city,
      this.cameraRig.camera,
      this.renderer.instance.domElement,
      this.bus,
    )
    this.npcs = new NpcSystem(this.city, this.physics)
    this.scene.add(this.npcs.object)

    this.subscriptions.push(
      this.bus.on('worldPresetSelected', (event) => {
        this.selectWorldPreset(event.id)
      }),
      this.bus.on('themeSelected', (event) => {
        this.selectTheme(event.id)
      }),
      this.bus.on('terrainSelected', (event) => {
        this.selectTerrain(event)
      }),
      this.bus.on('playModeSelected', (event) => {
        void this.selectPlayMode(event.mode)
      }),
    )

    this.applyWorldMetrics(this.activePreset)
    this.publishWorldChanged()
    this.publishThemeChanged()

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

    void this.loadCatalog()
  }

  start(): void {
    this.loop.start()
  }

  dispose(): void {
    this.loop.stop()

    for (const unsubscribe of this.subscriptions) unsubscribe()
    this.subscriptions.length = 0

    this.resizeObserver.disconnect()
    this.renderer.instance.domElement.removeEventListener('contextmenu', this.preventContextMenu)
    window.removeEventListener('keydown', this.handleKeyDown)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)

    this.build.dispose()
    this.physics.dispose()
    this.npcs.dispose()
    this.city.dispose()
    this.library.dispose()
    this.hud.dispose()
    this.bus.clear()

    this.scene.environment = null
    this.postProcessing.dispose()
    this.particles.dispose()
    this.environmentTexture.dispose()
    this.sky.dispose()
    this.world.dispose()
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

  private async loadCatalog(): Promise<void> {
    this.bus.emit('notice', { message: 'Cargando catálogo glTF…', tone: 'info' })

    const result = await this.library.load(CATALOG_ITEMS)
    this.city.refreshModels()
    this.bus.emit('assetsLoaded', result)

    if (result.failed.length > 0) {
      this.bus.emit('notice', {
        message: `No se pudieron cargar ${result.failed.length} modelos; se usan cajas provisionales.`,
        tone: 'error',
      })
    } else {
      this.bus.emit('notice', {
        message: `Catálogo listo: ${result.loaded} modelos glTF.`,
        tone: 'success',
      })
    }
  }

  private selectWorldPreset(id: string): void {
    const preset = resolveWorldPreset(id)
    if (preset.id === this.activePreset.id) return

    this.replaceWorld(preset)
    this.activePreset = preset

    this.applyWorldMetrics(preset)
    this.publishWorldChanged()

    this.bus.emit('notice', {
      message: `Diorama ${preset.size} × ${preset.size}.`,
      tone: 'info',
    })
  }

  private selectTerrain(settings: TerrainSettings): void {
    const next = normalizeTerrain(settings)
    if (
      next.mode === this.terrain.mode &&
      next.density === this.terrain.density &&
      next.prominence === this.terrain.prominence
    ) {
      return
    }

    this.terrain = next
    this.replaceWorld(this.activePreset)
    this.applyWorldMetrics(this.activePreset)
    this.publishWorldChanged()
    this.bus.emit('notice', {
      message:
        next.mode === 'flat'
          ? 'Terreno plano activado.'
          : `Relieve activado: ${next.density} colinas.`,
      tone: 'info',
    })
  }

  private async selectPlayMode(mode: 'build' | 'play'): Promise<void> {
    const playing = mode === 'play'
    this.build.setInteractionEnabled(!playing)
    try {
      await this.physics.setActive(playing)
      this.npcs.setPlaying(playing)
    } catch (error) {
      this.build.setInteractionEnabled(true)
      this.hud.setPlayMode('build')
      this.bus.emit('notice', {
        message: `No se pudo iniciar la física: ${(error as Error).message}`,
        tone: 'error',
      })
    }
  }

  private replaceWorld(preset: WorldPreset): void {
    this.scene.remove(this.world.object)
    this.world.dispose()
    this.world = new World(preset, this.theme, this.terrain)
    this.scene.add(this.world.object)
    this.scene.remove(this.particles.object)
    this.particles.dispose()
    this.particles = new AeroParticles(preset.size, this.theme)
    this.scene.add(this.particles.object)
    this.city.setWorld(this.world)
    this.build.syncAfterWorldChange()
  }

  private selectTheme(id: string): void {
    const theme = resolveTheme(id)
    if (theme.id === this.theme.id) return

    this.theme = theme

    this.sky.applyTheme(theme)
    this.lighting.applyTheme(theme)
    this.world.applyTheme(theme)
    this.city.applyTheme(theme)
    this.build.applyTheme(theme)
    this.postProcessing.applyTheme(theme)
    this.dayCycle.applyTheme(theme)
    this.particles.applyTheme(theme)

    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.set(theme.fog.color)
    }

    this.applyWorldMetrics(this.activePreset)
    this.build.refreshSelection()
    this.publishThemeChanged()

    this.bus.emit('notice', {
      message: `Tema activo: ${theme.name}.`,
      tone: 'info',
    })
  }

  /** Ajusta cámara, niebla y sombras al tamaño del diorama activo. */
  private applyWorldMetrics(preset: WorldPreset): void {
    const fog = this.scene.fog
    if (fog instanceof THREE.Fog) {
      const scale = worldScale(preset.size)
      fog.color.set(this.theme.fog.color)
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

  private publishThemeChanged(): void {
    this.bus.emit('themeChanged', { theme: this.theme })
  }

  private fixedUpdate(dt: number): void {
    this.world.update(dt)
    this.physics.update(dt)
    this.npcs.update(dt)
    this.particles.update(dt)
    if (this.scene.fog instanceof THREE.Fog) {
      this.dayCycle.update(dt, this.sky, this.lighting, this.scene.fog)
    }
  }

  private render(alpha: number, frameDelta: number): void {
    this.cameraRig.update(frameDelta)
    this.postProcessing.render(frameDelta)

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
    this.postProcessing.setSize(width, height)
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
