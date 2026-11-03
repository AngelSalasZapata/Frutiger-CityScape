import './ui/styles.css'

import { App } from './app/App'

const container = document.querySelector<HTMLDivElement>('#app')

if (!container) {
  throw new Error('No se encontró el contenedor #app en index.html')
}

const app = new App(container)
app.start()

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    app.dispose()
  })
}
