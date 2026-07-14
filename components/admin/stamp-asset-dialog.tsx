"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Stamp, Trash2, Upload } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StampService } from "@/services/stamp.service"
import { fileToDataUrl, processSignatureImage } from "@/lib/signature-image"

const MAX_FILE_SIZE = 4 * 1024 * 1024
const CHECKERBOARD =
  "repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 16px 16px"

export function StampAssetDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [current, setCurrent] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [removeBackground, setRemoveBackground] = useState(true)
  const [rawDataUrl, setRawDataUrl] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setCurrent(StampService.get())
      setPreview(null)
      setRawDataUrl(null)
      setRemoveBackground(true)
      if (inputRef.current) inputRef.current.value = ""
    }
  }, [open])

  async function runProcessing(source: string, transparent: boolean) {
    setProcessing(true)
    try {
      const result = await processSignatureImage(source, { removeBackground: transparent })
      setPreview(result)
    } catch {
      toast({
        title: "Image illisible",
        description: "Choisissez un fichier PNG ou JPEG valide.",
        variant: "destructive",
      })
      setPreview(null)
    } finally {
      setProcessing(false)
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast({ title: "Format non supporté", variant: "destructive" })
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Image trop lourde", description: "Taille maximale : 4 Mo.", variant: "destructive" })
      return
    }
    try {
      const source = await fileToDataUrl(file)
      setRawDataUrl(source)
      await runProcessing(source, removeBackground)
    } catch {
      toast({ title: "Lecture impossible", variant: "destructive" })
    }
  }

  async function handleToggleBackground(next: boolean) {
    setRemoveBackground(next)
    if (rawDataUrl) await runProcessing(rawDataUrl, next)
  }

  function handleSave() {
    if (!preview) return
    setSaving(true)
    try {
      StampService.set(preview)
      setCurrent(preview)
      setPreview(null)
      setRawDataUrl(null)
      if (inputRef.current) inputRef.current.value = ""
      toast({ title: "Cachet enregistré", description: "Il sera disponible dans le module cachets." })
    } finally {
      setSaving(false)
    }
  }

  function handleRemove() {
    StampService.remove()
    setCurrent(null)
    setPreview(null)
    setRawDataUrl(null)
    if (inputRef.current) inputRef.current.value = ""
    toast({ title: "Cachet supprimé" })
  }

  const shown = preview ?? current

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stamp className="size-4" /> Cachet de l&apos;entreprise
          </DialogTitle>
          <DialogDescription>
            Importez le cachet officiel (image PNG ou JPEG). Il pourra être placé librement sur vos
            documents PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="flex h-36 items-center justify-center rounded-lg border"
            style={{ background: CHECKERBOARD }}
          >
            {processing ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : shown ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shown} alt="Cachet" className="max-h-32 max-w-full object-contain" />
            ) : (
              <span className="text-xs text-muted-foreground">Aucun cachet importé</span>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={removeBackground}
              onChange={(e) => void handleToggleBackground(e.target.checked)}
              className="mt-0.5"
            />
            <span>Rendre le fond transparent automatiquement</span>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={processing || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Upload className="size-4" /> Importer
            </button>
            {current ? (
              <button
                type="button"
                onClick={handleRemove}
                disabled={processing || saving}
                className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-4" /> Supprimer
              </button>
            ) : null}
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted/50"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!preview || processing || saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Enregistrer
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
