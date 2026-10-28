import { createHash } from 'node:crypto'
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
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

// Replaced photos are kept in public/players/<team>/old/. They are left out of the published
// site (see dropOldPhotos) and ignored by portraitList, which only reads files at the team level.
const dropOldPhotos = () => ({
  name: 'drop-old-photos',
  apply: 'build',
  closeBundle() {
    const distPlayers = join(process.cwd(), 'dist', 'players')
    if (!existsSync(distPlayers)) return
    for (const team of readdirSync(distPlayers)) rmSync(join(distPlayers, team, 'old'), { recursive: true, force: true })
  },
})

const focusFile = join(process.cwd(), 'src', 'faceFocus.json')
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

// Moves a portrait into public/players/<team>/old/, adding -2, -3… if an older copy is already there.
const archive = (team, file) => {
  const dir = join(playersDir, team, 'old')
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

// Local-only endpoints for the photo import page (src/ImportTool.jsx): lists the Top 9 project's
// portraits, serves them for preview, and copies a chosen one in, archiving the current photo.
const top9Dir = join(process.cwd(), '..', 'Tennis top9', 'public', 'players')
const top9Framing = join(process.cwd(), '..', 'Tennis top9', 'src', 'framing.json')
const md5 = (file) => createHash('md5').update(readFileSync(file)).digest('hex')
const listPortraits = (root) => (existsSync(root) ? readdirSync(root) : []).flatMap((team) => {
  const dir = join(root, team)
  if (!statSync(dir).isDirectory()) return []
  return readdirSync(dir).filter((file) => /\.(webp|png|jpe?g)$/i.test(file)).map((file) => ({ team, file, hash: md5(join(dir, file)) }))
})

const importTool = () => ({
  name: 'import-tool',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__import', async (request, response) => {
      const reply = (status, body) => {
        response.statusCode = status
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify(body))
      }
      try {
        const url = decodeURIComponent(request.url.split('?')[0])
        if (request.method === 'GET' && url === '/list') {
          const framing = existsSync(top9Framing) ? JSON.parse(readFileSync(top9Framing, 'utf8')) : {}
          return reply(200, { top9: listPortraits(top9Dir), fave: listPortraits(playersDir), framing })
        }
        const image = /^\/img\/([a-z0-9-]+)\/([^/\\]+\.(?:webp|png|jpe?g))$/i.exec(url)
        if (request.method === 'GET' && image) {
          const file = join(top9Dir, image[1], image[2])
          if (!existsSync(file)) return reply(404, { error: 'Not found' })
          response.setHeader('Content-Type', `image/${extname(file).slice(1).toLowerCase().replace('jpg', 'jpeg')}`)
          return createReadStream(file).pipe(response)
        }
        if (request.method === 'POST' && url === '/apply') {
          const { source, target, focus } = JSON.parse(await readBody(request))
          const from = /^([a-z0-9-]+)\/([^/\\]+\.(webp|png|jpe?g))$/i.exec(source || '')
          const to = /^([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(target || '')
          if (!from || !to || !existsSync(join(top9Dir, source))) return reply(400, { error: 'Bad source or target' })
          const [, team, slug] = to
          const teamDir = join(playersDir, team)
          mkdirSync(teamDir, { recursive: true })
          const archived = readdirSync(teamDir)
            .filter((file) => file.replace(/\.[^.]+$/, '') === slug && /\.(webp|png|jpe?g)$/i.test(file))
            .map((file) => archive(team, file))
          const extension = extname(from[2]).toLowerCase().replace('.jpeg', '.jpg')
          copyFileSync(join(top9Dir, source), join(teamDir, `${slug}${extension}`))
          if (Array.isArray(focus) && focus.length === 2 && focus.every(Number.isFinite)) saveFocus(`${team}/${slug}`, focus)
          return reply(200, { ok: true, file: `${team}/${slug}${extension}`, archived })
        }
        return reply(404, { error: 'Unknown request' })
      } catch (error) {
        return reply(500, { error: error.message })
      }
    })
  },
})

export default defineConfig({
  plugins: [react(), portraitList(), cropTool(), importTool(), dropOldPhotos()],
  base: repositoryName ? `/${repositoryName}/` : '/',
  // Compile down for older phones (roughly iOS 13+ and Android Chrome 80+);
  // Vite's default only targets browsers from 2023 onward.
  build: {
    target: ['es2019', 'chrome80', 'safari13', 'firefox78'],
    cssTarget: ['chrome80', 'safari13', 'firefox78'],
  },
})
