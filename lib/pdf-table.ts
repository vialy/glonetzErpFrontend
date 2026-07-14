import { sanitizeTextForPdf } from "@/lib/pdf-text"

type JsPdfDoc = {
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } }
  setFillColor: (r: number, g: number, b: number) => void
  setDrawColor: (r: number, g: number, b: number) => void
  setTextColor: (r: number, g: number, b: number) => void
  setFontSize: (size: number) => void
  text: (text: string, x: number, y: number, options?: { align?: "left" | "center" | "right"; maxWidth?: number }) => void
  rect: (x: number, y: number, w: number, h: number, style?: "S" | "F" | "FD") => void
  line: (x1: number, y1: number, x2: number, y2: number) => void
  splitTextToSize: (text: string, maxWidth: number) => string[]
  addPage: () => void
}

export type PdfTableColumn = {
  header: string
  width: number
  align?: "left" | "center" | "right"
}

export type PdfTableOptions = {
  x?: number
  startY: number
  rowHeight?: number
  headerHeight?: number
  fontSize?: number
  headerFontSize?: number
  headerFill?: [number, number, number]
  headerText?: [number, number, number]
  rowFillEven?: [number, number, number]
  rowFillOdd?: [number, number, number]
  borderColor?: [number, number, number]
  textColor?: [number, number, number]
  footerRow?: string[]
  footerFill?: [number, number, number]
  footerText?: [number, number, number]
  repeatHeaderOnNewPage?: boolean
  bottomMargin?: number
  /** Couleur optionnelle par cellule (lignes + pied de tableau). */
  getCellTextColor?: (
    rowIndex: number,
    colIndex: number,
    context: "body" | "footer",
  ) => [number, number, number] | undefined
}

function cellText(
  doc: JsPdfDoc,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
  align: "left" | "center" | "right",
  fontSize: number,
) {
  const pad = 2
  const safe = sanitizeTextForPdf(value)
  const lines = doc.splitTextToSize(safe, width - pad * 2)
  const line = lines[0] ?? ""
  doc.setFontSize(fontSize)
  const textY = y + height / 2 + fontSize * 0.12
  const textX =
    align === "right" ? x + width - pad : align === "center" ? x + width / 2 : x + pad
  doc.text(line, textX, textY, { align, maxWidth: width - pad * 2 })
}

function drawHeaderRow(
  doc: JsPdfDoc,
  x: number,
  y: number,
  columns: PdfTableColumn[],
  tableWidth: number,
  headerHeight: number,
  headerFontSize: number,
  headerFill: [number, number, number],
  headerText: [number, number, number],
  borderColor: [number, number, number],
) {
  doc.setFillColor(...headerFill)
  doc.setDrawColor(...borderColor)
  doc.rect(x, y, tableWidth, headerHeight, "FD")
  let cx = x
  for (const col of columns) {
    doc.setTextColor(...headerText)
    cellText(doc, col.header, cx, y, col.width, headerHeight, col.align ?? "left", headerFontSize)
    if (cx > x) {
      doc.setDrawColor(...borderColor)
      doc.line(cx, y, cx, y + headerHeight)
    }
    cx += col.width
  }
}

/**
 * Dessine un tableau pagine avec en-tete colore et lignes alternees.
 * Retourne la position Y finale.
 */
export function drawPdfTable(
  doc: JsPdfDoc,
  columns: PdfTableColumn[],
  rows: string[][],
  options: PdfTableOptions,
): number {
  const pageHeight = doc.internal.pageSize.getHeight()
  const x = options.x ?? 14
  const rowHeight = options.rowHeight ?? 7
  const headerHeight = options.headerHeight ?? 8
  const fontSize = options.fontSize ?? 8
  const headerFontSize = options.headerFontSize ?? 9
  const headerFill = options.headerFill ?? [79, 70, 229]
  const headerText = options.headerText ?? [255, 255, 255]
  const rowFillEven = options.rowFillEven ?? [248, 250, 252]
  const rowFillOdd = options.rowFillOdd ?? [255, 255, 255]
  const borderColor = options.borderColor ?? [226, 232, 240]
  const textColor = options.textColor ?? [15, 23, 42]
  const footerFill = options.footerFill ?? [224, 231, 255]
  const footerText = options.footerText ?? [30, 27, 75]
  const bottomMargin = options.bottomMargin ?? 18
  const repeatHeader = options.repeatHeaderOnNewPage ?? true
  const tableWidth = columns.reduce((sum, col) => sum + col.width, 0)

  let y = options.startY

  const ensureSpace = (needed: number) => {
    if (y + needed <= pageHeight - bottomMargin) return
    doc.addPage()
    y = 16
    if (repeatHeader) {
      drawHeaderRow(doc, x, y, columns, tableWidth, headerHeight, headerFontSize, headerFill, headerText, borderColor)
      y += headerHeight
    }
  }

  drawHeaderRow(doc, x, y, columns, tableWidth, headerHeight, headerFontSize, headerFill, headerText, borderColor)
  y += headerHeight

  rows.forEach((row, index) => {
    ensureSpace(rowHeight)
    const fill = index % 2 === 0 ? rowFillEven : rowFillOdd
    doc.setFillColor(...fill)
    doc.setDrawColor(...borderColor)
    doc.rect(x, y, tableWidth, rowHeight, "FD")

    let cx = x
    columns.forEach((col, colIndex) => {
      const cellColor = options.getCellTextColor?.(index, colIndex, "body")
      doc.setTextColor(...(cellColor ?? textColor))
      cellText(doc, row[colIndex] ?? "", cx, y, col.width, rowHeight, col.align ?? "left", fontSize)
      if (cx > x) {
        doc.setDrawColor(...borderColor)
        doc.line(cx, y, cx, y + rowHeight)
      }
      cx += col.width
    })
    y += rowHeight
  })

  if (options.footerRow) {
    ensureSpace(rowHeight + 1)
    doc.setFillColor(...footerFill)
    doc.setDrawColor(...borderColor)
    doc.rect(x, y, tableWidth, rowHeight + 1, "FD")
    let cx = x
    columns.forEach((col, colIndex) => {
      const cellColor = options.getCellTextColor?.(0, colIndex, "footer")
      doc.setTextColor(...(cellColor ?? footerText))
      cellText(
        doc,
        options.footerRow![colIndex] ?? "",
        cx,
        y,
        col.width,
        rowHeight + 1,
        col.align ?? "left",
        fontSize + 0.5,
      )
      if (cx > x) {
        doc.setDrawColor(...borderColor)
        doc.line(cx, y, cx, y + rowHeight + 1)
      }
      cx += col.width
    })
    y += rowHeight + 1
  }

  return y
}
