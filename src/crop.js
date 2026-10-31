// Cover-crop an image into a box while keeping the face (fx, fy in 0-100)
// as close to the middle of the box as the image edges allow. zoom > 1 crops tighter around the face.
export const coverCrop = (imageWidth, imageHeight, boxWidth, boxHeight, fx = 50, fy = 30, zoom = 1) => {
  const scale = Math.max(boxWidth / imageWidth, boxHeight / imageHeight) * Math.max(1, zoom || 1)
  const sw = boxWidth / scale
  const sh = boxHeight / scale
  const clamp = (value, max) => Math.min(Math.max(value, 0), max)
  const sx = clamp((fx / 100) * imageWidth - sw / 2, imageWidth - sw)
  const sy = clamp((fy / 100) * imageHeight - sh / 2, imageHeight - sh)
  return { sx, sy, sw, sh }
}

// The same crop as size and offset for an absolutely positioned <img> inside the box
// (percentages of the box, so it stays right if the box resizes before the next measure).
export const coverFrame = (imageWidth, imageHeight, boxWidth, boxHeight, fx, fy, zoom) => {
  const { sx, sy, sw, sh } = coverCrop(imageWidth, imageHeight, boxWidth, boxHeight, fx, fy, zoom)
  return {
    width: `${((imageWidth / sw) * 100).toFixed(2)}%`,
    height: `${((imageHeight / sh) * 100).toFixed(2)}%`,
    left: `${(-(sx / sw) * 100).toFixed(2)}%`,
    top: `${(-(sy / sh) * 100).toFixed(2)}%`,
  }
}

export const imageSourcesFor = (player) => (player.image ? [player.image] : [])
