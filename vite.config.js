import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
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

const focusFile = join(process.cwd(), 'src', 'faceFocus.json')
const oldDir = join(process.cwd(), 'old')
const portraitPath = /^([a-z0-9-]+)\/([a-z0-9-]+)\.(webp|png|jpe?g)$/

const readBody = (request) => new Promise((resolve, reject) => {
  let body = ''
  request.on('data', (chunk) => { body += chunk })
  request.on('end', () => resolve(body))
  request.on('error', reject)
})

const saveFocus = (key, focus) => {
  const all = JSON.parse(readFileSync(focusFile, 'utf8'))
  all[key] = focus.map((value) => Math.round(Math.min(100, Math.max(0, value))))
  const lines = Object.keys(all).map((name) => `  ${JSON.stringify(name)}: [${all[name][0]}, ${all[name][1]}]`)
  writeFileSync(focusFile, `{\n${lines.join(',\n')}\n}\n`)
}

// Moves a portrait into old/<team>/, adding -2, -3… if an older copy is already there.
const archive = (team, file) => {
  const dir = join(oldDir, team)
  mkdirSync(dir, { recursive: true })
  const extension = extname(file)
  const base = file.slice(0, -extension.length)
  let target = join(dir, file)
  for (let n = 2; existsSync(target); n += 1) target = join(dir, `${base}-${n}${extension}`)
  renameSync(join(playersDir, team, file), target)
  return target.slice(process.cwd().length + 1).replace(/\\/g, '/')
}

// Local-only endpoints for the crop tool (src/CropTool.jsx). They exist only while `npm run dev`
// runs, so the published site can never change files.
const cropTool = () => ({
  name: 'crop-tool',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__crop-tool', async (request, response) => {
      const reply = (status, body) => {
        response.statusCode = status
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify(body))
      }
      try {
        if (request.method !== 'POST') return reply(405, { error: 'POST only' })
        const { action, file, focus, image } = JSON.parse(await readBody(request))
        const match = portraitPath.exec(file || '')
        if (!match || !existsSync(join(playersDir, file))) return reply(400, { error: 'Unknown portrait' })
        const [, team, slug] = match
        const validFocus = Array.isArray(focus) && focus.length === 2 && focus.every(Number.isFinite)
        if (action === 'focus') {
          if (!validFocus) return reply(400, { error: 'Bad face position' })
          saveFocus(`${team}/${slug}`, focus)
          return reply(200, { ok: true })
        }
        if (action === 'crop') {
          const data = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(image || '')
          if (!data || !validFocus) return reply(400, { error: 'Bad crop' })
          const archived = archive(team, file.slice(team.length + 1))
          writeFileSync(join(playersDir, team, `${slug}.jpg`), Buffer.from(data[1], 'base64'))
          saveFocus(`${team}/${slug}`, focus)
          return reply(200, { ok: true, file: `${team}/${slug}.jpg`, archived })
        }
        return reply(400, { error: 'Unknown action' })
      } catch (error) {
        return reply(500, { error: error.message })
      }
    })
  },
})

export default defineConfig({
  plugins: [react(), portraitList(), cropTool()],
  base: repositoryName ? `/${repositoryName}/` : '/',
  // Compile down for older phones (roughly iOS 13+ and Android Chrome 80+);
  // Vite's default only targets browsers from 2023 onward.
  build: {
    target: ['es2019', 'chrome80', 'safari13', 'firefox78'],
    cssTarget: ['chrome80', 'safari13', 'firefox78'],
  },
})
