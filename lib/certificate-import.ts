import * as XLSX from "xlsx"
import {
  CERTIFICATE_LEVELS,
  type CertificateLevel,
  type CourseInfo,
  type CreateCertificateInput,
  type Evaluation,
} from "@/domains/certificates"

export type RawRow = Record<string, unknown>

export interface MappedRow {
  fullName: string
  input?: CreateCertificateInput
  error?: string
}

export const IMPORT_HEADERS = [
  "Nom complet",
  "Date de naissance",
  "Lieu de naissance",
  "Niveau de référence",
  "Date de début",
  "Date de fin",
  "Nombre de leçons",
  "Leçons suivies",
  "Info cours",
  "Évaluation",
  "Commentaires",
] as const

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function toISO(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

/** Numéro de série Excel → Date (25569 = 1970-01-01). */
function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial <= 0) return null
  return new Date(Math.round((serial - 25569) * 86400 * 1000))
}

/** Accepte numéro Excel, Date ou chaîne (DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD…) → ISO yyyy-mm-dd. */
export function normalizeDateToISO(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : toISO(value)
  }

  if (typeof value === "number") {
    const date = excelSerialToDate(value)
    return date ? toISO(date) : null
  }

  if (typeof value === "string") {
    const str = value.trim()
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10)

    const parts = str.split(/[-./]/)
    if (parts.length === 3) {
      let y: string, mo: string, d: string
      if (parts[0].length === 4) {
        ;[y, mo, d] = parts
      } else {
        ;[d, mo, y] = parts
      }
      const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)))
      if (!Number.isNaN(date.getTime())) return toISO(date)
    }

    const parsed = new Date(str)
    if (!Number.isNaN(parsed.getTime())) return toISO(parsed)
  }

  return null
}

function normalizeEvaluation(value: unknown): Evaluation | null {
  if (typeof value !== "string") return null
  const v = value.toLowerCase()
  if (v.includes("excellent") || v.includes("outstanding")) return "Outstanding"
  if (v.includes("bon") || v.includes("good")) return "Good"
  if (v.includes("satisfais") || v.includes("satisfactory")) return "Satisfactory"
  if (v.includes("participant")) return "Participant"
  return null
}

function normalizeCourseInfo(value: unknown): CourseInfo | null {
  if (value === null || value === undefined || value === "") return "Complete level"
  if (typeof value !== "string") return null
  const v = value.toLowerCase()
  if (v.includes("complet")) return "Complete level"
  if (v.includes("partial") || v.includes("partiel")) return "Partially completed level"
  if (v.includes("drop") || v.includes("abandon")) return "Course dropped out"
  if (v.includes("no participation") || v.includes("aucune")) return "No participation"
  return null
}

function str(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim()
}

/** Lit la première feuille d'un fichier Excel/CSV et renvoie les lignes JSON. */
export async function readRowsFromFile(file: File): Promise<RawRow[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: false, raw: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { raw: true, defval: null })
  // Ignore une éventuelle ligne d'en-tête répétée.
  return rows.filter((row) => str(row["Nom complet"]) !== "Nom complet")
}

/** Mappe + valide une ligne brute vers un CreateCertificateInput (ou une erreur). */
export function mapRow(raw: RawRow): MappedRow {
  const fullName = str(raw["Nom complet"])
  const placeOfBirth = str(raw["Lieu de naissance"])
  const levelRaw = str(raw["Niveau de référence"]).toUpperCase()

  if (!fullName) return { fullName: "(sans nom)", error: "Nom complet manquant" }
  if (!placeOfBirth) return { fullName, error: "Lieu de naissance manquant" }

  const dateOfBirth = normalizeDateToISO(raw["Date de naissance"])
  const courseStartDate = normalizeDateToISO(raw["Date de début"])
  const courseEndDate = normalizeDateToISO(raw["Date de fin"])
  if (!dateOfBirth) return { fullName, error: "Date de naissance invalide" }
  if (!courseStartDate) return { fullName, error: "Date de début invalide" }
  if (!courseEndDate) return { fullName, error: "Date de fin invalide" }
  if (new Date(courseEndDate).getTime() < new Date(courseStartDate).getTime()) {
    return { fullName, error: "La date de fin est antérieure à la date de début" }
  }

  if (!CERTIFICATE_LEVELS.includes(levelRaw as CertificateLevel)) {
    return { fullName, error: `Niveau invalide (${levelRaw || "vide"}). Attendu: ${CERTIFICATE_LEVELS.join(", ")}` }
  }
  const referenceLevel = levelRaw as CertificateLevel

  const evaluation = normalizeEvaluation(raw["Évaluation"] ?? raw["Evaluation"])
  if (!evaluation) {
    return { fullName, error: "Évaluation invalide. Attendu: Outstanding, Good, Satisfactory, Participant" }
  }

  const courseInfo = normalizeCourseInfo(raw["Info cours"])
  if (!courseInfo) {
    return { fullName, error: "Info cours invalide. Attendu: Complete level, Partially completed level, Course dropped out, No participation" }
  }

  const lessonUnits = Number.parseInt(str(raw["Nombre de leçons"]), 10) || 0
  const lessonsAttended = Number.parseInt(str(raw["Leçons suivies"]), 10) || lessonUnits
  if (lessonsAttended > lessonUnits) {
    return { fullName, error: `Leçons suivies (${lessonsAttended}) > total (${lessonUnits})` }
  }

  return {
    fullName,
    input: {
      fullName,
      dateOfBirth,
      placeOfBirth,
      referenceLevel,
      courseStartDate,
      courseEndDate,
      lessonUnits,
      lessonsAttended,
      courseInfo,
      evaluation,
      comments: str(raw["Commentaires"]),
    },
  }
}

/** Génère et télécharge un modèle Excel avec les en-têtes attendus + une ligne d'exemple. */
export function downloadImportTemplate() {
  const example = [
    "Jean Dupont",
    "1998-05-12",
    "Douala",
    "B1",
    "2026-01-10",
    "2026-03-20",
    60,
    58,
    "Complete level",
    "Good",
    "",
  ]
  const worksheet = XLSX.utils.aoa_to_sheet([[...IMPORT_HEADERS], example])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Certificats")
  XLSX.writeFile(workbook, "modele-certificats.xlsx")
}
