"use client"

import { X } from "lucide-react"
import type { StampPlacement } from "@/lib/stamp-pdf"
import { clamp01 } from "@/lib/stamp-pdf"

type StampOverlayItemProps = {
  placement: StampPlacement
  imageSrc: string
  canvasWidth: number
  canvasHeight: number
  selected: boolean
  label: string
  onSelect: () => void
  onChange: (next: StampPlacement) => void
  onRemove: () => void
  /** Masque le bouton supprimer (éditeur certificat de scolarité). */
  hideRemove?: boolean
}

export function StampOverlayItem({
  placement,
  imageSrc,
  canvasWidth,
  canvasHeight,
  selected,
  label,
  onSelect,
  onChange,
  onRemove,
  hideRemove = false,
}: StampOverlayItemProps) {
  function startDrag(e: React.PointerEvent, mode: "move" | "resize") {
    e.stopPropagation()
    e.preventDefault()
    onSelect()

    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)

    const startX = e.clientX
    const startY = e.clientY
    const orig = { ...placement }

    const onMove = (ev: PointerEvent) => {
      if (canvasWidth <= 0 || canvasHeight <= 0) return
      const dx = (ev.clientX - startX) / canvasWidth
      const dy = (ev.clientY - startY) / canvasHeight
      if (mode === "move") {
        onChange({
          ...orig,
          x: clamp01(orig.x + dx, 0, 1 - orig.width),
          y: clamp01(orig.y + dy, 0, 1 - orig.height),
        })
      } else {
        onChange({
          ...orig,
          width: clamp01(orig.width + dx, 0.04, 1 - orig.x),
          height: clamp01(orig.height + dy, 0.04, 1 - orig.y),
        })
      }
    }

    const onUp = (ev: PointerEvent) => {
      try {
        target.releasePointerCapture(ev.pointerId)
      } catch {
        /* déjà relâché */
      }
      target.removeEventListener("pointermove", onMove)
      target.removeEventListener("pointerup", onUp)
      target.removeEventListener("pointercancel", onUp)
    }

    target.addEventListener("pointermove", onMove)
    target.addEventListener("pointerup", onUp)
    target.addEventListener("pointercancel", onUp)
  }

  function handleDelete(e: React.PointerEvent) {
    e.stopPropagation()
    e.preventDefault()
    onRemove()
  }

  const left = placement.x * canvasWidth
  const top = placement.y * canvasHeight
  const width = placement.width * canvasWidth
  const height = placement.height * canvasHeight

  return (
    <div
      className={`absolute touch-none ${selected ? "z-20" : "z-10"}`}
      style={{ left, top, width, height }}
      onPointerDown={(e) => {
        e.stopPropagation()
        if ((e.target as HTMLElement).dataset.overlayAction) return
        onSelect()
        startDrag(e, "move")
      }}
    >
      {selected ? (
        <div className="pointer-events-none absolute -top-7 left-0 right-0 flex items-center justify-between gap-1">
          <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
            {label}
          </span>
          {!hideRemove ? (
            <button
              type="button"
              data-overlay-action="delete"
              onPointerDown={handleDelete}
              className="pointer-events-auto flex size-6 items-center justify-center rounded-md bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
              aria-label="Supprimer"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        className={`relative h-full w-full rounded border-2 ${
          selected ? "border-primary bg-primary/5 shadow-md" : "border-primary/40 border-dashed"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={label}
          className="h-full w-full object-contain pointer-events-none"
          draggable={false}
        />
        {selected ? (
          <div
            role="button"
            tabIndex={0}
            data-overlay-action="resize"
            aria-label="Redimensionner"
            className="absolute bottom-0 right-0 z-10 size-6 cursor-se-resize rounded-tl-md border-2 border-primary bg-background shadow-sm"
            onPointerDown={(e) => startDrag(e, "resize")}
          />
        ) : null}
      </div>
    </div>
  )
}
