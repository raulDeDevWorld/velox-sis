const POINTS_PER_MM = 72 / 25.4

export const TICKET_WIDTH_POINTS = 80 * POINTS_PER_MM

function glyphWidth(character, fontSize) {
  if (/\s/.test(character)) return fontSize * 0.28
  if (/[ilI1.,:;'|!]/.test(character)) return fontSize * 0.3
  if (/[MWÁÉÍÓÚÑmw@%&]/.test(character)) return fontSize * 0.78
  if (/[A-Z0-9]/.test(character)) return fontSize * 0.61
  return fontSize * 0.52
}

function textWidth(text, fontSize) {
  return [...String(text || '')].reduce((width, character) => width + glyphWidth(character, fontSize), 0)
}

export function estimateTextLines(text, width, fontSize) {
  if (!text) return 1

  return String(text).split(/\r?\n/).reduce((total, paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)
    if (!words.length) return total + 1

    let lines = 1
    let currentWidth = 0
    for (const word of words) {
      const wordWidth = textWidth(word, fontSize)
      const separatorWidth = currentWidth ? glyphWidth(' ', fontSize) : 0

      if (currentWidth && currentWidth + separatorWidth + wordWidth > width) {
        lines += Math.max(1, Math.ceil(wordWidth / width))
        currentWidth = wordWidth % width
      } else if (wordWidth > width) {
        lines += Math.ceil(wordWidth / width) - 1
        currentWidth = wordWidth % width
      } else {
        currentWidth += separatorWidth + wordWidth
      }
    }

    return total + lines
  }, 0)
}

export function textBlockHeight(text, width, fontSize, lineHeight = 1.2) {
  return estimateTextLines(text, width, fontSize) * fontSize * lineHeight
}

export function createTicketSize(contentHeight, { minimumHeight = 0, safetyMargin = 10 } = {}) {
  return [
    Math.ceil(TICKET_WIDTH_POINTS),
    Math.ceil(Math.max(contentHeight + safetyMargin, minimumHeight))
  ]
}
