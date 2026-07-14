"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, Stamp } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { CertificateSignatureDialog } from "@/components/admin/certificate-signature-dialog"
import {
  buildPreviewSchoolCertificateTemplate,
  SchoolCertificateLayoutEditor,
} from "@/components/admin/school-certificate-layout-editor"
import { StampAssetDialog } from "@/components/admin/stamp-asset-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { resolveSignaturePlacement, resolveStampPlacement } from "@/lib/school-cert-placement"
import { downloadSchoolCertificatePdf } from "@/lib/school-certificate-pdf"
import { SCHOOL_CERTIFICATE_PDF_PREVIEW_SAMPLE } from "@/lib/school-certificate-preview"
import { SignatureService, SIGNATURE_UPDATED_EVENT } from "@/services/signature.service"
import { StampService, STAMP_UPDATED_EVENT } from "@/services/stamp.service"
import {
  SCHOOL_CERT_PLACEHOLDERS,
  SchoolCertificateTemplateService,
  type SchoolCertificateTemplate,
  type SchoolCertificateTemplateSection,
} from "@/services/school-certificate-template.service"

export function SchoolCertificateTemplateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [form, setForm] = useState<SchoolCertificateTemplate>(() => SchoolCertificateTemplateService.get())
  const [saving, setSaving] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [signatureOpen, setSignatureOpen] = useState(false)
  const [stampOpen, setStampOpen] = useState(false)
  const [stampSrc, setStampSrc] = useState<string | null>(null)
  const [signatureSrc, setSignatureSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void SchoolCertificateTemplateService.fetch().then((template) => {
      if (!cancelled) setForm(template)
    })
    const refreshAssets = () => {
      setStampSrc(StampService.get() ?? form.stampImageUrl ?? null)
      setSignatureSrc(SignatureService.get() ?? form.signatureImageUrl ?? null)
    }
    refreshAssets()
    window.addEventListener(STAMP_UPDATED_EVENT, refreshAssets)
    window.addEventListener(SIGNATURE_UPDATED_EVENT, refreshAssets)
    return () => {
      cancelled = true
      window.removeEventListener(STAMP_UPDATED_EVENT, refreshAssets)
      window.removeEventListener(SIGNATURE_UPDATED_EVENT, refreshAssets)
    }
  }, [open])

  function updateSection(index: number, patch: Partial<SchoolCertificateTemplateSection>) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }))
  }

  function templateForPreview(): SchoolCertificateTemplate {
    return buildPreviewSchoolCertificateTemplate({
      ...form,
      stampPlacement: form.stampPlacement ?? resolveStampPlacement(form),
      signaturePlacement: form.signaturePlacement ?? resolveSignaturePlacement(form),
    })
  }

  async function handlePreviewPdf() {
    setPreviewLoading(true)
    try {
      await downloadSchoolCertificatePdf(SCHOOL_CERTIFICATE_PDF_PREVIEW_SAMPLE, {
        preview: true,
        draftWatermark: "APERÇU",
        templateOverride: templateForPreview(),
      })
    } catch {
      toast({ title: "Aperçu impossible", variant: "destructive" })
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const stampUrl = StampService.get() ?? form.stampImageUrl
      const signatureUrl = SignatureService.get() ?? form.signatureImageUrl
      const hasSignature = Boolean(signatureUrl)
      const hasStamp = Boolean(stampUrl)
      const next = await SchoolCertificateTemplateService.saveRemote({
        ...templateForPreview(),
        stampImageUrl: stampUrl ?? null,
        signatureImageUrl: signatureUrl ?? null,
        signatureApproved: form.signatureApproved && hasSignature,
        stampApproved: form.stampApproved && hasStamp,
      })
      setForm(next)
      toast({ title: "Modèle enregistré", description: "Texte et mise en page appliqués aux téléchargements." })
      onOpenChange(false)
    } catch {
      toast({ title: "Enregistrement impossible", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const hasSignature = Boolean(signatureSrc)
  const hasStamp = Boolean(stampSrc)
  const stampPlacement = form.stampPlacement ?? resolveStampPlacement(form)
  const signaturePlacement = form.signaturePlacement ?? resolveSignaturePlacement(form)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Modèle — certificat de scolarité</DialogTitle>
            <DialogDescription>
              Modifiez le texte et placez visuellement le cachet et la signature. Validez les visuels pour
              autoriser le téléchargement par les apprenants.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="layout" className="py-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="layout">Mise en page & cachet</TabsTrigger>
              <TabsTrigger value="text">Texte du document</TabsTrigger>
            </TabsList>

            <TabsContent value="layout" className="mt-4 space-y-4">
              <SchoolCertificateLayoutEditor
                documentTitle={form.documentTitle}
                stampPlacement={stampPlacement}
                signaturePlacement={signaturePlacement}
                stampSrc={stampSrc}
                signatureSrc={signatureSrc}
                previewPdfLoading={previewLoading}
                onPreviewPdf={() => void handlePreviewPdf()}
                onChange={({ stampPlacement: nextStamp, signaturePlacement: nextSig }) =>
                  setForm((p) => ({
                    ...p,
                    stampPlacement: nextStamp,
                    signaturePlacement: nextSig,
                    stampOffsetXCm: 0,
                    stampOffsetYCm: 0,
                    signatureOffsetXCm: 0,
                    signatureOffsetYCm: 0,
                  }))
                }
              />

              <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-500/30 dark:bg-violet-500/10">
                <p className="text-sm font-semibold">Fichiers & validation</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setStampOpen(true)}>
                    <Stamp className="mr-2 size-3.5" />
                    Importer / modifier le cachet
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setSignatureOpen(true)}>
                    Importer / modifier la signature
                  </Button>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.stampApproved}
                      disabled={!hasStamp}
                      onChange={(e) => setForm((p) => ({ ...p, stampApproved: e.target.checked }))}
                    />
                    Cachet approuvé pour diffusion {hasStamp ? "" : "(importez d'abord un cachet)"}
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.signatureApproved}
                      disabled={!hasSignature}
                      onChange={(e) => setForm((p) => ({ ...p, signatureApproved: e.target.checked }))}
                    />
                    Signature approuvée pour diffusion{" "}
                    {hasSignature ? "" : "(importez d'abord une signature)"}
                  </label>
                  {form.stampApproved && form.signatureApproved ? (
                    <p className="flex items-center gap-1 text-xs text-emerald-700">
                      <CheckCircle2 className="size-3.5" />
                      Téléchargement apprenant autorisé (si pension soldée).
                    </p>
                  ) : null}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="text" className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-title">Titre du document</Label>
                <Input
                  id="tpl-title"
                  value={form.documentTitle}
                  onChange={(e) => setForm((p) => ({ ...p, documentTitle: e.target.value }))}
                />
              </div>

              <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Variables disponibles</p>
                <p className="mt-1 break-all">{SCHOOL_CERT_PLACEHOLDERS.join(", ")}</p>
              </div>

              {form.sections.map((section, index) => (
                <div key={section.id} className="rounded-lg border p-3">
                  <div className="space-y-2">
                    <Label>Section — {section.title}</Label>
                    <Input
                      value={section.title}
                      onChange={(e) => updateSection(index, { title: e.target.value })}
                      className="text-sm"
                    />
                    <Textarea
                      value={section.content}
                      onChange={(e) => updateSection(index, { content: e.target.value })}
                      rows={4}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Enregistrer le modèle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CertificateSignatureDialog open={signatureOpen} onOpenChange={setSignatureOpen} />
      <StampAssetDialog open={stampOpen} onOpenChange={setStampOpen} />
    </>
  )
}
