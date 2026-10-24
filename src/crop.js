// Cover-crop an image into a box while keeping the face (fx, fy in 0-100)
// as close to the middle of the box as the image edges allow.
export const coverCrop = (imageWidth, imageHeight, boxWidth, boxHeight, fx = 50, fy = 30) => {
  const scale = Math.max(boxWidth / imageWidth, boxHeight / imageHeight)
  const sw = boxWidth / scale
  const sh = boxHeight / scale
  const clamp = (value, max) => Math.min(Math.max(value, 0), max)
  const sx = clamp((fx / 100) * imageWidth - sw / 2, imageWidth - sw)
  const sy = clamp((fy / 100) * imageHeight - sh / 2, imageHeight - sh)
  return { sx, sy, sw, sh }
}

// The same crop expressed as a CSS object-position for an object-fit: cover image.
export const coverPosition = (imageWidth, imageHeight, boxWidth, boxHeight, fx, fy) => {
  const { sx, sy, sw, sh } = coverCrop(imageWidth, imageHeight, boxWidth, boxHeight, fx, fy)
  const x = imageWidth - sw > 0.5 ? (sx / (imageWidth - sw)) * 100 : 50
  const y = imageHeight - sh > 0.5 ? (sy / (imageHeight - sh)) * 100 : 50
  return `${x.toFixed(1)}% ${y.toFixed(1)}%`
}

export const imageSourcesFor = (player) => (player.image ? [player.image] : [])
