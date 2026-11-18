import { env } from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pagesPath = env.PAGES_BASE_PATH?.replace(/^\/+|\/+$/g, '')

export default defineConfig({
  base: pagesPath ? `/${pagesPath}/` : '/',
  plugins: [react()],
  build: { sourcemap: false },
})
