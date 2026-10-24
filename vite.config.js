import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const playersDir = join(process.cwd(), 'public', 'players')

// Exposes the portrait files in public/players as `virtual:portraits`, so the app only
// requests images that exist instead of guessing .webp, .png and .jpg in turn.
const portraitList = () => ({
  name: 'portrait-list',
  resolveId: (id) => (id === 'virtual:portraits' ? '\0virtual:portraits' : null),
  load(id) {
    if (id !== '\0virtual:portraits') return null
    const files = readdirSync(playersDir).flatMap((team) => {
      const teamDir = join(playersDir, team)
      if (!statSync(teamDir).isDirectory()) return []
      return readdirSync(teamDir).filter((file) => /\.(webp|png|jpe?g)$/i.test(file)).map((file) => `${team}/${file}`)
    })
    return `export default ${JSON.stringify(files)}`
  },
  // While `npm run dev` runs, adding or removing a portrait refreshes the list.
  configureServer(server) {
    const refresh = (file) => {
      if (!file.startsWith(playersDir)) return
      const module = server.moduleGraph.getModuleById('\0virtual:portraits')
      if (module) server.moduleGraph.invalidateModule(module)
      server.ws.send({ type: 'full-reload' })
    }
    server.watcher.add(playersDir)
    server.watcher.on('add', refresh)
    server.watcher.on('unlink', refresh)
  },
})

export default defineConfig({
  plugins: [react(), portraitList()],
  base: repositoryName ? `/${repositoryName}/` : '/',
  // Compile down for older phones (roughly iOS 13+ and Android Chrome 80+);
  // Vite's default only targets browsers from 2023 onward.
  build: {
    target: ['es2019', 'chrome80', 'safari13', 'firefox78'],
    cssTarget: ['chrome80', 'safari13', 'firefox78'],
  },
})
