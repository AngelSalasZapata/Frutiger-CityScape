import * as THREE from 'three'
import {
  BlendFunction,
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  SMAAEffect,
  SSAOEffect,
  VignetteEffect,
} from 'postprocessing'

import type { ThemeDefinition } from './theme'

/** Cadena ligera de acabado: AA, oclusión ambiental, bloom y viñeta. */
export class PostProcessing {
  private readonly composer: EffectComposer
  private readonly bloom = new BloomEffect({
    luminanceThreshold: 0.82,
    luminanceSmoothing: 0.18,
    mipmapBlur: true,
    intensity: 0.42,
    radius: 0.72,
  })
  private readonly ssao: SSAOEffect
  private readonly vignette = new VignetteEffect({
    blendFunction: BlendFunction.NORMAL,
    offset: 0.32,
    darkness: 0.1,
  })
  private readonly effectPass: EffectPass

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer, {
      depthBuffer: true,
      multisampling: 2,
      frameBufferType: THREE.HalfFloatType,
    })
    this.ssao = new SSAOEffect(camera, undefined, {
      blendFunction: BlendFunction.MULTIPLY,
      samples: 9,
      rings: 7,
      radius: 0.16,
      intensity: 0.22,
      fade: 0.025,
    })

    this.effectPass = new EffectPass(camera, this.ssao, this.bloom, this.vignette, new SMAAEffect())
    this.composer.addPass(new RenderPass(scene, camera))
    this.composer.addPass(this.effectPass)
  }

  applyTheme(theme: ThemeDefinition): void {
    const settings = theme.postfx ?? { bloom: 0.2, ssao: 0.16, vignette: 0.06 }
    this.bloom.intensity = settings.bloom
    this.ssao.blendMode.opacity.value = settings.ssao
    this.vignette.blendMode.opacity.value = settings.vignette
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height)
  }

  render(delta: number): void {
    this.composer.render(delta)
  }

  dispose(): void {
    this.composer.dispose()
  }
}
