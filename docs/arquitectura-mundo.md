# Arquitectura del mundo (Fase 2)

Este documento describe cómo se representa el diorama después de la Fase 2: selector de tamaño,
grilla lógica, chunks y agua procedural.

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
6. Publica `worldChanged` para que el HUD actualice el preset activo y sus métricas.

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

No usa texturas ni reflejos reales todavía. La Fase 4 lo integrará con el postproceso y el HDRI
del tema.

## Pruebas

`tests/unit/WorldGrid.test.ts` y `tests/unit/ChunkGrid.test.ts` cubren límites, centros de celda,
claves, cobertura completa del área y validación de configuraciones inválidas.
