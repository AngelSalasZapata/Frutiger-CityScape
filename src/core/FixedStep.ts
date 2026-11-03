/**
 * Convierte tiempo real (variable) en pasos de simulación de duración fija.
 * Mantiene el resto sobrante para el siguiente frame y limita el delta máximo
 * para evitar el clásico "spiral of death" al recuperar el foco de la ventana.
 */
const DEFAULT_MAX_FRAME_DELTA = 0.25

export class FixedStepAccumulator {
  readonly step: number
  readonly maxFrameDelta: number

  private accumulator = 0

  constructor(stepSeconds: number, maxFrameDelta = DEFAULT_MAX_FRAME_DELTA) {
    if (!(stepSeconds > 0)) {
      throw new RangeError('stepSeconds debe ser mayor que 0')
    }
    if (!(maxFrameDelta > 0)) {
      throw new RangeError('maxFrameDelta debe ser mayor que 0')
    }

    this.step = stepSeconds
    this.maxFrameDelta = maxFrameDelta
  }

  /**
   * Añade un frame y devuelve cuántos pasos fijos hay que ejecutar.
   */
  push(frameDelta: number): number {
    const clampedDelta = Math.min(Math.max(frameDelta, 0), this.maxFrameDelta)
    this.accumulator += clampedDelta

    let steps = 0
    while (this.accumulator + Number.EPSILON >= this.step) {
      this.accumulator = Math.max(0, this.accumulator - this.step)
      steps += 1
    }

    return steps
  }

  /**
   * Fracción de paso pendiente, útil para interpolar el render.
   */
  get alpha(): number {
    return Math.min(this.accumulator / this.step, 1)
  }

  reset(): void {
    this.accumulator = 0
  }
}
