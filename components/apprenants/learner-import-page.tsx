"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, FileUp, CheckCircle2, AlertTriangle } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { toast } from "@/components/ui/use-toast"
import * as XLSX from "xlsx"
import { getAdminLearners } from "@/services/admin-mock.service"
import { useLocale } from "@/hooks/use-locale"
import type { TranslationKey } from "@/services/i18n"

export const LEARNER_IMPORT_SESSION_KEY = "learnerImportPayload"

type PreviewRow = {
  row: number
  fullName: string
  phone: string
  className: string
  pin: string
  status: "ok" | "error"
  issue?: string
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "")
}

function normalizeKey(key: string): string {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

function getMappedValue(source: Record<string, unknown>, aliases: string[]): string {
  for (const alias of aliases) {
    const matchKey = Object.keys(source).find((k) => normalizeKey(k) === normalizeKey(alias))
    if (!matchKey) continue
    const value = source[matchKey]
    if (value === null || value === undefined) return ""
    return String(value).trim()
  }
  return ""
}

async function parseLearnerFile(
  file: File,
  t: (key: TranslationKey) => string,
): Promise<PreviewRow[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })

  const existingPhones = new Set(getAdminLearners().map((l) => normalizePhone(l.phone)))
  const seenPhonesInFile = new Set<string>()

  return rows.map((raw, idx) => {
    const fullName = getMappedValue(raw, ["fullName", "nom", "name", "nomComplet"])
    const phone = getMappedValue(raw, ["phone", "telephone", "tel", "numero"])
    const normalizedPhone = normalizePhone(phone)
    const className = getMappedValue(raw, ["className", "classe", "class"])
    const pin = getMappedValue(raw, ["pin", "codePin", "password"])

    const issues: string[] = []
    if (!fullName) issues.push(t("lrn_import_err_name"))
    if (!phone) issues.push(t("lrn_import_err_phone"))
    if (normalizedPhone && (normalizedPhone.length < 8 || normalizedPhone.length > 15)) {
      issues.push(t("lrn_import_err_phone_len"))
    }
    if (!className) issues.push(t("lrn_import_err_class"))
    if (!pin || pin.length < 4) issues.push(t("lrn_import_err_pin"))
    if (normalizedPhone && existingPhones.has(normalizedPhone)) {
      issues.push(t("lrn_import_err_dup_db"))
    }
    if (normalizedPhone && seenPhonesInFile.has(normalizedPhone)) {
      issues.push(t("lrn_import_err_dup_file"))
    }
    if (normalizedPhone) {
      seenPhonesInFile.add(normalizedPhone)
    }

    return {
      row: idx + 2,
      fullName,
      phone,
      className,
      pin,
      status: issues.length === 0 ? "ok" : "error",
      issue: issues.join(" | ") || undefined,
    }
  })
}

function fileFromDataUrl(name: string, type: string, dataUrl: string): File {
  const commaIdx = dataUrl.indexOf(",")
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], name, { type })
}

function downloadExcelTemplate() {
  const rows = [
    {
      nom: "Jean Dupont",
      telephone: "677100123",
      classe: "A1 - Jan 2025",
      pin: "1234",
    },
  ]
  const sheet = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.sheet_add_aoa(
    sheet,
    [["nom", "telephone", "classe", "pin"]],
    { origin: "A1" }
  )
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, "apprenants")
  XLSX.writeFile(workbook, "template-import-apprenants.xlsx")
}

export type LearnerImportPageProps = {
  backHref: string
  afterImportHref: string
}

export function LearnerImportPage({ backHref, afterImportHref }: LearnerImportPageProps) {
  const { t } = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [fileName, setFileName] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState(false)
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [imported, setImported] = useState(false)

  const stats = useMemo(() => {
    const ok = rows.filter((r) => r.status === "ok").length
    const bad = rows.filter((r) => r.status === "error").length
    return { ok, bad, total: rows.length }
  }, [rows])

  const validRows = useMemo(() => rows.filter((r) => r.status === "ok"), [rows])
  const blockedRows = useMemo(() => rows.filter((r) => r.status === "error"), [rows])

  useEffect(() => {
    const fileParam = searchParams.get("file")
    const autostart = searchParams.get("autostart")
    if (!fileParam) return
    const decoded = decodeURIComponent(fileParam)
    setFileName(decoded)
    if (autostart === "1") {
      const rawPayload =
        sessionStorage.getItem(LEARNER_IMPORT_SESSION_KEY) ?? sessionStorage.getItem("adminLearnerImportPayload")
      if (!rawPayload) return
      try {
        const payload = JSON.parse(rawPayload) as { name: string; type: string; dataUrl: string }
        const file = fileFromDataUrl(payload.name, payload.type, payload.dataUrl)
        setSelectedFile(file)
        setParsing(true)
        parseLearnerFile(file, t)
          .then((parsedRows) => {
            setRows(parsedRows)
            setParsed(true)
            setImported(false)
            toast({
              title: t("lrn_import_toast_loaded"),
              description: t("lrn_import_toast_loaded_desc")
                .replace("{file}", decoded)
                .replace("{n}", String(parsedRows.length)),
            })
          })
          .catch(() => {
            toast({
              title: t("lrn_import_toast_parse_err"),
              description: t("lrn_import_toast_parse_desc"),
              variant: "destructive",
            })
          })
          .finally(() => setParsing(false))
      } catch {
        toast({
          title: t("lrn_import_toast_unavail"),
          description: t("lrn_import_toast_unavail_desc"),
          variant: "destructive",
        })
      }
    }
  }, [searchParams, t])

  async function handleParse() {
    if (!selectedFile) {
      toast({ title: t("lrn_import_toast_no_file"), description: t("lrn_import_toast_no_file_desc"), variant: "destructive" })
      return
    }
    try {
      setParsing(true)
      const parsedRows = await parseLearnerFile(selectedFile, t)
      setParsed(true)
      setRows(parsedRows)
      setImported(false)
      toast({
        title: t("lrn_import_toast_parsed"),
        description: t("lrn_import_toast_parsed_desc").replace("{n}", String(parsedRows.length)),
      })
    } catch {
      toast({
        title: t("lrn_import_toast_parse_err"),
        description: t("lrn_import_toast_parse_fail"),
        variant: "destructive",
      })
    } finally {
      setParsing(false)
    }
  }

  function handleImport() {
    if (!parsed || validRows.length === 0) {
      toast({ title: t("lrn_import_toast_impossible"), description: t("lrn_import_toast_no_valid"), variant: "destructive" })
      return
    }
    if (blockedRows.length > 0) {
      toast({
        title: t("lrn_import_toast_partial"),
        description: t("lrn_import_toast_partial_desc").replace("{n}", String(blockedRows.length)),
      })
    }
    setImported(true)
    toast({
      title: t("lrn_import_toast_done"),
      description: t("lrn_import_toast_done_desc")
        .replace("{ok}", String(validRows.length))
        .replace("{blocked}", String(blockedRows.length)),
    })
    setTimeout(() => {
      router.push(afterImportHref)
    }, 600)
  }

  return (
    <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <AdminPageHeader
        title={t("lrn_import_title")}
        subtitle={t("lrn_import_subtitle")}
        gradientClassName="from-fuchsia-600 to-indigo-600"
        actions={
          <Link href={backHref} className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-xs">
            <ArrowLeft className="size-3.5" /> {t("lrn_import_back")}
          </Link>
        }
      />

      <div className="mt-4 rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold">{t("lrn_import_step1")}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={fileName}
            readOnly
            placeholder={t("lrn_import_ph_file")}
            className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"
          >
            {t("lrn_import_pick_file")}
          </button>
          <button
            onClick={() => void handleParse()}
            disabled={parsing}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileUp className="size-4" /> {parsing ? t("lrn_import_analyzing") : t("lrn_import_analyze")}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            setSelectedFile(file)
            setFileName(file.name)
            setParsed(false)
            setRows([])
            setImported(false)
          }}
        />
        <p className="mt-2 text-xs text-muted-foreground">{t("lrn_import_headers_hint")}</p>
      </div>

      {parsed ? (
        <div className="mt-4 rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold">{t("lrn_import_step2")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("lrn_import_stats")}{" "}
            <span className="font-semibold text-emerald-700">{stats.ok}</span> / {t("lrn_import_blocked")}{" "}
            <span className="font-semibold text-destructive">{stats.bad}</span> / {t("lrn_import_total")} {stats.total}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t("lrn_import_th_row")}</th>
                  <th className="px-3 py-2">{t("lrn_import_th_name")}</th>
                  <th className="px-3 py-2">{t("lrn_import_th_phone")}</th>
                  <th className="px-3 py-2">{t("lrn_import_th_class")}</th>
                  <th className="px-3 py-2">{t("lrn_import_th_pin")}</th>
                  <th className="px-3 py-2">{t("lrn_import_th_state")}</th>
                  <th className="px-3 py-2">{t("lrn_import_th_issue")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.row} className="border-t">
                    <td className="px-3 py-2">{row.row}</td>
                    <td className="px-3 py-2">{row.fullName}</td>
                    <td className="px-3 py-2">{row.phone || "-"}</td>
                    <td className="px-3 py-2">{row.className}</td>
                    <td className="px-3 py-2">{row.pin}</td>
                    <td className="px-3 py-2">
                      {row.status === "ok" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                          <CheckCircle2 className="size-3" /> {t("lrn_import_ok")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                          <AlertTriangle className="size-3" /> {t("lrn_import_err")}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{row.issue ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={handleImport} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              {t("lrn_import_btn_valid")}
            </button>
            <button
              onClick={() => {
                downloadExcelTemplate()
                toast({ title: t("lrn_import_tpl_toast"), description: t("lrn_import_tpl_toast_desc") })
              }}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              {t("lrn_import_tpl_btn")}
            </button>
          </div>
          {imported ? (
            <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
              {t("lrn_import_done_banner")
                .replace("{ok}", String(validRows.length))
                .replace("{blocked}", String(blockedRows.length))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
