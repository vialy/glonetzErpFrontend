"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, FileUp, CheckCircle2, AlertTriangle, RotateCcw, Plus, Trash2, Loader2 } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { toast } from "@/components/ui/use-toast"
import * as XLSX from "xlsx"
import { getAdminLearners } from "@/services/admin-mock.service"
import { learnersService, type BulkCreateStaffLearnersResult } from "@/domains/learners"
import { classesService, type StaffClass } from "@/domains/classes"
import { validatePhoneE164 } from "@/lib/phone-validation"
import { useLocale } from "@/hooks/use-locale"
import type { TranslationKey } from "@/services/i18n"

export const LEARNER_IMPORT_SESSION_KEY = "learnerImportPayload"

/** Taille des lots envoyes au backend pour afficher une progression reelle. */
const IMPORT_CHUNK_SIZE = 5

type ParsedRow = {
  id: string
  line: number
  fullName: string
  phone: string
  email: string
  classId: string
}

type DisplayRow = ParsedRow & {
  status: "ok" | "error"
  issue?: string
}

type EditableField = "fullName" | "phone" | "email"

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "")
}

/**
 * Cle de comparaison robuste d'un numero: on retient les 9 derniers chiffres
 * (numero national), ce qui rend la detection de doublon insensible a la presence
 * ou non de l'indicatif (+237 / 237 / format local).
 */
function phoneKey(phone: string): string {
  const digits = normalizePhone(phone)
  return digits.length > 9 ? digits.slice(-9) : digits
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

type ExistingKeys = { phones: Set<string>; emails: Set<string> }

/** Recupere les numeros (9 derniers chiffres) et emails deja presents en base. */
async function fetchExistingKeys(): Promise<ExistingKeys> {
  const phones = new Set<string>()
  const emails = new Set<string>()
  const collect = (list: { phone: string; email?: string }[]) => {
    for (const learner of list) {
      const key = phoneKey(learner.phone)
      if (key) phones.add(key)
      const email = learner.email ? normalizeEmail(learner.email) : ""
      if (email) emails.add(email)
    }
  }
  try {
    collect(await learnersService.list())
  } catch {
    collect(getAdminLearners())
  }
  return { phones, emails }
}

function cleanPhone(phone: string): string {
  return phone.replace(/[\s().-]/g, "")
}

/**
 * Validation alignee sur la creation individuelle (validatePhoneE164):
 *  - +237 : mobile obligatoire (+2376XXXXXXXX), car les identifiants partent par SMS.
 *  - autres pays : format international E.164 valide (ex. +32...).
 */
function isValidInternationalPhone(phone: string): boolean {
  return validatePhoneE164(cleanPhone(phone))
}

function normalizeKey(key: string): string {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
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

async function parseLearnerFile(file: File): Promise<ParsedRow[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })

  return rows.map((raw, idx) => ({
    id: `xls-${idx}`,
    line: idx + 2,
    fullName: getMappedValue(raw, ["fullName", "nom", "name", "nomComplet"]),
    phone: getMappedValue(raw, ["phone", "telephone", "tel", "numero"]),
    email: getMappedValue(raw, ["email", "mail", "courriel", "adresseEmail"]),
    classId: "",
  }))
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
      telephone: "+237677100123",
      email: "jean.dupont@example.com",
    },
  ]
  const sheet = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.sheet_add_aoa(sheet, [["nom", "telephone", "email"]], { origin: "A1" })
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
  const manualCounterRef = useRef(0)
  const [fileName, setFileName] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState(false)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [imported, setImported] = useState(false)
  const [importResult, setImportResult] = useState<BulkCreateStaffLearnersResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [classes, setClasses] = useState<StaffClass[]>([])
  const [classesLoaded, setClassesLoaded] = useState(false)
  const [bulkClassId, setBulkClassId] = useState("")
  const [existingPhones, setExistingPhones] = useState<Set<string>>(new Set())
  const [existingEmails, setExistingEmails] = useState<Set<string>>(new Set())

  useEffect(() => {
    let active = true
    Promise.allSettled([classesService.list(), fetchExistingKeys()])
      .then(([classesResult, keysResult]) => {
        if (!active) return
        if (classesResult.status === "fulfilled") {
          setClasses(classesResult.value)
        } else {
          toast({
            title: t("lrn_import_classes_error"),
            description: t("lrn_import_classes_error"),
            variant: "destructive",
          })
        }
        if (keysResult.status === "fulfilled") {
          setExistingPhones(keysResult.value.phones)
          setExistingEmails(keysResult.value.emails)
        }
      })
      .finally(() => {
        if (active) setClassesLoaded(true)
      })
    return () => {
      active = false
    }
  }, [t])

  const displayRows = useMemo<DisplayRow[]>(() => {
    const phoneCounts = new Map<string, number>()
    const emailCounts = new Map<string, number>()
    for (const r of rows) {
      const key = phoneKey(r.phone)
      if (key) phoneCounts.set(key, (phoneCounts.get(key) ?? 0) + 1)
      const email = normalizeEmail(r.email)
      if (email) emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1)
    }

    return rows.map((r) => {
      const issues: string[] = []
      const key = phoneKey(r.phone)
      const email = normalizeEmail(r.email)

      if (!r.fullName.trim()) issues.push(t("lrn_import_err_name"))
      if (!r.phone.trim()) {
        issues.push(t("lrn_import_err_phone"))
      } else if (!isValidInternationalPhone(r.phone)) {
        issues.push(t("lrn_import_err_phone_format"))
      }
      if (email && !isValidEmail(r.email)) issues.push(t("lrn_import_err_email"))
      if (!r.classId) issues.push(t("lrn_import_err_class"))
      if (key && existingPhones.has(key)) issues.push(t("lrn_import_err_dup_db"))
      if (key && (phoneCounts.get(key) ?? 0) > 1) issues.push(t("lrn_import_err_dup_file"))
      if (email && existingEmails.has(email)) issues.push(t("lrn_import_err_dup_email_db"))
      if (email && (emailCounts.get(email) ?? 0) > 1) issues.push(t("lrn_import_err_dup_email_file"))

      return {
        ...r,
        status: issues.length === 0 ? "ok" : "error",
        issue: issues.join(" | ") || undefined,
      }
    })
  }, [rows, t, existingPhones, existingEmails])

  const stats = useMemo(() => {
    const ok = displayRows.filter((r) => r.status === "ok").length
    const bad = displayRows.filter((r) => r.status === "error").length
    return { ok, bad, total: displayRows.length }
  }, [displayRows])

  const validRows = useMemo(() => displayRows.filter((r) => r.status === "ok"), [displayRows])
  const blockedRows = useMemo(() => displayRows.filter((r) => r.status === "error"), [displayRows])

  function setRowField(id: string, field: EditableField, value: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  function setRowClass(id: string, classId: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, classId } : r)))
  }

  function applyClassToAll() {
    if (!bulkClassId) return
    setRows((prev) => prev.map((r) => ({ ...r, classId: bulkClassId })))
  }

  function addRow() {
    manualCounterRef.current += 1
    const newRow: ParsedRow = {
      id: `manual-${manualCounterRef.current}`,
      line: 0,
      fullName: "",
      phone: "",
      email: "",
      classId: bulkClassId,
    }
    setRows((prev) => [...prev, newRow])
    if (!parsed) setParsed(true)
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  function resetImport() {
    setSelectedFile(null)
    setFileName("")
    setRows([])
    setParsed(false)
    setImported(false)
    setImportResult(null)
    setImporting(false)
    setProgress({ done: 0, total: 0 })
    setBulkClassId("")
    manualCounterRef.current = 0
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const autostartDoneRef = useRef(false)

  useEffect(() => {
    const fileParam = searchParams.get("file")
    const autostart = searchParams.get("autostart")
    if (!fileParam) return
    const decoded = decodeURIComponent(fileParam)
    setFileName(decoded)
    if (autostart !== "1") return
    if (!classesLoaded || autostartDoneRef.current) return
    autostartDoneRef.current = true

    const rawPayload =
      sessionStorage.getItem(LEARNER_IMPORT_SESSION_KEY) ?? sessionStorage.getItem("adminLearnerImportPayload")
    if (!rawPayload) return
    try {
      const payload = JSON.parse(rawPayload) as { name: string; type: string; dataUrl: string }
      const file = fileFromDataUrl(payload.name, payload.type, payload.dataUrl)
      setSelectedFile(file)
      setParsing(true)
      parseLearnerFile(file)
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
  }, [searchParams, t, classesLoaded])

  async function handleParse() {
    if (!selectedFile) {
      toast({ title: t("lrn_import_toast_no_file"), description: t("lrn_import_toast_no_file_desc"), variant: "destructive" })
      return
    }
    try {
      setParsing(true)
      const parsedRows = await parseLearnerFile(selectedFile)
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

  async function handleImport() {
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
    setImporting(true)
    try {
      const fresh = await fetchExistingKeys()
      setExistingPhones(fresh.phones)
      setExistingEmails(fresh.emails)

      const sendable = validRows.filter((r) => {
        if (fresh.phones.has(phoneKey(r.phone))) return false
        const email = normalizeEmail(r.email)
        if (email && fresh.emails.has(email)) return false
        return true
      })
      const newlyDuplicate = validRows.length - sendable.length

      if (sendable.length === 0) {
        toast({
          title: t("lrn_import_toast_impossible"),
          description: t("lrn_import_toast_no_valid"),
          variant: "destructive",
        })
        setImporting(false)
        return
      }

      if (newlyDuplicate > 0) {
        toast({
          title: t("lrn_import_toast_partial"),
          description: t("lrn_import_toast_partial_desc").replace("{n}", String(newlyDuplicate)),
        })
      }

      const payloads = sendable.map((r) => ({
        name: r.fullName,
        phone: cleanPhone(r.phone),
        classId: r.classId,
        email: r.email || undefined,
      }))

      setProgress({ done: 0, total: payloads.length })

      const result: BulkCreateStaffLearnersResult = {
        total: 0,
        createdCount: 0,
        skippedCount: 0,
        failedCount: 0,
        skipped: [],
        failed: [],
      }

      for (let i = 0; i < payloads.length; i += IMPORT_CHUNK_SIZE) {
        const chunk = payloads.slice(i, i + IMPORT_CHUNK_SIZE)
        try {
          const res = await learnersService.createBulk({ users: chunk, skipDuplicates: true })
          result.total += res.total
          result.createdCount += res.createdCount
          result.skippedCount += res.skippedCount
          result.failedCount += res.failedCount
          result.skipped.push(...res.skipped.map((s) => ({ ...s, index: s.index + i })))
          result.failed.push(...res.failed.map((f) => ({ ...f, index: f.index + i })))
        } catch {
          result.total += chunk.length
          result.failedCount += chunk.length
          chunk.forEach((u, j) => {
            result.failed.push({
              index: i + j,
              name: u.name,
              phone: u.phone,
              errorMsg: t("lrn_import_toast_create_err_desc"),
            })
          })
        }
        setProgress({ done: Math.min(i + chunk.length, payloads.length), total: payloads.length })
      }

      setImported(true)
      setImportResult(result)

      const hasIssues = result.failedCount > 0 || result.skippedCount > 0
      toast({
        title: hasIssues ? t("lrn_import_toast_done_partial") : t("lrn_import_toast_done"),
        description: t("lrn_import_result_summary")
          .replace("{created}", String(result.createdCount))
          .replace("{skipped}", String(result.skippedCount))
          .replace("{failed}", String(result.failedCount))
          .replace("{total}", String(result.total)),
        variant: result.failedCount > 0 ? "destructive" : undefined,
      })

      if (result.failedCount === 0) {
        setTimeout(() => {
          router.push(afterImportHref)
        }, 1400)
      }
    } catch {
      toast({
        title: t("lrn_import_toast_create_err"),
        description: t("lrn_import_toast_create_err_desc"),
        variant: "destructive",
      })
    } finally {
      setImporting(false)
    }
  }

  const noClasses = classesLoaded && classes.length === 0
  const editLocked = imported || importing

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
          <button
            type="button"
            onClick={() => {
              downloadExcelTemplate()
              toast({ title: t("lrn_import_tpl_toast"), description: t("lrn_import_tpl_toast_desc") })
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"
          >
            {t("lrn_import_tpl_btn")}
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
            setImportResult(null)
          }}
        />
        <p className="mt-2 text-xs text-muted-foreground">{t("lrn_import_headers_hint")}</p>
        {!parsed ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"
            >
              <Plus className="size-4" /> {t("lrn_import_add_row")}
            </button>
          </div>
        ) : null}
      </div>

      {parsed ? (
        <div className="mt-4 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">{t("lrn_import_step2")}</p>
            <button
              type="button"
              onClick={resetImport}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3.5" /> {imported ? t("lrn_import_new_btn") : t("lrn_import_cancel_btn")}
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("lrn_import_stats")}{" "}
            <span className="font-semibold text-emerald-700">{stats.ok}</span> / {t("lrn_import_blocked")}{" "}
            <span className="font-semibold text-destructive">{stats.bad}</span> / {t("lrn_import_total")} {stats.total}
          </p>

          {imported && importResult ? (
            <div
              className={`mt-3 rounded-lg border p-3 text-sm ${
                importResult.failedCount > 0
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-emerald-300 bg-emerald-50 text-emerald-700"
              }`}
            >
              <p className="font-semibold">
                {t("lrn_import_result_summary")
                  .replace("{created}", String(importResult.createdCount))
                  .replace("{skipped}", String(importResult.skippedCount))
                  .replace("{failed}", String(importResult.failedCount))
                  .replace("{total}", String(importResult.total))}
              </p>

              {importResult.skipped.length > 0 ? (
                <div className="mt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    {t("lrn_import_result_skipped_title")}
                  </p>
                  <ul className="mt-1 list-inside list-disc text-xs">
                    {importResult.skipped.map((s) => {
                      const reasonText =
                        !s.reason || s.reason === "duplicate" ? t("lrn_import_reason_duplicate") : s.reason
                      return (
                        <li key={`skip-${s.index}-${s.phone ?? ""}`}>
                          {(s.phone ?? `#${s.index + 1}`)} — {reasonText}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}

              {importResult.failed.length > 0 ? (
                <div className="mt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
                    {t("lrn_import_result_failed_title")}
                  </p>
                  <ul className="mt-1 list-inside list-disc text-xs">
                    {importResult.failed.map((f) => (
                      <li key={`fail-${f.index}-${f.phone ?? ""}`}>
                        {(f.name || f.phone || `#${f.index + 1}`)}
                        {f.errorMsg ? ` — ${f.errorMsg}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push(afterImportHref)}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  {t("lrn_import_view_btn")}
                </button>
                <button
                  type="button"
                  onClick={resetImport}
                  className="rounded-lg border px-4 py-2 text-sm font-semibold"
                >
                  {t("lrn_import_new_btn")}
                </button>
              </div>
            </div>
          ) : null}

          {!imported && !noClasses ? (
            <div className="mt-3 rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-semibold">{t("lrn_import_assign_class_title")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("lrn_import_assign_class_hint")}</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={bulkClassId}
                  onChange={(e) => setBulkClassId(e.target.value)}
                  aria-label={t("lrn_import_assign_all_label")}
                  className="h-9 rounded-lg border bg-background px-2 text-sm"
                >
                  <option value="">{t("lrn_import_select_class")}</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={applyClassToAll}
                  disabled={!bulkClassId}
                  className="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t("lrn_import_assign_all_btn")}
                </button>
              </div>
            </div>
          ) : null}

          {noClasses ? (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">
              {t("lrn_import_no_classes")}
            </div>
          ) : null}

          {!imported ? (
            <p className="mt-3 text-xs text-muted-foreground">{t("lrn_import_edit_hint")}</p>
          ) : null}

          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t("lrn_import_th_row")}</th>
                  <th className="px-3 py-2">{t("lrn_import_th_name")}</th>
                  <th className="px-3 py-2">{t("lrn_import_th_phone")}</th>
                  <th className="px-3 py-2">{t("lrn_import_th_email")}</th>
                  <th className="px-3 py-2">{t("lrn_import_th_class")}</th>
                  <th className="px-3 py-2">{t("lrn_import_th_state")}</th>
                  <th className="px-3 py-2">{t("lrn_import_th_issue")}</th>
                  {!imported ? <th className="px-3 py-2">{t("lrn_import_th_actions")}</th> : null}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row) => (
                  <tr key={row.id} className="border-t align-top">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {row.line > 0 ? row.line : t("lrn_import_manual_row")}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.fullName}
                        onChange={(e) => setRowField(row.id, "fullName", e.target.value)}
                        disabled={editLocked}
                        placeholder={t("lrn_import_ph_name")}
                        className="h-8 w-full min-w-[150px] rounded-lg border bg-background px-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.phone}
                        onChange={(e) => setRowField(row.id, "phone", e.target.value)}
                        disabled={editLocked}
                        placeholder={t("lrn_import_ph_phone")}
                        className="h-8 w-full min-w-[150px] rounded-lg border bg-background px-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.email}
                        onChange={(e) => setRowField(row.id, "email", e.target.value)}
                        disabled={editLocked}
                        placeholder={t("lrn_import_ph_email")}
                        className="h-8 w-full min-w-[170px] rounded-lg border bg-background px-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.classId}
                        onChange={(e) => setRowClass(row.id, e.target.value)}
                        disabled={editLocked || noClasses}
                        className="h-8 w-full min-w-[140px] rounded-lg border bg-background px-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">{t("lrn_import_select_class")}</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                    </td>
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
                    {!imported ? (
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          disabled={importing}
                          aria-label={t("lrn_import_remove_row")}
                          title={t("lrn_import_remove_row")}
                          className="inline-flex items-center justify-center rounded-lg border border-destructive/30 p-1.5 text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!imported ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => void handleImport()}
                disabled={importing || validRows.length === 0 || !classesLoaded}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {importing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> {t("lrn_import_importing")}
                  </>
                ) : !classesLoaded ? (
                  t("lrn_import_classes_loading")
                ) : (
                  t("lrn_import_btn_valid")
                )}
              </button>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"
              >
                <Plus className="size-4" /> {t("lrn_import_add_row")}
              </button>
              <button
                type="button"
                onClick={resetImport}
                className="rounded-lg border px-4 py-2 text-sm font-semibold"
              >
                {t("lrn_import_cancel_btn")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {importing ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-busy="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <Loader2 className="size-12 animate-spin text-primary" />
              <h3 className="mt-4 text-base font-bold">{t("lrn_import_importing")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("lrn_import_progress_hint")}</p>
            </div>

            {progress.total > 0 ? (
              <div className="mt-5">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {t("lrn_import_progress_label")
                      .replace("{done}", String(progress.done))
                      .replace("{total}", String(progress.total))}
                  </span>
                  <span className="font-semibold text-foreground">
                    {Math.round((progress.done / progress.total) * 100)}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${(progress.done / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
