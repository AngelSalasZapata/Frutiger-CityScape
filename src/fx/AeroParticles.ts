import * as THREE from 'three'

import type { ThemeDefinition } from '@/render/theme'

interface ParticleField {
  points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  speed: Float32Array
  minimumY: number
  maximumY: number
}

function seeded(index: number, salt: number): number {
  return (Math.sin(index * 127.1 + salt * 311.7) * 43_758.5453) % 1
}

function range(index: number, salt: number, min: number, max: number): number {
  return min + Math.abs(seeded(index, salt)) * (max - min)
}

function makeField(
  count: number,
  size: number,
  color: string,
  pointSize: number,
  opacity: number,
  yMin: number,
  yMax: number,
): ParticleField {
  const positions = new Float32Array(count * 3)
  const speed = new Float32Array(count)

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3
    positions[offset] = range(index, 1, -size / 2, size / 2)
    positions[offset + 1] = range(index, 2, yMin, yMax)
    positions[offset + 2] = range(index, 3, -size / 2, size / 2)
    speed[index] = range(index, 4, 0.12, 0.38)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color,
    size: pointSize,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  })
  return { points: new THREE.Points(geometry, material), speed, minimumY: yMin, maximumY: yMax }
}

/** Burbujas y destellos livianos, sin texturas ni assets externos. */
export class AeroParticles {
  readonly object = new THREE.Group()

  private bubbles: ParticleField
  private sparkles: ParticleField
  private elapsed = 0

  constructor(worldSize: number, theme: ThemeDefinition) {
    this.object.name = 'aero-particles'
    this.bubbles = makeField(54, worldSize * 1.12, '#e6fbff', 0.14, 0.48, 0.4, 7)
    this.sparkles = makeField(72, worldSize * 1.28, '#ffffff', 0.07, 0.72, 0.8, 10)
    this.bubbles.points.name = 'aero-bubbles'
    this.sparkles.points.name = 'aero-sparkles'
    this.object.add(this.bubbles.points, this.sparkles.points)
    this.applyTheme(theme)
  }

  update(dt: number): void {
    this.elapsed += dt
    this.animateField(this.bubbles, dt, 0.4)
    this.animateField(this.sparkles, dt, 0.15)
    this.sparkles.points.material.opacity = 0.42 + (Math.sin(this.elapsed * 2.4) + 1) * 0.16
  }

  applyTheme(theme: ThemeDefinition): void {
    const particles = theme.particles ?? []
    this.bubbles.points.visible = particles.includes('bubbles')
    this.sparkles.points.visible = particles.includes('sparkles')
    this.bubbles.points.material.color.set(theme.water.foam)
    this.sparkles.points.material.color.set(theme.sky.sun)
  }

  dispose(): void {
    for (const field of [this.bubbles, this.sparkles]) {
      field.points.geometry.dispose()
      field.points.material.dispose()
    }
    this.object.clear()
  }

  private animateField(field: ParticleField, dt: number, sway: number): void {
    const position = field.points.geometry.getAttribute('position')
    for (let index = 0; index < position.count; index += 1) {
      const nextY = position.getY(index) + field.speed[index]! * dt
      position.setY(index, nextY > field.maximumY ? field.minimumY : nextY)
      position.setX(index, position.getX(index) + Math.sin(this.elapsed + index) * sway * dt)
    }
    position.needsUpdate = true
  }
}
