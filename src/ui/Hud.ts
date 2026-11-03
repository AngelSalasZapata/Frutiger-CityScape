import type { AppEvents, FrameEvent, WorldChangedEvent } from '@/app/events'
import type { EventBus } from '@/core/EventBus'
import type { WorldPreset } from '@/world/WorldConfig'

const HUD_TEMPLATE = `
  <div class="hud">
    <section class="hud__brand glass-panel">
      <p class="hud__eyebrow">Frutiger Aero Sandbox</p>
      <h1 class="hud__title">Frutiger Cityscape</h1>
      <p class="hud__meta">
        <span class="hud__dot" aria-hidden="true"></span>
        <span data-runtime>Iniciando</span>
        <span aria-hidden="true">·</span>
        <span>v${__APP_VERSION__}</span>
      </p>
    </section>

    <section class="hud__stats glass-panel" aria-label="Estadísticas de rendimiento">
      <div class="hud__stat">
        <span class="hud__stat-label">FPS</span>
        <span class="hud__stat-value" data-fps>—</span>
      </div>
      <div class="hud__stat">
        <span class="hud__stat-label">Frame</span>
        <span class="hud__stat-value" data-frame>—</span>
      </div>
      <div class="hud__stat">
        <span class="hud__stat-label">Draw calls</span>
        <span class="hud__stat-value" data-draw-calls>—</span>
      </div>
      <div class="hud__stat">
        <span class="hud__stat-label">Triángulos</span>
        <span class="hud__stat-value" data-triangles>—</span>
      </div>
    </section>

    <section class="hud__world glass-panel" aria-label="Tamaño del diorama">
      <div>
        <p class="hud__eyebrow">Diorama</p>
        <p class="hud__world-meta" data-world-meta>—</p>
      </div>
      <div class="hud__presets" role="group" aria-label="Tamaño de la ciudad" data-presets></div>
    </section>

    <div class="hud__hints glass-panel">
      <span><kbd>Clic derecho</kbd> rotar</span>
      <span><kbd>Rueda</kbd> zoom</span>
      <span><kbd>Clic central</kbd> desplazar</span>
      <span><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> tamaño</span>
      <span><kbd>G</kbd> grilla</span>
      <span><kbd>C</kbd> chunks</span>
    </div>
  </div>
`

interface HudOptions {
  presets: readonly WorldPreset[]
  selectedPresetId: string
}

function query(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector)
  if (!element) {
    throw new Error(`No se encontró el elemento del HUD: ${selector}`)
  }
  return element
}

/**
 * HUD superpuesto en HTML/CSS. Consume métricas por el bus de eventos y no
 * conoce nada del renderer ni de la simulación.
 */
export class Hud {
  private readonly bus: EventBus<AppEvents>
  private readonly root: HTMLElement
  private readonly presetsRoot: HTMLElement
  private readonly worldMeta: HTMLElement
  private readonly fpsValue: HTMLElement
  private readonly frameValue: HTMLElement
  private readonly drawCallsValue: HTMLElement
  private readonly trianglesValue: HTMLElement
  private readonly presetButtons = new Map<string, HTMLButtonElement>()
  private readonly unsubscribeFrame: () => void
  private readonly unsubscribeWorldChanged: () => void

  private frames = 0
  private elapsed = 0

  constructor(container: HTMLElement, bus: EventBus<AppEvents>, options: HudOptions) {
    this.bus = bus
    this.root = this.createRoot(container)
    this.presetsRoot = query(this.root, '[data-presets]')
    this.worldMeta = query(this.root, '[data-world-meta]')
    this.fpsValue = query(this.root, '[data-fps]')
    this.frameValue = query(this.root, '[data-frame]')
    this.drawCallsValue = query(this.root, '[data-draw-calls]')
    this.trianglesValue = query(this.root, '[data-triangles]')

    const runtime = query(this.root, '[data-runtime]')
    runtime.textContent = window.desktop
      ? `Electron ${window.desktop.versions.electron}`
      : 'Navegador'

    this.createPresetButtons(options.presets)

    const initialPreset =
      options.presets.find((preset) => preset.id === options.selectedPresetId) ?? options.presets[0]

    if (!initialPreset) {
      throw new Error('El HUD necesita al menos un preset de mundo')
    }

    this.applyWorldState(initialPreset, this.chunkCountFor(initialPreset))

    this.presetsRoot.addEventListener('click', this.handlePresetClick)
    this.unsubscribeFrame = this.bus.on('frame', this.handleFrame)
    this.unsubscribeWorldChanged = this.bus.on('worldChanged', this.handleWorldChanged)
  }

  dispose(): void {
    this.unsubscribeFrame()
    this.unsubscribeWorldChanged()
    this.presetsRoot.removeEventListener('click', this.handlePresetClick)
    this.root.remove()
  }

  private createRoot(container: HTMLElement): HTMLElement {
    container.insertAdjacentHTML('beforeend', HUD_TEMPLATE)
    const root = container.querySelector<HTMLElement>('.hud')

    if (!root) {
      throw new Error('No se pudo montar el HUD')
    }

    return root
  }

  private createPresetButtons(presets: readonly WorldPreset[]): void {
    for (const preset of presets) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'hud__preset'
      button.dataset.preset = preset.id
      button.setAttribute('aria-pressed', 'false')

      const label = document.createElement('span')
      label.className = 'hud__preset-label'
      label.textContent = preset.label

      const size = document.createElement('span')
      size.className = 'hud__preset-size'
      size.textContent = `${preset.size} × ${preset.size}`

      button.append(label, size)
      this.presetsRoot.append(button)
      this.presetButtons.set(preset.id, button)
    }
  }

  private applyWorldState(preset: WorldPreset, chunks: number): void {
    for (const [id, button] of this.presetButtons) {
      const isActive = id === preset.id
      button.classList.toggle('is-active', isActive)
      button.setAttribute('aria-pressed', String(isActive))
    }

    this.worldMeta.textContent = `${preset.size} × ${preset.size} celdas · ${chunks} chunks`
  }

  private chunkCountFor(preset: WorldPreset): number {
    const perAxis = preset.size / preset.chunkSize
    return perAxis * perAxis
  }

  private readonly handlePresetClick = (event: MouseEvent): void => {
    const target = event.target
    if (!(target instanceof Element)) return

    const button = target.closest<HTMLButtonElement>('[data-preset]')
    if (!button) return

    const id = button.dataset.preset
    if (id) {
      this.bus.emit('worldPresetSelected', { id })
    }
  }

  private readonly handleWorldChanged = (event: WorldChangedEvent): void => {
    this.applyWorldState(event.preset, event.chunks)
  }

  private readonly handleFrame = (event: FrameEvent): void => {
    this.frames += 1
    this.elapsed += event.frameDelta

    if (this.elapsed < 0.5) return

    this.fpsValue.textContent = String(Math.round(this.frames / this.elapsed))
    this.frameValue.textContent = `${((this.elapsed / this.frames) * 1000).toFixed(1)} ms`
    this.drawCallsValue.textContent = String(event.drawCalls)
    this.trianglesValue.textContent = event.triangles.toLocaleString('es-PE')

    this.frames = 0
    this.elapsed = 0
  }
}
