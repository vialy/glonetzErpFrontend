"use client"

export type StampOverlayType = "signature" | "stamp"

export interface StampPlacement {
  id: string
  type: StampOverlayType
  /** Index de page (0 = première page). */
  page: number
  /** Position et taille normalisées (0–1) par rapport à la page. */
  x: number
  y: number
  width: number
  height: number
}

export type PdfDocumentProxy = import("pdfjs-dist").PDFDocumentProxy

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function getPdfjs() {
  const pdfjs = await import("pdfjs-dist")
  if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
  }
  return pdfjs
}

export async function loadPdfDocument(bytes: ArrayBuffer): Promise<PdfDocumentProxy> {
  const pdfjs = await getPdfjs()
  const task = pdfjs.getDocument({ data: bytes.slice(0) })
  return task.promise
}

export async function renderPdfPage(
  pdf: PdfDocumentProxy,
  pageIndex: number,
  canvas: HTMLCanvasElement,
  scale = 1.4,
): Promise<{ width: number; height: number }> {
  const page = await pdf.getPage(pageIndex + 1)
  const viewport = page.getViewport({ scale })
  const context = canvas.getContext("2d")
  if (!context) throw new Error("CANVAS_CONTEXT_FAILED")
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  await page.render({ canvasContext: context, viewport, canvas }).promise
  return { width: canvas.width, height: canvas.height }
}

async function embedImage(pdfDoc: import("pdf-lib").PDFDocument, dataUrl: string) {
  const bytes = dataUrlToUint8Array(dataUrl)
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) {
    return pdfDoc.embedJpg(bytes)
  }
  return pdfDoc.embedPng(bytes)
}

/** Même logique que `object-contain` CSS : l'image tient dans le cadre sans déformation. */
function fitImageInPlacementBox(
  placement: StampPlacement,
  pageWidth: number,
  pageHeight: number,
  imageWidth: number,
  imageHeight: number,
) {
  const boxW = placement.width * pageWidth
  const boxH = placement.height * pageHeight
  const boxX = placement.x * pageWidth
  const boxTop = placement.y * pageHeight

  const scale = Math.min(boxW / imageWidth, boxH / imageHeight)
  const drawW = imageWidth * scale
  const drawH = imageHeight * scale
  const drawX = boxX + (boxW - drawW) / 2
  const drawYFromTop = boxTop + (boxH - drawH) / 2
  const drawY = pageHeight - drawYFromTop - drawH

  return { x: drawX, y: drawY, width: drawW, height: drawH }
}

export function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error("IMAGE_DECODE_FAILED"))
    img.src = dataUrl
  })
}

/**
 * Calcule largeur/hauteur normalisées pour un cadre dont le ratio physique
 * correspond à celui de l'image (signature horizontale, cachet carré, etc.).
 */
export function normalizedBoxForImage(
  imageWidth: number,
  imageHeight: number,
  pageWidth: number,
  pageHeight: number,
  targetHeightNorm = 0.1,
): { width: number; height: number } {
  const aspect = imageWidth / imageHeight
  const height = targetHeightNorm
  const width = height * aspect * (pageHeight / pageWidth)
  return {
    height,
    width: clamp01(width, 0.04, 0.9),
  }
}

export async function exportStampedPdf(
  pdfBytes: ArrayBuffer,
  placements: StampPlacement[],
  assets: { signature: string | null; stamp: string | null },
): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib")
  const pdfDoc = await PDFDocument.load(pdfBytes.slice(0))
  const pages = pdfDoc.getPages()

  for (const placement of placements) {
    const dataUrl = placement.type === "signature" ? assets.signature : assets.stamp
    if (!dataUrl) continue
    const page = pages[placement.page]
    if (!page) continue

    const { width: pageWidth, height: pageHeight } = page.getSize()
    const image = await embedImage(pdfDoc, dataUrl)
    const imgSize = image.scale(1)
    const fitted = fitImageInPlacementBox(
      placement,
      pageWidth,
      pageHeight,
      imgSize.width,
      imgSize.height,
    )

    page.drawImage(image, fitted)
  }

  return pdfDoc.save()
}

export function downloadPdfBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.slice()], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function clamp01(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

export function newPlacement(
  type: StampOverlayType,
  page: number,
  defaults?: Partial<Pick<StampPlacement, "x" | "y" | "width" | "height">>,
): StampPlacement {
  const base =
    type === "stamp"
      ? { x: 0.68, y: 0.72, width: 0.18, height: 0.18 }
      : { x: 0.52, y: 0.8, width: 0.24, height: 0.09 }
  return {
    id: crypto.randomUUID(),
    type,
    page,
    ...base,
    ...defaults,
  }
}
