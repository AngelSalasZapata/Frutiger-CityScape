import { FixedStepAccumulator } from './FixedStep'

export interface GameLoopOptions {
  /** Frecuencia de simulación en Hz. Por defecto 60. */
  fixedHz?: number
  /** Delta máximo aceptado en segundos (protege tras pestañas en segundo plano). */
  maxFrameDelta?: number
  onFixedUpdate: (dt: number) => void
  onRender: (alpha: number, frameDelta: number) => void
}

/**
 * Bucle de juego con simulación a timestep fijo y render a la frecuencia del monitor.
 * `alpha` queda disponible para interpolar transforms entre dos pasos de física.
 */
export class GameLoop {
  private readonly fixedDelta: number
  private readonly accumulator: FixedStepAccumulator
  private readonly options: GameLoopOptions
  private running = false
  private rafId: number | null = null
  private lastTime = 0

  constructor(options: GameLoopOptions) {
    const fixedHz = options.fixedHz ?? 60
    if (!(fixedHz > 0)) {
      throw new RangeError('fixedHz debe ser mayor que 0')
    }

    this.fixedDelta = 1 / fixedHz
    this.accumulator = new FixedStepAccumulator(this.fixedDelta, options.maxFrameDelta)
    this.options = options
  }

  get isRunning(): boolean {
    return this.running
  }

  start(): void {
    if (this.running) return

    this.running = true
    this.lastTime = performance.now()
    this.accumulator.reset()
    this.rafId = requestAnimationFrame(this.tick)
  }

  stop(): void {
    this.running = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private readonly tick = (now: number): void => {
    if (!this.running) return

    const frameDelta = Math.max(0, (now - this.lastTime) / 1000)
    this.lastTime = now

    const steps = this.accumulator.push(frameDelta)
    for (let step = 0; step < steps; step += 1) {
      this.options.onFixedUpdate(this.fixedDelta)
    }

    this.options.onRender(
      this.accumulator.alpha,
      Math.min(frameDelta, this.accumulator.maxFrameDelta),
    )

    this.rafId = requestAnimationFrame(this.tick)
  }
}
