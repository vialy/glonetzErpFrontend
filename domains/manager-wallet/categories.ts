import type { ManagerCategoryOption } from "@/domains/manager-wallet/types"

export const MANAGER_EXPENSE_CATEGORIES: ManagerCategoryOption[] = [
  { id: "supplies", labelKey: "mgr_cat_supplies", icon: "Package" },
  { id: "electricity", labelKey: "mgr_cat_electricity", icon: "Zap" },
  { id: "water", labelKey: "mgr_cat_water", icon: "Droplets" },
  { id: "internet", labelKey: "mgr_cat_internet", icon: "Wifi" },
  { id: "maintenance", labelKey: "mgr_cat_maintenance", icon: "Wrench" },
  { id: "logistics", labelKey: "mgr_cat_logistics", icon: "Truck" },
  { id: "training", labelKey: "mgr_cat_training", icon: "GraduationCap" },
  { id: "other", labelKey: "mgr_cat_other", icon: "MoreHorizontal" },
]
