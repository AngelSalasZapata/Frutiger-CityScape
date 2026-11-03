export interface FrameEvent {
  frameDelta: number
  alpha: number
  drawCalls: number
  triangles: number
}

export interface AppEvents {
  frame: FrameEvent
}
