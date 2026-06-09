/** Libellé de session dérivé des dates de début / fin (ex. « Jan — Juin 2025 »). */
export function deriveClassSession(
  periodStart: string,
  periodEnd: string,
  locale: "fr" | "en" = "fr",
): string {
  if (!periodStart?.trim()) return ""

  const loc = locale === "en" ? "en-US" : "fr-FR"
  const start = new Date(`${periodStart}T12:00:00`)
  if (Number.isNaN(start.getTime())) return ""

  const month = (d: Date) =>
    d.toLocaleDateString(loc, { month: "short" }).replace(/\.$/, "").replace(/^\w/, (c) => c.toUpperCase())
  const year = (d: Date) => d.getFullYear()

  const startMonth = month(start)
  const startYear = year(start)

  if (!periodEnd?.trim() || periodEnd === periodStart) {
    return `${startMonth} ${startYear}`
  }

  const end = new Date(`${periodEnd}T12:00:00`)
  if (Number.isNaN(end.getTime())) {
    return `${startMonth} ${startYear}`
  }

  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  if (sameMonth) return `${startMonth} ${startYear}`

  const endMonth = month(end)
  const endYear = year(end)

  if (startYear === endYear) {
    return `${startMonth} — ${endMonth} ${startYear}`
  }

  return `${startMonth} ${startYear} — ${endMonth} ${endYear}`
}
