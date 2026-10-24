import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { coverPosition, imageSourcesFor } from './crop.js'
import { players, schools, schoolMap } from './data.js'
import { buildRankingImage } from './rankingImage.js'
import { sendResult } from './results.js'
import { translations } from './i18n.js'
import { applyChoice, createSortState, currentPair, estimateComparisons, getResult } from './sorter.js'

const STORAGE_KEY = 'court-order-progress-v1'
const playerMap = Object.fromEntries(players.map((player) => [player.id, player]))
const playerName = (player, language) => language === 'ja' && player.nameJa ? player.nameJa : player.name

function Icon({ name, size = 20 }) {
  const paths = {
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    moon: <path d="M20.5 14.4A8.4 8.4 0 0 1 9.6 3.5 8.5 8.5 0 1 0 20.5 14.4Z"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></>,
    save: <><path d="M5 3h12l2 2v16H5Z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/></>,
    undo: <><path d="M9 7 4 12l5 5"/><path d="M20 17a8 8 0 0 0-16-5"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/></>,
    copy: <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/></>,
    restart: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></>,
  }
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function BrandMark() {
  return <div className="brand-mark" aria-hidden="true"><span /><span /></div>
}

function Header({ dark, language, onToggleDark, onToggleLanguage, phase, t }) {
  return (
    <header className="site-header">
      <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label={t.header.home}>
        <BrandMark />
        <span>COURT ORDER</span>
      </button>
      <div className="header-meta">
        <span className="phase-label">{t.phase[phase]}</span>
        <button className="language-button" onClick={onToggleLanguage} aria-label={t.header.switchLanguage} lang={language === 'en' ? 'ja' : 'en'}>
          {t.header.languageButton}
        </button>
        <button className="icon-button" onClick={onToggleDark} aria-label={t.header.switchTheme(dark)}>
          <Icon name={dark ? 'sun' : 'moon'} />
        </button>
      </div>
    </header>
  )
}

// Warms the browser cache so the next portrait can be cropped and shown without a visible jump.
function preloadPortrait(player) {
  const sources = imageSourcesFor(player)
  const tryNext = (index) => {
    if (index >= sources.length) return
    const image = new Image()
    image.onerror = () => tryNext(index + 1)
    image.src = sources[index]
  }
  tryNext(0)
}

// Callers key this by player id, so each character gets fresh state. The image stays hidden
// until its face-centred crop is known, which avoids it sliding into place after it appears.
function Portrait({ player, compact = false, language = 'en' }) {
  const [imageIndex, setImageIndex] = useState(0)
  const [objectPosition, setObjectPosition] = useState(`${player.focus[0]}% ${player.focus[1]}%`)
  const [positioned, setPositioned] = useState(false)
  const imageRef = useRef(null)
  const school = schoolMap[player.schoolId]
  const displayName = playerName(player, language)
  const initials = language === 'ja'
    ? displayName.replace(/\s+/g, '').slice(0, 2)
    : displayName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('')
  const imageSources = imageSourcesFor(player)
  const hasImageSource = imageIndex < imageSources.length

  const centerFace = useCallback(() => {
    const image = imageRef.current
    if (!image?.naturalWidth) return
    if (image.clientWidth) setObjectPosition(coverPosition(image.naturalWidth, image.naturalHeight, image.clientWidth, image.clientHeight, player.focus[0], player.focus[1]))
    setPositioned(true)
  }, [player])

  // A cached image is already complete before paint, so position it before it is ever shown.
  useLayoutEffect(() => {
    if (imageRef.current?.complete) centerFace()
  }, [centerFace, imageIndex])

  useEffect(() => {
    const image = imageRef.current
    if (!image) return undefined
    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(centerFace)
      observer.observe(image)
      return () => observer.disconnect()
    }
    window.addEventListener('resize', centerFace)
    return () => window.removeEventListener('resize', centerFace)
  }, [centerFace, imageIndex])

  return (
    <div className={`portrait ${compact ? 'portrait--compact' : ''}`} style={{ '--team': school.color, '--team-accent': school.accent }}>
      <div className="court-lines" aria-hidden="true"><span /><span /></div>
      {hasImageSource && <img ref={imageRef} src={imageSources[imageIndex]} alt="" style={{ objectPosition, opacity: positioned ? 1 : 0 }} onLoad={centerFace} onError={() => setImageIndex((current) => current + 1)} />}
      {!hasImageSource && <span className="portrait-initials">{initials}</span>}
      <span className="portrait-code">{school.short}</span>
    </div>
  )
}

function SchoolToggle({ school, active, onToggle, t }) {
  return (
    <button className={`school-toggle ${active ? 'is-active' : ''}`} onClick={() => onToggle(school.id)} aria-pressed={active}>
      <span className="school-swatch" style={{ '--school-color': school.color, '--school-accent': school.accent }}>{school.short}</span>
      <span>{t.schools[school.id]}</span>
      <span className="toggle-check"><Icon name="check" size={15} /></span>
    </button>
  )
}

function Setup({ selected, setSelected, onStart, onLoad, hasSave, t }) {
  const selectedPlayers = players.filter((player) => selected.includes(player.schoolId))
  const allSelected = selected.length === schools.length
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const setAll = () => setSelected(allSelected ? [] : schools.map((school) => school.id))

  return (
    <main className="setup-page page-shell">
      <section className="setup-hero">
        <div className="hero-copy">
          <h1>{t.setup.heroStart}<br/><em>{t.setup.heroAccent}</em></h1>
          <p>{t.setup.intro}</p>
        </div>
        <div className="hero-score" aria-label={t.setup.selected(selectedPlayers.length)}>
          <span className="score-number">{String(selectedPlayers.length).padStart(2, '0')}</span>
          <span className="score-rule" />
          <span>{t.setup.playersOnCourt.split('\n').map((line, index) => <span key={line}>{index > 0 ? <br/> : null}{line}</span>)}</span>
        </div>
      </section>

      <section className="roster-section">
        <div className="section-heading">
          <div>
            <h2>{t.setup.buildDraw}</h2>
            <p>{t.setup.selectHint}</p>
          </div>
          <button className="text-button" onClick={setAll}>{allSelected ? t.setup.clearAll : t.setup.selectAll}</button>
        </div>
        <div className="school-grid">
          {schools.map((school) => <SchoolToggle key={school.id} school={school} active={selected.includes(school.id)} onToggle={toggle} t={t} />)}
        </div>
      </section>

      <section className="start-rail">
        <div className="start-note">
          <span className="keycap">H</span><span className="keycap">L</span>
          <span>{t.setup.keyboard}</span>
        </div>
        <div className="start-actions">
          {hasSave && <button className="secondary-button" onClick={onLoad}>{t.setup.continue}</button>}
          <button className="primary-button" onClick={onStart} disabled={selectedPlayers.length < 2}>
            {t.setup.start} <Icon name="arrow" />
          </button>
        </div>
      </section>
    </main>
  )
}

function CandidateCard({ ids, side, onChoose, language, t }) {
  const player = playerMap[ids[0]]
  const school = schoolMap[player.schoolId]
  return (
    <button className={`candidate candidate--${side}`} onClick={onChoose} style={{ '--team': school.color, '--team-accent': school.accent }}>
      <div className="candidate-visual">
        <Portrait key={player.id} player={player} language={language} />
        {ids.length > 1 && <span className="tie-stack">{t.candidate.tiedCount(ids.length - 1)}</span>}
        <span className="pick-cue">{t.candidate.pick(side)}<Icon name="arrow" size={17} /></span>
      </div>
      <div className="candidate-copy">
        <span className="candidate-school">{t.schools[school.id]}</span>
        <h2>{playerName(player, language)}</h2>
      </div>
    </button>
  )
}

function Sorting({ sortState, count, onChoice, onUndo, canUndo, onSave, savedAt, language, t }) {
  const { state, pair } = currentPair(sortState)
  const estimate = estimateComparisons(count)
  const percent = Math.min(98, Math.max(state.comparisons ? 1 : 0, Math.round((state.comparisons / estimate) * 100)))

  // Whichever side is picked, the next card comes from the same run, so preload both candidates.
  const upcoming = pair ? [state.runs[state.pairIndex]?.[state.leftIndex + 1], state.runs[state.pairIndex + 1]?.[state.rightIndex + 1]] : []
  const upcomingKey = upcoming.map((group) => group?.[0] || '').join('|')
  useEffect(() => {
    upcomingKey.split('|').filter(Boolean).forEach((id) => playerMap[id] && preloadPortrait(playerMap[id]))
  }, [upcomingKey])

  if (!pair) return null

  return (
    <main className="sorting-page page-shell">
      <section className="sort-status">
        <div>
          <span>{t.sorting.comparison} {String(state.comparisons + 1).padStart(2, '0')}</span>
          <strong>{percent}% {t.sorting.sorted}</strong>
        </div>
        <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>
        <div className="sort-utilities">
          <button className="utility-button" onClick={onUndo} disabled={!canUndo}><Icon name="undo" size={18} /> {t.sorting.undo} <kbd>J</kbd></button>
          <button className="utility-button" onClick={onSave}><Icon name="save" size={18} /> {savedAt ? t.sorting.saved : t.sorting.save} <kbd>S</kbd></button>
        </div>
      </section>

      <section className="comparison-grid">
        <CandidateCard ids={pair[0]} side="left" onChoose={() => onChoice('left')} language={language} t={t} />
        <div className="versus"><span>VS</span></div>
        <CandidateCard ids={pair[1]} side="right" onChoose={() => onChoice('right')} language={language} t={t} />
      </section>

      {state.tiebreak ? (
      <section className="tie-action">
        <p className="tiebreak-note"><strong>{t.sorting.tiebreak}</strong> {t.sorting.tiebreakHint}</p>
        <p>{t.sorting.left} <kbd>H</kbd> · {t.sorting.right} <kbd>L</kbd></p>
      </section>
      ) : (
      <section className="tie-action">
        <div className="choice-buttons">
          <button className="tie-button" onClick={() => onChoice('tie')}>
            <span>{t.sorting.likeBoth}</span>
            <strong>{t.sorting.tie}</strong>
            <kbd>K</kbd>
          </button>
          <button className="neither-button" onClick={() => onChoice('neither')}>
            <span>{t.sorting.likeNeither}</span>
            <strong>{t.sorting.neither}</strong>
            <kbd>N</kbd>
          </button>
        </div>
        <p>{t.sorting.left} <kbd>H</kbd> · {t.sorting.tieShort} <kbd>K</kbd> · {t.sorting.neitherShort} <kbd>N</kbd> · {t.sorting.right} <kbd>L</kbd></p>
      </section>
      )}
    </main>
  )
}

function detectBrowser() {
  const ua = navigator.userAgent || ''
  return {
    inApp: /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|\bLine\/|MicroMessenger|KAKAOTALK|Snapchat|BytedanceWebview|musical_ly|Twitter/i.test(ua),
    line: /\bLine\//i.test(ua),
    mobile: /Android|iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1),
  }
}

function ImagePreview({ image, onClose, t }) {
  const browser = detectBrowser()
  const externalUrl = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('openExternalBrowser', '1')
    return url.toString()
  }
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  return (
    <div className="image-preview" role="dialog" aria-modal="true" aria-label={t.results.previewTitle} onClick={onClose}>
      <div className="image-preview-inner" onClick={(event) => event.stopPropagation()}>
        <p className="image-preview-hint">{browser.mobile ? t.results.longPressHint : t.results.rightClickHint}</p>
        <img src={image.dataUrl} alt={t.results.previewTitle} />
        {browser.inApp && <p className="image-preview-note">{t.results.inAppNote}</p>}
        <div className="image-preview-actions">
          {browser.line && <a className="secondary-button" href={externalUrl()}>{t.results.openInBrowser}</a>}
          <button className="primary-button" onClick={onClose}>{t.results.close}</button>
        </div>
      </div>
    </div>
  )
}

function ResultRow({ group, rank, podium, language, t }) {
  const lead = playerMap[group[0]]
  return (
    <div className={`result-row ${podium ? 'result-row--podium' : ''}`}>
      <span className="result-rank">{String(rank).padStart(2, '0')}</span>
      <Portrait key={lead.id} player={lead} compact language={language} />
      <div className="result-name">
        <strong>{playerName(lead, language)}</strong>
        <span>{t.schools[lead.schoolId]}{group.length > 1 ? ` · ${t.results.tiedWith} ${group.slice(1).map((id) => playerName(playerMap[id], language)).join(', ')}` : ''}</span>
      </div>
      <span className="result-seed">{schoolMap[lead.schoolId].short}</span>
    </div>
  )
}

function Results({ groups, rejectedIds = [], onRestart, language, t }) {
  const [notice, setNotice] = useState('')
  const ranked = []
  let rank = 1
  groups.forEach((group) => {
    ranked.push({ group, rank })
    rank += group.length
  })
  const top = ranked[0]?.group.map((id) => playerName(playerMap[id], language)).join(' & ')
  const hasRankedCharacters = ranked.length > 0
  const rejectedPlayers = rejectedIds.map((id) => playerMap[id]).filter(Boolean)

  const shareUrl = () => {
    const encoded = groups.map((group) => group.join('~')).join(',')
    return `${window.location.origin}${window.location.pathname}#result=${encodeURIComponent(encoded)}`
  }

  const copyValue = async (value, success) => {
    try {
      await navigator.clipboard.writeText(value)
      setNotice(success)
      window.setTimeout(() => setNotice(''), 1800)
    } catch {
      setNotice(t.results.copyUnavailable)
    }
  }

  const copyList = () => copyValue(ranked.map(({ group, rank: itemRank }) => `${itemRank}. ${group.map((id) => playerName(playerMap[id], language)).join(' = ')}`).join('\n'), t.results.rankingCopied)
  const copyLink = () => copyValue(shareUrl(), t.results.linkCopied)

  // Build the image as soon as the results show, so the share sheet can open
  // straight from the tap (iOS rejects navigator.share after a slow async gap).
  const imageKey = `${language}|${groups.map((group) => group.join('~')).join(',')}`
  const [rankingImage, setRankingImage] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  useEffect(() => {
    let cancelled = false
    setRankingImage(null)
    if (!hasRankedCharacters) return undefined
    const entries = ranked.map(({ group, rank: itemRank }) => ({ player: { ...playerMap[group[0]], label: playerName(playerMap[group[0]], language) }, rank: itemRank }))
    buildRankingImage({
      entries,
      title: 'COURT ORDER',
      heading: t.results.imageHeading,
      footer: t.results.imageFooter,
      schoolName: (id) => t.schools[id],
      language,
      siteUrl: `${window.location.origin}${window.location.pathname}`,
      scanCaption: t.results.scanToPlay,
    })
      .then((image) => { if (!cancelled) setRankingImage(image) })
      .catch(() => { if (!cancelled) setNotice(t.results.imageFailed) })
    return () => { cancelled = true }
  }, [imageKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Never downloads by itself: the image opens on the page so people save it themselves
  // (right-click on desktop, press and hold on phones and in-app browsers).
  const downloadImage = () => {
    if (!rankingImage) {
      setNotice(t.results.imagePreparing)
      return
    }
    setPreviewOpen(true)
  }

  return (
    <main className="results-page page-shell">
      <section className="results-hero">
        <div>
          <span className="results-label">{t.results.finalOrder}</span>
          {hasRankedCharacters
            ? <h1>{t.results.gameSet}<br/><em>{top}.</em></h1>
            : <h1>{t.results.noFavourites}<br/><em>{t.results.thisTime}</em></h1>}
        </div>
        <p>{hasRankedCharacters
          ? t.results.description
          : t.results.emptyDescription}</p>
      </section>

      <section className="results-layout">
        <div>
          <div className="results-list">
            {hasRankedCharacters
              ? ranked.map(({ group, rank: itemRank }, index) => <ResultRow key={group.join('-')} group={group} rank={itemRank} podium={index < 3} language={language} t={t} />)
              : <p className="empty-results">{t.results.emptyList}</p>}
          </div>
          {rejectedPlayers.length > 0 ? (
            <section className="rejected-results">
              <span>{t.results.notRanked}</span>
              <h2>{t.results.neitherPicks}</h2>
              <p>{t.results.rejectedDescription}</p>
              <div className="rejected-list">
                {rejectedPlayers.map((player) => <span key={player.id}>{playerName(player, language)}</span>)}
              </div>
            </section>
          ) : null}
        </div>
        <aside className="result-actions">
          <div className="result-actions-inner">
            <h2>{t.results.takeIt}</h2>
            <p>{t.results.takeDescription}</p>
            <button onClick={copyLink}><Icon name="link" /> {t.results.copyLink}</button>
            <button onClick={downloadImage}><Icon name="image" /> {t.results.download}</button>
            <button onClick={copyList}><Icon name="copy" /> {t.results.copyList}</button>
            <button className="restart-button" onClick={onRestart}><Icon name="restart" /> {t.results.restart}</button>
            {notice && <span className="notice" role="status">{notice}</span>}
          </div>
        </aside>
      </section>
      {previewOpen && rankingImage && <ImagePreview image={rankingImage} onClose={() => setPreviewOpen(false)} t={t} />}
    </main>
  )
}

function parseSharedResult() {
  if (!window.location.hash.startsWith('#result=')) return null
  try {
    const raw = decodeURIComponent(window.location.hash.slice(8))
    const seen = new Set()
    const groups = raw.split(',')
      .map((group) => group.split('~').filter((id) => playerMap[id] && !seen.has(id) && seen.add(id)))
      .filter((group) => group.length)
    return groups.length ? groups : null
  } catch { return null }
}

// Storage can be missing or throw (private mode, some in-app browsers), so never let it crash the app.
const storage = {
  get: (key) => { try { return window.localStorage.getItem(key) } catch { return null } },
  set: (key, value) => { try { window.localStorage.setItem(key, value) } catch { /* not saved */ } },
  remove: (key) => { try { window.localStorage.removeItem(key) } catch { /* nothing to remove */ } },
}

// A saved sort is only usable if every character in it still exists in the roster.
const isUsableSortState = (state) => {
  const ids = [state?.runs, state?.nextRuns, state?.merged, state?.final, state?.rejected].flat(Infinity).filter((id) => id != null)
  return Array.isArray(state?.runs) && ids.every((id) => typeof id === 'string' && playerMap[id])
}

export default function App() {
  const [sharedResult, setSharedResult] = useState(parseSharedResult)
  const [dark, setDark] = useState(() => storage.get('court-order-theme') === 'dark')
  const [language, setLanguage] = useState(() => storage.get('court-order-language') === 'ja' ? 'ja' : 'en')
  const [phase, setPhase] = useState(() => sharedResult ? 'results' : 'setup')
  const [selected, setSelected] = useState(schools.map((school) => school.id))
  const [sortState, setSortState] = useState(null)
  const [history, setHistory] = useState([])
  const [savedAt, setSavedAt] = useState(null)
  const [hasSave, setHasSave] = useState(() => Boolean(storage.get(STORAGE_KEY)))
  const resultGroups = sharedResult || (sortState ? getResult(sortState) : null)
  const selectedCount = players.filter((player) => selected.includes(player.schoolId)).length
  const t = translations[language]

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    storage.set('court-order-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    document.documentElement.lang = language
    storage.set('court-order-language', language)
  }, [language])

  const start = useCallback(() => {
    const ids = players.filter((player) => selected.includes(player.schoolId)).map((player) => player.id)
    if (ids.length < 2) return
    setSharedResult(null)
    for (let i = ids.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
    }
    setSortState(createSortState(ids))
    setHistory([])
    setPhase('sorting')
    setSavedAt(null)
    window.scrollTo(0, 0)
  }, [selected])

  const save = useCallback(() => {
    if (!sortState) return
    storage.set(STORAGE_KEY, JSON.stringify({ phase: 'sorting', selected, sortState }))
    setSavedAt(new Date())
    setHasSave(true)
  }, [selected, sortState])

  const load = useCallback(() => {
    try {
      const saved = JSON.parse(storage.get(STORAGE_KEY))
      if (!isUsableSortState(saved?.sortState)) throw new Error('Saved sort no longer matches the roster')
      setSharedResult(null)
      setSelected(saved.selected || schools.map((school) => school.id))
      setSortState(saved.sortState)
      setHistory([])
      setPhase(getResult(saved.sortState) ? 'results' : 'sorting')
      window.scrollTo(0, 0)
    } catch { storage.remove(STORAGE_KEY); setHasSave(false) }
  }, [])

  const choose = useCallback((choice) => {
    if (!sortState) return
    const next = applyChoice(sortState, choice)
    if (next === sortState) return
    setHistory((items) => [...items, sortState])
    setSortState(next)
    const result = getResult(next)
    if (result) {
      sendResult({
        teams: schools.filter((school) => selected.includes(school.id)).map((school) => school.name),
        ranking: result.flat().map((id) => playerMap[id]?.name).filter(Boolean),
        neither: (next.rejected || []).map((id) => playerMap[id]?.name).filter(Boolean),
        language,
      })
      setPhase('results')
      storage.remove(STORAGE_KEY)
      setHasSave(false)
      window.scrollTo(0, 0)
    }
    setSavedAt(null)
  }, [sortState, selected, language])

  const undo = useCallback(() => {
    if (!history.length) return
    setSortState(history[history.length - 1])
    setHistory((items) => items.slice(0, -1))
    setSavedAt(null)
  }, [history])

  const restart = useCallback(() => {
    window.history.replaceState(null, '', window.location.pathname)
    setSharedResult(null)
    setPhase('setup')
    setSortState(null)
    setHistory([])
    setSavedAt(null)
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      // Leave browser shortcuts (Ctrl+S, Cmd+1…) alone and don't repeat picks while a key is held.
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return
      const key = (event.key || '').toLowerCase()
      // Enter/Space on a focused button already clicks it.
      if ((key === 'enter' || key === ' ') && event.target instanceof Element && event.target.closest('button, a')) return
      if (phase === 'setup') {
        if (key === 'enter' || key === 's') start()
        if (key === 'l' && hasSave) load()
      } else if (phase === 'sorting') {
        if (key === 'h' || key === 'arrowleft' || key === '1') choose('left')
        if (key === 'k' || key === 'arrowup' || key === '2') choose('tie')
        if (key === 'l' || key === 'arrowright' || key === '3') choose('right')
        if (key === 'n' || key === '0') choose('neither')
        if (key === 'j' || key === 'arrowdown') undo()
        if (key === 's') save()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [phase, start, choose, undo, save, load, hasSave])

  return (
    <div className="app">
      <Header dark={dark} language={language} onToggleDark={() => setDark((value) => !value)} onToggleLanguage={() => setLanguage((value) => value === 'en' ? 'ja' : 'en')} phase={phase} t={t} />
      {phase === 'setup' && <Setup selected={selected} setSelected={setSelected} onStart={start} onLoad={load} hasSave={hasSave} t={t} />}
      {phase === 'sorting' && sortState && <Sorting sortState={sortState} count={selectedCount} onChoice={choose} onUndo={undo} canUndo={history.length > 0} onSave={save} savedAt={savedAt} language={language} t={t} />}
      {phase === 'results' && resultGroups && <Results groups={resultGroups} rejectedIds={sortState?.rejected || []} onRestart={restart} language={language} t={t} />}
      <footer>
        <span>COURT ORDER</span><span>{t.footer}</span>
        <p className="footer-support">
          {t.support}{' '}
          <span aria-hidden="true">🎾</span> <a href="https://wavebox.me/wave/6vf81qelg8m318zr/" target="_blank" rel="noopener noreferrer">wavebox</a> <span aria-hidden="true">🎾</span>
        </p>
      </footer>
    </div>
  )
}
