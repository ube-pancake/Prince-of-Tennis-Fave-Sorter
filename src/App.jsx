import { useCallback, useEffect, useMemo, useState } from 'react'
import { players, schools, schoolMap } from './data.js'
import { applyChoice, createSortState, currentPair, estimateComparisons, getResult } from './sorter.js'

const STORAGE_KEY = 'court-order-progress-v1'
const playerMap = Object.fromEntries(players.map((player) => [player.id, player]))

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

function Header({ dark, onToggleDark, phase }) {
  return (
    <header className="site-header">
      <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Court Order home">
        <BrandMark />
        <span>COURT ORDER</span>
      </button>
      <div className="header-meta">
        <span className="phase-label">{phase === 'setup' ? 'Select roster' : phase === 'sorting' ? 'Live ranking' : 'Final order'}</span>
        <button className="icon-button" onClick={onToggleDark} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}>
          <Icon name={dark ? 'sun' : 'moon'} />
        </button>
      </div>
    </header>
  )
}

function Portrait({ player, compact = false }) {
  const [failed, setFailed] = useState(false)
  const school = schoolMap[player.schoolId]
  const initials = player.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('')
  useEffect(() => setFailed(false), [player.id])
  return (
    <div className={`portrait ${compact ? 'portrait--compact' : ''}`} style={{ '--team': school.color, '--team-accent': school.accent }}>
      <div className="court-lines" aria-hidden="true"><span /><span /></div>
      {!failed && <img src={player.image} alt="" onError={() => setFailed(true)} />}
      {failed && <span className="portrait-initials">{initials}</span>}
      <span className="portrait-code">{school.short}</span>
    </div>
  )
}

function SchoolToggle({ school, active, onToggle }) {
  return (
    <button className={`school-toggle ${active ? 'is-active' : ''}`} onClick={() => onToggle(school.id)} aria-pressed={active}>
      <span className="school-swatch" style={{ '--school-color': school.color, '--school-accent': school.accent }}>{school.short}</span>
      <span>{school.name}</span>
      <span className="toggle-check"><Icon name="check" size={15} /></span>
    </button>
  )
}

function Setup({ selected, setSelected, onStart, onLoad, hasSave }) {
  const selectedPlayers = players.filter((player) => selected.includes(player.schoolId))
  const allSelected = selected.length === schools.length
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const setAll = () => setSelected(allSelected ? [] : schools.map((school) => school.id))

  return (
    <main className="setup-page page-shell">
      <section className="setup-hero">
        <div className="hero-copy">
          <h1>Rank the<br/><em>court.</em></h1>
          <p>Choose between two characters at a time. We’ll turn every instinctive pick into your definitive Prince of Tennis ranking.</p>
        </div>
        <div className="hero-score" aria-label={`${selectedPlayers.length} characters selected`}>
          <span className="score-number">{String(selectedPlayers.length).padStart(2, '0')}</span>
          <span className="score-rule" />
          <span>players<br/>on court</span>
        </div>
      </section>

      <section className="roster-section">
        <div className="section-heading">
          <div>
            <h2>Build your draw</h2>
            <p>Select at least two schools or teams to begin.</p>
          </div>
          <button className="text-button" onClick={setAll}>{allSelected ? 'Clear all' : 'Select all'}</button>
        </div>
        <div className="school-grid">
          {schools.map((school) => <SchoolToggle key={school.id} school={school} active={selected.includes(school.id)} onToggle={toggle} />)}
        </div>
      </section>

      <section className="start-rail">
        <div className="start-note">
          <span className="keycap">H</span><span className="keycap">L</span>
          <span>Keyboard friendly. Your progress is saved on this device.</span>
        </div>
        <div className="start-actions">
          {hasSave && <button className="secondary-button" onClick={onLoad}>Continue saved sort</button>}
          <button className="primary-button" onClick={onStart} disabled={selectedPlayers.length < 2}>
            Start sorting <Icon name="arrow" />
          </button>
        </div>
      </section>
    </main>
  )
}

function CandidateCard({ ids, side, onChoose }) {
  const player = playerMap[ids[0]]
  const school = schoolMap[player.schoolId]
  return (
    <button className={`candidate candidate--${side}`} onClick={onChoose} style={{ '--team': school.color, '--team-accent': school.accent }}>
      <div className="candidate-visual">
        <Portrait player={player} />
        {ids.length > 1 && <span className="tie-stack">+{ids.length - 1} tied</span>}
        <span className="pick-cue">Pick {side}<Icon name="arrow" size={17} /></span>
      </div>
      <div className="candidate-copy">
        <span className="candidate-school">{school.name}</span>
        <h2>{player.name}</h2>
        {ids.length > 1 && <p>Grouped with {ids.slice(1).map((id) => playerMap[id].name).join(', ')}</p>}
      </div>
    </button>
  )
}

function Sorting({ sortState, count, onChoice, onUndo, canUndo, onSave, savedAt }) {
  const { state, pair } = currentPair(sortState)
  const estimate = estimateComparisons(count)
  const percent = Math.min(98, Math.max(state.comparisons ? 1 : 0, Math.round((state.comparisons / estimate) * 100)))
  if (!pair) return null

  return (
    <main className="sorting-page page-shell">
      <section className="sort-status">
        <div>
          <span>Comparison {String(state.comparisons + 1).padStart(2, '0')}</span>
          <strong>{percent}% sorted</strong>
        </div>
        <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>
        <div className="sort-utilities">
          <button className="utility-button" onClick={onUndo} disabled={!canUndo}><Icon name="undo" size={18} /> Undo <kbd>J</kbd></button>
          <button className="utility-button" onClick={onSave}><Icon name="save" size={18} /> {savedAt ? 'Saved' : 'Save'} <kbd>S</kbd></button>
        </div>
      </section>

      <section className="comparison-grid">
        <CandidateCard ids={pair[0]} side="left" onChoose={() => onChoice('left')} />
        <div className="versus"><span>VS</span></div>
        <CandidateCard ids={pair[1]} side="right" onChoose={() => onChoice('right')} />
      </section>

      <section className="tie-action">
        <button onClick={() => onChoice('tie')}>
          <span>Can’t choose?</span>
          <strong>Call it a tie</strong>
          <kbd>K</kbd>
        </button>
        <p>Left <kbd>H</kbd> · Tie <kbd>K</kbd> · Right <kbd>L</kbd></p>
      </section>
    </main>
  )
}

function ResultRow({ group, rank, podium }) {
  const lead = playerMap[group[0]]
  return (
    <div className={`result-row ${podium ? 'result-row--podium' : ''}`}>
      <span className="result-rank">{String(rank).padStart(2, '0')}</span>
      <Portrait player={lead} compact />
      <div className="result-name">
        <strong>{lead.name}</strong>
        <span>{schoolMap[lead.schoolId].name}{group.length > 1 ? ` · tied with ${group.slice(1).map((id) => playerMap[id].name).join(', ')}` : ''}</span>
      </div>
      <span className="result-seed">{schoolMap[lead.schoolId].short}</span>
    </div>
  )
}

function Results({ groups, onRestart }) {
  const [notice, setNotice] = useState('')
  const ranked = []
  let rank = 1
  groups.forEach((group) => {
    ranked.push({ group, rank })
    rank += group.length
  })
  const top = ranked[0]?.group.map((id) => playerMap[id].name).join(' & ')

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
      setNotice('Copy unavailable in this browser')
    }
  }

  const copyList = () => copyValue(ranked.map(({ group, rank: itemRank }) => `${itemRank}. ${group.map((id) => playerMap[id].name).join(' = ')}`).join('\n'), 'Ranking copied')
  const copyLink = () => copyValue(shareUrl(), 'Result link copied')

  const downloadImage = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 1500
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#f2f3ed'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#cfff45'
    ctx.fillRect(70, 70, 1060, 14)
    ctx.fillStyle = '#121914'
    ctx.font = '900 96px Arial'
    ctx.fillText('COURT ORDER', 70, 190)
    ctx.font = '28px Arial'
    ctx.fillStyle = '#5d655f'
    ctx.fillText('MY PRINCE OF TENNIS RANKING', 74, 240)
    ranked.slice(0, 15).forEach(({ group, rank: itemRank }, index) => {
      const y = 330 + index * 70
      ctx.fillStyle = index < 3 ? '#121914' : '#d7dbd3'
      ctx.fillRect(70, y - 42, 1060, 56)
      ctx.fillStyle = index < 3 ? '#cfff45' : '#121914'
      ctx.font = '700 23px Arial'
      ctx.fillText(String(itemRank).padStart(2, '0'), 94, y - 5)
      ctx.fillStyle = index < 3 ? '#ffffff' : '#121914'
      ctx.fillText(group.map((id) => playerMap[id].name).join(' = '), 170, y - 5)
    })
    ctx.fillStyle = '#5d655f'
    ctx.font = '20px Arial'
    ctx.fillText('Made with Court Order', 70, 1450)
    const link = document.createElement('a')
    link.download = 'court-order-ranking.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
    setNotice('Ranking image downloaded')
  }

  return (
    <main className="results-page page-shell">
      <section className="results-hero">
        <div>
          <span className="results-label">Your final order</span>
          <h1>Game, set,<br/><em>{top}.</em></h1>
        </div>
        <p>You made it through every matchup. Here’s the ranking your choices built—ties and all.</p>
      </section>

      <section className="results-layout">
        <div className="results-list">
          {ranked.map(({ group, rank: itemRank }, index) => <ResultRow key={group.join('-')} group={group} rank={itemRank} podium={index < 3} />)}
        </div>
        <aside className="result-actions">
          <div className="result-actions-inner">
            <h2>Take it with you</h2>
            <p>Share the result, save a graphic, or copy a clean text ranking.</p>
            <button onClick={copyLink}><Icon name="link" /> Copy result link</button>
            <button onClick={downloadImage}><Icon name="image" /> Download image</button>
            <button onClick={copyList}><Icon name="copy" /> Copy text list</button>
            <button className="restart-button" onClick={onRestart}><Icon name="restart" /> Start a new sort</button>
            {notice && <span className="notice" role="status">{notice}</span>}
          </div>
        </aside>
      </section>
    </main>
  )
}

function parseSharedResult() {
  if (!window.location.hash.startsWith('#result=')) return null
  try {
    const raw = decodeURIComponent(window.location.hash.slice(8))
    const groups = raw.split(',').map((group) => group.split('~').filter((id) => playerMap[id])).filter((group) => group.length)
    return groups.length ? groups : null
  } catch { return null }
}

export default function App() {
  const sharedResult = useMemo(parseSharedResult, [])
  const [dark, setDark] = useState(() => localStorage.getItem('court-order-theme') === 'dark')
  const [phase, setPhase] = useState(sharedResult ? 'results' : 'setup')
  const [selected, setSelected] = useState(schools.map((school) => school.id))
  const [sortState, setSortState] = useState(null)
  const [history, setHistory] = useState([])
  const [savedAt, setSavedAt] = useState(null)
  const [hasSave, setHasSave] = useState(() => Boolean(localStorage.getItem(STORAGE_KEY)))
  const resultGroups = sharedResult || (sortState ? getResult(sortState) : null)
  const selectedCount = players.filter((player) => selected.includes(player.schoolId)).length

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('court-order-theme', dark ? 'dark' : 'light')
  }, [dark])

  const start = useCallback(() => {
    const ids = players.filter((player) => selected.includes(player.schoolId)).map((player) => player.id)
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ phase: 'sorting', selected, sortState }))
    setSavedAt(new Date())
    setHasSave(true)
  }, [selected, sortState])

  const load = useCallback(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
      if (!saved?.sortState) return
      setSelected(saved.selected || schools.map((school) => school.id))
      setSortState(saved.sortState)
      setHistory([])
      setPhase(getResult(saved.sortState) ? 'results' : 'sorting')
      window.scrollTo(0, 0)
    } catch { localStorage.removeItem(STORAGE_KEY); setHasSave(false) }
  }, [])

  const choose = useCallback((choice) => {
    if (!sortState) return
    setHistory((items) => [...items, sortState])
    const next = applyChoice(sortState, choice)
    setSortState(next)
    if (getResult(next)) {
      setPhase('results')
      localStorage.removeItem(STORAGE_KEY)
      setHasSave(false)
      window.scrollTo(0, 0)
    }
    setSavedAt(null)
  }, [sortState])

  const undo = useCallback(() => {
    if (!history.length) return
    setSortState(history[history.length - 1])
    setHistory((items) => items.slice(0, -1))
    setSavedAt(null)
  }, [history])

  const restart = useCallback(() => {
    window.history.replaceState(null, '', window.location.pathname)
    setPhase('setup')
    setSortState(null)
    setHistory([])
    setSavedAt(null)
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      const key = event.key.toLowerCase()
      if (phase === 'setup') {
        if (key === 'enter' || key === 's') start()
        if (key === 'l' && hasSave) load()
      } else if (phase === 'sorting') {
        if (key === 'h' || key === 'arrowleft' || key === '1') choose('left')
        if (key === 'k' || key === 'arrowup' || key === '2') choose('tie')
        if (key === 'l' || key === 'arrowright' || key === '3') choose('right')
        if (key === 'j' || key === 'arrowdown') undo()
        if (key === 's') save()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [phase, start, choose, undo, save, load, hasSave])

  return (
    <div className="app">
      <Header dark={dark} onToggleDark={() => setDark((value) => !value)} phase={phase} />
      {phase === 'setup' && <Setup selected={selected} setSelected={setSelected} onStart={start} onLoad={load} hasSave={hasSave} />}
      {phase === 'sorting' && sortState && <Sorting sortState={sortState} count={selectedCount} onChoice={choose} onUndo={undo} canUndo={history.length > 0} onSave={save} savedAt={savedAt} />}
      {phase === 'results' && resultGroups && <Results groups={resultGroups} onRestart={restart} />}
      <footer><span>COURT ORDER</span><span>Choose fast. Trust the ranking.</span></footer>
    </div>
  )
}
