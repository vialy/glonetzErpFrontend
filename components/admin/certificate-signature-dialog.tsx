"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, PenLine, Trash2, Upload } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SignatureService } from "@/services/signature.service"
import { fileToDataUrl, processSignatureImage } from "@/lib/signature-image"

const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4 Mo

// Fond en damier pour bien visualiser la transparence du PNG.
const CHECKERBOARD =
  "repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 16px 16px"

export function CertificateSignatureDialog({
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
  const [syncPromptOpen, setSyncPromptOpen] = useState(false)
  const [generatedCount, setGeneratedCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      void SignatureService.fetch().then((url) => {
        setCurrent(url)
        setPreview(null)
        setRawDataUrl(null)
        setRemoveBackground(true)
        if (inputRef.current) inputRef.current.value = ""
      })
    }
  }, [open])

  async function runProcessing(source: string, transparent: boolean) {
    setProcessing(true)
    try {
      const result = await processSignatureImage(source, { removeBackground: transparent })
      setPreview(result)
    } catch {
      toast({ title: "Image illisible", description: "Choisissez un fichier PNG ou JPEG valide.", variant: "destructive" })
      setPreview(null)
    } finally {
      setProcessing(false)
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast({ title: "Format non supporté", description: "Choisissez une image (PNG, JPEG).", variant: "destructive" })
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

  async function promptSyncIfNeeded() {
    const count = await SignatureService.countGeneratedFormations()
    if (count > 0) {
      setGeneratedCount(count)
      setSyncPromptOpen(true)
    }
  }

  async function handleSave() {
    if (!preview) return
    setSaving(true)
    try {
      await SignatureService.saveRemote(preview)
      setCurrent(preview)
      setPreview(null)
      setRawDataUrl(null)
      if (inputRef.current) inputRef.current.value = ""
      toast({ title: "Signature enregistrée", description: "Elle apparaîtra sur les prochains certificats générés." })
      await promptSyncIfNeeded()
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setSaving(true)
    try {
      await SignatureService.saveRemote(null)
      setCurrent(null)
      setPreview(null)
      setRawDataUrl(null)
      if (inputRef.current) inputRef.current.value = ""
      toast({ title: "Signature supprimée", description: "L'image par défaut sera utilisée." })
      await promptSyncIfNeeded()
    } finally {
      setSaving(false)
    }
  }

  async function handleSyncConfirm() {
    setSyncing(true)
    try {
      const updated = await SignatureService.syncFormationSnapshots()
      toast({
        title: "Attestations mises à jour",
        description: `${updated} attestation${updated > 1 ? "s" : ""} de formation mise${updated > 1 ? "s" : ""} à jour.`,
      })
      setSyncPromptOpen(false)
    } catch {
      toast({
        title: "Mise à jour impossible",
        description: "La signature globale est enregistrée, mais les attestations n'ont pas pu être mises à jour.",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  function handleSyncDecline() {
    setSyncPromptOpen(false)
  }

  const shown = preview ?? current

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="size-4" /> Signature des certificats
            </DialogTitle>
            <DialogDescription>
              Importez votre signature (image). Elle sera apposée automatiquement au-dessus de la ligne
              « Leitung / Management » sur chaque certificat PDF. Pour un meilleur rendu, utilisez une signature
              foncée sur fond clair.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {preview ? "Aperçu de la nouvelle signature" : current ? "Signature actuelle" : "Aucune signature importée"}
              </p>
              <div
                className="flex h-32 items-center justify-center rounded-lg border"
                style={{ background: CHECKERBOARD }}
              >
                {processing ? (
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                ) : shown ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shown} alt="Signature" className="max-h-28 max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">L'image par défaut du projet sera utilisée.</span>
                )}
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={removeBackground}
                onChange={(e) => void handleToggleBackground(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Rendre le fond transparent automatiquement
                <span className="block text-xs text-muted-foreground">
                  Recommandé. Décochez si votre image est déjà un PNG à fond transparent.
                </span>
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={processing || saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Upload className="size-4" /> {current || preview ? "Changer l'image" : "Importer une image"}
              </button>
              {current ? (
                <button
                  type="button"
                  onClick={() => void handleRemove()}
                  disabled={processing || saving}
                  className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
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
              disabled={saving}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!preview || processing || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Enregistrer la signature
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={syncPromptOpen}
        onOpenChange={(next) => {
          if (!syncing) setSyncPromptOpen(next)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mettre à jour les attestations déjà générées ?</AlertDialogTitle>
            <AlertDialogDescription>
              {generatedCount === 1
                ? "1 attestation de formation a déjà été générée."
                : `${generatedCount} attestations de formation ont déjà été générées.`}{" "}
              Souhaitez-vous également mettre à jour leur signature avec la nouvelle version ?
              <span className="mt-2 block">
                Si vous choisissez Non, la signature globale sera bien enregistrée, mais les attestations
                déjà générées conserveront leur ancienne signature.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={syncing} onClick={handleSyncDecline}>
              Non
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={syncing}
              onClick={(e) => {
                e.preventDefault()
                void handleSyncConfirm()
              }}
            >
              {syncing ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Oui, mettre à jour
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
