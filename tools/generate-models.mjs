import { mkdir, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'

import { AUTO_TILE_VARIANTS, buildAutoTile } from './model-autotile.mjs'
import * as buildings from './model-buildings.mjs'
import * as scenery from './model-scenery.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputRoot = join(root, 'public', 'assets', 'models')

// GLTFExporter usa FileReader para ensamblar el GLB. Node no lo trae, pero
// Blob sí: este polyfill mínimo basta para exportar geometría sin texturas.
if (!globalThis.FileReader) {
  globalThis.FileReader = class FileReader {
    constructor() {
      this.result = null
      this.onloadend = null
    }

    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buffer) => {
        this.result = buffer
        this.onloadend?.()
      })
    }
  }
}

const MODELS = [
  ['buildings/aero_tower.glb', buildings.aeroTower],
  ['buildings/aero_dome.glb', buildings.aeroDome],
  ['buildings/townhouse.glb', buildings.townhouse],
  ['buildings/kiosk.glb', buildings.kiosk],
  ['buildings/greenhouse.glb', buildings.greenhouse],
  ['buildings/lighthouse.glb', buildings.lighthouse],
  ['buildings/eco_tower.glb', buildings.ecoTower],
  ['buildings/aurora_observatory.glb', buildings.auroraObservatory],
  ['buildings/metro_block.glb', buildings.metroBlock],
  ['buildings/aqua_dome.glb', buildings.aquaDome],
  ['buildings/aqua_tunnel.glb', buildings.aquaTunnel],
  ['buildings/dark_spire.glb', buildings.darkSpire],
  ['buildings/fotonight_tower.glb', buildings.fotonightTower],
  ['buildings/dorf_pavilion.glb', buildings.dorfPavilion],
  ['nature/tree_round.glb', scenery.treeRound],
  ['nature/palm_tree.glb', scenery.palmTree],
  ['nature/flower_bed.glb', scenery.flowerBed],
  ['nature/hedge.glb', scenery.hedge],
  ['nature/aurora_pine.glb', scenery.auroraPine],
  ['nature/coral_cluster.glb', scenery.coralCluster],
  ['props/bench.glb', scenery.bench],
  ['props/street_lamp.glb', scenery.streetLamp],
  ['props/bubble_garden.glb', scenery.bubbleGarden],
  ['props/plaza_fountain.glb', scenery.plazaFountain],
  ['props/billboard.glb', scenery.billboard],
  ['props/solar_panel.glb', scenery.solarPanel],
  ['props/wind_turbine.glb', scenery.windTurbine],
  ['props/bridge.glb', scenery.bridge],
  ['props/neon_sign.glb', scenery.neonSign],
  ['props/dorf_orb.glb', scenery.dorfOrb],
  ['props/metro_arch.glb', scenery.metroArch],
  ['vehicles/car_aero.glb', scenery.carAero],
  ['vehicles/bus_aero.glb', scenery.busAero],
  ['vehicles/boat_aero.glb', scenery.boatAero],
]

const AUTO_TILES = ['path_stone', 'fence_white'].flatMap((style) =>
  AUTO_TILE_VARIANTS.map((variant) => [
    `autotile/${style}_${variant}.glb`,
    () => buildAutoTile(style, variant),
  ]),
)

async function exportModel(relativePath, build) {
  const scene = new THREE.Scene()
  scene.name = basename(relativePath, '.glb')
  scene.add(build())
  scene.updateMatrixWorld(true)

  const exporter = new GLTFExporter()
  const result = await exporter.parseAsync(scene, { binary: true, onlyVisible: true })

  if (!(result instanceof ArrayBuffer)) {
    throw new Error(`La exportación de ${relativePath} no devolvió un binario`)
  }

  const target = join(outputRoot, relativePath)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, Buffer.from(result))

  return result.byteLength
}

async function main() {
  const entries = [...MODELS, ...AUTO_TILES]
  let totalBytes = 0

  for (const [relativePath, build] of entries) {
    const bytes = await exportModel(relativePath, build)
    totalBytes += bytes
    console.log(`  ${relativePath.padEnd(44)} ${(bytes / 1024).toFixed(1)} KB`)
  }

  console.log(
    `\n${entries.length} modelos exportados (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`,
  )
  console.log(`Salida: ${outputRoot}`)
}

main().catch((error) => {
  console.error('No se pudieron generar los modelos:', error)
  process.exitCode = 1
})
