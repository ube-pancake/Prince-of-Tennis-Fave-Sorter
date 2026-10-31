import { useEffect, useRef, useState } from 'react'
import { coverFrame } from './crop.js'
import { players as allPlayers, schools } from './data.js'
import './cropTool.css'

// Local-only photo fixer (npm run dev, then open /?crop). Click a face to set where crops
// centre, or crop the photo itself. Saving goes through the dev server (see vite.config.js):
// the original moves to old/<team>/ and the cropped JPEG takes its place.

const RATIOS = { square: 1, portrait: 4 / 5, free: null }
const MAX_SIDE = 1200
const MIN_SIDE = 40
const PREVIEWS = [
  // Same shapes as the live site (2026-10-31 layout): VS cards 532×440 desktop / 155×210 phone,
  // podium 4:5, phone #1 square, results list square.
  { label: 'Desktop VS card', width: 240, height: 198 },
  { label: 'Phone VS card', width: 120, height: 163 },
  { label: 'Podium #2 / #3', width: 120, height: 150 },
  { label: 'Phone #1', width: 150, height: 150 },
  { label: 'Result list', width: 82, height: 82 },
  { label: 'Saved image top 3', width: 152, height: 190 },
]

// ?only=id1,id2,… limits the tool to those characters (e.g. just the newly imported photos).
const only = (new URLSearchParams(window.location.search).get('only') || '').split(',').filter(Boolean)
const selected = allPlayers.filter((player) => only.includes(player.id))
const players = selected.length ? selected : allPlayers
const queryFor = (id) => `?crop=${id}${only.length ? `&only=${only.join(',')}` : ''}`

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const fileOf = (player) => player.image.split('/players/')[1]

const post = async (body) => {
  const response = await fetch('/__crop-tool', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`)
  return result
}

// Biggest box of the given ratio that fits the image, centred on the face.
const defaultBox = (natural, focus, ratio) => {
  if (!ratio) return { x: 0, y: 0, w: natural.w, h: natural.h }
  const w = Math.min(natural.w, natural.h * ratio)
  const h = w / ratio
  return {
    x: clamp((focus[0] / 100) * natural.w - w / 2, 0, natural.w - w),
    y: clamp((focus[1] / 100) * natural.h - h / 2, 0, natural.h - h),
    w,
    h,
  }
}

// Framed exactly like the site's Portrait: the photo is sized and offset inside a fixed box.
function Preview({ src, natural, focus, width, height, label }) {
  const frame = natural ? coverFrame(natural.w, natural.h, width, height, focus[0], focus[1], focus[2]) : null
  return (
    <figure className="ct-preview">
      <span className="ct-preview-box" style={{ width, height }}>
        {frame && <img src={src} alt="" style={frame} />}
      </span>
      <figcaption>{label}</figcaption>
    </figure>
  )
}

const MAX_ZOOM = 3
const zoomOf = (focus) => focus[2] || 1
// Face position as saved: [x, y], plus the zoom only when it's above 1×.
const withZoom = (xy, zoom) => (zoom > 1.001 ? [...xy, Math.round(zoom * 100) / 100] : xy)

export default function CropTool() {
  const [id, setId] = useState(() => {
    const wanted = new URLSearchParams(window.location.search).get('crop')
    return players.some((player) => player.id === wanted) ? wanted : players[0].id
  })
  const index = players.findIndex((player) => player.id === id)
  const player = players[index]
  const [focus, setFocus] = useState(player.focus)
  const [natural, setNatural] = useState(null)
  const [box, setBox] = useState(null)
  const [ratio, setRatio] = useState('square')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [cacheBust] = useState(() => Date.now())
  const frameRef = useRef(null)
  const imageRef = useRef(null)
  const dragRef = useRef(null)
  const src = `${player.image}?v=${cacheBust}`

  const select = (nextId) => {
    const next = players.find((item) => item.id === nextId)
    setId(nextId)
    setFocus(next.focus)
    setNatural(null)
    setBox(null)
    setStatus('')
    window.history.replaceState(null, '', queryFor(nextId))
  }
  const step = (offset) => select(players[(index + offset + players.length) % players.length].id)

  useEffect(() => {
    const onKey = (event) => {
      if (event.target instanceof HTMLSelectElement || box) return
      if (event.key === 'ArrowRight') step(1)
      if (event.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const pickFace = async (event) => {
    if (box || !natural) return
    const rect = frameRef.current.getBoundingClientRect()
    const next = withZoom([((event.clientX - rect.left) / rect.width) * 100, ((event.clientY - rect.top) / rect.height) * 100].map(Math.round), zoomOf(focus))
    setFocus(next)
    saveFocus(next, 'Face position saved')
  }

  const saveFocus = async (next, message) => {
    try {
      await post({ action: 'focus', file: fileOf(player), focus: next })
      setStatus(message)
    } catch (error) {
      setStatus(`Could not save: ${error.message}`)
    }
  }

  // The slider updates the previews live and saves once it stops moving for a moment.
  const zoomTimer = useRef(null)
  const changeZoom = (value) => {
    const next = withZoom(focus.slice(0, 2), value)
    setFocus(next)
    window.clearTimeout(zoomTimer.current)
    zoomTimer.current = window.setTimeout(() => saveFocus(next, `Zoom ${value.toFixed(2)}× saved`), 400)
  }

  const startCrop = () => setBox(defaultBox(natural, focus, RATIOS[ratio]))
  const changeRatio = (value) => {
    setRatio(value)
    if (box) setBox(defaultBox(natural, focus, RATIOS[value]))
  }

  // Dragging: "move" shifts the box; a corner resizes it from the opposite corner, keeping the ratio.
  const startDrag = (event, mode) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { mode, startX: event.clientX, startY: event.clientY, start: box }
  }
  const onDrag = (event) => {
    const drag = dragRef.current
    if (!drag) return
    const scale = frameRef.current.getBoundingClientRect().width / natural.w
    const dx = (event.clientX - drag.startX) / scale
    const dy = (event.clientY - drag.startY) / scale
    const { start } = drag
    if (drag.mode === 'move') {
      setBox({ ...start, x: clamp(start.x + dx, 0, natural.w - start.w), y: clamp(start.y + dy, 0, natural.h - start.h) })
      return
    }
    const west = drag.mode.includes('w')
    const north = drag.mode.includes('n')
    const fixedX = west ? start.x + start.w : start.x
    const fixedY = north ? start.y + start.h : start.y
    const pointX = (west ? start.x : start.x + start.w) + dx
    const pointY = (north ? start.y : start.y + start.h) + dy
    const roomX = west ? fixedX : natural.w - fixedX
    const roomY = north ? fixedY : natural.h - fixedY
    const r = RATIOS[ratio]
    let w = clamp(west ? fixedX - pointX : pointX - fixedX, MIN_SIDE, roomX)
    let h = clamp(north ? fixedY - pointY : pointY - fixedY, MIN_SIDE, roomY)
    if (r) {
      w = Math.min(Math.max(w, h * r), roomX, roomY * r)
      h = w / r
    }
    setBox({ x: west ? fixedX - w : fixedX, y: north ? fixedY - h : fixedY, w, h })
  }
  const endDrag = () => { dragRef.current = null }

  const saveCrop = async () => {
    setBusy(true)
    try {
      const scale = Math.min(1, MAX_SIDE / Math.max(box.w, box.h))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(box.w * scale)
      canvas.height = Math.round(box.h * scale)
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(imageRef.current, box.x, box.y, box.w, box.h, 0, 0, canvas.width, canvas.height)
      // Keep the face where it was, now measured inside the cropped photo.
      const newFocus = withZoom([
        clamp((((focus[0] / 100) * natural.w - box.x) / box.w) * 100, 0, 100),
        clamp((((focus[1] / 100) * natural.h - box.y) / box.h) * 100, 0, 100),
      ], zoomOf(focus))
      const result = await post({ action: 'crop', file: fileOf(player), focus: newFocus, image: canvas.toDataURL('image/jpeg', 0.9) })
      setStatus(`Cropped. Original kept in ${result.archived}. Reloading…`)
      // The dev server reloads the page when the photo file changes; this is a fallback.
      window.setTimeout(() => window.location.reload(), 1500)
    } catch (error) {
      setStatus(`Could not crop: ${error.message}`)
      setBusy(false)
    }
  }

  const boxStyle = box && natural && {
    left: `${(box.x / natural.w) * 100}%`,
    top: `${(box.y / natural.h) * 100}%`,
    width: `${(box.w / natural.w) * 100}%`,
    height: `${(box.h / natural.h) * 100}%`,
  }

  return (
    <main className="ct">
      <header className="ct-bar">
        <strong>Crop fixer</strong>
        <span className="ct-local">local only · not on the website{only.length ? ` · ${index + 1} of ${players.length} selected` : ''}</span>
        <select value={id} onChange={(event) => select(event.target.value)}>
          {schools.filter((school) => players.some((item) => item.schoolId === school.id)).map((school) => (
            <optgroup key={school.id} label={school.name}>
              {players.filter((item) => item.schoolId === school.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </optgroup>
          ))}
        </select>
        <button onClick={() => step(-1)} disabled={Boolean(box)}>← Prev</button>
        <button onClick={() => step(1)} disabled={Boolean(box)}>Next →</button>
        <a href="./">Back to site</a>
      </header>

      <section className="ct-work">
        <div className="ct-stage">
          <div
            ref={frameRef}
            className={`ct-frame ${box ? 'is-cropping' : ''}`}
            style={natural ? { width: `min(100%, calc((100vh - 130px) * ${natural.w / natural.h}))` } : undefined}
            onClick={pickFace}
          >
            <img ref={imageRef} src={src} alt={player.name} draggable={false} onLoad={(event) => setNatural({ w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight })} />
            {!box && <i className="ct-face" style={{ left: `${focus[0]}%`, top: `${focus[1]}%` }} />}
            {box && (
              <div className="ct-box" style={boxStyle} onPointerDown={(event) => startDrag(event, 'move')} onPointerMove={onDrag} onPointerUp={endDrag}>
                {['nw', 'ne', 'sw', 'se'].map((corner) => (
                  <span key={corner} className={`ct-handle ct-${corner}`} onPointerDown={(event) => startDrag(event, corner)} onPointerMove={onDrag} onPointerUp={endDrag} />
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="ct-side">
          <h1>{player.name}</h1>
          <p className="ct-meta">{fileOf(player)}{natural ? ` · ${natural.w}×${natural.h}` : ''}</p>
          {!box ? (
            <>
              <p className="ct-help">Click the face to set where every crop centres. It saves right away.</p>
              <label className="ct-zoom">
                <span>Zoom on the site <strong>{zoomOf(focus).toFixed(2)}×</strong></span>
                <input type="range" min="1" max={MAX_ZOOM} step="0.05" value={zoomOf(focus)} onChange={(event) => changeZoom(Number(event.target.value))} />
              </label>
              {zoomOf(focus) > 1 && <button onClick={() => changeZoom(1)}>Reset zoom</button>}
              <button className="ct-primary" onClick={startCrop} disabled={!natural}>Crop this photo…</button>
            </>
          ) : (
            <>
              <p className="ct-help">Drag the box to move it, drag a corner to resize. The original is kept in <code>old/</code>.</p>
              <div className="ct-ratios">
                {Object.keys(RATIOS).map((key) => (
                  <label key={key}><input type="radio" name="ratio" checked={ratio === key} onChange={() => changeRatio(key)} /> {key === 'square' ? 'Square' : key === 'portrait' ? '4:5' : 'Free'}</label>
                ))}
              </div>
              <p className="ct-meta">Result: {Math.round(box.w * Math.min(1, MAX_SIDE / Math.max(box.w, box.h)))}×{Math.round(box.h * Math.min(1, MAX_SIDE / Math.max(box.w, box.h)))}</p>
              <div className="ct-actions">
                <button className="ct-primary" onClick={saveCrop} disabled={busy}>Save crop</button>
                <button onClick={() => setBox(null)} disabled={busy}>Cancel</button>
              </div>
            </>
          )}
          {status && <p className="ct-status" role="status">{status}</p>}

          <h2>How it looks</h2>
          <div className="ct-previews">
            {PREVIEWS.map((preview) => <Preview key={preview.label} src={src} natural={natural} focus={focus} {...preview} />)}
          </div>
          {box && <p className="ct-help">Previews update after you save the crop.</p>}
        </aside>
      </section>
    </main>
  )
}
