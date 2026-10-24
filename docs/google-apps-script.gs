// Court Order: results collector.
// Paste this into Extensions → Apps Script of your private Google Sheet and deploy it as a web app
// (Execute as: Me, Who has access: Anyone). Each finished sort adds a row to "Results", and the
// "Ranking" tab is rebuilt with the overall popularity leaderboard. Only you can open the sheet.
//
// To fix data: delete rows on "Results", then run rebuildRanking from the Apps Script editor.

const RESULTS_SHEET = 'Results'
const RANKING_SHEET = 'Ranking'
const SEPARATOR = ' > '
const HEADER = ['Time', 'Teams', 'Characters ranked', '#1', '#2', '#3', 'Full ranking', 'Neither picks', 'Language']
const FULL_COLUMN = 7
const NEITHER_COLUMN = 8

function doPost(e) {
  const lock = LockService.getScriptLock()
  lock.waitLock(20000)
  try {
    const data = JSON.parse(e.postData.contents)
    const clean = (list, max) => (Array.isArray(list) ? list : []).map((name) => String(name).replace(/>/g, '').slice(0, 80)).filter(Boolean).slice(0, max)
    const ranking = clean(data.ranking, 300)
    if (ranking.length < 2) return reply('empty')
    const neither = clean(data.neither, 300)
    const teams = clean(data.teams, 30)

    const results = sheet(RESULTS_SHEET, HEADER)
    results.appendRow([
      new Date(data.time || Date.now()),
      teams.join(', '),
      ranking.length,
      ranking[0] || '',
      ranking[1] || '',
      ranking[2] || '',
      ranking.join(SEPARATOR),
      neither.join(', '),
      String(data.language || '').slice(0, 5),
    ])

    rebuildRanking()
    return reply('ok')
  } finally {
    lock.releaseLock()
  }
}

// People can sort different team selections, so a placement is scored by how high it is
// within that person's list: #1 = 100, last place = 0, everyone else in between.
// "Neither" picks score 0. The leaderboard is ordered by average score, then #1 finishes.
function rebuildRanking() {
  const results = sheet(RESULTS_SHEET, HEADER)
  const rowCount = results.getLastRow() - 1
  const fullCells = rowCount > 0 ? results.getRange(2, FULL_COLUMN, rowCount, 1).getValues() : []
  const neitherCells = rowCount > 0 ? results.getRange(2, NEITHER_COLUMN, rowCount, 1).getValues() : []
  const stats = {}
  const entryFor = (name) => stats[name] || (stats[name] = { scoreSum: 0, counted: 0, firsts: 0, top3: 0, top10: 0, ranked: 0, rankSum: 0, neither: 0 })

  fullCells.forEach(([cell]) => {
    const names = String(cell || '').split(SEPARATOR).map((name) => name.trim()).filter(Boolean)
    names.forEach((name, i) => {
      const entry = entryFor(name)
      entry.scoreSum += names.length > 1 ? ((names.length - 1 - i) / (names.length - 1)) * 100 : 100
      entry.counted += 1
      entry.ranked += 1
      entry.rankSum += i + 1
      if (i === 0) entry.firsts += 1
      if (i < 3) entry.top3 += 1
      if (i < 10) entry.top10 += 1
    })
  })
  neitherCells.forEach(([cell]) => String(cell || '').split(',').map((name) => name.trim()).filter(Boolean).forEach((name) => {
    const entry = entryFor(name)
    entry.neither += 1
    entry.counted += 1
  }))

  const columns = ['Rank', 'Character', 'Popularity score (0-100)', '#1 finishes', 'Top 3 finishes', 'Top 10 finishes', 'Times ranked', 'Average place', 'Neither picks']
  const round1 = (value) => Math.round(value * 10) / 10
  const table = Object.keys(stats)
    .map((name) => [name, stats[name]])
    .map(([name, s]) => [name, s, s.counted ? s.scoreSum / s.counted : 0])
    .sort((a, b) => b[2] - a[2] || b[1].firsts - a[1].firsts || b[1].counted - a[1].counted)
    .map(([name, s, score], i) => [i + 1, name, round1(score), s.firsts, s.top3, s.top10, s.ranked, s.ranked ? round1(s.rankSum / s.ranked) : '', s.neither])

  const ranking = sheet(RANKING_SHEET)
  ranking.clear()
  ranking.appendRow(columns)
  ranking.getRange(1, 1, 1, columns.length).setFontWeight('bold')
  if (table.length) ranking.getRange(2, 1, table.length, columns.length).setValues(table)
  ranking.setFrozenRows(1)
  ranking.getRange('A1').setNote(`Updated ${new Date().toLocaleString()} from ${fullCells.length} results`)
}

function sheet(name, header) {
  const book = SpreadsheetApp.getActiveSpreadsheet()
  let tab = book.getSheetByName(name)
  if (!tab) {
    tab = book.insertSheet(name)
    if (header) {
      tab.appendRow(header)
      tab.getRange(1, 1, 1, header.length).setFontWeight('bold')
      tab.setFrozenRows(1)
    }
  }
  return tab
}

function reply(text) {
  return ContentService.createTextOutput(text)
}
