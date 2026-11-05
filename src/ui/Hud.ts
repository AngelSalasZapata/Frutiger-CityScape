import type {
  AppEvents,
  AssetsLoadedEvent,
  BuildStateChangedEvent,
  FrameEvent,
  NoticeEvent,
  SelectionChangedEvent,
  ThemeChangedEvent,
  WorldChangedEvent,
} from '@/app/events'
import type { CatalogCategory, CatalogItem } from '@/building/Catalog'
import {
  CATEGORY_LABELS,
  CATALOG_CATEGORIES,
  isItemAvailable,
  resolveCatalogItem,
} from '@/building/Catalog'
import type { BuildTool } from '@/building/tools'
import { BUILD_TOOLS, TOOL_HINTS, TOOL_LABELS } from '@/building/tools'
import type { EventBus } from '@/core/EventBus'
import type { ThemeDefinition } from '@/render/theme'
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
        <span aria-hidden="true">·</span>
        <span data-assets>Catálogo…</span>
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

    <div class="hud__left">
      <section class="hud__theme glass-panel">
        <div class="hud__panel-head">
          <p class="hud__eyebrow">Tema visual</p>
          <span class="hud__theme-count">8 estilos</span>
        </div>
        <label class="hud__select-wrap">
          <span class="sr-only">Elegir tema visual</span>
          <select class="hud__select" data-theme-select></select>
        </label>
        <p class="hud__tagline" data-theme-tagline>—</p>
      </section>

      <section class="hud__world glass-panel" aria-label="Tamaño del diorama">
        <div class="hud__panel-head">
          <p class="hud__eyebrow">Diorama</p>
          <p class="hud__world-meta" data-world-meta>—</p>
        </div>
        <div class="hud__presets" role="group" aria-label="Tamaño de la ciudad" data-presets></div>
        <div class="hud__terrain" aria-label="Relieve del mundo">
          <label class="hud__terrain-label" for="terrain-mode">Terreno</label>
          <select id="terrain-mode" class="hud__select hud__terrain-mode" data-terrain-mode>
            <option value="flat">Plano</option>
            <option value="hills">Con colinas</option>
          </select>
          <label class="hud__range-label">Cantidad <output data-terrain-count>4</output>
            <input data-terrain-density type="range" min="1" max="12" value="4" />
          </label>
          <label class="hud__range-label">Altura <output data-terrain-prominence-label>Media</output>
            <input data-terrain-prominence type="range" min="0" max="100" value="35" />
          </label>
        </div>
      </section>
    </div>

    <aside class="hud__build glass-panel" aria-label="Paleta de construcción">
      <div class="hud__panel-head">
        <p class="hud__eyebrow">Construcción</p>
        <p class="hud__build-meta" data-build-meta>0 objetos</p>
      </div>
      <p class="hud__build-hint" data-build-hint>Elegí una herramienta.</p>
      <button type="button" class="hud__mode" data-mode="build" aria-pressed="true">Modo: Construir</button>

      <div class="hud__tools" role="group" aria-label="Herramientas" data-tools></div>

      <div class="hud__categories" role="tablist" aria-label="Categorías del catálogo" data-categories></div>
      <div class="hud__catalog" role="listbox" aria-label="Catálogo de objetos" data-catalog></div>

      <div class="hud__actions" role="group" aria-label="Acciones del objeto">
        <button type="button" class="hud__action" data-action="rotate">Rotar <kbd>R</kbd></button>
        <button type="button" class="hud__action" data-action="duplicate">Duplicar <kbd>D</kbd></button>
        <button type="button" class="hud__action" data-action="delete">Eliminar <kbd>Del</kbd></button>
        <button type="button" class="hud__action" data-action="cancel">Cancelar <kbd>Esc</kbd></button>
      </div>

      <div class="hud__history" role="group" aria-label="Historial de construcción">
        <button type="button" class="hud__history-button" data-history="undo" disabled>Deshacer <kbd>Ctrl+Z</kbd></button>
        <button type="button" class="hud__history-button" data-history="redo" disabled>Rehacer <kbd>Ctrl+Y</kbd></button>
      </div>

      <p class="hud__selection" data-selection>Sin selección</p>
      <label class="hud__color-control">Color del objeto
        <input type="color" value="#f4faff" data-object-color disabled aria-label="Color de todos los elementos principales" />
      </label>
    </aside>

    <div class="hud__toast" data-toast role="status" aria-live="polite"></div>

    <div class="hud__hints glass-panel">
      <span><kbd>Clic izq.</kbd> construir / seleccionar</span>
      <span><kbd>Clic derecho</kbd> rotar cámara</span>
      <span><kbd>Rueda</kbd> zoom</span>
      <span><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> tamaño</span>
      <span><kbd>G</kbd> grilla</span>
      <span><kbd>C</kbd> chunks</span>
    </div>
  </div>
`

interface HudOptions {
  presets: readonly WorldPreset[]
  selectedPresetId: string
  themes: readonly ThemeDefinition[]
  selectedThemeId: string
  items: readonly CatalogItem[]
}

function query(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector)
  if (!element) {
    throw new Error(`No se encontró el elemento del HUD: ${selector}`)
  }
  return element
}

function luminance(hex: string): number {
  const normalized = hex.replace('#', '')
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized
  const red = Number.parseInt(value.slice(0, 2), 16) / 255
  const green = Number.parseInt(value.slice(2, 4), 16) / 255
  const blue = Number.parseInt(value.slice(4, 6), 16) / 255
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

/**
 * HUD superpuesto en HTML/CSS. Consume estado por el bus de eventos y no
 * conoce el renderer ni la lógica de construcción: solo emite intenciones.
 */
export class Hud {
  private readonly bus: EventBus<AppEvents>
  private readonly root: HTMLElement
  private readonly options: HudOptions
  private readonly presetsRoot: HTMLElement
  private readonly worldMeta: HTMLElement
  private readonly themeSelect: HTMLSelectElement
  private readonly themeTagline: HTMLElement
  private readonly buildMeta: HTMLElement
  private readonly buildHint: HTMLElement
  private readonly toolsRoot: HTMLElement
  private readonly categoriesRoot: HTMLElement
  private readonly catalogRoot: HTMLElement
  private readonly selectionLabel: HTMLElement
  private readonly toast: HTMLElement
  private readonly assetsLabel: HTMLElement
  private readonly fpsValue: HTMLElement
  private readonly frameValue: HTMLElement
  private readonly drawCallsValue: HTMLElement
  private readonly trianglesValue: HTMLElement
  private readonly presetButtons = new Map<string, HTMLButtonElement>()
  private readonly toolButtons = new Map<BuildTool, HTMLButtonElement>()
  private readonly undoButton: HTMLButtonElement
  private readonly redoButton: HTMLButtonElement
  private readonly objectColor: HTMLInputElement
  private readonly terrainMode: HTMLSelectElement
  private readonly terrainDensity: HTMLInputElement
  private readonly terrainProminence: HTMLInputElement
  private readonly unsubscribers: (() => void)[] = []

  private selectedThemeId: string
  private activeCategory: CatalogCategory | null = null
  private activeItemId: string | null = null
  private toastTimer: number | null = null
  private frames = 0
  private elapsed = 0

  constructor(container: HTMLElement, bus: EventBus<AppEvents>, options: HudOptions) {
    this.bus = bus
    this.options = options
    this.selectedThemeId = options.selectedThemeId

    this.root = this.createRoot(container)
    this.presetsRoot = query(this.root, '[data-presets]')
    this.worldMeta = query(this.root, '[data-world-meta]')
    this.themeSelect = query(this.root, '[data-theme-select]') as HTMLSelectElement
    this.themeTagline = query(this.root, '[data-theme-tagline]')
    this.buildMeta = query(this.root, '[data-build-meta]')
    this.buildHint = query(this.root, '[data-build-hint]')
    this.toolsRoot = query(this.root, '[data-tools]')
    this.categoriesRoot = query(this.root, '[data-categories]')
    this.catalogRoot = query(this.root, '[data-catalog]')
    this.selectionLabel = query(this.root, '[data-selection]')
    this.toast = query(this.root, '[data-toast]')
    this.assetsLabel = query(this.root, '[data-assets]')
    this.fpsValue = query(this.root, '[data-fps]')
    this.frameValue = query(this.root, '[data-frame]')
    this.drawCallsValue = query(this.root, '[data-draw-calls]')
    this.trianglesValue = query(this.root, '[data-triangles]')
    this.undoButton = query(this.root, '[data-history="undo"]') as HTMLButtonElement
    this.redoButton = query(this.root, '[data-history="redo"]') as HTMLButtonElement
    this.objectColor = query(this.root, '[data-object-color]') as HTMLInputElement
    this.terrainMode = query(this.root, '[data-terrain-mode]') as HTMLSelectElement
    this.terrainDensity = query(this.root, '[data-terrain-density]') as HTMLInputElement
    this.terrainProminence = query(this.root, '[data-terrain-prominence]') as HTMLInputElement

    const runtime = query(this.root, '[data-runtime]')
    runtime.textContent = window.desktop
      ? `Electron ${window.desktop.versions.electron}`
      : 'Navegador'

    const initialTheme =
      options.themes.find((theme) => theme.id === options.selectedThemeId) ?? options.themes[0]

    if (!initialTheme) {
      throw new Error('El HUD necesita al menos un tema visual')
    }

    this.createThemeOptions()
    this.createPresetButtons(options.presets)
    this.createToolButtons()
    this.applyTheme(initialTheme)

    const initialPreset =
      options.presets.find((preset) => preset.id === options.selectedPresetId) ?? options.presets[0]

    if (!initialPreset) {
      throw new Error('El HUD necesita al menos un preset de mundo')
    }

    this.applyWorldState(initialPreset, this.chunkCountFor(initialPreset))
    this.renderCategories()
    this.renderCatalog()

    this.presetsRoot.addEventListener('click', this.handlePresetClick)
    this.themeSelect.addEventListener('change', this.handleThemeChange)
    this.toolsRoot.addEventListener('click', this.handleToolClick)
    this.categoriesRoot.addEventListener('click', this.handleCategoryClick)
    this.catalogRoot.addEventListener('click', this.handleCatalogClick)
    this.root.addEventListener('click', this.handleActionClick)
    this.objectColor.addEventListener('input', this.handleObjectColor)
    this.terrainMode.addEventListener('change', this.handleTerrainChange)
    this.terrainDensity.addEventListener('input', this.handleTerrainChange)
    this.terrainProminence.addEventListener('input', this.handleTerrainChange)

    this.unsubscribers.push(
      bus.on('frame', this.handleFrame),
      bus.on('worldChanged', this.handleWorldChanged),
      bus.on('themeChanged', this.handleThemeChanged),
      bus.on('buildStateChanged', this.handleBuildState),
      bus.on('selectionChanged', this.handleSelection),
      bus.on('assetsLoaded', this.handleAssetsLoaded),
      bus.on('notice', this.handleNotice),
    )
  }

  dispose(): void {
    for (const unsubscribe of this.unsubscribers) unsubscribe()
    this.unsubscribers.length = 0

    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer)

    this.presetsRoot.removeEventListener('click', this.handlePresetClick)
    this.themeSelect.removeEventListener('change', this.handleThemeChange)
    this.toolsRoot.removeEventListener('click', this.handleToolClick)
    this.categoriesRoot.removeEventListener('click', this.handleCategoryClick)
    this.catalogRoot.removeEventListener('click', this.handleCatalogClick)
    this.root.removeEventListener('click', this.handleActionClick)
    this.objectColor.removeEventListener('input', this.handleObjectColor)
    this.terrainMode.removeEventListener('change', this.handleTerrainChange)
    this.terrainDensity.removeEventListener('input', this.handleTerrainChange)
    this.terrainProminence.removeEventListener('input', this.handleTerrainChange)
    this.root.remove()
  }

  setPlayMode(mode: 'build' | 'play'): void {
    const button = this.root.querySelector<HTMLButtonElement>('[data-mode]')
    if (!button) return
    button.dataset.mode = mode
    button.setAttribute('aria-pressed', String(mode === 'play'))
    button.textContent = mode === 'play' ? 'Modo: Jugar' : 'Modo: Construir'
  }

  private createRoot(container: HTMLElement): HTMLElement {
    container.insertAdjacentHTML('beforeend', HUD_TEMPLATE)
    const root = container.querySelector<HTMLElement>('.hud')

    if (!root) {
      throw new Error('No se pudo montar el HUD')
    }

    return root
  }

  private createThemeOptions(): void {
    for (const theme of this.options.themes) {
      const option = document.createElement('option')
      option.value = theme.id
      option.textContent = theme.name
      this.themeSelect.append(option)
    }

    this.themeSelect.value = this.selectedThemeId
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

  private createToolButtons(): void {
    for (const tool of BUILD_TOOLS) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'hud__tool'
      button.dataset.tool = tool
      button.setAttribute('aria-pressed', 'false')
      button.textContent = TOOL_LABELS[tool]
      button.title = TOOL_HINTS[tool]
      this.toolsRoot.append(button)
      this.toolButtons.set(tool, button)
    }
  }

  private availableItems(): readonly CatalogItem[] {
    return this.options.items.filter((item) => isItemAvailable(item, this.selectedThemeId))
  }

  private renderCategories(): void {
    const available = this.availableItems()
    const categories = CATALOG_CATEGORIES.filter((category) =>
      available.some((item) => item.category === category),
    )

    if (!this.activeCategory || !categories.includes(this.activeCategory)) {
      this.activeCategory = categories[0] ?? null
    }

    this.categoriesRoot.replaceChildren()

    for (const category of categories) {
      const count = available.filter((item) => item.category === category).length
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'hud__category'
      button.dataset.category = category
      button.setAttribute('role', 'tab')
      button.setAttribute('aria-selected', String(category === this.activeCategory))
      button.textContent = `${CATEGORY_LABELS[category]} ${count}`
      this.categoriesRoot.append(button)
    }
  }

  private renderCatalog(): void {
    this.catalogRoot.replaceChildren()

    if (!this.activeCategory) {
      const empty = document.createElement('p')
      empty.className = 'hud__catalog-empty'
      empty.textContent = 'Este tema no tiene items disponibles.'
      this.catalogRoot.append(empty)
      return
    }

    const items = this.availableItems().filter((item) => item.category === this.activeCategory)

    for (const item of items) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'hud__item'
      button.dataset.item = item.id
      button.setAttribute('role', 'option')
      button.setAttribute('aria-selected', String(item.id === this.activeItemId))
      button.title = item.description

      const name = document.createElement('span')
      name.className = 'hud__item-name'
      name.textContent = item.name

      const meta = document.createElement('span')
      meta.className = 'hud__item-meta'
      meta.textContent = `${item.footprint[0]} × ${item.footprint[1]} · ${item.physics}`

      button.append(name, meta)
      this.catalogRoot.append(button)
    }
  }

  private applyTheme(theme: ThemeDefinition): void {
    this.selectedThemeId = theme.id
    const root = document.documentElement
    const dark = theme.dark ?? luminance(theme.palette.atmosphere) < 0.32
    const panelIsLight = luminance(theme.palette.neutral) > 0.48
    const accentIsLight = luminance(theme.palette.accent) > 0.52

    root.dataset.theme = theme.id
    root.dataset.themeDark = String(dark)
    root.style.setProperty('--aero-accent', theme.palette.primary)
    root.style.setProperty(
      '--aero-accent-strong',
      dark ? theme.palette.accent : theme.palette.atmosphere,
    )
    root.style.setProperty('--aero-ink', panelIsLight ? '#092b43' : '#f5fbff')
    root.style.setProperty('--aero-ink-soft', panelIsLight ? '#185b82' : '#c8edff')
    root.style.setProperty('--aero-button-fg', accentIsLight ? '#092b1f' : '#ffffff')
    root.style.setProperty('--aero-highlight', theme.palette.accent)
    root.style.setProperty('--aero-panel', theme.palette.neutral)

    this.themeTagline.textContent = theme.tagline
    this.themeSelect.value = theme.id
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
    if (id) this.bus.emit('worldPresetSelected', { id })
  }

  private readonly handleThemeChange = (): void => {
    this.bus.emit('themeSelected', { id: this.themeSelect.value })
  }

  private readonly handleObjectColor = (): void => {
    this.bus.emit('objectColorSelected', { color: this.objectColor.value })
  }

  private readonly handleTerrainChange = (): void => {
    const density = Number(this.terrainDensity.value)
    const prominence = Number(this.terrainProminence.value) / 100
    query(this.root, '[data-terrain-count]').textContent = String(density)
    query(this.root, '[data-terrain-prominence-label]').textContent =
      prominence < 0.34 ? 'Baja' : prominence < 0.67 ? 'Media' : 'Alta'
    this.bus.emit('terrainSelected', {
      mode: this.terrainMode.value === 'hills' ? 'hills' : 'flat',
      density,
      prominence,
    })
  }

  private readonly handleToolClick = (event: MouseEvent): void => {
    const target = event.target
    if (!(target instanceof Element)) return

    const button = target.closest<HTMLButtonElement>('[data-tool]')
    if (!button) return

    const tool = button.dataset.tool as BuildTool | undefined
    if (tool) this.bus.emit('toolSelected', { tool })
  }

  private readonly handleCategoryClick = (event: MouseEvent): void => {
    const target = event.target
    if (!(target instanceof Element)) return

    const button = target.closest<HTMLButtonElement>('[data-category]')
    if (!button) return

    const category = button.dataset.category as CatalogCategory | undefined
    if (!category) return

    this.activeCategory = category
    this.renderCategories()
    this.renderCatalog()
  }

  private readonly handleCatalogClick = (event: MouseEvent): void => {
    const target = event.target
    if (!(target instanceof Element)) return

    const button = target.closest<HTMLButtonElement>('[data-item]')
    if (!button) return

    const id = button.dataset.item
    if (id) this.bus.emit('catalogItemSelected', { id })
  }

  private readonly handleActionClick = (event: MouseEvent): void => {
    const target = event.target
    if (!(target instanceof Element)) return

    const historyButton = target.closest<HTMLButtonElement>('[data-history]')
    if (historyButton) {
      const action = historyButton.dataset.history
      if (action === 'undo' || action === 'redo') {
        this.bus.emit('historyRequest', { action })
      }
      return
    }

    const actionButton = target.closest<HTMLButtonElement>('[data-action]')
    if (!actionButton) {
      const modeButton = target.closest<HTMLButtonElement>('[data-mode]')
      if (!modeButton) return
      const mode = modeButton.dataset.mode === 'play' ? 'play' : 'build'
      const next = mode === 'build' ? 'play' : 'build'
      this.setPlayMode(next)
      this.bus.emit('playModeSelected', { mode: next })
      return
    }

    const action = actionButton.dataset.action
    if (
      action === 'rotate' ||
      action === 'duplicate' ||
      action === 'delete' ||
      action === 'cancel'
    ) {
      this.bus.emit('buildAction', { action })
    }
  }

  private readonly handleWorldChanged = (event: WorldChangedEvent): void => {
    this.applyWorldState(event.preset, event.chunks)
  }

  private readonly handleThemeChanged = (event: ThemeChangedEvent): void => {
    this.applyTheme(event.theme)
    this.renderCategories()
    this.renderCatalog()
  }

  private readonly handleBuildState = (event: BuildStateChangedEvent): void => {
    for (const [tool, button] of this.toolButtons) {
      const active = tool === event.tool
      button.classList.toggle('is-active', active)
      button.setAttribute('aria-pressed', String(active))
    }

    const itemChanged = event.itemId !== this.activeItemId
    this.activeItemId = event.itemId

    if (itemChanged && event.itemId) {
      const item = resolveCatalogItem(event.itemId)
      if (item.category !== this.activeCategory) {
        this.activeCategory = item.category
        this.renderCategories()
      }
      this.renderCatalog()
    } else if (itemChanged) {
      this.renderCatalog()
    } else {
      this.updateItemSelection()
    }

    this.buildHint.textContent = event.hint
    this.undoButton.disabled = !event.canUndo
    this.redoButton.disabled = !event.canRedo
    this.undoButton.title = event.undoLabel ? `Deshacer: ${event.undoLabel}` : 'Sin acciones'
    this.redoButton.title = event.redoLabel ? `Rehacer: ${event.redoLabel}` : 'Sin acciones'

    this.buildMeta.textContent = `${event.placedCount} objeto${event.placedCount === 1 ? '' : 's'} · ${event.rotation * 90}°`
  }

  private updateItemSelection(): void {
    for (const button of this.catalogRoot.querySelectorAll<HTMLButtonElement>('[data-item]')) {
      button.setAttribute('aria-selected', String(button.dataset.item === this.activeItemId))
    }
  }

  private readonly handleSelection = (event: SelectionChangedEvent): void => {
    if (!event.name) {
      this.selectionLabel.textContent = 'Sin selección'
      this.selectionLabel.title = ''
      this.objectColor.disabled = true
      return
    }

    const size = event.footprint ? `${event.footprint[0]} × ${event.footprint[1]}` : ''
    this.selectionLabel.textContent = `${event.name} · ${size} · ${event.rotation * 90}°`
    this.selectionLabel.title = event.description ?? ''
    this.objectColor.disabled = false
    if (event.color) this.objectColor.value = event.color
  }

  private readonly handleAssetsLoaded = (event: AssetsLoadedEvent): void => {
    this.assetsLabel.textContent = `${event.loaded} modelos glTF`
  }

  private readonly handleNotice = (event: NoticeEvent): void => {
    this.toast.textContent = event.message
    this.toast.dataset.tone = event.tone
    this.toast.classList.add('is-visible')

    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => {
      this.toast.classList.remove('is-visible')
      this.toastTimer = null
    }, 3200)
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
