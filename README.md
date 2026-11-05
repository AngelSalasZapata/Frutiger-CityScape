# Frutiger Cityscape: Frutiger Aero Sandbox

Sandbox 3D de ciudades en miniatura con estética **Frutiger Aero**. El jugador elige el tamaño
del diorama, coloca edificios, props y vehículos con el mouse, interactúa con física real y observa
mini NPCs recorrer la ciudad.

> Estado actual: **Fase 4 — estética Frutiger Aero v1** completada: construcción con mouse,
> catálogo glTF, acabado Aero, postproceso y partículas. Todavía no hay física ni NPCs
> (ver [roadmap](#roadmap)).

## Stack

| Área         | Tecnología                                    |
| ------------ | --------------------------------------------- |
| Lenguaje     | TypeScript estricto                           |
| Build        | Vite                                          |
| Render 3D    | Three.js (WebGL2) + postprocessing            |
| Física       | Rapier (`@dimforge/rapier3d-compat`) — Fase 5 |
| UI           | HTML/CSS superpuesto                          |
| Escritorio   | Electron + electron-builder                   |
| Persistencia | IndexedDB (`idb`) + JSON exportable — Fase 8  |
| Calidad      | ESLint, Prettier, Vitest, GitHub Actions      |

El renderer es web puro, así que también puede correr en el navegador. Electron solo aporta la
ventana de escritorio y el empaquetado en instaladores. En builds empaquetados los modelos glTF se
sirven con el esquema propio `app://` para que `fetch` funcione sin las restricciones de `file://`.

## Descargar el ejecutable

Cada release de GitHub publica el instalador NSIS de Windows y un archivo `SHA256SUMS.txt`:

1. Abrí la pestaña **Releases** del repositorio.
2. Descargá `Frutiger.Cityscape.Setup.<versión>.exe`.
3. Verificá el checksum (opcional) y ejecutá el instalador; no requiere Node.js.

El workflow [`release.yml`](.github/workflows/release.yml) se dispara al empujar un tag `v*` (o
manualmente con `workflow_dispatch`) y falla si el tag no coincide con la versión de `package.json`.

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
| `npm run models`      | Regenera los 46 modelos glTF procedurales de `public/assets`.      |

## Publicar una release

```bash
# 1. Subí la versión en package.json (por ejemplo 0.2.0).
# 2. Creá y empujá el tag correspondiente.
git tag v0.2.0
git push origin main --tags
```

El workflow **Release** ejecuta formato, lint y pruebas, empaqueta el instalador NSIS y lo adjunta
a la release de GitHub junto con `SHA256SUMS.txt`. También puede lanzarse a mano desde la pestaña
**Actions** indicando el tag. Ver [`docs/arquitectura-mundo.md`](docs/arquitectura-mundo.md) para el
detalle del empaquetado con `app://`.

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
distancia, sin depender todavía de texturas ni postproceso. Los objetos ya colocados se conservan:
sus anclas se desplazan la mitad de la diferencia de tamaño y se eliminan solo si dejan de entrar
en el diorama. Detalles en [`docs/arquitectura-mundo.md`](docs/arquitectura-mundo.md).

## Construcción

El catálogo se reparte en `data/catalog/*.json` y se fusiona/valida en `src/building/Catalog.ts`.
Cada item declara categoría, temas compatibles, huella en celdas, altura y modelo glTF (o un estilo
de auto-tile). Al iniciar, `AssetLibrary` carga los 46 `.glb` y `City` aplica una paleta estable por
objeto a las ranuras del GLB (`glass`, `solid`, `accent`, `roof`, `wood`, `leaf`, `stone`,
`metal`, `emissive`, `water`, `fabric`).

- **Herramientas**: seleccionar, colocar, mover, rotar, duplicar y eliminar.
- **Snap**: el puntero se proyecta contra el plano del suelo y se ajusta a la celda de la grilla.
- **Fantasma**: muestra el modelo translúcido y la huella completa en verde (válida) o rojo (ocupada).
- **Colocación continua**: al arrastrar se interpolan celdas; un solo `Ctrl+Z` deshace la calle entera.
- **Caminos y cercas**: eligen automáticamente entre `dot`, `end`, `straight`, `corner`, `tee` y
  `cross` según la máscara de vecinos de 4 direcciones, y se reconectan al colocar o eliminar.
- **Historial**: comandos reversibles (`PlaceCommand`, `RemoveCommand`, `MoveCommand`,
  `RotateCommand` y color) agrupados por transacción, con `Ctrl+Z` / `Ctrl+Y`.
- **Selección y color**: cada objeto recién colocado queda seleccionado; el recuadro fino marca su
  huella y el selector del HUD recolorea todos sus elementos principales.

Los modelos son procedurales y se regeneran con `npm run models` (`tools/model-*.mjs`). El catálogo
actual tiene 36 items: 14 edificios, 6 elementos de naturaleza, 11 props, 3 vehículos, 1 camino y
1 cerca.

## Temas visuales

Hay ocho temas en `data/themes/*.json`, conmutables en caliente desde el HUD sin reconstruir la
ciudad: **Frutiger Aero** (`aero_classic`), **Frutiger Eco**, **Frutiger Aurora**,
**Frutiger Metro**, **Helvetica Aqua Aero**, **Dark Aero**, **Fotonight Web** y **DORFic**.
Cada archivo define paleta, cielo, niebla, terreno, agua, luces, colores de construcción y la
matriz de materiales de las once ranuras. El HUD adapta sus paneles de vidrio al tema claro u
oscuro, y el catálogo filtra los items exclusivos de cada estilo.

El cambio de tema solo afecta el entorno (cielo, agua, iluminación, terreno y HUD): los objetos ya
colocados conservan su apariencia y sus colores elegidos.

El panel **Diorama** permite elegir terreno plano o con colinas, su cantidad y una altura baja,
media o alta. El relieve es procedural y las construcciones se apoyan a la altura del terreno.

## Estética Aero v1

El renderer aplica antialiasing SMAA, SSAO ligero, bloom suave y viñeta ajustada por tema. Aero
Classic incluye burbujas y destellos procedurales, materiales físicos con reflejos de entorno y un
ciclo visual lento de día/atardecer. No necesita texturas ni modelos adicionales.

## Controles actuales

- **Clic izquierdo**: ejecutar la herramienta activa (seleccionar o construir).
- **Arrastrar con la herramienta Colocar**: dibujar una calle, camino o cerca en serie.
- **Clic derecho + arrastrar**: rotar la cámara.
- **Rueda**: zoom.
- **Clic central + arrastrar**: desplazar.
- **R**: rotar el objeto seleccionado o la orientación de colocación.
- **Selector de color**: con un objeto seleccionado, cambiar el color de su composición principal.
- **D**: duplicar el objeto seleccionado en la celda libre más cercana.
- **Supr / Backspace**: eliminar el objeto seleccionado.
- **Esc**: cancelar el arrastre o la selección.
- **Ctrl+Z**: deshacer. **Ctrl+Y** o **Ctrl+Shift+Z**: rehacer.
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
- [x] **Fase 3** — Construcción con mouse, catálogo glTF, snap, fantasmas, auto-tile y undo/redo.
- [x] **Fase 4** — Estética Aero v1: postproceso, partículas y acabado del tema Aero Classic.
- [ ] **Fase 5** — Física Rapier, agarre y lanzamiento.
- [ ] **Fase 6** — NPCs deambulantes con smart objects.
- [ ] **Fase 7** — Vehículos y tráfico.
- [ ] **Fase 8** — Persistencia, temas y catálogo ampliado.
- [ ] **Fase 9** — Optimización, audio, tutorial y release `v0.1.0`.

## Licencia

Pendiente de definir antes del lanzamiento público. Hasta entonces el código se distribuye como
`UNLICENSED`.
