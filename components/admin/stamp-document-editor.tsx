"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileUp,
  Loader2,
  PenLine,
  Plus,
  Stamp,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { StampOverlayItem } from "@/components/admin/stamp-overlay-item"
import { SignatureService } from "@/services/signature.service"
import { StampService } from "@/services/stamp.service"
import {
  exportStampedPdf,
  downloadPdfBytes,
  loadPdfDocument,
  loadImageDimensions,
  newPlacement,
  normalizedBoxForImage,
  renderPdfPage,
  type PdfDocumentProxy,
  type StampPlacement,
} from "@/lib/stamp-pdf"

const MAX_PDF_SIZE = 15 * 1024 * 1024

type StampDocumentEditorProps = {
  onManageSignature: () => void
  onManageStamp: () => void
}

export function StampDocumentEditor({ onManageSignature, onManageStamp }: StampDocumentEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null)
  const [fileName, setFileName] = useState("document")
  const [pdfDoc, setPdfDoc] = useState<PdfDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [displayScale, setDisplayScale] = useState(1)
  const [placements, setPlacements] = useState<StampPlacement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [exporting, setExporting] = useState(false)

  const [signature, setSignature] = useState<string | null>(null)
  const [stamp, setStamp] = useState<string | null>(null)

  useEffect(() => {
    setSignature(SignatureService.get())
    setStamp(StampService.get())
    const onSig = () => setSignature(SignatureService.get())
    const onStamp = () => setStamp(StampService.get())
    window.addEventListener("certificate-signature-updated", onSig)
    window.addEventListener("company-stamp-updated", onStamp)
    return () => {
      window.removeEventListener("certificate-signature-updated", onSig)
      window.removeEventListener("company-stamp-updated", onStamp)
    }
  }, [])

  useEffect(() => {
    if (!canvasSize.width) return
    const updateScale = () => {
      const maxW = viewportRef.current?.clientWidth ?? canvasSize.width
      setDisplayScale(Math.min(1, maxW / canvasSize.width))
    }
    updateScale()
    window.addEventListener("resize", updateScale)
    return () => window.removeEventListener("resize", updateScale)
  }, [canvasSize.width])

  const renderPage = useCallback(async (doc: PdfDocumentProxy, pageIndex: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    setRendering(true)
    try {
      const size = await renderPdfPage(doc, pageIndex, canvas)
      setCanvasSize(size)
    } finally {
      setRendering(false)
    }
  }, [])

  useEffect(() => {
    if (!pdfDoc) return
    void renderPage(pdfDoc, currentPage)
  }, [pdfDoc, currentPage, renderPage])

  async function handlePdfFile(file: File | undefined) {
    if (!file) return
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "Format non supporté", description: "Importez un fichier PDF.", variant: "destructive" })
      return
    }
    if (file.size > MAX_PDF_SIZE) {
      toast({ title: "Fichier trop lourd", description: "Taille maximale : 15 Mo.", variant: "destructive" })
      return
    }
    setLoadingPdf(true)
    try {
      const bytes = await file.arrayBuffer()
      const doc = await loadPdfDocument(bytes)
      setPdfBytes(bytes)
      setFileName(file.name.replace(/\.pdf$/i, "") || "document")
      setPdfDoc(doc)
      setPageCount(doc.numPages)
      setCurrentPage(0)
      setPlacements([])
      setSelectedId(null)
    } catch {
      toast({ title: "PDF illisible", description: "Impossible d'ouvrir ce fichier.", variant: "destructive" })
    } finally {
      setLoadingPdf(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function addOverlay(type: "signature" | "stamp") {
    const asset = type === "signature" ? signature : stamp
    if (!asset) {
      toast({
        title: type === "signature" ? "Signature manquante" : "Cachet manquant",
        description: "Importez d'abord l'image dans les paramètres ci-dessus.",
        variant: "destructive",
      })
      return
    }
    void (async () => {
      try {
        const dims = await loadImageDimensions(asset)
        const pageAspect =
          canvasSize.width > 0 && canvasSize.height > 0
            ? { w: canvasSize.width, h: canvasSize.height }
            : { w: 595, h: 842 }
        const box = normalizedBoxForImage(
          dims.width,
          dims.height,
          pageAspect.w,
          pageAspect.h,
          type === "stamp" ? 0.14 : 0.09,
        )
        const placement = newPlacement(type, currentPage, box)
        setPlacements((prev) => [...prev, placement])
        setSelectedId(placement.id)
      } catch {
        const placement = newPlacement(type, currentPage)
        setPlacements((prev) => [...prev, placement])
        setSelectedId(placement.id)
      }
    })()
  }

  function updatePlacement(id: string, next: StampPlacement) {
    setPlacements((prev) => prev.map((p) => (p.id === id ? next : p)))
  }

  function removePlacement(id: string) {
    setPlacements((prev) => prev.filter((p) => p.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  async function handleExport() {
    if (!pdfBytes) return
    if (placements.length === 0) {
      toast({ title: "Aucun élément", description: "Ajoutez une signature ou un cachet.", variant: "destructive" })
      return
    }
    setExporting(true)
    try {
      const out = await exportStampedPdf(pdfBytes, placements, { signature, stamp })
      downloadPdfBytes(out, `${fileName}-cachete.pdf`)
      toast({ title: "PDF téléchargé", description: `${fileName}-cachete.pdf` })
    } catch {
      toast({ title: "Export impossible", variant: "destructive" })
    } finally {
      setExporting(false)
    }
  }

  const pagePlacements = placements.filter((p) => p.page === currentPage)

  return (
    <div className="space-y-4">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loadingPdf}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {loadingPdf ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
          Importer un PDF
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => void handlePdfFile(e.target.files?.[0])}
        />

        <span className="mx-1 hidden h-6 w-px bg-border sm:block" />

        <button
          type="button"
          onClick={onManageSignature}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted/50"
        >
          <PenLine className="size-4" />
          Signature {signature ? "✓" : "—"}
        </button>
        <button
          type="button"
          onClick={onManageStamp}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted/50"
        >
          <Stamp className="size-4" />
          Cachet {stamp ? "✓" : "—"}
        </button>

        {pdfDoc ? (
          <>
            <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
            <button
              type="button"
              onClick={() => addOverlay("signature")}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted/50"
            >
              <Plus className="size-4" /> Signature
            </button>
            <button
              type="button"
              onClick={() => addOverlay("stamp")}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted/50"
            >
              <Plus className="size-4" /> Cachet
            </button>
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={exporting}
              className="ml-auto inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Télécharger le PDF
            </button>
          </>
        ) : null}
      </div>

      {/* Zone d'édition */}
      {!pdfDoc ? (
        <div
          className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/20 p-8 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files?.[0]
            void handlePdfFile(file)
          }}
        >
          <FileUp className="mb-3 size-10 text-muted-foreground" />
          <p className="text-sm font-medium">Glissez un PDF ici ou cliquez sur « Importer un PDF »</p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            Placez votre signature et le cachet de l&apos;entreprise où vous le souhaitez, puis téléchargez le
            document final.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 0}
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              className="rounded-lg border p-2 disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-medium">
              Page {currentPage + 1} / {pageCount}
            </span>
            <button
              type="button"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setCurrentPage((p) => Math.min(pageCount - 1, p + 1))}
              className="rounded-lg border p-2 disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div
            ref={viewportRef}
            className="w-full max-w-full overflow-auto rounded-lg border bg-muted/30 shadow-inner"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setSelectedId(null)
            }}
          >
            {(rendering || loadingPdf) && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
            )}
            <div
              className="relative mx-auto"
              style={{
                width: canvasSize.width * displayScale,
                height: canvasSize.height * displayScale,
              }}
            >
              <div
                className="relative origin-top-left"
                style={{
                  width: canvasSize.width,
                  height: canvasSize.height,
                  transform: `scale(${displayScale})`,
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <canvas ref={canvasRef} className="block" />
                {canvasSize.width > 0
                  ? pagePlacements.map((placement) => {
                      const src = placement.type === "signature" ? signature : stamp
                      if (!src) return null
                      return (
                        <StampOverlayItem
                          key={placement.id}
                          placement={placement}
                          imageSrc={src}
                          canvasWidth={canvasSize.width}
                          canvasHeight={canvasSize.height}
                          selected={selectedId === placement.id}
                          label={placement.type === "signature" ? "Signature" : "Cachet"}
                          onSelect={() => setSelectedId(placement.id)}
                          onChange={(next) => updatePlacement(placement.id, next)}
                          onRemove={() => removePlacement(placement.id)}
                        />
                      )
                    })
                  : null}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Cliquez sur un élément pour le sélectionner. Glissez pour déplacer, coin bas-droit pour redimensionner.
            {placements.length > 0
              ? ` ${placements.length} élément(s) sur le document.`
              : " Ajoutez une signature et/ou un cachet sur cette page."}
          </p>
        </div>
      )}
    </div>
  )
}
