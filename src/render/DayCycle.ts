import * as THREE from 'three'

import type { Lighting } from './Lighting'
import type { SkyDome } from './SkyDome'
import type { ThemeDefinition } from './theme'

/** Ciclo visual lento: no altera la simulación ni cambia el reloj del juego. */
export class DayCycle {
  private elapsed = 0
  private readonly sunDirection = new THREE.Vector3()

  constructor(
    private theme: ThemeDefinition,
    private readonly duration = 180,
  ) {}

  applyTheme(theme: ThemeDefinition): void {
    this.theme = theme
  }

  update(dt: number, sky: SkyDome, lighting: Lighting, fog: THREE.Fog): void {
    this.elapsed = (this.elapsed + dt) % this.duration
    const phase = (this.elapsed / this.duration) * Math.PI * 2 - Math.PI * 0.35
    const altitude = Math.max(-0.18, Math.sin(phase))
    const daylight = THREE.MathUtils.smoothstep(altitude, -0.08, 0.48)
    const [baseX, , baseZ] = this.theme.sky.sunDirection

    this.sunDirection
      .set(baseX + Math.cos(phase) * 0.35, Math.max(altitude, 0.06), baseZ)
      .normalize()
    sky.applyDayCycle(daylight, this.sunDirection)
    lighting.applyDayCycle(daylight, this.sunDirection)
    fog.color.copy(new THREE.Color('#62759d')).lerp(new THREE.Color(this.theme.fog.color), daylight)
  }
}
