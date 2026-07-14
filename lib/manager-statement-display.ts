import type { StatementEntry } from "@/services/staff-accounts.service"

export type ManagerStatementRow = StatementEntry & {
  displayDescription: string
  statusBadge?: "failed_withdrawal" | "withdrawal_fee"
  /** Ne pas compter dans les totaux entrees/sorties (virement echoue puis annule). */
  excludeFromTotals?: boolean
}

const REFUND_RE =
  /Refund for failed withdrawal (WDR-[A-Z0-9]+)|Annulation - virement echoue \((WDR-[A-Z0-9]+)\)/i
const WITHDRAWAL_FEE_RE = /^Frais de retrait virement/i

function extractFailedWithdrawalId(description: string | undefined): string | null {
  if (!description) return null
  const m = description.match(REFUND_RE)
  return m?.[1] ?? m?.[2] ?? null
}

function isFailedRefundDebit(entry: StatementEntry): boolean {
  if (entry.direction !== "out" || entry.source !== "adjustment") return false
  return Boolean(extractFailedWithdrawalId(entry.description) || entry.withdrawalFriendlyId)
}

/** Uniquement les frais lies a un virement admin (pas les depenses normales). */
function isWithdrawalFeeEntry(entry: StatementEntry): boolean {
  const raw = entry.description ?? ""
  return (
    WITHDRAWAL_FEE_RE.test(raw) ||
    entry.categoryLabel === "Frais de retrait virement"
  )
}

function formatFeeDescription(amount: number, locale: "fr" | "en"): string {
  const formatted = new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR").format(amount)
  return locale === "en"
    ? `Withdrawal transfer fee: ${formatted} FCFA`
    : `Frais de retrait virement : ${formatted} FCFA`
}

function formatRefundDescription(locale: "fr" | "en"): string {
  return locale === "en" ? "Cancellation - transfer failed" : "Annulation - virement echoue"
}

function formatFailedWithdrawalDescription(motif: string, locale: "fr" | "en"): string {
  const base = motif.trim() || (locale === "en" ? "Manager transfer" : "Virement manager")
  const suffix =
    locale === "en"
      ? " - transfer failed (funds not received)"
      : " - virement echoue (fonds non recus)"
  return `${base}${suffix}`
}

export function formatStatementDescription(entry: StatementEntry, locale: "fr" | "en"): string {
  const raw = entry.description?.trim() ?? ""

  if (isWithdrawalFeeEntry(entry)) {
    return formatFeeDescription(entry.totalAmount, locale)
  }

  if (extractFailedWithdrawalId(raw) && entry.direction === "out") {
    return formatRefundDescription(locale)
  }

  return raw
}

/** Associe un credit retrait a son annulation (meme montant, peu de temps avant). */
function findPairedFailedCreditId(
  refund: StatementEntry,
  entries: StatementEntry[],
): string | null {
  if (refund.withdrawalFriendlyId) {
    const byId = entries.find(
      (e) =>
        e.id !== refund.id &&
        e.direction === "in" &&
        e.source === "withdrawal" &&
        e.withdrawalFriendlyId === refund.withdrawalFriendlyId,
    )
    if (byId) return byId.id
  }

  const refundTime = new Date(refund.createdAt).getTime()
  const candidate = entries.find((e) => {
    if (e.direction !== "in" || e.source !== "withdrawal") return false
    if (e.totalAmount !== refund.totalAmount) return false
    const delta = refundTime - new Date(e.createdAt).getTime()
    return delta >= 0 && delta <= 10 * 60 * 1000
  })
  return candidate?.id ?? null
}

/**
 * Masque les lignes d'annulation techniques et regroupe visuellement
 * les virements echoues (credit + remboursement = une seule ligne lisible).
 */
export function prepareManagerStatementEntries(
  entries: StatementEntry[],
  locale: "fr" | "en",
): ManagerStatementRow[] {
  const failedCreditIds = new Set<string>()

  for (const entry of entries) {
    if (!isFailedRefundDebit(entry)) continue
    const paired = findPairedFailedCreditId(entry, entries)
    if (paired) failedCreditIds.add(paired)
  }

  const rows: ManagerStatementRow[] = []

  for (const entry of entries) {
    if (isFailedRefundDebit(entry)) continue

    const failed =
      entry.direction === "in" &&
      entry.source === "withdrawal" &&
      failedCreditIds.has(entry.id)

    if (failed) {
      rows.push({
        ...entry,
        displayDescription: formatFailedWithdrawalDescription(entry.description ?? "", locale),
        statusBadge: "failed_withdrawal",
        excludeFromTotals: true,
      })
      continue
    }

    rows.push({
      ...entry,
      displayDescription: formatStatementDescription(entry, locale),
      statusBadge: isWithdrawalFeeEntry(entry) ? "withdrawal_fee" : undefined,
    })
  }

  return rows
}
