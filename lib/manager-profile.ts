const STORAGE_KEY = "glonetz_manager_profile_v1"

export type ManagerProfileData = {
  name: string
  phone: string
}

export function loadManagerProfile(fallback: ManagerProfileData): ManagerProfileData {
  if (typeof localStorage === "undefined") return fallback
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw) as Partial<ManagerProfileData>
    const name = typeof p.name === "string" ? p.name.trim() : ""
    const phone = typeof p.phone === "string" ? p.phone.trim() : ""
    return {
      name: name || fallback.name,
      phone: phone || fallback.phone,
    }
  } catch {
    return fallback
  }
}

export function saveManagerProfile(data: ManagerProfileData): void {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      name: data.name.trim(),
      phone: data.phone.trim(),
    }),
  )
}
