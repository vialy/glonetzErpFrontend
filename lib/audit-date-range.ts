import type { AuditDateRange } from "@/domains/accounting/types"

export function defaultAuditDateRange(): AuditDateRange {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

export function formatFcfa(value: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(value)} F CFA`
}
