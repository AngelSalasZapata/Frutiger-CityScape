# Frutiger Cityscape: Frutiger Aero Sandbox

Sandbox 3D de ciudades en miniatura con estética **Frutiger Aero**. El jugador elige el tamaño
del diorama, coloca edificios, props y vehículos con el mouse, interactúa con física real y observa
mini NPCs recorrer la ciudad.

> Estado actual: **Fase 2 — selector de tamaño, grilla, chunks y diorama con agua** completada.
> Todavía no hay herramientas de construcción, física ni NPCs (ver [roadmap](#roadmap)).

## Stack

| Área         | Tecnología                                    |
| ------------ | --------------------------------------------- |
| Lenguaje     | TypeScript estricto                           |
| Build        | Vite                                          |
| Render 3D    | Three.js (WebGL2)                             |
| Física       | Rapier (`@dimforge/rapier3d-compat`) — Fase 5 |
| UI           | HTML/CSS superpuesto                          |
| Escritorio   | Electron + electron-builder                   |
| Persistencia | IndexedDB (`idb`) + JSON exportable — Fase 8  |
| Calidad      | ESLint, Prettier, Vitest, GitHub Actions      |

El renderer es web puro, así que también puede correr en el navegador. Electron solo aporta la
ventana de escritorio y, más adelante, el empaquetado en instaladores.

## Requisitos

- Node.js **22.12 o superior**
- npm 10 o superior

## Scripts

| Comando               | Descripción                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `npm run dev`         | Servidor de desarrollo web con HMR en `http://localhost:5173`.     |
| `npm run dev:desktop` | Vite + Electron en modo desarrollo.                                |
| `npm run build`       | Typecheck, build del renderer y compilación del proceso principal. |
| `npm run dist`        | Build + instalador de escritorio para el sistema actual.           |
| `npm run dist:win`    | Instalador NSIS para Windows.                                      |
| `npm run typecheck`   | TypeScript estricto en renderer y Electron.                        |
| `npm run lint`        | ESLint sobre todo el repo.                                         |
| `npm run format`      | Prettier sobre todo el repo.                                       |
| `npm run test`        | Pruebas unitarias con Vitest.                                      |

## Mundo y tamaños

El diorama se genera a partir de los presets de `data/worlds/presets.json`. La grilla lógica está
centrada en el origen y cada celda mide una unidad. Los chunks son regiones de 16 × 16 celdas que
en fases posteriores permitirán renderizado y guardado por región.

| Preset   | Tamaño    | Celdas | Chunks |
| -------- | --------- | ------ | ------ |
| `small`  | 32 × 32   | 1 024  | 4      |
| `medium` | 64 × 64   | 4 096  | 16     |
| `large`  | 128 × 128 | 16 384 | 64     |

Al cambiar de tamaño se reconstruye el mundo completo y se reajustan cámara, niebla y la frustum
de sombras. El agua usa un shader procedural con oleaje, espuma en la costa y desvanecimiento por
distancia, sin depender todavía de texturas ni postproceso. Detalles en
[`docs/arquitectura-mundo.md`](docs/arquitectura-mundo.md).

## Controles actuales

- **Clic derecho + arrastrar**: rotar la cámara.
- **Rueda**: zoom.
- **Clic central + arrastrar**: desplazar.
- **1 / 2 / 3**: cambiar el diorama a pequeño, mediano o grande.
- **G**: mostrar u ocultar la grilla de celdas.
- **C**: mostrar u ocultar los límites de chunks.
- **F12**: DevTools (solo en la app de escritorio).

## Estructura

```text
docs/                 Documentación viva y ADRs
assets-src/           Fuentes .blend, texturas y audio sin optimizar
public/assets/        Assets optimizados que consume el juego
data/                 Catálogo, temas, presets de mundo y NPCs (JSON)
src/
  app/                Composición de la aplicación y estados
  core/               Loop de timestep fijo, bus de eventos, ECS, input
  render/             Renderer, cámara, luces, cielo, temas, postproceso
  world/              Grilla, chunks, terreno, agua
  building/           Colocación, fantasma, herramientas, undo/redo
  physics/            Rapier, agarre, perfiles físicos
  npc/                Agentes, FSM, navegación, smart objects
  vehicles/           Vehículos, rutas y tráfico
  ui/                 HUD y paneles de vidrio estilo Aero
  audio/              Música, SFX y ambiente
  persistence/        Serialización versionada y guardado
  fx/                 Partículas: burbujas, destellos, agua
  utils/              Matemáticas y helpers
electron/             Proceso principal y preload
tools/                Scripts de assets y validación de datos
tests/                Unitarias y e2e
.github/workflows/    CI/CD
```

## Roadmap

- [x] **Fase 0** — Documentación y decisiones base.
- [x] **Fase 1** — Vite + TypeScript estricto + Electron, escena Three.js, cámara orbital, loop
      con timestep fijo, HUD y CI.
- [x] **Fase 2** — Selector de tamaño de ciudad, grilla lógica, chunks y diorama con agua.
- [ ] **Fase 3** — Construcción con mouse, catálogo glTF, snap, fantasmas y undo/redo.
- [ ] **Fase 4** — Estética Aero v1, postproceso, partículas y tema Aero Classic completo.
- [ ] **Fase 5** — Física Rapier, agarre y lanzamiento.
- [ ] **Fase 6** — NPCs deambulantes con smart objects.
- [ ] **Fase 7** — Vehículos y tráfico.
- [ ] **Fase 8** — Persistencia, temas y catálogo ampliado.
- [ ] **Fase 9** — Optimización, audio, tutorial y release `v0.1.0`.

## Licencia

Pendiente de definir antes del lanzamiento público. Hasta entonces el código se distribuye como
`UNLICENSED`.
