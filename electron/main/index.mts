import { app, BrowserWindow, shell } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const APP_TITLE = 'Frutiger Cityscape: Frutiger Aero Sandbox'
const devServerUrl = process.env.VITE_DEV_SERVER_URL

let mainWindow: BrowserWindow | null = null

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    title: APP_TITLE,
    backgroundColor: '#0e3a5f',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(currentDirectory, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })

  window.setMenuBarVisibility(false)
  window.once('ready-to-show', () => window.show())

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) {
      event.preventDefault()
      void shell.openExternal(url)
    }
  })

  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl) => {
    console.error(`No se pudo cargar ${validatedUrl} (${errorCode}): ${errorDescription}`)
  })

  window.webContents.on('did-finish-load', () => {
    console.log('Renderer cargado correctamente')
  })

  window.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      window.webContents.toggleDevTools()
    }
  })

  if (devServerUrl) {
    void window.loadURL(devServerUrl)
  } else {
    void window.loadFile(join(currentDirectory, '../../dist/index.html'))
  }

  window.on('closed', () => {
    mainWindow = null
  })

  return window
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return

    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app
    .whenReady()
    .then(() => {
      mainWindow = createMainWindow()

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          mainWindow = createMainWindow()
        }
      })
    })
    .catch((error: unknown) => {
      console.error('No se pudo iniciar la ventana principal', error)
      app.quit()
    })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
