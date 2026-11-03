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

export interface AppEvents {
  frame: FrameEvent
  worldPresetSelected: WorldPresetSelectedEvent
  worldChanged: WorldChangedEvent
}
