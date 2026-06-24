import type { PaymentGatewayId, StaffSettings } from "@/domains/settings/types"

const GATEWAY_VALUES: PaymentGatewayId[] = ["monero", "tranzak", "neero", "none"]

function normalizeGateway(value: unknown): PaymentGatewayId {
  const normalized = String(value ?? "none").toLowerCase()
  return GATEWAY_VALUES.includes(normalized as PaymentGatewayId)
    ? (normalized as PaymentGatewayId)
    : "none"
}

function asSettingsRecord(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") return {}
  const record = data as Record<string, unknown>
  if (record.settings && typeof record.settings === "object") {
    return record.settings as Record<string, unknown>
  }
  return record
}

export function parseStaffSettings(data: unknown): StaffSettings {
  const settings = asSettingsRecord(data)
  const emails = settings.notificationEmails
  const now = new Date().toISOString()

  return {
    id: String(settings.id ?? settings.friendlyId ?? "settings"),
    activeGateway: normalizeGateway(settings.activeGateway),
    notificationEmails: Array.isArray(emails)
      ? emails.filter((e): e is string => typeof e === "string")
      : [],
    createdAt: String(settings.createdAt ?? now),
    updatedAt: String(settings.updatedAt ?? now),
  }
}
