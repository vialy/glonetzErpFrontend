export const CLASS_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const
export type ClassLevel = (typeof CLASS_LEVELS)[number]

export const CLASS_TIME_SLOTS = ["MO", "MI", "NM", "AB"] as const
export type ClassTimeSlot = (typeof CLASS_TIME_SLOTS)[number]

export const DEFAULT_CLASS_TIME_SLOT: ClassTimeSlot = "MO"

export const CLASS_TIME_SLOT_LABELS_FR: Record<ClassTimeSlot, string> = {
  MO: "Matin",
  MI: "Midi",
  NM: "Apres-midi",
  AB: "Soir",
}

/** Plages horaires affichées sur le certificat de scolarité. */
export const CLASS_TIME_SLOT_HOURS_FR: Record<ClassTimeSlot, string> = {
  MO: "08h00 - 11h00",
  MI: "11h15 - 14h30",
  NM: "14h45 - 17h45",
  AB: "18h00 - 21h00",
}

export const CLASS_TIME_SLOT_HOURS_EN: Record<ClassTimeSlot, string> = {
  MO: "08:00 AM - 11:00 AM",
  MI: "11:15 AM - 02:30 PM",
  NM: "02:45 PM - 05:45 PM",
  AB: "06:00 PM - 09:00 PM",
}

export const CLASS_TIME_SLOT_LABELS_EN: Record<ClassTimeSlot, string> = {
  MO: "Morning",
  MI: "Midday",
  NM: "Afternoon",
  AB: "Evening",
}

export function classTimeSlotLabel(slot: ClassTimeSlot, locale: "fr" | "en" = "fr"): string {
  return locale === "en" ? CLASS_TIME_SLOT_LABELS_EN[slot] : CLASS_TIME_SLOT_LABELS_FR[slot]
}

export function classTimeSlotHours(slot: ClassTimeSlot, locale: "fr" | "en" = "fr"): string {
  return locale === "en" ? CLASS_TIME_SLOT_HOURS_EN[slot] : CLASS_TIME_SLOT_HOURS_FR[slot]
}

export function isClassLevel(value: string): value is ClassLevel {
  return (CLASS_LEVELS as readonly string[]).includes(value)
}

export function isClassTimeSlot(value: string): value is ClassTimeSlot {
  return (CLASS_TIME_SLOTS as readonly string[]).includes(value)
}

export function inferClassLevelFromName(name: string): ClassLevel | null {
  const match = name.toUpperCase().match(/\b(A1|A2|B1|B2|C1|C2)\b/)
  return match && isClassLevel(match[1]) ? match[1] : null
}

export function normalizeStoredClassTimeSlot(timeSlot?: string): ClassTimeSlot {
  if (timeSlot && isClassTimeSlot(timeSlot)) return timeSlot
  return DEFAULT_CLASS_TIME_SLOT
}
