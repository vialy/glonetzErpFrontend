const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidNotificationEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

export function parseNotificationEmailsInput(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}
