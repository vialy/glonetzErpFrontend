"use client"

import { useEffect, useRef, useState } from "react"
import { Eye, Loader2 } from "lucide-react"
import { StampOverlayItem } from "@/components/admin/stamp-overlay-item"
import type { StampPlacement } from "@/lib/stamp-pdf"
import type { SchoolCertVisualPlacement } from "@/lib/school-cert-placement"
import type { SchoolCertificateTemplate } from "@/services/school-certificate-template.service"

const PREVIEW_WIDTH = 420

function toStampPlacement(id: string, type: "stamp" | "signature", p: SchoolCertVisualPlacement): StampPlacement {
  return { id, type, page: 0, x: p.x, y: p.y, width: p.width, height: p.height }
}

function fromStampPlacement(p: StampPlacement): SchoolCertVisualPlacement {
  return { x: p.x, y: p.y, width: p.width, height: p.height }
}

type SchoolCertificateLayoutEditorProps = {
  documentTitle: string
  stampPlacement: SchoolCertVisualPlacement
  signaturePlacement: SchoolCertVisualPlacement
  stampSrc: string | null
  signatureSrc: string | null
  onChange: (next: {
    stampPlacement: SchoolCertVisualPlacement
    signaturePlacement: SchoolCertVisualPlacement
  }) => void
  onPreviewPdf?: () => void
  previewPdfLoading?: boolean
}

export function SchoolCertificateLayoutEditor({
  documentTitle,
  stampPlacement,
  signaturePlacement,
  stampSrc,
  signatureSrc,
  onChange,
  onPreviewPdf,
  previewPdfLoading,
}: SchoolCertificateLayoutEditorProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: PREVIEW_WIDTH, height: Math.round(PREVIEW_WIDTH * (297 / 210)) })
  const [selected, setSelected] = useState<"stamp" | "signature" | null>("stamp")

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth || PREVIEW_WIDTH
      setCanvasSize({ width: w, height: Math.round(w * (297 / 210)) })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const stampP = toStampPlacement("school-stamp", "stamp", stampPlacement)
  const sigP = toStampPlacement("school-sig", "signature", signaturePlacement)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Aperçu visuel — glissez et redimensionnez</p>
        {onPreviewPdf ? (
          <button
            type="button"
            onClick={onPreviewPdf}
            disabled={previewPdfLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 disabled:opacity-50"
          >
            {previewPdfLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
            Aperçu PDF complet
          </button>
        ) : null}
      </div>

      <div
        ref={viewportRef}
        className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-lg border bg-white shadow-sm"
        style={{ aspectRatio: "210 / 297" }}
        onPointerDown={() => setSelected(null)}
      >
        <div className="absolute inset-0 overflow-hidden bg-white text-[7px] leading-tight text-gray-800">
          <div className="flex items-start justify-between px-3 pt-2 opacity-70">
            <div className="h-6 w-10 rounded bg-slate-200" />
            <div className="h-5 w-9 rounded bg-slate-200" />
          </div>
          <p className="mt-3 text-center text-[9px] font-bold text-[#0066cc]">{documentTitle}</p>
          <div className="mx-auto mt-0.5 h-px w-2/3 bg-[#0066cc]" />
          <div className="mt-3 space-y-1 px-4 text-[6.5px] text-gray-600">
            <p>Référence / Referenznummer : <span className="font-semibold text-gray-900">SCOL-XXXX</span></p>
            <p>Lieu et date / Ort und Datum : <span className="font-semibold text-gray-900">Douala</span></p>
            <p className="pt-1">La direction du centre Glonetz certifie…</p>
            <p>Nom : <span className="font-semibold">Jean DUPONT</span></p>
            <p>Date / lieu de naissance…</p>
            <p className="pt-1">Niveau : □ A1 □ A2 ■ B1 □ B2</p>
            <p className="text-[6px] leading-snug">
              Est actuellement inscrit(e) et suit des cours au sein de notre centre de langue Glonetz…
            </p>
          </div>
          <div className="absolute bottom-8 left-3 right-3 border-t-[2px] border-[#0066cc]" />
          <p className="absolute bottom-2 left-0 right-0 text-center text-[5px] text-gray-500">
            contact@bg-student.com
          </p>
        </div>

        <div
          className="absolute inset-0 touch-none"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {stampSrc ? (
            <StampOverlayItem
              placement={stampP}
              imageSrc={stampSrc}
              canvasWidth={canvasSize.width}
              canvasHeight={canvasSize.height}
              selected={selected === "stamp"}
              label="Cachet"
              onSelect={() => setSelected("stamp")}
              onChange={(next) =>
                onChange({ stampPlacement: fromStampPlacement(next), signaturePlacement })
              }
              onRemove={() => undefined}
              hideRemove
            />
          ) : (
            <button
              type="button"
              className="absolute left-[18%] top-[74%] rounded border border-dashed border-violet-400 bg-violet-50/80 px-2 py-1 text-[10px] text-violet-700"
              onClick={() => setSelected("stamp")}
            >
              Importez un cachet
            </button>
          )}

          {signatureSrc ? (
            <StampOverlayItem
              placement={sigP}
              imageSrc={signatureSrc}
              canvasWidth={canvasSize.width}
              canvasHeight={canvasSize.height}
              selected={selected === "signature"}
              label="Signature"
              onSelect={() => setSelected("signature")}
              onChange={(next) =>
                onChange({ stampPlacement, signaturePlacement: fromStampPlacement(next) })
              }
              onRemove={() => undefined}
              hideRemove
            />
          ) : (
            <button
              type="button"
              className="absolute left-[52%] top-[72%] rounded border border-dashed border-violet-400 bg-violet-50/80 px-2 py-1 text-[10px] text-violet-700"
              onClick={() => setSelected("signature")}
            >
              Importez une signature
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Cliquez sur le cachet ou la signature, déplacez-le, ou tirez le coin inférieur droit pour
        l&apos;agrandir ou le réduire. Les réglages sont appliqués au PDF téléchargé.
      </p>
    </div>
  )
}

export function buildPreviewSchoolCertificateTemplate(
  form: SchoolCertificateTemplate,
): SchoolCertificateTemplate {
  return {
    ...form,
    stampOffsetXCm: 0,
    stampOffsetYCm: 0,
    signatureOffsetXCm: 0,
    signatureOffsetYCm: 0,
  }
}
