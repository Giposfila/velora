import { readFile, writeFile } from 'node:fs/promises'
import { markup } from '../.prerender/prerender.js'

const path = new URL('../dist/index.html', import.meta.url)
let html = await readFile(path, 'utf8')
if (process.env.PAGES_ORIGIN) {
  html = html.replace(/(<meta property="og:image" content=")(\/[^"]+)/, (_, prefix, asset) =>
    prefix + new URL(asset, process.env.PAGES_ORIGIN).href,
  )
}
await writeFile(path, html.replace('<div id="root"></div>', () => `<div id="root">${markup}</div>`))
