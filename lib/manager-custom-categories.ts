import type { ManagerCategoryOption } from "@/domains/manager-wallet/types"

const STORAGE_PREFIX = "glonetz_manager_custom_categories_v1"

export type StoredManagerCustomCategory = {
  id: string
  label: string
  createdAt: string
}

function storageKey(managerId: string) {
  return `${STORAGE_PREFIX}:${managerId}`
}

export function loadManagerCustomCategories(managerId: string): StoredManagerCustomCategory[] {
  if (typeof localStorage === "undefined" || !managerId) return []
  try {
    const raw = localStorage.getItem(storageKey(managerId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is StoredManagerCustomCategory => {
        return (
          typeof item === "object" &&
          item !== null &&
          typeof (item as StoredManagerCustomCategory).id === "string" &&
          typeof (item as StoredManagerCustomCategory).label === "string"
        )
      })
      .map((item) => ({
        id: item.id.trim(),
        label: item.label.trim(),
        createdAt: item.createdAt || new Date().toISOString(),
      }))
      .filter((item) => item.id && item.label)
  } catch {
    return []
  }
}

export function saveManagerCustomCategories(managerId: string, categories: StoredManagerCustomCategory[]) {
  if (typeof localStorage === "undefined" || !managerId) return
  localStorage.setItem(storageKey(managerId), JSON.stringify(categories))
}

export function toManagerCategoryOption(category: StoredManagerCustomCategory): ManagerCategoryOption {
  return {
    id: category.id,
    customLabel: category.label,
    icon: "MoreHorizontal",
  }
}

export function slugifyCustomCategoryId(label: string) {
  const base = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return `custom_${base || "category"}_${Date.now()}`
}

export function notifyManagerCustomCategoriesUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("manager-custom-categories-updated"))
  }
}
