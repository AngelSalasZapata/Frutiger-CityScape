import type { AppEvents, FrameEvent } from '@/app/events'
import type { EventBus } from '@/core/EventBus'

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

    <div class="hud__hints glass-panel">
      <span><kbd>Clic derecho</kbd> rotar</span>
      <span><kbd>Rueda</kbd> zoom</span>
      <span><kbd>Clic central</kbd> desplazar</span>
      <span><kbd>G</kbd> grilla</span>
    </div>
  </div>
`

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
  private readonly root: HTMLElement
  private readonly fpsValue: HTMLElement
  private readonly frameValue: HTMLElement
  private readonly drawCallsValue: HTMLElement
  private readonly trianglesValue: HTMLElement
  private readonly unsubscribe: () => void

  private frames = 0
  private elapsed = 0

  constructor(container: HTMLElement, bus: EventBus<AppEvents>) {
    container.insertAdjacentHTML('beforeend', HUD_TEMPLATE)

    this.root = query(container, '.hud')
    this.fpsValue = query(this.root, '[data-fps]')
    this.frameValue = query(this.root, '[data-frame]')
    this.drawCallsValue = query(this.root, '[data-draw-calls]')
    this.trianglesValue = query(this.root, '[data-triangles]')

    const runtime = query(this.root, '[data-runtime]')
    runtime.textContent = window.desktop
      ? `Electron ${window.desktop.versions.electron}`
      : 'Navegador'

    this.unsubscribe = bus.on('frame', this.handleFrame)
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

  dispose(): void {
    this.unsubscribe()
    this.root.remove()
  }
}
