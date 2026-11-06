# Arquitectura del mundo, construcción, acabado, física y simulación (Fases 2–7)

Este documento describe cómo se representa el diorama después de la Fase 2 (selector de tamaño,
grilla lógica, chunks y agua procedural), cómo se construye sobre él en la Fase 3 (catálogo glTF,
snapping, fantasmas, auto-tile, comandos y temas), el acabado Aero de la Fase 4 y la física directa
de la Fase 5.

## Presets de tamaño

Los tamaños viven en `data/worlds/presets.json` y se leen desde `src/world/WorldConfig.ts`.
Agregar un preset nuevo no requiere tocar la UI ni el renderer, siempre que `size` sea divisible
por `chunkSize`.

| Preset   | `size` | `chunkSize` | Chunks por lado | Chunks |
| -------- | -----: | ----------: | --------------: | -----: |
| `small`  |     32 |          16 |               2 |      4 |
| `medium` |     64 |          16 |               4 |     16 |
| `large`  |    128 |          16 |               8 |     64 |

## Grilla lógica

`WorldGrid` es la única fuente de verdad para convertir entre mundo y celdas.

- El mundo está centrado en el origen.
- Cada celda mide una unidad y su índice va de `0` a `size - 1`.
- El centro de la celda `(x, z)` es `((x + 0.5) - size / 2, (z + 0.5) - size / 2)`.
- `worldToCell(x, z)` devuelve `null` si el punto cae fuera del diorama. El borde negativo
  pertenece a la primera celda; el borde positivo queda fuera.
- `cellKey(cell)` produce claves estables `"x:z"` para mapas de ocupación y guardado.

Esto evita que el renderer, la futura herramienta de construcción y los NPCs implementen cada uno
su propia conversión.

## Chunks

`ChunkGrid` divide la grilla en regiones cuadradas de `chunkSize` celdas.

- La clave de un chunk es `"cx:cz"`.
- `bounds` usa coordenadas de celda inclusivas (`minX..maxX`, `minZ..maxZ`).
- `chunkAt(cell)` devuelve el chunk que contiene una celda o `null` fuera del mundo.
- La partición se valida al construir: `size % chunkSize === 0`.

Todavía no hay streaming de malla. Los chunks son metadatos para que las próximas fases puedan
trabajar por región (render, colisiones, NPCs, guardado) sin cambiar el formato del mundo.

## Ciclo de vida al cambiar de tamaño

`App.selectWorldPreset` sigue una operación atómica:

1. Quita el objeto anterior de la escena y llama a `World.dispose()`.
2. Crea un `World` nuevo con su `WorldGrid`, `ChunkGrid`, `Terrain` y `Water`.
3. Reajusta la frustum de sombras (`Lighting.setWorldSize`).
4. Escala la niebla respecto al preset pequeño (`worldScale`).
5. Reencuadra la cámara conservando el ángulo orbital (`CameraRig.frameWorld`).
6. Transfiere la ciudad al mundo nuevo con `City.setWorld`: las anclas se desplazan la mitad de la
   diferencia de tamaño y los items que ya no entran se descartan.
7. Sincroniza el controlador (`BuildController.syncAfterWorldChange`) y publica `worldChanged`.

`CameraRig.ensureWorldFits` solo aleja la cámara cuando un cambio de relación de aspecto podría
recortar el diorama; nunca deshace un zoom manual.

## Diorama y agua

`Terrain` construye la isla con geometrías redondeadas: base tipo plástico, borde de arena,
superficie de césped y dos retículas (celdas y chunks) con grosores visuales distintos.

`Water` es un plano de 128 × 128 segmentos con un `ShaderMaterial`:

- oleaje procedural en el vertex shader;
- color que mezcla profundidad, Fresnel y brillo solar;
- espuma alrededor de la isla;
- desvanecimiento por distancia equivalente a la niebla del tema.

No usa texturas externas. Los materiales físicos reciben un entorno procedural PMREM para reflejos
suaves y el resultado se integra con el postproceso de la Fase 4.

## Catálogo y modelos

El catálogo vive en `data/catalog/{buildings,nature,props,vehicles,paths}.json`. `Catalog.ts` los
fusiona, valida ids únicos, categorías, huellas enteras, física, paleta, temas y la presencia de
`model` o `autoTile`. Cada item declara:

- `footprint: [width, depth]` en celdas;
- `height` para el contorno de selección;
- `themes` (`["*"]` o ids concretos de `data/themes`);
- `model` (`assets/models/...glb`) o `autoTile` (estilo de camino/cerca).

`AssetLibrary` carga los glTF con `GLTFLoader` y clona la escena para cada instancia. Los materiales
del GLB llevan nombres de ranura; `applyThemeMaterials` los sustituye por los materiales cacheados
del tema activo, de modo que cambiar de tema no requiere volver a cargar modelos.

Los 46 `.glb` son procedurales: `tools/model-kit.mjs` arma geometrías y materiales, y
`tools/generate-models.mjs` los exporta con `GLTFExporter` a `public/assets/models`. Para regenerarlos:

```bash
npm run models
```

## Huella, ocupación y snap

- `Footprint.ts` convierte un ancla y una rotación (0–3) en la lista de celdas ocupadas.
  Los pasos impares intercambian ancho y profundidad; los footprints impares centran el ancla.
- `OccupancyMap.ts` asigna cada celda a un único id y permite ignorar el id que se está moviendo.
- `BuildController` proyecta el puntero con `Raycaster` sobre el plano `y = 0`, obtiene la celda con
  `WorldGrid.worldToCell` y dibuja el fantasma solo si `City.canOccupyPlacement` devuelve `true`.

## Comandos e historial

`BuildHistory` implementa el patrón comando con transacciones:

- `PlaceCommand`, `RemoveCommand`, `MoveCommand` y `RotateCommand` son reversibles e idempotentes.
- Un arrastre abre una transacción; cada celda colocada agrega un comando.
- Al soltar el mouse la transacción se confirma como **una sola entrada**, así que un `Ctrl+Z`
  deshace la calle completa.
- `Esc` durante un arrastre cancela la transacción y deshace lo colocado.
- El historial conserva hasta 200 entradas y limpia la pila de redo al ejecutar algo nuevo.

## Auto-tile de caminos y cercas

Cada camino o cerca ocupa una celda y consulta a sus cuatro vecinos del mismo estilo. La máscara
resultante (`N=1`, `E=2`, `S=4`, `W=8`) se resuelve contra las variantes `dot`, `end`, `straight`,
`corner`, `tee` y `cross`, rotando la variante base hasta que coincida. Al colocar, mover o eliminar
un tramo se refrescan solo el tramo y sus vecinos (`City.refreshAutoTileAround`).

Los assets siguen la convención `assets/models/autotile/${style}_${variant}.glb`. Los estilos
actuales son `path_stone` y `fence_white`.

## Temas

`data/themes/*.json` describe ocho estilos: Aero Classic, Frutiger Eco, Frutiger Aurora,
Frutiger Metro, Helvetica Aqua Aero, Dark Aero, Fotonight Web y DORFic. `theme.ts` valida la forma y
los colores al cargar. `ThemeMaterialLibrary` crea una vez por tema los materiales de las once
ranuras (`glass`, `solid`, `accent`, `roof`, `wood`, `leaf`, `stone`, `metal`, `emissive`, `water`,
`fabric`) y `resolveThemeMaterial` completa las que el JSON no defina.

Al cambiar de tema, `App.selectTheme` actualiza cielo, luces, terreno, agua, niebla, fantasma y HUD;
no reconstruye el mundo ni pierde objetos. Los objetos conservan su paleta o color elegido, por lo que
el tema afecta solo al entorno. El HUD deduce el modo claro/oscuro
del campo opcional `dark` o de la luminancia de la atmósfera.

## Acabado Aero (Fase 4)

`PostProcessing` compone `RenderPass`, SMAA, SSAO de baja intensidad, bloom con blur mipmap y una
viñeta sutil. Los parámetros opcionales `postfx` del JSON permiten que cada tema ajuste bloom, SSAO y
viñeta; Aero Classic declara el acabado completo.

`AeroParticles` dibuja burbujas y destellos mediante `THREE.Points`, sin texturas ni modelos GLB.
`DayCycle` anima lentamente la dirección solar, la intensidad de luces, el cielo y la niebla entre día
y atardecer. Ambos sistemas se actualizan en el timestep fijo y se recrean al cambiar el tamaño del
mundo para mantener su distribución correcta.

## Física e interacción directa (Fase 5)

`PhysicsWorld` carga `@dimforge/rapier3d-compat` solo al activar **Modo: Jugar**, por lo que el WASM
no retrasa la entrada al constructor. Cada instancia recibe un collider de caja calculado desde su
huella y altura: `static` crea cuerpo fijo, `dynamic` cuerpo dinámico con amortiguación y `kinematic`
cuerpo cinemático preparado para futuras entidades controladas.

El modo Jugar desactiva `BuildController` y mantiene la grilla como estado de construcción. Un raycast
identifica cuerpos dinámicos; el puntero aplica un impulso-resorte hacia el punto de agarre y conserva
la inercia al soltar. Al regresar a Construir, los cuerpos se liberan y `City.resetPhysicalPoses()`
recompone las posiciones guardadas, evitando que la simulación corrompa ocupación, comandos o undo.

### Corrección de catálogo v0.4.1

La paleta presenta el catálogo completo sin filtrar por el tema ambiental activo. Las etiquetas
`themes` del asset se usan como paleta de origen: `City.createRecord()` guarda el color de su rol
(`primary`, `secondary`, `accent` o `neutral`) en ese tema, para mantener la identidad visual del
asset al cambiar cielo, agua o iluminación. La zona de construcción tiene scroll vertical y las
categorías scroll horizontal, evitando compresión al crecer el catálogo.

`PlacementRecord.physics` sobrescribe por instancia el perfil recomendado en catálogo entre `static`
y `dynamic`. `PhysicsCommand` hace este cambio reversible y `PhysicsWorld` consume el perfil guardado
al crear los cuerpos Rapier.

### Navegación y paleta v0.4.2

El HUD usa dos `select`: uno de categorías y otro de items disponibles. Así la lista nativa mantiene
todos los elementos legibles sin deformar la paleta. `CameraRig` mantiene el mouse con OrbitControls y
suma desplazamiento continuo con W/A/S/D: mueve posición y objetivo de cámara sobre el plano horizontal
con velocidad proporcional al zoom. El atajo de duplicar se reasignó de `D` a `V` para liberar WASD.

## NPCs deambulantes (Fase 6)

El catálogo suma la categoría `npc` y el GLB de referencia se carga mediante `AssetLibrary` con una
escala reducida por item. `NpcSystem` descubre estas instancias, dirige paseos cortos durante el modo
Jugar, aplica flotación y pequeños saltos visuales junto a estructuras, y dibuja una burbuja como
`THREE.Sprite` con pictogramas generados en canvas. Los símbolos reaccionan a cercanía de otros NPCs,
objetos y vehículos, al agarre y a velocidades altas después de un lanzamiento.

Los NPC usan cuerpos Rapier dinámicos sin gravedad: pueden ser tomados y lanzados, pero `PhysicsWorld`
suspende su paseo durante la inercia y después los reorienta verticalmente al continuar, evitando que
permanezcan tumbados. Su color es el color por instancia de `PlacementRecord`, igual que para el resto
del catálogo.

### Ajuste físico v0.5.1

El modelo NPC recibe `groundOffset` en catálogo para separarlo visualmente del suelo sin alterar su
collider. Sus cuerpos Rapier vuelven a usar gravedad, de modo que un lanzamiento ya no lo deja suspendido.
El impulso de agarre se multiplica por `RigidBody.mass()`, equilibrando la respuesta de objetos grandes y
pequeños con el mismo gesto de mouse.

## Vehículos y tráfico (Fase 7)

`VehicleSystem` se actualiza en el timestep fijo solo durante Modo Jugar. Los items de catálogo declaran
`vehicleBehavior` como `road`, `water` o `air`. Para los dos vehículos viales usa las anclas de `path`
como una red ortogonal. `RoadNetwork` concentra la lógica pura de vecinos y de elección del siguiente
tramo: evita una vuelta inmediata salvo en un final de calle, lo que permite circuitos, cruces y rutas de
ida y vuelta sin datos adicionales en el catálogo.

Los vehículos arrancan desde el camino más próximo, construyen rutas cortas y mantienen distancia con otros
vehículos. En una celda con tres o cuatro salidas, el orden estable del id decide una cesión básica para
evitar que todos entren simultáneamente al cruce. `PhysicsWorld.driveVehicle()` sincroniza la pose de Rapier
y Three.js; un vehículo tomado con el mouse pausa su tráfico. Auto y autobús animan sus nodos de ruedas por
nombre. La lancha recibe destinos aleatorios en el anillo de agua y un balanceo visual, mientras que el
globo alterna destinos aéreos de altura limitada con descensos periódicos a altura de abordaje. El vehículo
vial seleccionado se controla con flechas y vuelve al tráfico al soltarlas.

`NpcSystem` reserva plazas cuando un habitante se encuentra cerca de un vehículo disponible, sincroniza su
pose con el pasajero durante un paseo corto y lo libera después. La lancha y el globo solo son abordables
cuando alcanzan una altura cercana al suelo/agua. El catálogo v0.6.1 reemplaza todos los vehículos por
`car_aero`, `bus_aero`, `boat_aero` y `balloon_aero` en `public/assets/models/vehicles/`.

## Empaquetado de escritorio

En desarrollo el renderer se sirve desde Vite. En el build empaquetado, `file://` bloquea los
`fetch` que usa `GLTFLoader`, por lo que `electron/main/index.mts` registra el esquema privilegiado
`app://` y sirve `dist` con `protocol.handle`. La ventana carga `app://bundle/index.html`; el handler
normaliza la ruta y rechaza cualquier acceso fuera de `dist` con `403`. Esto permite que los 46 GLB
se carguen igual que en el navegador.

El workflow `.github/workflows/release.yml` se dispara con tags `v*`, verifica que el tag coincida
con `package.json`, ejecuta las comprobaciones, empaqueta el instalador NSIS con
`npm run dist:win` y publica el `.exe` más `SHA256SUMS.txt` en la release de GitHub.

## Pruebas

Las unitarias cubren `WorldGrid`, `ChunkGrid`, `Footprint`, `OccupancyMap`, `BuildHistory`, los
comandos, `resolveAutoTile` (las 16 máscaras), la validación del catálogo (incluida la existencia de
cada GLB y de las seis variantes de auto-tile) y la validación de los ocho temas.

La prueba manual de aceptación de la Fase 3 se ejecutó en navegador: colocar una calle de 10 edificios
arrastrando, deshacerla con un solo `Ctrl+Z`, rehacerla, dibujar 19 celdas de camino y 9 de cerca con
auto-conexión, rotar/duplicar/eliminar objetos, cambiar los ocho temas y redimensionar el diorama sin
perder las casas.
