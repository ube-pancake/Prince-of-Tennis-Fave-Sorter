import QRCode from 'qrcode'
import { coverCrop, imageSourcesFor } from './crop.js'
import { schoolMap } from './data.js'

const WIDTH = 1080
const MARGIN = 60
const INK = '#121914'
const MUTED = '#5d655f'
const ACCENT = '#cfff45'

const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = reject
  image.src = src
})

const loadPortrait = async (player) => {
  for (const src of imageSourcesFor(player)) {
    try { return await loadImage(src) } catch { /* try the next format */ }
  }
  return null
}

const drawPortrait = (ctx, player, image, x, y, w, h, initialsSize) => {
  const school = schoolMap[player.schoolId]
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.fillStyle = school.color
  ctx.fillRect(x, y, w, h)
  if (image) {
    const { sx, sy, sw, sh } = coverCrop(image.naturalWidth, image.naturalHeight, w, h, player.focus[0], player.focus[1])
    ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h)
  } else {
    ctx.fillStyle = school.accent
    ctx.font = `900 ${initialsSize}px "Arial Black", Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(player.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join(''), x + w / 2, y + h / 2)
  }
  ctx.restore()
}

// Draws a scannable QR code (dark modules on a white tile with a quiet zone) at x, y.
const drawQrCode = (ctx, text, x, y, size) => {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const quiet = 2
  const cell = size / (modules.size + quiet * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x, y, size, size)
  ctx.fillStyle = INK
  for (let row = 0; row < modules.size; row += 1) {
    for (let col = 0; col < modules.size; col += 1) {
      if (modules.get(row, col)) {
        // Overlap by a hair so anti-aliasing doesn't leave faint lines between modules.
        ctx.fillRect(x + (col + quiet) * cell, y + (row + quiet) * cell, cell + 0.5, cell + 0.5)
      }
    }
  }
}

// Splits text into at most `maxLines` lines that fit `maxWidth`, adding an ellipsis if cut.
const wrapText = (ctx, text, maxWidth, maxLines) => {
  const words = text.includes(' ') ? text.split(' ') : [...text]
  const joiner = text.includes(' ') ? ' ' : ''
  const lines = []
  let line = ''
  for (const word of words) {
    const next = line ? line + joiner + word : word
    if (ctx.measureText(next).width <= maxWidth || !line) line = next
    else { lines.push(line); line = word }
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  let last = kept[maxLines - 1]
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1)
  kept[maxLines - 1] = `${last}…`
  return kept
}

export async function buildRankingImage({ entries, title, heading, footer, schoolName, language, siteUrl, scanCaption }) {
  const font = language === 'ja' ? '"Hiragino Sans", "Yu Gothic UI", Meiryo, sans-serif' : 'Arial, sans-serif'
  const displayFont = language === 'ja' ? font : '"Arial Black", Arial, sans-serif'
  const podium = entries.slice(0, 3)
  const rest = entries.slice(3, 15)
  const images = await Promise.all(entries.slice(0, 15).map(({ player }) => loadPortrait(player)))

  const tileGap = 24
  const tileW = (WIDTH - MARGIN * 2 - tileGap * 2) / 3
  const tileH = Math.round(tileW * 1.25)
  const rowH = 104
  const colGap = 24
  const colW = (WIDTH - MARGIN * 2 - colGap) / 2
  const qrSize = 150
  const podiumTop = 300
  const podiumBottom = podium.length ? podiumTop + tileH + 120 : podiumTop
  const rowsTop = podiumBottom + 30
  const rowCount = Math.ceil(rest.length / 2)
  const height = rowsTop + rowCount * rowH + 110

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#f2f3ed'
  ctx.fillRect(0, 0, WIDTH, height)
  ctx.fillStyle = ACCENT
  ctx.fillRect(MARGIN, 60, WIDTH - MARGIN * 2, 14)
  ctx.fillStyle = INK
  ctx.font = `900 88px "Arial Black", Arial, sans-serif`
  ctx.fillText(title, MARGIN, 175)
  ctx.fillStyle = MUTED
  ctx.font = `700 26px ${font}`
  ctx.fillText(heading, MARGIN + 4, 220)

  if (siteUrl) {
    const qrX = WIDTH - MARGIN - qrSize
    drawQrCode(ctx, siteUrl, qrX, 98, qrSize)
    ctx.fillStyle = INK
    ctx.font = `800 16px ${font}`
    ctx.textAlign = 'center'
    ctx.fillText(scanCaption, qrX + qrSize / 2, 98 + qrSize + 26)
    ctx.textAlign = 'left'
  }

  podium.forEach(({ player, rank }, index) => {
    const x = MARGIN + index * (tileW + tileGap)
    drawPortrait(ctx, player, images[index], x, podiumTop, tileW, tileH, 110)
    ctx.fillStyle = ACCENT
    ctx.fillRect(x, podiumTop, 78, 56)
    ctx.fillStyle = INK
    ctx.font = `900 34px "Arial Black", Arial, sans-serif`
    ctx.fillText(String(rank).padStart(2, '0'), x + 12, podiumTop + 41)
    ctx.font = `900 30px ${displayFont}`
    const lines = wrapText(ctx, language === 'ja' ? player.label : player.label.toUpperCase(), tileW, 2)
    lines.forEach((line, lineIndex) => ctx.fillText(line, x, podiumTop + tileH + 42 + lineIndex * 34))
    ctx.fillStyle = MUTED
    ctx.font = `700 18px ${font}`
    ctx.fillText(schoolName(player.schoolId), x, podiumTop + tileH + 42 + lines.length * 34 + 6)
  })

  rest.forEach(({ player, rank }, index) => {
    const column = Math.floor(index / rowCount)
    const row = index % rowCount
    const x = MARGIN + column * (colW + colGap)
    const y = rowsTop + row * rowH
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x, y, colW, rowH - 14)
    drawPortrait(ctx, player, images[index + 3], x, y, rowH - 14, rowH - 14, 34)
    const textX = x + rowH - 14 + 18
    ctx.fillStyle = INK
    ctx.font = `900 22px "Arial Black", Arial, sans-serif`
    ctx.fillText(String(rank).padStart(2, '0'), textX, y + 36)
    ctx.font = `900 22px ${displayFont}`
    const [name] = wrapText(ctx, language === 'ja' ? player.label : player.label.toUpperCase(), colW - (textX - x) - 62, 1)
    ctx.fillText(name, textX + 46, y + 36)
    ctx.fillStyle = MUTED
    ctx.font = `700 16px ${font}`
    ctx.fillText(schoolName(player.schoolId), textX + 46, y + 64)
  })

  ctx.fillStyle = MUTED
  ctx.font = `20px ${font}`
  ctx.fillText(footer, MARGIN, height - 50)

  return { dataUrl: canvas.toDataURL('image/png') }
}
