"use client"

import { Tag } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import { useManagerExpenseCategories } from "@/hooks/use-manager-expense-categories"
import { useLocale } from "@/hooks/use-locale"
import { cn } from "@/lib/utils"

export const ALL_EXPENSE_CATEGORIES = "all" as const

type Props = {
  value: string
  onChange: (categoryId: string) => void
  className?: string
}

export function ManagerExpenseCategoryFilter({ value, onChange, className }: Props) {
  const { t } = useLocale()
  const { session } = useAuth()
  const managerId = session?.staffUserId ?? session?.email ?? "default"
  const { categories, getCategoryLabel } = useManagerExpenseCategories(managerId)

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border/80 bg-background p-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <Label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Tag className="size-3.5" />
          {t("mgr_expense_category_label")}
        </Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-11 w-full rounded-xl border-input bg-background sm:min-w-[260px] sm:max-w-[340px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_EXPENSE_CATEGORIES}>{t("mgr_expense_category_all")}</SelectItem>
            {categories
              .filter((category) => category.id !== "other")
              .map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {getCategoryLabel(category)}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
