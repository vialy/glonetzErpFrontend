"use client"

import { useRef, useState } from "react"
import { CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { certificatesService, type CertificateCreateMeta } from "@/domains/certificates"
import {
  downloadImportTemplate,
  mapRow,
  readRowsFromFile,
  type MappedRow,
} from "@/lib/certificate-import"

interface ImportResult {
  fullName: string
  success: boolean
  message: string
}

const SERVICE_ERROR_MESSAGES: Record<string, string> = {
  DUPLICATE_CERTIFICATE: "Un certificat similaire existe déjà",
  END_BEFORE_START: "Date de fin antérieure à la date de début",
  ATTENDED_GT_UNITS: "Leçons suivies supérieures au total",
}

export function CertificateImportDialog({
  open,
  onOpenChange,
  createMeta,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  createMeta?: CertificateCreateMeta
  onImported?: () => void
}) {
  const [fileName, setFileName] = useState("")
  const [rows, setRows] = useState<MappedRow[]>([])
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<ImportResult[] | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setFileName("")
    setRows([])
    setResults(null)
    setParsing(false)
    setImporting(false)
    if (inputRef.current) inputRef.current.value = ""
  }

  function handleClose(next: boolean) {
    if (importing) return
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    setFileName(file.name)
    setResults(null)
    setParsing(true)
    try {
      const raw = await readRowsFromFile(file)
      if (raw.length === 0) {
        toast({ title: "Fichier vide", description: "Aucune ligne détectée.", variant: "destructive" })
        setRows([])
        return
      }
      setRows(raw.map(mapRow))
    } catch {
      toast({ title: "Format invalide", description: "Utilisez un fichier .xlsx, .xls ou .csv.", variant: "destructive" })
      setRows([])
    } finally {
      setParsing(false)
    }
  }

  async function handleImport() {
    const valid = rows.filter((r) => r.input)
    if (valid.length === 0) {
      toast({ title: "Aucune ligne valide à importer", variant: "destructive" })
      return
    }
    setImporting(true)
    const out: ImportResult[] = []
    try {
      for (const row of rows) {
        if (!row.input) {
          out.push({ fullName: row.fullName, success: false, message: row.error ?? "Ligne invalide" })
          continue
        }
        try {
          const created = await certificatesService.create(row.input, createMeta)
          out.push({ fullName: row.fullName, success: true, message: created.referenceNumber })
        } catch (e) {
          const code = e instanceof Error ? e.message : ""
          out.push({ fullName: row.fullName, success: false, message: SERVICE_ERROR_MESSAGES[code] ?? "Erreur" })
        }
      }
      const ok = out.filter((r) => r.success).length
      setResults(out)
      toast({ title: `Import terminé : ${ok}/${out.length} certificat(s) créé(s)` })
      if (ok > 0) onImported?.()
    } finally {
      setImporting(false)
    }
  }

  const validCount = rows.filter((r) => r.input).length
  const invalidCount = rows.length - validCount

  const cellClass = "px-3 py-2"

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importer des certificats</DialogTitle>
          <DialogDescription>
            Fichier Excel/CSV avec les colonnes : Nom complet, Date de naissance, Lieu de naissance, Niveau de référence,
            Date de début, Date de fin, Nombre de leçons, Leçons suivies, Info cours, Évaluation, Commentaires.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Upload className="size-4" /> Sélectionner un fichier
          </button>
          <button
            type="button"
            onClick={downloadImportTemplate}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted/50"
          >
            <Download className="size-4" /> Télécharger le modèle
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          {fileName ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <FileSpreadsheet className="size-4" /> {fileName}
            </span>
          ) : null}
        </div>

        {parsing ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Lecture du fichier…
          </div>
        ) : null}

        {!parsing && rows.length > 0 && !results ? (
          <>
            <div className="flex gap-3 text-sm">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-medium text-emerald-700">
                {validCount} valide(s)
              </span>
              {invalidCount > 0 ? (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 font-medium text-red-700">
                  {invalidCount} en erreur
                </span>
              ) : null}
            </div>
            <div className="max-h-72 overflow-auto rounded-lg border">
              <table className="w-full min-w-[640px] text-xs">
                <thead className="sticky top-0 bg-muted/60 text-left uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className={cellClass}>Nom</th>
                    <th className={cellClass}>Niveau</th>
                    <th className={cellClass}>Début</th>
                    <th className={cellClass}>Fin</th>
                    <th className={cellClass}>État</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className={`${cellClass} font-medium`}>{row.fullName}</td>
                      <td className={cellClass}>{row.input?.referenceLevel ?? "—"}</td>
                      <td className={cellClass}>{row.input?.courseStartDate ?? "—"}</td>
                      <td className={cellClass}>{row.input?.courseEndDate ?? "—"}</td>
                      <td className={cellClass}>
                        {row.input ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="size-3.5" /> Prêt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-700" title={row.error}>
                            <XCircle className="size-3.5" /> {row.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {results ? (
          <div className="max-h-72 overflow-auto rounded-lg border">
            <table className="w-full min-w-[480px] text-xs">
              <thead className="sticky top-0 bg-muted/60 text-left uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className={cellClass}>Nom</th>
                  <th className={cellClass}>Statut</th>
                  <th className={cellClass}>Message</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className={`${cellClass} font-medium`}>{r.fullName}</td>
                    <td className={cellClass}>
                      {r.success ? (
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      ) : (
                        <XCircle className="size-4 text-red-600" />
                      )}
                    </td>
                    <td className={`${cellClass} ${r.success ? "font-mono" : "text-red-700"}`}>{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <DialogFooter>
          <button
            type="button"
            onClick={() => handleClose(false)}
            disabled={importing}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
          >
            {results ? "Fermer" : "Annuler"}
          </button>
          {!results ? (
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || validCount === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing ? <Loader2 className="size-4 animate-spin" /> : null}
              Importer {validCount > 0 ? `${validCount} certificat(s)` : ""}
            </button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
