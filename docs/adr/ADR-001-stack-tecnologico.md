# ADR-001 — Stack tecnológico y empaquetado de escritorio

- **Estado:** aceptado
- **Fecha:** 2026-11-03
- **Fase:** 0 / 1

## Contexto

El proyecto nace como un sandbox 3D de dioramas con estética Frutiger Aero. Debe:

1. Iterar rápido con una sola persona o equipo pequeño.
2. Usar el mouse como input principal (colocar, rotar, arrastrar, lanzar).
3. Lograr materiales de vidrio, plástico glossy, transparencias y agua.
4. Distribuirse como **ejecutable de escritorio** descargable desde GitHub.

El documento base recomendaba web con TypeScript + Three.js y dejaba abierta la capa de escritorio.

## Decisión

- **Renderer:** TypeScript estricto + Vite + Three.js (WebGL2).
- **Física:** Rapier WASM (`@dimforge/rapier3d-compat`) a partir de la Fase 5.
- **Postproceso:** `postprocessing` (pmndrs) a partir de la Fase 4.
- **Persistencia:** IndexedDB (`idb`) + exportación JSON.
- **Escritorio:** **Electron** con `electron-builder` para generar instaladores NSIS (Windows),
  DMG (macOS) y AppImage (Linux).
- **Proceso principal:** TypeScript compilado a ESM (`.mts` → `.mjs`); preload en CommonJS
  (`.cts` → `.cjs`) para mantener `sandbox: true` y `contextIsolation: true`.

## Alternativas consideradas

| Alternativa    | Motivo para no elegirla en esta etapa                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| Tauri          | Binarios más livianos, pero exige toolchain de Rust y complica la contribución y el CI inicial.        |
| Godot 4        | Excelente editor, pero menos control fino sobre materiales de vidrio avanzados en el renderer.         |
| Unity          | Builds web/escritorio más pesados y licencias a considerar.                                            |
| Solo navegador | No cumple el requisito de ejecutable de escritorio descargable.                                        |
| Babylon.js     | Válido, pero el ecosistema y los ejemplos de materiales físicos de Three.js encajan mejor con la idea. |

Electron se puede reemplazar por Tauri más adelante sin reescribir el juego: el renderer seguiría
siendo el mismo bundle web.

## Consecuencias

- **Positivas:** un solo stack (TypeScript) para juego, UI y escritorio; HMR rápido; empaquetado
  multiplataforma con `electron-builder`; CI puede construir el renderer sin GPU.
- **Negativas:** el instalador pesa más (~80–120 MB) y Electron consume más RAM que un contenedor
  nativo. Se acepta a cambio de velocidad de desarrollo.
- **Seguridad:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` y una API de
  preload mínima. El renderer nunca accede a Node directamente.
- **Nombres:** el producto visible es **Frutiger Cityscape: Frutiger Aero Sandbox**. El paquete npm
  usa `frutiger-cityscape` y el instalador `Frutiger Cityscape` porque `:` no es válido en nombres
  de archivo de Windows.
