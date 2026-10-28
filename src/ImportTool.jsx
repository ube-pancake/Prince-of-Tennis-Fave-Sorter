import { useEffect, useMemo, useState } from 'react'
import { rosterPlayers, rosterSchools } from './data.js'
import './cropTool.css'

// Local-only page (npm run dev, then open /?import) for copying colour photos from the Top 9 project.
// Each photo is shown next to the current one; nothing changes until you press Replace. The current
// photo moves to public/players/<team>/old/. Choices are remembered in this browser so you can resume.

const DECISIONS_KEY = 'court-order-import-decisions'

// Top 9 file names that are spelled differently here ("team/slug" → "team/slug", or null to ignore).
const ALIASES = {
  'australia/noah-j-dolgius': 'australia/noah-j-dorgias',
  'france/jonathan-saint-georges': 'france/jonathan-st-georges',
  'france/l-camus-de-charpentier': 'france/leopold-camus',
  'germany/jurgen-borisovich-volk': 'foreign/j-rgen-volk',
  'germany/qp': 'foreign/qp',
  'greece/apollon-stefanopoulos': 'greece/apollon-stephanopoulos',
  'spain/mars-de-colon': 'spain/mares-de-colon',
  'spain/sedah': 'spain/seda',
  'spain/silva-serra-banbieri': 'spain/silva-serra-bambieri',
  'spain/antokino-da-medanore': null,
  'switzerland/alexander-amadeus': 'foreign/alexander-amadeus',
  'switzerland/randy-pug': 'switzerland/randy-pugu',
  'u17/duke 2': 'u17/duke-watanabe',
  'u17/futa-kaji': 'u17/kazena-kaji',
  'u17/jusaburo-mori': 'u17/jusaburo-mouri',
  'u17/liliadent-krauser': 'other/liliadent-krauser',
  'usa/oliver-phillips': 'usa/oliver-philips',
}

const keyOf = (player) => `${player.schoolId}/${player.id.slice(player.schoolId.length + 1)}`
const playersByKey = Object.fromEntries(rosterPlayers.map((player) => [keyOf(player), player]))
const stripExtension = (file) => file.replace(/\.[^.]+$/, '')

const readDecisions = () => { try { return JSON.parse(window.localStorage.getItem(DECISIONS_KEY)) || {} } catch { return {} } }
const writeDecisions = (value) => { try { window.localStorage.setItem(DECISIONS_KEY, JSON.stringify(value)) } catch { /* not remembered */ } }

// True when the picture has real colour (manga pages and greyscale scans score near zero).
const isColourful = (src) => new Promise((resolve) => {
  const image = new Image()
  image.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 48
    canvas.height = 48
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0, 48, 48)
    const { data } = ctx.getImageData(0, 0, 48, 48)
    let spread = 0
    for (let i = 0; i < data.length; i += 4) spread += Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2])
    resolve(spread / (data.length / 4) > 18)
  }
  image.onerror = () => resolve(false)
  image.src = src
})

export default function ImportTool() {
  const [list, setList] = useState(null)
  const [colour, setColour] = useState({})
  const [decisions, setDecisions] = useState(readDecisions)
  const [targets, setTargets] = useState({})
  const [showGrey, setShowGrey] = useState(false)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/__import/list').then((response) => response.json()).then(setList).catch((error) => setStatus(`Could not read the Top 9 folder: ${error.message}`))
  }, [])

  const items = useMemo(() => {
    if (!list) return []
    const faveHashes = Object.fromEntries(list.fave.map((photo) => [`${photo.team}/${stripExtension(photo.file)}`, { hash: photo.hash, file: `${photo.team}/${photo.file}` }]))
    return list.top9.map((photo) => {
      const source = `${photo.team}/${photo.file}`
      const sourceKey = `${photo.team}/${stripExtension(photo.file)}`
      const matched = sourceKey in ALIASES ? ALIASES[sourceKey] : (playersByKey[sourceKey] ? sourceKey : null)
      const target = source in targets ? targets[source] : matched
      const framing = list.framing[`${photo.team}-${stripExtension(photo.file)}`]
      return {
        source,
        url: `/__import/img/${photo.team}/${encodeURIComponent(photo.file)}`,
        target,
        current: target ? faveHashes[target] : null,
        identical: Boolean(target && faveHashes[target]?.hash === photo.hash),
        focus: framing ? [framing.x * 100, framing.y * 100] : [50, 35],
      }
    })
  }, [list, targets])

  useEffect(() => {
    items.forEach((item) => {
      if (item.source in colour) return
      isColourful(item.url).then((value) => setColour((current) => ({ ...current, [item.source]: value })))
    })
  }, [items]) // eslint-disable-line react-hooks/exhaustive-deps

  const reviewable = items.filter((item) => item.target && !item.identical && (showGrey || colour[item.source]))
  const pending = reviewable.filter((item) => !decisions[item.source])
  const item = pending[0]
  const checking = items.some((entry) => !(entry.source in colour))
  const unmatched = items.filter((entry) => !entry.target && entry.source.split('/')[1] !== 'old')

  const decide = (source, value) => {
    const next = { ...decisions, [source]: value }
    setDecisions(next)
    writeDecisions(next)
  }

  const replace = async () => {
    setBusy(true)
    try {
      const response = await fetch('/__import/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: item.source, target: item.target, focus: item.focus }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      decide(item.source, 'replaced')
      setStatus(result.archived.length ? `Replaced. Old photo moved to ${result.archived.join(', ')}` : `Added ${result.file}`)
    } catch (error) {
      setStatus(`Could not replace: ${error.message}`)
    }
    setBusy(false)
  }

  const player = item && playersByKey[item.target]
  const done = reviewable.length - pending.length

  return (
    <main className="ct">
      <header className="ct-bar">
        <strong>Photo import</strong>
        <span className="ct-local">local only · from Tennis top9</span>
        <label><input type="checkbox" checked={showGrey} onChange={(event) => setShowGrey(event.target.checked)} /> include black &amp; white</label>
        <button onClick={() => { setDecisions({}); writeDecisions({}) }}>Start over</button>
        <a href="./">Back to site</a>
      </header>

      {!list && <p className="ct-help">{status || 'Loading…'}</p>}
      {list && (
        <p className="ct-meta">
          {done} of {reviewable.length} reviewed · {items.filter((entry) => entry.identical).length} already the same, skipped
          {checking ? ' · checking colours…' : ` · ${items.filter((entry) => entry.target && !colour[entry.source]).length} black & white hidden`}
        </p>
      )}
      {status && <p className="ct-status" role="status">{status}</p>}

      {list && item && player && (
        <section className="im-compare">
          <div className="im-head">
            <h1>{player.name}</h1>
            <label>
              Copy to{' '}
              <select value={item.target || ''} onChange={(event) => setTargets((current) => ({ ...current, [item.source]: event.target.value || null }))}>
                <option value="">— nobody (skip) —</option>
                {rosterSchools.map((school) => (
                  <optgroup key={school.id} label={school.name}>
                    {rosterPlayers.filter((entry) => entry.schoolId === school.id).map((entry) => <option key={entry.id} value={keyOf(entry)}>{entry.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>
          <div className="im-pair">
            <figure>
              {item.current ? <img src={`/players/${item.current.file}?v=${item.current.hash}`} alt="" /> : <div className="im-empty">No photo yet<br />(hidden on the site)</div>}
              <figcaption>Current{item.current ? ` · ${item.current.file}` : ''}</figcaption>
            </figure>
            <span className="im-arrow">→</span>
            <figure>
              <img src={item.url} alt="" />
              <figcaption>Top 9 · {item.source}</figcaption>
            </figure>
          </div>
          <div className="ct-actions">
            <button className="ct-primary" onClick={replace} disabled={busy}>{item.current ? 'Replace' : 'Use this photo'}</button>
            <button onClick={() => decide(item.source, 'kept')} disabled={busy}>Keep current</button>
          </div>
        </section>
      )}
      {list && !item && !checking && <p className="ct-status">All done! Check the site, then commit and push with GitHub Desktop.</p>}

      {list && unmatched.length > 0 && (
        <details className="im-unmatched">
          <summary>{unmatched.length} Top 9 photos have no character here yet</summary>
          <p className="ct-help">These people aren't in this sorter's roster. Ask Claude to add any you want.</p>
          <ul>{unmatched.map((entry) => <li key={entry.source}>{entry.source}</li>)}</ul>
        </details>
      )}
    </main>
  )
}
