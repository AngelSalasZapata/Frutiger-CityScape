import type { CatalogCategory } from '@/building/Catalog'
import type { BuildTool } from '@/building/tools'
import type { ThemeDefinition } from '@/render/theme'
import type { WorldPreset } from '@/world/WorldConfig'

export interface FrameEvent {
  frameDelta: number
  alpha: number
  drawCalls: number
  triangles: number
}

export interface WorldPresetSelectedEvent {
  id: string
}

export interface WorldChangedEvent {
  preset: WorldPreset
  cells: number
  chunks: number
}

export interface ThemeSelectedEvent {
  id: string
}

export interface ThemeChangedEvent {
  theme: ThemeDefinition
}

export interface CatalogItemSelectedEvent {
  id: string | null
}

export interface ObjectColorSelectedEvent {
  color: string
}

export interface TerrainSelectedEvent {
  mode: 'flat' | 'hills'
  density: number
  prominence: number
}

export interface ToolSelectedEvent {
  tool: BuildTool
}

export interface BuildActionEvent {
  action: 'rotate' | 'duplicate' | 'delete' | 'cancel'
}

export interface HistoryRequestEvent {
  action: 'undo' | 'redo'
}

export interface SelectionChangedEvent {
  id: string | null
  name: string | null
  description: string | null
  category: CatalogCategory | null
  footprint: [number, number] | null
  rotation: number
  color: string | null
}

export interface BuildStateChangedEvent {
  placedCount: number
  tool: BuildTool
  itemId: string | null
  rotation: number
  canUndo: boolean
  canRedo: boolean
  undoLabel: string | null
  redoLabel: string | null
  hint: string
}

export interface AssetsLoadedEvent {
  loaded: number
  failed: readonly string[]
}

export interface NoticeEvent {
  message: string
  tone: 'info' | 'success' | 'error'
}

export interface AppEvents {
  frame: FrameEvent
  worldPresetSelected: WorldPresetSelectedEvent
  worldChanged: WorldChangedEvent
  themeSelected: ThemeSelectedEvent
  themeChanged: ThemeChangedEvent
  catalogItemSelected: CatalogItemSelectedEvent
  objectColorSelected: ObjectColorSelectedEvent
  terrainSelected: TerrainSelectedEvent
  toolSelected: ToolSelectedEvent
  buildAction: BuildActionEvent
  historyRequest: HistoryRequestEvent
  selectionChanged: SelectionChangedEvent
  buildStateChanged: BuildStateChangedEvent
  assetsLoaded: AssetsLoadedEvent
  notice: NoticeEvent
}
