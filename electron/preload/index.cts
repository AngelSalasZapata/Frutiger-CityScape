import { contextBridge } from 'electron'

/**
 * API mínima y explícita para el renderer. El juego no necesita Node en la UI;
 * aquí se expondrán únicamente capacidades de escritorio (guardado nativo, etc.).
 */
const desktopApi = {
  platform: process.platform,
  versions: {
    electron: process.versions.electron ?? '0.0.0',
    chrome: process.versions.chrome ?? '0.0.0',
    node: process.versions.node,
  },
} as const

contextBridge.exposeInMainWorld('desktop', desktopApi)
