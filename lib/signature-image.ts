"use client"

/**
 * Traitement de l'image de signature directement dans le navigateur.
 *
 * Objectif : transformer une signature scannée/photographiée (fond blanc ou
 * fond noir opaque) en un PNG à fond transparent, avec l'encre nette, afin
 * qu'elle se pose proprement sur le certificat sans masquer le filigrane.
 *
 * Principe :
 *  1. On échantillonne la couleur de fond sur les bords de l'image.
 *  2. Pour chaque pixel, l'opacité (alpha) dépend de sa distance à ce fond :
 *     proche du fond -> transparent ; éloigné (= encre) -> opaque.
 *  3. On conserve la couleur d'origine de l'encre (stylo noir, bleu…).
 *  4. Un seuil plancher supprime le voile résiduel autour des traits.
 */

const MAX_DIMENSION = 1200

export interface ProcessSignatureOptions {
  /** Rendre le fond transparent automatiquement (défaut : true). */
  removeBackground?: boolean
}

function loadHtmlImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("IMAGE_DECODE_FAILED"))
    img.src = dataUrl
  })
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("IMAGE_READ_FAILED"))
    reader.readAsDataURL(file)
  })
}

/** Médiane d'un tableau (utilisée pour estimer la couleur de fond). */
function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * Convertit l'image (data URL) en PNG à fond transparent.
 * Retourne le data URL traité, ou l'original si le traitement échoue.
 */
export async function processSignatureImage(
  dataUrl: string,
  options: ProcessSignatureOptions = {},
): Promise<string> {
  const removeBackground = options.removeBackground ?? true
  try {
    const img = await loadHtmlImage(dataUrl)

    let width = img.naturalWidth
    let height = img.naturalHeight
    if (width === 0 || height === 0) return dataUrl

    // Réduction si l'image est très grande (PDF n'a pas besoin de plus).
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height))
    width = Math.round(width * scale)
    height = Math.round(height * scale)

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return dataUrl

    ctx.drawImage(img, 0, 0, width, height)

    if (!removeBackground) {
      return canvas.toDataURL("image/png")
    }

    const image = ctx.getImageData(0, 0, width, height)
    const data = image.data

    // 1) Estimation de la couleur de fond à partir des pixels de bordure.
    const borderR: number[] = []
    const borderG: number[] = []
    const borderB: number[] = []
    const sampleBorder = (x: number, y: number) => {
      const i = (y * width + x) * 4
      borderR.push(data[i])
      borderG.push(data[i + 1])
      borderB.push(data[i + 2])
    }
    for (let x = 0; x < width; x += 1) {
      sampleBorder(x, 0)
      sampleBorder(x, height - 1)
    }
    for (let y = 0; y < height; y += 1) {
      sampleBorder(0, y)
      sampleBorder(width - 1, y)
    }
    const bgR = median(borderR)
    const bgG = median(borderG)
    const bgB = median(borderB)

    // 2) Seuils de distance (sur 0..441 en distance euclidienne RVB).
    const NEAR = 48 // en dessous : considéré comme fond -> transparent
    const FAR = 130 // au dessus : encre pleine -> opaque
    const FLOOR_ALPHA = 30 // plancher : tout ce qui est plus transparent est effacé

    for (let i = 0; i < data.length; i += 4) {
      const dr = data[i] - bgR
      const dg = data[i + 1] - bgG
      const db = data[i + 2] - bgB
      const dist = Math.sqrt(dr * dr + dg * dg + db * db)

      let alpha: number
      if (dist <= NEAR) {
        alpha = 0
      } else if (dist >= FAR) {
        alpha = 255
      } else {
        alpha = Math.round(((dist - NEAR) / (FAR - NEAR)) * 255)
      }

      if (alpha < FLOOR_ALPHA) alpha = 0

      data[i + 3] = alpha
    }

    ctx.putImageData(image, 0, 0)
    return canvas.toDataURL("image/png")
  } catch {
    return dataUrl
  }
}
